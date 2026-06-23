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

  const { messages, financialContext } = await req.json();

  const systemPrompt = `Kamu adalah asisten keuangan pribadi AI bernama "HAEGUSA-AI" untuk seorang mahasiswa Binus Jakarta.
Kamu memiliki akses ke data keuangan real-time mereka. Jawab dengan campuran Bahasa Indonesia dan English (gaya casual Jakarta).
Jadilah singkat, tajam, dan actionable. Gunakan emoji secara moderat. Jangan bertele-tele.

=== DATA KEUANGAN SAAT INI ===
${financialContext}
================================

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
