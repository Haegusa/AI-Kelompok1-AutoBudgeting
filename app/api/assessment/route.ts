import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

let rrIndex = 0;

function getKeys(): string[] {
  const raw = process.env.GEMINI_APIKEYS ?? '';
  return raw.split(',').map(k => k.trim()).filter(Boolean);
}

function nextKey(keys: string[]): string {
  const key = keys[rrIndex % keys.length];
  rrIndex = (rrIndex + 1) % keys.length;
  return key;
}

export async function POST(req: NextRequest) {
  const keys = getKeys();

  if (keys.length === 0) {
    return NextResponse.json(
      { error: 'GEMINI_APIKEYS is not configured.' },
      { status: 500 },
    );
  }

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
  const { data: profile } = await supabase.from('profiles').select('current_cash, current_debt, full_name, nickname').eq('id', user.id).single();
  const { data: transactions } = await supabase.from('transactions').select('amount, type, timestamp, description, category').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(20);

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
  const nickname = profile?.nickname || 'Pengguna';

  const financialNarrative = `
=== RINGKASAN NERACA KEUANGAN ===
Nama/Panggilan: ${nickname}
Kas Likuid Tersedia: Rp ${currentCash.toLocaleString('id-ID')}
Total Utang/PayLater Aktif: Rp ${currentDebt.toLocaleString('id-ID')}
Anggaran Bulan Ini: Rp ${monthlyBudget.toLocaleString('id-ID')}
Pengeluaran Bulan Ini: Rp ${thisMonthSpent.toLocaleString('id-ID')}
Sisa Anggaran: Rp ${remainingBudget.toLocaleString('id-ID')} ${isOverBudget ? '(OVER BUDGET)' : ''}

=== TRANSAKSI TERAKHIR (MAX 20) ===
${transactions ? transactions.map((t: any) => `- ${t.type === 'DEBIT' ? 'Keluar' : 'Masuk'}: Rp ${t.amount} (${t.category}) | ${t.description}`).join('\n') : 'Belum ada transaksi'}
=================================
`;

  const systemPrompt = `Kamu adalah analis keuangan kuantitatif AI (Quantitative AI Analyst) bergaya "HAEGUSA-AI" yang sangat kejam, realistis, dan presisi. 
Tugasmu adalah menganalisis data keuangan pengguna (terutama mahasiswa Binus) dan memberikan rekomendasi strategis.
Gunakan bahasa Indonesia dengan campuran sedikit istilah financial/startup Jakarta (gaya konsultan).

Berdasarkan data berikut, buatlah assessment dan rekomendasi dengan format JSON murni TANPA markdown block. Format output JSON harus persis seperti ini:
{
  "diagnostics": [
    { "icon": "emoji", "title": "Judul Diagnostic", "content": "Analisis tajam. Format HTML diperbolehkan untuk styling seperti <strong style='color:#ef4444'>...</strong>" },
    { "icon": "emoji", "title": "Judul Diagnostic 2", "content": "Analisis tajam. Format HTML diperbolehkan." }
  ],
  "recommendations": [
    { "n": "01", "title": "Judul Rekomendasi", "desc": "Deskripsi rekomendasi yang actionable." },
    { "n": "02", "title": "Judul Rekomendasi 2", "desc": "Deskripsi rekomendasi yang actionable." },
    { "n": "03", "title": "Judul Rekomendasi 3", "desc": "Deskripsi rekomendasi yang actionable." },
    { "n": "04", "title": "Judul Rekomendasi 4", "desc": "Deskripsi rekomendasi yang actionable." }
  ],
  "quote": "Quote singkat yang nyelekit tapi memotivasi soal keuangan (contoh: 'Neraca adalah cermin kedewasaan...')"
}

DATA PENGGUNA:
${financialNarrative}`;

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: "application/json"
    },
  });

  const startIndex = rrIndex;
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const apiKey = nextKey(keys);

    try {
      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (res.status === 429 || res.status === 403) {
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }

      const data = await res.json();
      const text: string =
        data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

      try {
        const parsed = JSON.parse(text);
        return NextResponse.json(parsed);
      } catch (e) {
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }

    } catch (e: any) {
      continue;
    }
  }

  return NextResponse.json(
    { error: 'Semua API key Gemini sedang habis kuota.' },
    { status: 503 },
  );
}
