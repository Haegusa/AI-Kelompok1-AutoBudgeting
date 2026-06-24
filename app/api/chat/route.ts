import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ---------------------------------------------------------------------------
// Round-robin key rotation
// Module-level counter persists across requests within the same serverless
// function instance and rotates automatically on every call.
// ---------------------------------------------------------------------------
let rrIndex = 0;

function getKeys(): string[] {
  const raw = process.env.GEMINI_APIKEYS ?? '';
  return raw.split(',').map(k => k.trim()).filter(Boolean);
}

/** Returns the next key in round-robin order and advances the counter. */
function nextKey(keys: string[]): string {
  const key = keys[rrIndex % keys.length];
  rrIndex = (rrIndex + 1) % keys.length;
  return key;
}

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const keys = getKeys();

  if (keys.length === 0) {
    return NextResponse.json(
      { error: 'GEMINI_APIKEYS is not configured.' },
      { status: 500 },
    );
  }

  const { messages } = await req.json();
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized: Missing Authorization header.' }, { status: 401 });
  }

  // Create a server-side Supabase client using the client's token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  // Fetch financial data directly from the database
  const { data: profile } = await supabase.from('profiles').select('current_cash, current_debt').eq('id', user.id).single();
  const { data: transactions } = await supabase.from('transactions').select('amount, type, timestamp').eq('user_id', user.id);

  // Calculate current month's spent amount
  let thisMonthSpent = 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  if (transactions) {
    transactions.forEach((tx: any) => {
      const txDate = new Date(tx.timestamp);
      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear && tx.type === 'DEBIT') {
        thisMonthSpent += tx.amount;
      }
    });
  }

  const monthlyBudget = 1000000;
  const remainingBudget = monthlyBudget - thisMonthSpent;
  const isOverBudget = remainingBudget < 0;
  const currentCash = profile?.current_cash || 0;
  const currentDebt = profile?.current_debt || 0;

  const financialNarrative = `
=== RINGKASAN NERACA KEUANGAN ===
Kas Likuid Tersedia: Rp ${currentCash.toLocaleString('id-ID')}
Total Utang/PayLater Aktif: Rp ${currentDebt.toLocaleString('id-ID')}
Anggaran Bulan Ini: Rp ${monthlyBudget.toLocaleString('id-ID')}
Pengeluaran Bulan Ini: Rp ${thisMonthSpent.toLocaleString('id-ID')}
Sisa Anggaran: Rp ${remainingBudget.toLocaleString('id-ID')} ${isOverBudget ? '(OVER BUDGET)' : ''}
=================================
`;

  const systemPrompt = `Kamu adalah asisten keuangan pribadi AI bernama "HAEGUSA-AI" untuk seorang mahasiswa Binus Jakarta.
Kamu memiliki akses ke data keuangan real-time mereka. Jawab dengan campuran Bahasa Indonesia dan English (gaya casual Jakarta).
Jadilah singkat, tajam, dan actionable. Gunakan emoji secara moderat. Jangan bertele-tele.

Berdasarkan data keuangan di bawah ini, lakukan evaluasi rasio likuiditas dan berikan rekomendasi keputusan pengeluaran yang sangat tajam, presisi, dan realistis:
${financialNarrative}

Fokus pada insight yang relevan dengan data di atas. Jika ditanya sesuatu di luar data, jawab dengan jujur bahwa kamu tidak tahu.`;

  const contents = (messages as { role: string; text: string }[]).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature:     0.7,
      maxOutputTokens: 512,
    },
  });

  // Try every key in round-robin order; skip exhausted/forbidden keys
  const startIndex = rrIndex;
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const apiKey = nextKey(keys);

    try {
      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      // Quota exhausted or key invalid → try the next one
      if (res.status === 429 || res.status === 403) {
        console.warn(`[Gemini] Key #${(startIndex + attempt) % keys.length} returned ${res.status}, trying next key…`);
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }

      const data = await res.json();
      const text: string =
        data.candidates?.[0]?.content?.parts?.[0]?.text ??
        'Maaf, tidak bisa generate respons saat ini.';

      return NextResponse.json({ text });

    } catch (e: any) {
      // Network error on this key → try next
      console.warn(`[Gemini] Key #${(startIndex + attempt) % keys.length} threw: ${e.message}`);
      continue;
    }
  }

  // All keys exhausted
  return NextResponse.json(
    { error: 'Semua API key Gemini sedang habis kuota. Coba lagi nanti ya!' },
    { status: 503 },
  );
}
