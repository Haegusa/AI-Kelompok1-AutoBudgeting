'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type Category = 'Food' | 'Transport' | 'Shopping' | 'Entertainment' | 'Bills' | 'Health' | 'Other';

interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

interface AppState {
  monthlyIncome: number;
  expenses: Expense[];
  savingsGoalPct: number;
}

type Tab = 'dashboard' | 'expenses' | 'analytics' | 'settings';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const CATEGORY_META: Record<Category, { icon: string; color: string; bg: string }> = {
  Food:          { icon: '🍜', color: '#ff9500', bg: 'rgba(255,149,0,0.15)' },
  Transport:     { icon: '🚗', color: '#00d4ff', bg: 'rgba(0,212,255,0.12)' },
  Shopping:      { icon: '🛍️', color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  Entertainment: { icon: '🎮', color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  Bills:         { icon: '📄', color: '#ffd700', bg: 'rgba(255,215,0,0.12)' },
  Health:        { icon: '💊', color: '#00ff88', bg: 'rgba(0,255,136,0.12)' },
  Other:         { icon: '📦', color: '#8ba0c0', bg: 'rgba(139,160,192,0.12)' },
};

const CATEGORIES: Category[] = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Other'];

const STORAGE_KEY = 'budget_os_data';

const EMPTY_STATE_HINTS = [
  'Mungkin kopi V60 di kafe favorit, servis motor, atau top-up RDN kamu?',
  'Catat juga pengeluaran kecil — bubble tea, parkir, atau jajan pasar.',
  'Setiap rupiah yang dicatat = satu langkah lebih dekat ke financial freedom.',
  'Mulai dari yang paling segar di ingatan — belanjaan tadi pagi?',
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatIDR(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

function formatIDRCompact(amount: number): string {
  if (amount >= 1_000_000_000) return 'Rp ' + (amount / 1_000_000_000).toFixed(1) + 'M';
  if (amount >= 1_000_000) return 'Rp ' + (amount / 1_000_000).toFixed(1) + 'jt';
  if (amount >= 1_000) return 'Rp ' + (amount / 1_000).toFixed(0) + 'k';
  return formatIDR(amount);
}

function getDaysInMonth(date: Date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getRemainingDays(): number {
  const now = new Date();
  const total = getDaysInMonth(now);
  return total - now.getDate() + 1;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getRandomHint(): string {
  return EMPTY_STATE_HINTS[Math.floor(Math.random() * EMPTY_STATE_HINTS.length)];
}

// ─────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────
function loadState(): AppState {
  if (typeof window === 'undefined') return { monthlyIncome: 0, expenses: [], savingsGoalPct: 20 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {/* ignore */}
  return { monthlyIncome: 0, expenses: [], savingsGoalPct: 20 };
}

function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {/* ignore */}
}

// ─────────────────────────────────────────────
// TOAST HOOK
// ─────────────────────────────────────────────
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, show };
}

// ─────────────────────────────────────────────
// LIVE CLOCK
// ─────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ─────────────────────────────────────────────
// DONUT CHART COMPONENT
// ─────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div className="empty-state">
      <div className="empty-state-icon">📊</div>
      <div className="empty-state-text">Belum ada data bulan ini</div>
    </div>
  );

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const strokeWidth = 28;

  let cumulative = 0;
  const circumference = 2 * Math.PI * r;

  const slices = data
    .filter(d => d.value > 0)
    .map(d => {
      const pct = d.value / total;
      const offset = circumference * (1 - cumulative - pct);
      const dash = circumference * pct - 2; // small gap
      const result = { ...d, pct, offset, dash };
      cumulative += pct;
      return result;
    });

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${Math.max(0, s.dash)} ${circumference}`}
            strokeDashoffset={s.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${s.color}66)` }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)" letterSpacing="0.08em">TOTAL</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">{formatIDRCompact(total)}</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, boxShadow: `0 0 6px ${s.color}`, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: s.color }}>{(s.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AI ANALYSIS PANEL (gated by ≥5 transactions)
// ─────────────────────────────────────────────
function AIAnalysisPanel({
  expenses, monthlyIncome, savingsGoalPct, totalSpentThisMonth, avgDailySpend, projectedTotal, spendableIncome, categoryTotals,
}: {
  expenses: Expense[];
  monthlyIncome: number;
  savingsGoalPct: number;
  totalSpentThisMonth: number;
  avgDailySpend: number;
  projectedTotal: number;
  spendableIncome: number;
  categoryTotals: Record<string, number>;
}) {
  const MIN_TX = 5;
  const txCount = expenses.length;
  if (txCount < MIN_TX) {
    return (
      <div className="ai-gate-card">
        <div className="ai-gate-icon">🤖</div>
        <div className="ai-gate-title">HAEGUSA-AI Short Analysis</div>
        <div className="ai-gate-desc">
          Analisis AI akan muncul setelah kamu mencatat minimal <strong>{MIN_TX} transaksi</strong>.
          <br />Saat ini: <span style={{ color: 'var(--cyan)' }}>{txCount}</span> transaksi tercatat.
        </div>
        <div className="ai-gate-progress-track">
          <div className="ai-gate-progress-fill" style={{ width: `${(txCount / MIN_TX) * 100}%` }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
          {txCount}/{MIN_TX} transaksi
        </div>
      </div>
    );
  }

  // Generate contextual AI insights
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const topCategoryPct = totalSpentThisMonth > 0 && topCategory
    ? ((topCategory[1] / totalSpentThisMonth) * 100).toFixed(0)
    : '0';
  const savingsReserve = monthlyIncome * (savingsGoalPct / 100);
  const isOverBudget = projectedTotal > spendableIncome;
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - (totalSpentThisMonth / spendableIncome) * 80)));

  const insights: { icon: string; text: string; accent: string }[] = [
    {
      icon: '📊',
      text: `Portofolio pengeluaran bulan ini didominasi oleh kategori **${topCategory?.[0] ?? 'N/A'}** (${topCategoryPct}% dari total spend). ${
        Number(topCategoryPct) > 40
          ? 'Konsentrasi tinggi di satu kategori menunjukkan potensi optimasi — pertimbangkan rebalancing.'
          : 'Distribusi pengeluaran tergolong sehat dan terdiversifikasi.'
      }`,
      accent: 'var(--cyan)',
    },
    {
      icon: '💡',
      text: `Rata-rata harian ${formatIDRCompact(avgDailySpend)} vs budget ${formatIDRCompact(spendableIncome / getDaysInMonth())}. Proyeksi bulan ini: **${formatIDRCompact(projectedTotal)}** — ${
        isOverBudget
          ? `⚠️ ${formatIDRCompact(projectedTotal - spendableIncome)} di atas batas aman. Kurangi pengeluaran diskresioner.`
          : `✓ Masih ${formatIDRCompact(spendableIncome - projectedTotal)} di bawah budget. Keep it up!`
      }`,
      accent: isOverBudget ? 'var(--red)' : 'var(--green)',
    },
    {
      icon: '🧠',
      text: `Rasio tabungan target kamu ${savingsGoalPct}% (${formatIDRCompact(savingsReserve)}/bln). ${
        savingsGoalPct >= 30
          ? 'Disiplin finansial di atas rata-rata — kamu sedang membangun buffer yang kuat untuk investasi jangka panjang.'
          : savingsGoalPct >= 20
          ? 'Savings rate 20–29% sudah solid. Pertimbangkan alokasi sebagian ke instrumen investasi seperti reksa dana atau RDN.'
          : 'Savings rate di bawah 20% perlu perhatian. Coba naikan target 5% per bulan secara bertahap.'
      }`,
      accent: 'var(--gold)',
    },
  ];

  return (
    <div className="card ai-analysis-card">
      <div className="card-title">
        <span className="card-title-icon">🤖</span>
        HAEGUSA-AI · Short Analysis
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>● LIVE</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', background: 'rgba(0,212,255,0.04)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyan), #006aff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, boxShadow: '0 0 16px var(--cyan-glow)' }}>🤖</div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', marginBottom: 2 }}>Financial Health Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: healthScore >= 70 ? 'var(--green)' : healthScore >= 40 ? 'var(--orange)' : 'var(--red)', textShadow: `0 0 16px ${healthScore >= 70 ? 'rgba(0,255,136,0.4)' : healthScore >= 40 ? 'rgba(255,149,0,0.4)' : 'rgba(255,68,102,0.4)'}` }}>{healthScore}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/100</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {insights.map((ins, i) => (
          <div key={i} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, borderLeft: `3px solid ${ins.accent}` }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{ins.icon}</span>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}
                dangerouslySetInnerHTML={{ __html: ins.text.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${ins.accent}">$1</strong>`) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function BudgetApp() {
  const [state, setState] = useState<AppState>({ monthlyIncome: 0, expenses: [], savingsGoalPct: 20 });
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [hydrated, setHydrated] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hint] = useState(getRandomHint);

  // Expense form
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Food');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayStr());

  // Filters
  const [filterCat, setFilterCat] = useState<string>('All');
  const [filterDate, setFilterDate] = useState('');

  // Settings
  const [incomeInput, setIncomeInput] = useState('');
  const [savingsInput, setSavingsInput] = useState('20');

  const { toasts, show: showToast } = useToast();
  const clock = useClock();

  // Hydrate from localStorage
  useEffect(() => {
    const s = loadState();
    setState(s);
    setIncomeInput(s.monthlyIncome > 0 ? String(s.monthlyIncome) : '');
    setSavingsInput(String(s.savingsGoalPct));
    setHydrated(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  // ─── Derived values ───────────────────────
  const today = todayStr();
  const daysInMonth = getDaysInMonth();
  const remainingDays = getRemainingDays();
  const now = new Date();
  const dayOfMonth = now.getDate();

  const { monthlyIncome, expenses, savingsGoalPct } = state;
  const savingsReserve = monthlyIncome * (savingsGoalPct / 100);
  const spendableIncome = monthlyIncome - savingsReserve;
  const dailyBudget = spendableIncome / daysInMonth;

  const thisMonthExpenses = useMemo(() => {
    const ym = today.slice(0, 7);
    return expenses.filter(e => e.date.startsWith(ym));
  }, [expenses, today]);

  const totalSpentThisMonth = useMemo(() =>
    thisMonthExpenses.reduce((s, e) => s + e.amount, 0),
  [thisMonthExpenses]);

  const todayExpenses = useMemo(() =>
    expenses.filter(e => e.date === today),
  [expenses, today]);

  const todaySpent = useMemo(() =>
    todayExpenses.reduce((s, e) => s + e.amount, 0),
  [todayExpenses]);

  const remainingToday = dailyBudget - todaySpent;
  const remainingMonth = spendableIncome - totalSpentThisMonth;

  // Average daily spend so far this month
  const avgDailySpend = dayOfMonth > 0 ? totalSpentThisMonth / dayOfMonth : 0;
  const projectedTotal = avgDailySpend * daysInMonth;

  // "Bisa jajan berapa hari" metric
  const bisaJajanHari = avgDailySpend > 0 ? Math.floor(remainingMonth / avgDailySpend) : remainingDays;

  // Spending by category
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    thisMonthExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return totals;
  }, [thisMonthExpenses]);

  // Daily spending history (last 14 days)
  const dailyHistory = useMemo(() => {
    const days: { date: string; spent: number; budget: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const spent = expenses.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0);
      days.push({ date: ds, spent, budget: dailyBudget });
    }
    return days;
  }, [expenses, dailyBudget]);

  // Filtered expense list
  const filteredExpenses = useMemo(() => {
    let list = [...expenses].sort((a, b) => b.createdAt - a.createdAt);
    if (filterCat !== 'All') list = list.filter(e => e.category === filterCat);
    if (filterDate) list = list.filter(e => e.date === filterDate);
    return list;
  }, [expenses, filterCat, filterDate]);

  // Donut chart data
  const donutData = useMemo(() =>
    CATEGORIES
      .filter(c => categoryTotals[c] > 0)
      .map(c => ({ label: `${CATEGORY_META[c].icon} ${c}`, value: categoryTotals[c], color: CATEGORY_META[c].color })),
  [categoryTotals]);

  // ─── Handlers ────────────────────────────
  const addExpense = () => {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!amt || amt <= 0) { showToast('Masukkan jumlah yang valid', 'error'); return; }
    if (!description.trim()) { showToast('Deskripsi tidak boleh kosong', 'error'); return; }
    const newExpense: Expense = {
      id: generateId(),
      amount: amt,
      category,
      description: description.trim(),
      date: expenseDate,
      createdAt: Date.now(),
    };
    setState(prev => ({ ...prev, expenses: [...prev.expenses, newExpense] }));
    setAmount('');
    setDescription('');
    setExpenseDate(todayStr());
    showToast(`${CATEGORY_META[category].icon} Pengeluaran dicatat!`, 'success');
    setShowForm(false);
  };

  const deleteExpense = (id: string) => {
    setState(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
    showToast('Pengeluaran dihapus', 'info');
  };

  const saveSettings = () => {
    const income = parseFloat(incomeInput.replace(/[^0-9.]/g, ''));
    const savings = parseFloat(savingsInput);
    if (isNaN(income) || income < 0) { showToast('Masukkan income yang valid', 'error'); return; }
    if (isNaN(savings) || savings < 0 || savings > 90) { showToast('Savings goal harus 0–90%', 'error'); return; }
    setState(prev => ({ ...prev, monthlyIncome: income, savingsGoalPct: savings }));
    showToast('Settings tersimpan ✓', 'success');
  };

  const clearAllData = () => {
    if (!confirm('Hapus SEMUA data? Tindakan ini tidak bisa dibatalkan.')) return;
    const fresh: AppState = { monthlyIncome: 0, expenses: [], savingsGoalPct: 20 };
    setState(fresh);
    setIncomeInput('');
    setSavingsInput('20');
    showToast('Semua data dihapus', 'info');
  };

  // Budget health
  const monthPct = spendableIncome > 0 ? Math.min((totalSpentThisMonth / spendableIncome) * 100, 100) : 0;
  const getDangerLevel = (pct: number) => pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : '';

  // Debt ratio (paylater-style: total this month spend vs income)
  const debtRatio = monthlyIncome > 0 ? (totalSpentThisMonth / monthlyIncome) * 100 : 0;

  if (!hydrated) return null;

  // ─────────────────────────────────────────
  // TABS
  // ─────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'expenses',  label: 'Expenses',  icon: '💸' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings',  label: 'Settings',  icon: '⚙️' },
  ];

  const isNewUser = expenses.length === 0 && monthlyIncome === 0;

  return (
    <div className="app-shell">
      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-logo">$</div>
          <div>
            <div className="brand-name">BudgetOS</div>
            <div className="brand-tagline">Financial Command Center</div>
          </div>
        </div>
        <div className="topbar-right">
          {monthlyIncome > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold)' }}>
              {formatIDRCompact(monthlyIncome)}<span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>/mo</span>
            </span>
          )}
          <div className="live-clock">
            <span className="live-dot" />
            {clock}
          </div>
        </div>
      </header>

      {/* ── NAV TABS ── */}
      <nav className="nav-tabs" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`nav-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="nav-tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── MAIN ── */}
      <main className="main-content">

        {/* ══════════════════════════════════
            DASHBOARD TAB
        ══════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <section id="section-dashboard">

            {/* ── NEW USER EMPTY STATE ── */}
            {isNewUser ? (
              <div className="welcome-card">
                <div className="welcome-orb">🚀</div>
                <h2 className="welcome-title">Sistem Siap Monitor Arus Kasmu</h2>
                <p className="welcome-desc">
                  Mulai dengan mencatat pengeluaran pertamamu hari ini —{' '}
                  <em style={{ color: 'var(--cyan)' }}>{hint}</em>
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                  <button
                    id="welcome-add-btn"
                    className="btn btn-primary"
                    onClick={() => { setShowForm(true); setActiveTab('expenses'); }}
                  >
                    <span>➕</span> Catat Sekarang
                  </button>
                  <button
                    id="welcome-settings-btn"
                    className="btn btn-ghost"
                    onClick={() => setActiveTab('settings')}
                  >
                    <span>⚙️</span> Setup Income
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Budget alert banners */}
                {monthlyIncome > 0 && monthPct >= 100 && (
                  <div className="alert-banner danger">
                    <span>🔴</span>
                    <span><strong>Budget bulan ini habis!</strong> Pengeluaranmu melebihi batas aman.</span>
                  </div>
                )}
                {monthlyIncome > 0 && monthPct >= 75 && monthPct < 100 && (
                  <div className="alert-banner warning">
                    <span>⚠️</span>
                    <span><strong>Budget mendekati batas.</strong> Sisa {formatIDRCompact(remainingMonth)} untuk {remainingDays} hari ke depan.</span>
                  </div>
                )}

                {/* ── HERO METRIC: "Bisa Jajan Berapa?" ── */}
                <div className="hero-metric-card">
                  <div className="hero-metric-label">💰 Sisa Dana Aman Bulan Ini</div>
                  <div className="hero-metric-value">
                    {monthlyIncome > 0 ? formatIDR(Math.max(0, remainingMonth)) : '—'}
                  </div>
                  {monthlyIncome > 0 && (
                    <div className="hero-metric-sub">
                      <span className={`hero-badge ${remainingMonth < 0 ? 'danger' : bisaJajanHari <= 3 ? 'warning' : 'good'}`}>
                        {remainingMonth < 0
                          ? `⚠ Sudah over budget`
                          : `✓ Aman untuk ~${bisaJajanHari} hari lagi`
                        }
                      </span>
                    </div>
                  )}
                  {monthlyIncome === 0 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 12 }}
                      onClick={() => setActiveTab('settings')}
                    >
                      Set income dulu →
                    </button>
                  )}
                </div>

                {/* ── MONTHLY BUDGET BAR ── */}
                {monthlyIncome > 0 && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-title"><span className="card-title-icon">📆</span>Monthly Budget</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {formatIDRCompact(totalSpentThisMonth)} dipakai
                      </span>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: monthPct >= 75 ? 'var(--red)' : 'var(--text-muted)' }}>
                        {monthPct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-track" style={{ height: 10 }}>
                      <div
                        className={`progress-fill ${getDangerLevel(monthPct)}`}
                        style={{ width: `${monthPct}%`, '--fill-color': 'var(--gold)', '--fill-glow': 'var(--gold-glow)' } as React.CSSProperties}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Budget: {formatIDRCompact(spendableIncome)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{remainingDays} hari tersisa</span>
                    </div>
                  </div>
                )}

                {/* ── TODAY'S TRANSACTIONS ── */}
                <div className="card">
                  <div className="card-title">
                    <span className="card-title-icon">🕐</span>Transaksi Hari Ini
                    {todayExpenses.length > 0 && (
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)' }}>
                        −{formatIDRCompact(todaySpent)}
                      </span>
                    )}
                  </div>
                  {todayExpenses.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">✨</div>
                      <div className="empty-state-text">Belum ada pengeluaran hari ini</div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
                        {hint}
                      </p>
                    </div>
                  ) : (
                    <div className="expense-list">
                      {[...todayExpenses].sort((a, b) => b.createdAt - a.createdAt).map(e => (
                        <ExpenseRow key={e.id} expense={e} onDelete={deleteExpense} />
                      ))}
                    </div>
                  )}
                  <button
                    id="dashboard-add-btn"
                    className="btn btn-ghost btn-full"
                    style={{ marginTop: 14 }}
                    onClick={() => { setActiveTab('expenses'); setShowForm(true); }}
                  >
                    <span>➕</span> Catat Pengeluaran
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ══════════════════════════════════
            EXPENSES TAB
        ══════════════════════════════════ */}
        {activeTab === 'expenses' && (
          <section id="section-expenses">
            <div className="grid-2" style={{ alignItems: 'start' }}>
              {/* Add Expense Form */}
              <div className="card">
                <div className="card-title"><span className="card-title-icon">➕</span>Catat Pengeluaran</div>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-amount">Jumlah (IDR)</label>
                    <input
                      id="input-amount"
                      className="form-input"
                      type="number"
                      placeholder="contoh: 25000"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addExpense()}
                      min="0"
                      autoFocus={showForm}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-category">Kategori</label>
                    <select
                      id="input-category"
                      className="form-select"
                      value={category}
                      onChange={e => setCategory(e.target.value as Category)}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{CATEGORY_META[c].icon} {c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-description">Deskripsi</label>
                    <input
                      id="input-description"
                      className="form-input"
                      type="text"
                      placeholder="Buat apa?"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addExpense()}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-date">Tanggal</label>
                    <input
                      id="input-date"
                      className="form-input"
                      type="date"
                      value={expenseDate}
                      onChange={e => setExpenseDate(e.target.value)}
                    />
                  </div>
                  <button id="btn-add-expense" className="btn btn-primary btn-full" onClick={addExpense}>
                    <span>➕</span> Tambah Pengeluaran
                  </button>
                </div>
              </div>

              {/* Expense List */}
              <div className="card" style={{ minHeight: 300 }}>
                <div className="card-title"><span className="card-title-icon">📋</span>Semua Pengeluaran</div>

                {/* Filters */}
                <div className="filter-bar">
                  <button
                    id="filter-all"
                    className={`filter-chip${filterCat === 'All' ? ' active' : ''}`}
                    onClick={() => setFilterCat('All')}
                  >All</button>
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      id={`filter-${c.toLowerCase()}`}
                      className={`filter-chip${filterCat === c ? ' active' : ''}`}
                      onClick={() => setFilterCat(c)}
                    >
                      {CATEGORY_META[c].icon} {c}
                    </button>
                  ))}
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <input
                    id="filter-date"
                    className="form-input"
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    placeholder="Filter by date"
                  />
                </div>

                {filteredExpenses.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <div className="empty-state-text">Tidak ada pengeluaran</div>
                  </div>
                ) : (
                  <div className="expense-list" style={{ maxHeight: 500, overflowY: 'auto' }}>
                    {filteredExpenses.map(e => (
                      <ExpenseRow key={e.id} expense={e} onDelete={deleteExpense} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════
            ANALYTICS TAB
        ══════════════════════════════════ */}
        {activeTab === 'analytics' && (
          <section id="section-analytics">

            {/* ── ADVANCED KPI METRICS ── */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
              <div className="kpi-card" style={{ '--accent-color': 'var(--cyan)', '--accent-glow': 'var(--cyan-glow)' } as React.CSSProperties}>
                <div className="kpi-label">Avg Daily Spend</div>
                <div className="kpi-value large">{formatIDRCompact(avgDailySpend)}</div>
                <div className="kpi-sub">vs {formatIDRCompact(dailyBudget)} budget</div>
              </div>
              <div className="kpi-card" style={{ '--accent-color': projectedTotal > spendableIncome ? 'var(--red)' : 'var(--green)', '--accent-glow': projectedTotal > spendableIncome ? 'rgba(255,68,102,0.4)' : 'rgba(0,255,136,0.4)' } as React.CSSProperties}>
                <div className="kpi-label">Proyeksi Bulan Ini</div>
                <div className="kpi-value large">{monthlyIncome > 0 ? formatIDRCompact(projectedTotal) : '—'}</div>
                <div className="kpi-sub">{projectedTotal > spendableIncome ? '🔴 Over budget' : '✓ Dalam budget'}</div>
              </div>
              <div className="kpi-card" style={{ '--accent-color': 'var(--gold)', '--accent-glow': 'var(--gold-glow)' } as React.CSSProperties}>
                <div className="kpi-label">Total Transaksi</div>
                <div className="kpi-value large">{thisMonthExpenses.length}</div>
                <div className="kpi-sub">bulan ini</div>
              </div>
              <div className="kpi-card" style={{ '--accent-color': debtRatio > 80 ? 'var(--red)' : debtRatio > 50 ? 'var(--orange)' : 'var(--green)', '--accent-glow': debtRatio > 80 ? 'rgba(255,68,102,0.4)' : debtRatio > 50 ? 'rgba(255,149,0,0.4)' : 'rgba(0,255,136,0.4)' } as React.CSSProperties}>
                <div className="kpi-label">Debt Ratio</div>
                <div className="kpi-value large">{monthlyIncome > 0 ? debtRatio.toFixed(1) + '%' : '—'}</div>
                <div className="kpi-sub">spend vs income</div>
              </div>
              <div className="kpi-card" style={{ '--accent-color': 'var(--cyan)', '--accent-glow': 'var(--cyan-glow)' } as React.CSSProperties}>
                <div className="kpi-label">Savings Reserve</div>
                <div className="kpi-value large">{monthlyIncome > 0 ? formatIDRCompact(savingsReserve) : '—'}</div>
                <div className="kpi-sub">{savingsGoalPct}% dari income</div>
              </div>
              <div className="kpi-card" style={{ '--accent-color': 'var(--gold)', '--accent-glow': 'var(--gold-glow)' } as React.CSSProperties}>
                <div className="kpi-label">Invest Growth Est.</div>
                <div className="kpi-value large">{monthlyIncome > 0 ? formatIDRCompact(savingsReserve * 12 * 1.08) : '—'}</div>
                <div className="kpi-sub">annualized @ 8%</div>
              </div>
            </div>

            {/* ── ALLOCATION BREAKDOWN DONUT ── */}
            <div className="grid-2" style={{ alignItems: 'start', marginBottom: 24 }}>
              <div className="card">
                <div className="card-title"><span className="card-title-icon">🍩</span>Allocation Breakdown</div>
                <DonutChart data={donutData} />
              </div>

              {/* Category bar chart */}
              <div className="card">
                <div className="card-title"><span className="card-title-icon">🗂️</span>Pengeluaran per Kategori</div>
                {Object.keys(categoryTotals).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-text">Belum ada data</div>
                  </div>
                ) : (
                  <div className="chart-bars">
                    {CATEGORIES
                      .filter(c => categoryTotals[c] > 0)
                      .sort((a, b) => (categoryTotals[b] || 0) - (categoryTotals[a] || 0))
                      .map(c => {
                        const amt = categoryTotals[c] || 0;
                        const pct = totalSpentThisMonth > 0 ? (amt / totalSpentThisMonth) * 100 : 0;
                        const meta = CATEGORY_META[c];
                        return (
                          <div key={c} className="chart-bar-row">
                            <div className="chart-bar-label">{meta.icon} {c}</div>
                            <div className="chart-bar-track">
                              <div
                                className="chart-bar-fill"
                                style={{ width: `${pct}%`, background: meta.color, boxShadow: `0 0 8px ${meta.color}66` }}
                              >
                                {pct >= 12 && <span className="chart-bar-pct">{pct.toFixed(0)}%</span>}
                              </div>
                            </div>
                            <div className="chart-bar-amount">{formatIDRCompact(amt)}</div>
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            </div>

            {/* ── AI ANALYSIS (gated ≥5 tx) ── */}
            <AIAnalysisPanel
              expenses={expenses}
              monthlyIncome={monthlyIncome}
              savingsGoalPct={savingsGoalPct}
              totalSpentThisMonth={totalSpentThisMonth}
              avgDailySpend={avgDailySpend}
              projectedTotal={projectedTotal}
              spendableIncome={spendableIncome}
              categoryTotals={categoryTotals}
            />

            {/* ── DAILY HISTORY TABLE ── */}
            <div className="card" style={{ marginTop: 24 }}>
              <div className="card-title"><span className="card-title-icon">📅</span>14 Hari Terakhir</div>
              {monthlyIncome === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⚙️</div>
                  <div className="empty-state-text">Set income di Settings terlebih dahulu</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Pengeluaran</th>
                        <th>Budget Harian</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyHistory.map(row => {
                        const diff = row.budget - row.spent;
                        const isOver = row.spent > row.budget && row.spent > 0;
                        return (
                          <tr key={row.date}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatDate(row.date)}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} className={isOver ? 'negative' : ''}>{formatIDRCompact(row.spent)}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{formatIDRCompact(row.budget)}</td>
                            <td>
                              {row.spent === 0 ? (
                                <span className="kpi-badge neutral">—</span>
                              ) : isOver ? (
                                <span className="kpi-badge negative">+{formatIDRCompact(Math.abs(diff))}</span>
                              ) : (
                                <span className="kpi-badge positive">-{formatIDRCompact(diff)}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════
            SETTINGS TAB
        ══════════════════════════════════ */}
        {activeTab === 'settings' && (
          <section id="section-settings" style={{ maxWidth: 600 }}>
            <div className="card">
              <div className="settings-section">
                <div className="settings-section-title">💰 Income Configuration</div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" htmlFor="settings-income">Monthly Income (IDR)</label>
                  <input
                    id="settings-income"
                    className="form-input"
                    type="number"
                    placeholder="contoh: 5000000"
                    value={incomeInput}
                    onChange={e => setIncomeInput(e.target.value)}
                    min="0"
                  />
                  {incomeInput && !isNaN(parseFloat(incomeInput)) && (
                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                      = <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                        {formatIDR(parseFloat(incomeInput))}
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label" htmlFor="settings-savings">Savings Goal (%)</label>
                  <input
                    id="settings-savings"
                    className="form-input"
                    type="number"
                    placeholder="contoh: 20"
                    value={savingsInput}
                    onChange={e => setSavingsInput(e.target.value)}
                    min="0"
                    max="90"
                  />
                  {incomeInput && savingsInput && !isNaN(parseFloat(incomeInput)) && !isNaN(parseFloat(savingsInput)) && (
                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                      Tabungan:{' '}
                      <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                        {formatIDR(parseFloat(incomeInput) * (parseFloat(savingsInput) / 100))}
                      </span>
                      {' '}| Spendable:{' '}
                      <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                        {formatIDR(parseFloat(incomeInput) * (1 - parseFloat(savingsInput) / 100))}
                      </span>
                    </div>
                  )}
                </div>

                {/* Preview */}
                {incomeInput && !isNaN(parseFloat(incomeInput)) && parseFloat(incomeInput) > 0 && (
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 16 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>Budget Preview</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Daily Budget', value: formatIDR(parseFloat(incomeInput) * (1 - parseFloat(savingsInput || '0') / 100) / daysInMonth), color: 'var(--gold)' },
                        { label: 'Monthly Budget', value: formatIDR(parseFloat(incomeInput) * (1 - parseFloat(savingsInput || '0') / 100)), color: 'var(--cyan)' },
                        { label: 'Days Left', value: remainingDays + ' hari', color: 'var(--text-secondary)' },
                        { label: 'Days in Month', value: daysInMonth + ' hari', color: 'var(--text-secondary)' },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: item.color, fontWeight: 700 }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button id="btn-save-settings" className="btn btn-gold btn-full" onClick={saveSettings}>
                  <span>💾</span> Simpan Settings
                </button>
              </div>

              <div className="divider" />

              <div className="settings-section">
                <div className="settings-section-title">⚠️ Danger Zone</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                  Hapus semua catatan pengeluaran dan reset pengaturan income.
                </p>
                <button id="btn-clear-data" className="btn btn-danger" onClick={clearAllData}>
                  🗑️ Hapus Semua Data
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── FAB: Floating Action Button ── */}
      <button
        id="fab-add-expense"
        className="fab"
        aria-label="Tambah pengeluaran"
        onClick={() => { setActiveTab('expenses'); setShowForm(true); }}
        title="Catat pengeluaran baru"
      >
        +
      </button>

      {/* ── TOAST NOTIFICATIONS ── */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EXPENSE ROW SUB-COMPONENT
// ─────────────────────────────────────────────
function ExpenseRow({ expense, onDelete }: { expense: Expense; onDelete: (id: string) => void }) {
  const meta = CATEGORY_META[expense.category];
  return (
    <div className="expense-item">
      <div
        className="expense-category-badge"
        style={{ background: meta.bg }}
        title={expense.category}
      >
        {meta.icon}
      </div>
      <div className="expense-info">
        <div className="expense-desc">{expense.description}</div>
        <div className="expense-meta">{expense.category}</div>
      </div>
      <div className="expense-date">{formatDate(expense.date)}</div>
      <div className="expense-amount">−{formatIDRCompact(expense.amount)}</div>
      <button
        id={`delete-expense-${expense.id}`}
        className="btn btn-danger"
        onClick={() => onDelete(expense.id)}
        title="Hapus pengeluaran"
        style={{ padding: '4px 10px', fontSize: 14 }}
      >
        ✕
      </button>
    </div>
  );
}
