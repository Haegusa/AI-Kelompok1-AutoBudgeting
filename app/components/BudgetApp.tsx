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
  savingsGoalPct: number; // % of income to save
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
  return total - now.getDate() + 1; // include today
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
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
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function BudgetApp() {
  const [state, setState] = useState<AppState>({ monthlyIncome: 0, expenses: [], savingsGoalPct: 20 });
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [hydrated, setHydrated] = useState(false);

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

  // Projected month total
  const projectedTotal = avgDailySpend * daysInMonth;

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

  // ─── Handlers ────────────────────────────
  const addExpense = () => {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (!description.trim()) { showToast('Enter a description', 'error'); return; }
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
    showToast(`${CATEGORY_META[category].icon} Expense added!`, 'success');
  };

  const deleteExpense = (id: string) => {
    setState(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
    showToast('Expense removed', 'info');
  };

  const saveSettings = () => {
    const income = parseFloat(incomeInput.replace(/[^0-9.]/g, ''));
    const savings = parseFloat(savingsInput);
    if (isNaN(income) || income < 0) { showToast('Enter valid income', 'error'); return; }
    if (isNaN(savings) || savings < 0 || savings > 90) { showToast('Savings goal must be 0–90%', 'error'); return; }
    setState(prev => ({ ...prev, monthlyIncome: income, savingsGoalPct: savings }));
    showToast('Settings saved ✓', 'success');
  };

  const clearAllData = () => {
    if (!confirm('Clear ALL data? This cannot be undone.')) return;
    const fresh: AppState = { monthlyIncome: 0, expenses: [], savingsGoalPct: 20 };
    setState(fresh);
    setIncomeInput('');
    setSavingsInput('20');
    showToast('All data cleared', 'info');
  };

  // Budget health
  const budgetPct = dailyBudget > 0 ? Math.min((todaySpent / dailyBudget) * 100, 100) : 0;
  const monthPct = spendableIncome > 0 ? Math.min((totalSpentThisMonth / spendableIncome) * 100, 100) : 0;
  const getDangerLevel = (pct: number) => pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : '';

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
            {monthlyIncome === 0 && (
              <div className="alert-banner warning" style={{ marginBottom: 20 }}>
                <span>⚠️</span>
                <span>Set your monthly income in <strong>Settings</strong> to enable budget tracking.</span>
              </div>
            )}

            {/* Alerts */}
            {monthlyIncome > 0 && budgetPct >= 100 && (
              <div className="alert-banner danger">
                <span>🔴</span>
                <span><strong>Daily budget exceeded!</strong> You&apos;ve spent {formatIDRCompact(todaySpent)} today (budget: {formatIDRCompact(dailyBudget)})</span>
              </div>
            )}
            {monthlyIncome > 0 && budgetPct >= 75 && budgetPct < 100 && (
              <div className="alert-banner warning">
                <span>⚠️</span>
                <span><strong>Approaching daily limit.</strong> {formatIDRCompact(remainingToday)} remaining today.</span>
              </div>
            )}

            {/* KPI Cards */}
            <div className="kpi-grid">
              <div className="kpi-card" style={{ '--accent-color': 'var(--gold)', '--accent-glow': 'var(--gold-glow)' } as React.CSSProperties}>
                <div className="kpi-label">Daily Budget</div>
                <div className="kpi-value">{monthlyIncome > 0 ? formatIDRCompact(dailyBudget) : '—'}</div>
                <div className="kpi-sub">{daysInMonth} days this month</div>
              </div>

              <div className="kpi-card" style={{ '--accent-color': remainingToday < 0 ? 'var(--red)' : 'var(--cyan)', '--accent-glow': remainingToday < 0 ? 'rgba(255,68,102,0.4)' : 'var(--cyan-glow)' } as React.CSSProperties}>
                <div className="kpi-label">Remaining Today</div>
                <div className="kpi-value">{monthlyIncome > 0 ? formatIDRCompact(Math.abs(remainingToday)) : '—'}</div>
                <div className="kpi-sub">
                  {remainingToday < 0 ? (
                    <span className="kpi-badge negative">↑ {formatIDRCompact(Math.abs(remainingToday))} over</span>
                  ) : (
                    <span className="kpi-badge positive">✓ On track</span>
                  )}
                </div>
              </div>

              <div className="kpi-card" style={{ '--accent-color': 'var(--red)', '--accent-glow': 'rgba(255,68,102,0.4)' } as React.CSSProperties}>
                <div className="kpi-label">Spent Today</div>
                <div className="kpi-value">{formatIDRCompact(todaySpent)}</div>
                <div className="kpi-sub">{todayExpenses.length} transaction{todayExpenses.length !== 1 ? 's' : ''}</div>
              </div>

              <div className="kpi-card" style={{ '--accent-color': remainingMonth < 0 ? 'var(--red)' : 'var(--green)', '--accent-glow': remainingMonth < 0 ? 'rgba(255,68,102,0.4)' : 'rgba(0,255,136,0.4)' } as React.CSSProperties}>
                <div className="kpi-label">Month Remaining</div>
                <div className="kpi-value large">{monthlyIncome > 0 ? formatIDRCompact(Math.abs(remainingMonth)) : '—'}</div>
                <div className="kpi-sub">{remainingDays} days left</div>
              </div>

              <div className="kpi-card" style={{ '--accent-color': 'var(--orange)', '--accent-glow': 'rgba(255,149,0,0.4)' } as React.CSSProperties}>
                <div className="kpi-label">Month Spent</div>
                <div className="kpi-value large">{formatIDRCompact(totalSpentThisMonth)}</div>
                <div className="kpi-sub">of {monthlyIncome > 0 ? formatIDRCompact(spendableIncome) : '—'}</div>
              </div>

              <div className="kpi-card" style={{ '--accent-color': 'var(--cyan)', '--accent-glow': 'var(--cyan-glow)' } as React.CSSProperties}>
                <div className="kpi-label">Savings Reserve</div>
                <div className="kpi-value large">{monthlyIncome > 0 ? formatIDRCompact(savingsReserve) : '—'}</div>
                <div className="kpi-sub">{savingsGoalPct}% of income</div>
              </div>
            </div>

            {/* Progress bars */}
            {monthlyIncome > 0 && (
              <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card">
                  <div className="card-title"><span className="card-title-icon">📅</span>Daily Budget Usage</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatIDRCompact(todaySpent)} spent</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{budgetPct.toFixed(0)}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${getDangerLevel(budgetPct)}`}
                      style={{ width: `${budgetPct}%`, '--fill-color': 'var(--cyan)', '--fill-glow': 'var(--cyan-glow)' } as React.CSSProperties}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    {formatIDRCompact(dailyBudget)} daily budget
                  </div>
                </div>

                <div className="card">
                  <div className="card-title"><span className="card-title-icon">📆</span>Monthly Budget Usage</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatIDRCompact(totalSpentThisMonth)} spent</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{monthPct.toFixed(0)}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${getDangerLevel(monthPct)}`}
                      style={{ width: `${monthPct}%`, '--fill-color': 'var(--gold)', '--fill-glow': 'var(--gold-glow)' } as React.CSSProperties}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    {formatIDRCompact(spendableIncome)} monthly budget
                  </div>
                </div>
              </div>
            )}

            {/* Today's expenses quick view */}
            <div className="card">
              <div className="card-title"><span className="card-title-icon">🕐</span>Today&apos;s Transactions</div>
              {todayExpenses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">✨</div>
                  <div className="empty-state-text">No expenses recorded today</div>
                </div>
              ) : (
                <div className="expense-list">
                  {[...todayExpenses].sort((a, b) => b.createdAt - a.createdAt).map(e => (
                    <ExpenseRow key={e.id} expense={e} onDelete={deleteExpense} />
                  ))}
                </div>
              )}
            </div>
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
                <div className="card-title"><span className="card-title-icon">➕</span>Add Expense</div>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-amount">Amount (IDR)</label>
                    <input
                      id="input-amount"
                      className="form-input"
                      type="number"
                      placeholder="e.g. 25000"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addExpense()}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-category">Category</label>
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
                    <label className="form-label" htmlFor="input-description">Description</label>
                    <input
                      id="input-description"
                      className="form-input"
                      type="text"
                      placeholder="What was this for?"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addExpense()}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="input-date">Date</label>
                    <input
                      id="input-date"
                      className="form-input"
                      type="date"
                      value={expenseDate}
                      onChange={e => setExpenseDate(e.target.value)}
                    />
                  </div>
                  <button id="btn-add-expense" className="btn btn-primary btn-full" onClick={addExpense}>
                    <span>➕</span> Add Expense
                  </button>
                </div>
              </div>

              {/* Expense List */}
              <div className="card" style={{ minHeight: 300 }}>
                <div className="card-title"><span className="card-title-icon">📋</span>All Expenses</div>

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
                    <div className="empty-state-text">No expenses found</div>
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
            {/* Top row: summary stats */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
              <div className="kpi-card" style={{ '--accent-color': 'var(--cyan)', '--accent-glow': 'var(--cyan-glow)' } as React.CSSProperties}>
                <div className="kpi-label">Avg Daily Spend</div>
                <div className="kpi-value large">{formatIDRCompact(avgDailySpend)}</div>
                <div className="kpi-sub">vs {formatIDRCompact(dailyBudget)} budget</div>
              </div>
              <div className="kpi-card" style={{ '--accent-color': projectedTotal > spendableIncome ? 'var(--red)' : 'var(--green)', '--accent-glow': projectedTotal > spendableIncome ? 'rgba(255,68,102,0.4)' : 'rgba(0,255,136,0.4)' } as React.CSSProperties}>
                <div className="kpi-label">Projected Month</div>
                <div className="kpi-value large">{monthlyIncome > 0 ? formatIDRCompact(projectedTotal) : '—'}</div>
                <div className="kpi-sub">{projectedTotal > spendableIncome ? '🔴 Over budget' : '✓ Within budget'}</div>
              </div>
              <div className="kpi-card" style={{ '--accent-color': 'var(--gold)', '--accent-glow': 'var(--gold-glow)' } as React.CSSProperties}>
                <div className="kpi-label">Total Transactions</div>
                <div className="kpi-value large">{thisMonthExpenses.length}</div>
                <div className="kpi-sub">this month</div>
              </div>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
              {/* Category breakdown */}
              <div className="card">
                <div className="card-title"><span className="card-title-icon">🗂️</span>Spending by Category</div>
                {Object.keys(categoryTotals).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-text">No data yet</div>
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
                                style={{ width: `${pct}%`, background: meta.color }}
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

              {/* Daily history */}
              <div className="card">
                <div className="card-title"><span className="card-title-icon">📅</span>Last 14 Days</div>
                {monthlyIncome === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">⚙️</div>
                    <div className="empty-state-text">Set income in Settings first</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Spent</th>
                          <th>Budget</th>
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
                    placeholder="e.g. 5000000"
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
                    placeholder="e.g. 20"
                    value={savingsInput}
                    onChange={e => setSavingsInput(e.target.value)}
                    min="0"
                    max="90"
                  />
                  {incomeInput && savingsInput && !isNaN(parseFloat(incomeInput)) && !isNaN(parseFloat(savingsInput)) && (
                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                      Savings reserve:{' '}
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
                        { label: 'Days Left', value: remainingDays + ' days', color: 'var(--text-secondary)' },
                        { label: 'Days in Month', value: daysInMonth + ' days', color: 'var(--text-secondary)' },
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
                  <span>💾</span> Save Settings
                </button>
              </div>

              <div className="divider" />

              <div className="settings-section">
                <div className="settings-section-title">⚠️ Danger Zone</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                  Permanently delete all expense records and reset income settings.
                </p>
                <button id="btn-clear-data" className="btn btn-danger" onClick={clearAllData}>
                  🗑️ Clear All Data
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

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
        title="Delete expense"
        style={{ padding: '4px 10px', fontSize: 14 }}
      >
        ✕
      </button>
    </div>
  );
}


