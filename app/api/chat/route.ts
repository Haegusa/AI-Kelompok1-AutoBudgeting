import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set in environment variables.' },
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

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature:     0.7,
          maxOutputTokens: 512,
        },
      }),
    });

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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
