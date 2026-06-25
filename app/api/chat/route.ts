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

  const { messages, language = 'id' } = await req.json();
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

  // ---------------------------------------------------------------------------
  // Pre-calculate financial ratios for AI context
  // ---------------------------------------------------------------------------
  const debtToCashRatio   = currentCash > 0 ? (currentDebt / currentCash) : (currentDebt > 0 ? 99 : 0);
  const budgetBurnRate    = monthlyBudget > 0 ? (thisMonthSpent / monthlyBudget) : 0;
  const liquidityCoverage = currentDebt > 0 ? (currentCash / currentDebt) : 99;

  // Determine risk tier based on ratios
  let riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  if (debtToCashRatio > 0.8 || budgetBurnRate > 1.2 || liquidityCoverage < 0.5) {
    riskLevel = 'CRITICAL';
  } else if (debtToCashRatio > 0.5 || budgetBurnRate > 0.9 || liquidityCoverage < 1.0) {
    riskLevel = 'HIGH';
  } else if (debtToCashRatio > 0.3 || budgetBurnRate > 0.7) {
    riskLevel = 'MODERATE';
  } else {
    riskLevel = 'LOW';
  }

  const riskColor = { CRITICAL: '🔴', HIGH: '🟠', MODERATE: '🟡', LOW: '🟢' }[riskLevel];

  // ---------------------------------------------------------------------------
  // Financial narrative injected into context
  // ---------------------------------------------------------------------------
  const financialNarrative = `
=== FINANCIAL BALANCE SUMMARY ===
Available Liquid Cash      : Rp ${currentCash.toLocaleString('id-ID')}
Total Active Debt/PayLater : Rp ${currentDebt.toLocaleString('id-ID')}
Monthly Budget             : Rp ${monthlyBudget.toLocaleString('id-ID')}
This Month's Spending      : Rp ${thisMonthSpent.toLocaleString('id-ID')}
Remaining Budget           : Rp ${remainingBudget.toLocaleString('id-ID')} ${isOverBudget ? '(OVER BUDGET ⚠)' : ''}

=== PRE-CALCULATED RISK RATIOS ===
Debt-to-Cash Ratio         : ${debtToCashRatio.toFixed(2)} ${debtToCashRatio > 0.8 ? '⚠ DANGER' : debtToCashRatio > 0.5 ? '⚠ HIGH' : '✓ OK'}
Budget Burn Rate           : ${(budgetBurnRate * 100).toFixed(1)}% ${budgetBurnRate > 1 ? '⚠ OVER BUDGET' : budgetBurnRate > 0.9 ? '⚠ NEAR LIMIT' : '✓ OK'}
Liquidity Coverage Ratio   : ${liquidityCoverage === 99 ? 'N/A (no debt)' : liquidityCoverage.toFixed(2) + (liquidityCoverage < 1 ? ' ⚠ DANGER — cash cannot cover debt' : ' ✓ OK')}

${riskColor} OVERALL RISK LEVEL: ${riskLevel}
=================================
`;


  // ---------------------------------------------------------------------------
  // ABSOLUTE SYSTEM PROMPT — Financial domain perimeter
  // ---------------------------------------------------------------------------
  const languageInstruction = language === 'en'
    ? `LANGUAGE DIRECTIVE: Always respond in English. Use clear, professional financial English.`
    : `LANGUAGE DIRECTIVE: Selalu jawab dalam Bahasa Indonesia. Gunakan gaya kasual Jakarta yang tetap profesional dan tajam. Boleh mix sedikit English untuk istilah keuangan teknis.`;

  const systemPrompt = `You are HAEGUSA-AI, an elite personal finance AI assistant embedded in a budgeting application for university students in Jakarta, Indonesia.

══════════════════════════════════════════════════════════
ABSOLUTE DOMAIN RESTRICTION — READ CAREFULLY AND ENFORCE
══════════════════════════════════════════════════════════
You are STRICTLY AND EXCLUSIVELY specialized in the following domains:
  1. Personal finance & household budgeting
  2. Accounting principles (bookkeeping, cash flow, balance sheets, GAAP, IFRS)
  3. Macroeconomics & microeconomics (inflation, interest rates, supply/demand, behavioral economics)
  4. Investment analysis (stocks, bonds, mutual funds, ETF, RDN, portfolio theory)
  5. Debt management (PayLater, credit cards, loan amortization)
  6. Financial ratios & liquidity analysis
  7. Financial planning & goal setting

IF A USER'S QUESTION IS OUTSIDE THESE FINANCIAL DOMAINS:
  - Politely and briefly decline with a one-sentence explanation
  - Immediately redirect them to ask a finance-related question
  - Do NOT answer the out-of-scope question under any circumstances
  - Do NOT apologize excessively — be concise and redirect
  - Example refusal: "That's outside my financial expertise. I'm here to help with budgeting, investing, and money management — what's your finance question?"

══════════════════════════════════════════════════════════
REAL-TIME FINANCIAL CONTEXT & RISK ANALYSIS
══════════════════════════════════════════════════════════
${financialNarrative}

CRITICAL DIRECTIVE ON RISK LEVELS:
- If OVERALL RISK LEVEL is "CRITICAL" or "HIGH", and the user asks about buying non-essential items (e.g., coffee equipment, games) or making high-risk investments (e.g., stocks/IHSG), you MUST proactively warn them before answering.
- Cite their Debt-to-Cash Ratio or Liquidity Coverage Ratio in your warning.
- Example: "Sebelum bahas saham IHSG, liquidity coverage kamu bahaya banget di bawah 1. Utang PayLater kamu lebih besar dari kas liquid. Beresin utang dulu sebelum mikir investasi."

══════════════════════════════════════════════════════════
COMMUNICATION STYLE
══════════════════════════════════════════════════════════
- Be concise, sharp, and actionable — avoid rambling
- Use emojis sparingly (max 2-3 per response)
- Lead with the most important insight first
- When relevant, cite specific numbers from the user's financial data above

${languageInstruction}`;

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
        (language === 'en'
          ? 'Sorry, unable to generate a response right now.'
          : 'Maaf, tidak bisa generate respons saat ini.');

      return NextResponse.json({ text });

    } catch (e: any) {
      // Network error on this key → try next
      console.warn(`[Gemini] Key #${(startIndex + attempt) % keys.length} threw: ${e.message}`);
      continue;
    }
  }

  // All keys exhausted
  return NextResponse.json(
    { error: language === 'en'
        ? 'All Gemini API keys are quota-exhausted. Please try again later.'
        : 'Semua API key Gemini sedang habis kuota. Coba lagi nanti ya!'
    },
    { status: 503 },
  );
}
