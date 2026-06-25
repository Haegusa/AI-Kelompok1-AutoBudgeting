"use client";

import { useEffect, useState, useMemo } from "react";
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { DM_Sans, Space_Mono } from 'next/font/google';
import { useLanguage } from '../lib/LanguageContext';
import type { Lang } from '../lib/LanguageContext';

const dmSans = DM_Sans({ subsets: ['latin'] });
const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'] });

const CATEGORY_COLORS: Record<string, string> = {
  'FOOD & BEVERAGE': '#ec4899',
  'EQUIPMENT':       '#f59e0b',
  'TRANSPORTATION':  '#10b981',
  'ENTERTAINMENT':   '#06b6d4',
  'INVESTMENT':      '#a855f7',
  'OTHER':           '#64748b',
  'INCOME':          '#10b981',
  'CASH':            '#3b82f6',
  'PAYLATER':        '#ef4444',
};

const MONTHLY_BUDGET = 1_000_000;

/* ─────────────────────────────────────────── */
export default function BinusianMonthlyBudgeting({ user }: { user?: User | null }) {

  const { lang, setLang, t } = useLanguage();

  const NAV_ITEMS = [
    { id: 'DASHBOARD', label: t('tab.dashboard') },
    { id: 'HISTORY',   label: t('tab.history')   },
    { id: 'ANALYTICS', label: t('tab.analytics') },
    { id: 'OPTIONS',   label: t('tab.settings')  },
  ];

  const [activeTab,        setActiveTab]        = useState('DASHBOARD');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [clockStr,         setClockStr]         = useState('');
  const [dateStr,          setDateStr]          = useState('');
  const [greeting,         setGreeting]         = useState('');
  const [langDropOpen,     setLangDropOpen]     = useState(false);

  /* Profile */
  const [profile, setProfile] = useState({
    fullName: '', nickname: '', phone: '', email: '', address: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile,      setTempProfile]      = useState({ fullName:'', nickname:'', phone:'', email:'', address:'' });
  const [avatarUrl,        setAvatarUrl]        = useState<string | null>(null);
  const [currentCash,      setCurrentCash]      = useState(0);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatarUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  /* Transactions */
  const [transactions, setTransactions] = useState<any[]>([]);

  // ── Supabase Data Fetching ──
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Fetch Profile
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (p) {
        const loadedProfile = {
          fullName: p.full_name || user.user_metadata?.full_name || '',
          nickname: p.nickname || '',
          phone: p.phone || '',
          email: user.email || '',
          address: p.address || ''
        };
        setProfile(loadedProfile);
        setTempProfile(loadedProfile);
        setCurrentCash(p.current_cash || 0);
      } else {
        // Fallback for new users before trigger runs
        setProfile(prev => ({ ...prev, fullName: user.user_metadata?.full_name || '', email: user.email || '' }));
      }
      
      // Fetch Transactions
      const { data: txs } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('timestamp', { ascending: false });
      if (txs) setTransactions(txs);
    };
    fetchData();
  }, [user]);

  const [editingTx,    setEditingTx]    = useState<any | null>(null);
  const [newTxType,    setNewTxType]    = useState('DEBIT');
  const [newTxAmount,  setNewTxAmount]  = useState('');
  const [newTxDesc,    setNewTxDesc]    = useState('');
  const [newTxCategory,setNewTxCategory]= useState('OTHER');
  const [filterMonth,  setFilterMonth]  = useState<string>('all');

  /* Chat state */
  const [chatOpen,     setChatOpen]     = useState(false);
  const [chatMsgs,     setChatMsgs]     = useState<{role:'user'|'assistant';text:string}[]>([]);
  const [chatInput,    setChatInput]    = useState('');
  const [chatLoading,  setChatLoading]  = useState(false);

  /* Assessment state */
  const [aiAssessment, setAiAssessment] = useState<any>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  const fetchAssessment = async () => {
    setLoadingAssessment(true);
    setAiAssessment(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '' }
      });
      const data = await res.json();
      if (data && data.diagnostics) {
        setAiAssessment(data);
      } else {
        setAiAssessment({ error: true, quote: "Mohon maaf, layanan AI sedang sibuk atau data portofolio belum memadai. Silakan coba beberapa saat lagi." });
      }
    } catch (e) {
      console.error(e);
      setAiAssessment({ error: true, quote: "Terjadi kesalahan koneksi saat terhubung ke peladen AI." });
    } finally {
      setLoadingAssessment(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ANALYTICS' && !aiAssessment && !loadingAssessment) {
      fetchAssessment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* Floating quick-record FAB state */
  const [fabOpen,      setFabOpen]      = useState(false);
  const [fabType,      setFabType]      = useState<'DEBIT'|'CREDIT'>('DEBIT');
  const [fabAmount,    setFabAmount]    = useState('');
  const [fabDesc,      setFabDesc]      = useState('');
  const [fabSource,    setFabSource]    = useState('ShopeePay');
  const [fabCategory,  setFabCategory]  = useState('FOOD & BEVERAGE');

  /* ── Clock & greeting ── */
  useEffect(() => {
    setLoading(false);
    const tick = () => {
      const n = new Date();
      const p = (v: number) => String(v).padStart(2, '0');
      setClockStr(`${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`);
      const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      setDateStr(`${MONTHS[n.getMonth()]} ${n.getFullYear()}`);
      const h = n.getHours();
      if (h >= 0  && h <= 5)  setGreeting('SUBUH');
      else if (h <= 10)       setGreeting('PAGI');
      else if (h <= 14)       setGreeting('SIANG');
      else if (h <= 18)       setGreeting('SORE');
      else                    setGreeting('MALAM');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Close lang dropdown on outside click ── */
  useEffect(() => {
    if (!langDropOpen) return;
    const handler = () => setLangDropOpen(false);
    document.addEventListener('click', handler, { once: true });
    return () => document.removeEventListener('click', handler);
  }, [langDropOpen]);

  /* ── Core financials ── */
  const fin = useMemo(() => {
    let income = 0, spent = 0, debt = 0;
    const catMap: Record<string, number> = { CASH: currentCash };
    transactions.forEach(t => {
      if (t.type === 'DEBIT') {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        spent += t.amount;
        if (t.category === 'PAYLATER') debt += t.amount;
      } else { income += t.amount; }
    });
    const total = Object.values(catMap).reduce((a, b) => a + b, 0);
    const catArray = Object.keys(catMap).map(k => ({
      name: k, amount: catMap[k],
      percentage: total > 0 ? Math.round((catMap[k] / total) * 100) : 0,
      color: CATEGORY_COLORS[k] || CATEGORY_COLORS['OTHER'],
    })).sort((a, b) => b.amount - a.amount);

    let ang = 0;
    const svgSegs = catArray.map(cat => {
      const R = 52; const C = 2 * Math.PI * R;
      const dash = (cat.percentage / 100) * C;
      const seg = { ...cat, dash, gap: C - dash, offset: ang * (C / 360) };
      ang += (cat.percentage / 100) * 360;
      return seg;
    });

    const consumptiveSpent = transactions
      .filter(t => t.type === 'DEBIT' && t.category !== 'INVESTMENT')
      .reduce((a, t) => a + t.amount, 0);

    return {
      totalAllocation: total, totalIncome: income,
      paylaterDebt: debt, totalSpent: spent,
      monthRemaining: currentCash + income - (spent - debt),
      categoryData: catArray, svgSegs,
      consumptiveSpent,
      budgetPct: Math.min(100, Math.round((consumptiveSpent / MONTHLY_BUDGET) * 100)),
    };
  }, [transactions, currentCash]);

  /* ── Weekly spend ── */
  const weeklySpend = useMemo(() => {
    const groups: Record<string, { dateKey: string; label: string; total: number; ts: number }> = {};
    transactions.forEach(t => {
      if (t.type !== 'DEBIT') return;
      const d = new Date(t.timestamp);
      const sun = new Date(d); sun.setDate(d.getDate() - d.getDay());
      const key = sun.toISOString().slice(0, 10);
      if (!groups[key]) {
        const wom = Math.ceil((sun.getDate() + 6) / 7);
        const mon = sun.toLocaleString('en', { month: 'short' }).toUpperCase();
        groups[key] = { dateKey: key, label: `W${wom} ${mon}`, total: 0, ts: sun.getTime() };
      }
      groups[key].total += t.amount;
    });
    const sorted = Object.values(groups).sort((a, b) => a.ts - b.ts).slice(-5);
    const max = Math.max(...sorted.map(w => w.total), 1);
    return sorted.map(w => ({ ...w, pct: Math.round((w.total / max) * 100) }));
  }, [transactions]);

  /* ── History filters ── */
  const historyFilters = useMemo(() => {
    const monthsMap: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.timestamp);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthsMap[ym]) monthsMap[ym] = d.getTime();
    });
    return Object.entries(monthsMap).sort((a, b) => b[1] - a[1]).map(([ym]) => ym);
  }, [transactions]);

  const filteredTransactions = useMemo(() =>
    filterMonth === 'all'
      ? transactions
      : transactions.filter(t => {
          const d = new Date(t.timestamp);
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return ym === filterMonth;
        }),
  [transactions, filterMonth]);

  const monthlyBudgetStats = useMemo(() => {
    const spent = filteredTransactions
      .filter((t: any) => t.type === 'DEBIT' && t.category !== 'INVESTMENT')
      .reduce((a: number, t: any) => a + t.amount, 0);
    const pct    = Math.min(100, Math.round((spent / MONTHLY_BUDGET) * 100));
    const isOver = spent > MONTHLY_BUDGET;
    return { spent, pct, isOver, remaining: MONTHLY_BUDGET - spent };
  }, [filteredTransactions]);

  /* ── Current-month budget stats (for dashboard banner) ── */
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTxs = transactions.filter(t => {
      const d = new Date(t.timestamp);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return ym === curYm;
    });
    const spent = monthTxs
      .filter(t => t.type === 'DEBIT' && t.category !== 'INVESTMENT')
      .reduce((a, t) => a + t.amount, 0);
    const pct    = Math.min(100, Math.round((spent / MONTHLY_BUDGET) * 100));
    const isOver = spent > MONTHLY_BUDGET;
    const now2   = new Date();
    const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
    return { spent, pct, isOver, remaining: MONTHLY_BUDGET - spent, label: `${MONTHS[now2.getMonth()]} ${now2.getFullYear()}` };
  }, [transactions]);

  /* ── Handlers ── */
  const handleAddTransaction = async () => {
    if (!newTxAmount || !newTxDesc || !user) return;
    
    const newTx = {
      user_id: user.id,
      timestamp: new Date().toISOString(),
      description: newTxDesc.toUpperCase(),
      amount: Number(newTxAmount),
      source: newTxCategory === 'PAYLATER' ? 'PayLater' : 'Account Master',
      type: newTxType,
      category: newTxType === 'CREDIT' ? 'INCOME' : newTxCategory,
    };
    
    // Insert to DB
    const { data, error } = await supabase.from('transactions').insert([newTx]).select().single();
    if (!error && data) {
      setTransactions([data, ...transactions]);
    }
    
    setNewTxAmount(''); setNewTxDesc(''); setNewTxType('DEBIT');
  };
  
  const saveEditedTransaction = async () => {
    if (!editingTx) return;
    const { error } = await supabase.from('transactions').update({
      description: editingTx.description,
      amount: editingTx.amount,
      source: editingTx.source,
      type: editingTx.type,
      category: editingTx.category
    }).eq('id', editingTx.id);
    
    if (!error) {
      setTransactions(transactions.map(t => t.id === editingTx.id ? editingTx : t));
    }
    setEditingTx(null);
  };
  
  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({
      full_name: tempProfile.fullName,
      nickname: tempProfile.nickname,
      phone: tempProfile.phone,
      address: tempProfile.address
    }).eq('id', user.id);
    
    if (!error) {
      setProfile(tempProfile);
    }
    setIsEditingProfile(false);
  };

  /* ── Chat handler ── */
  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg = { role: 'user' as const, text };
    const nextMsgs = [...chatMsgs, userMsg];
    setChatMsgs(nextMsgs);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({ messages: nextMsgs, language: lang }),
      });
      const data = await res.json();
      setChatMsgs(prev => [...prev, { role: 'assistant', text: data.text || data.error || 'Error' }]);
    } catch {
      setChatMsgs(prev => [...prev, { role: 'assistant', text: t('misc.network_error') }]);
    } finally {
      setChatLoading(false);
    }
  };

  /* ── FAB quick-record handler ── */
  const handleFabRecord = async () => {
    if (!fabAmount || !fabDesc || !user) return;
    const newTx = {
      user_id: user.id,
      timestamp: new Date().toISOString(),
      description: fabDesc.toUpperCase(),
      amount: Number(fabAmount),
      source: fabSource,
      type: fabType,
      category: fabType === 'CREDIT' ? 'INCOME' : fabCategory,
    };
    
    const { data, error } = await supabase.from('transactions').insert([newTx]).select().single();
    if (!error && data) {
      setTransactions(prev => [data, ...prev]);
    }
    
    setFabAmount(''); setFabDesc(''); setFabOpen(false);
  };

  /* Ticker items */
  const tickerItems = [
    ...fin.categoryData.map(c => `${c.name} ${c.percentage}% ${t('ticker.portfolio')}`),
    `${t('ticker.remaining')}  Rp ${fin.monthRemaining.toLocaleString('id-ID')}`,
    `${t('ticker.current')}  Rp ${currentCash.toLocaleString('id-ID')}`,
    `${t('ticker.income')}  +Rp ${fin.totalIncome.toLocaleString('id-ID')}`,
    `${t('ticker.paylater')}  Rp ${fin.paylaterDebt.toLocaleString('id-ID')}`,
    `${t('ticker.budget')}  ${fin.budgetPct}% USED`,
  ];

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className={dmSans.className} style={{ background:'#0a0a0f', color:'#e2e8f0', minHeight:'100vh', display:'flex', flexDirection:'column' }}>

      {/* ── TOP NAVBAR ── */}
      <nav style={{
        height:48, background:'#0c0c14', borderBottom:'1px solid #1e1e2e',
        display:'flex', alignItems:'center', padding:'0 12px',
        position:'sticky', top:0, zIndex:200, flexShrink:0,
        gap:8,
      }}>
        {/* Logo */}
        <span className={spaceMono.className} style={{
          fontSize:11, fontWeight:700, color:'#00d4ff', letterSpacing:'0.08em',
          whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6, flexShrink:0,
        }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'#00d4ff', display:'inline-block', boxShadow:'0 0 7px #00d4ff', flexShrink:0 }} />
          {t('nav.logo')}
        </span>

        <div style={{ flex:1, minWidth:8 }} />

        {/* Nav tabs — scrollable row on mobile */}
        <div style={{ display:'flex', gap:2, flexShrink:1, minWidth:0, overflowX:'auto', overflowY:'hidden', msOverflowStyle:'none', scrollbarWidth:'none', paddingBottom:4, paddingTop:4 }}>
          {NAV_ITEMS.map(item => {
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                fontFamily: spaceMono.style.fontFamily, fontSize:10, letterSpacing:'0.1em',
                textTransform:'uppercase', padding:'5px 12px', whiteSpace:'nowrap',
                background: active ? 'rgba(0,212,255,0.08)' : 'transparent',
                border: active ? '1px solid #00d4ff' : '1px solid transparent',
                color: active ? '#00d4ff' : '#475569',
                cursor:'pointer', transition:'all 0.15s', borderRadius:3, flexShrink:0,
              }}>
                {item.label}
              </button>
            );
          })}
        </div>

        <div style={{ flex:1, minWidth:8 }} />

        {/* Clock — hidden on xs */}
        <div className={spaceMono.className} style={{ fontSize:10, color:'#64748b', letterSpacing:'0.08em', whiteSpace:'nowrap', flexShrink:0 }}>
          {clockStr}
        </div>

        {/* LIVE indicator */}
        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#10b981', flexShrink:0 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', display:'inline-block', boxShadow:'0 0 6px #10b981' }} />
          <span className={spaceMono.className} style={{ letterSpacing:'0.1em' }}>{t('nav.live')}</span>
        </div>

        {/* ── Language Switcher Dropdown ── */}
        <div style={{ position:'relative', flexShrink:0 }} onClick={e => e.stopPropagation()}>
          <button
            id="lang-switcher-btn"
            onClick={() => setLangDropOpen(o => !o)}
            style={{
              display:'flex', alignItems:'center', gap:4,
              padding:'4px 8px', background:'transparent',
              border:'1px solid rgba(0,212,255,0.2)', borderRadius:4,
              color:'#00d4ff', cursor:'pointer', fontSize:10,
              fontFamily: spaceMono.style.fontFamily, letterSpacing:'0.06em',
              transition:'all 0.15s', whiteSpace:'nowrap',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(0,212,255,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='transparent'; }}
            title={t('nav.lang.label')}
          >
            {lang === 'id' ? '🇮🇩' : '🇬🇧'}
            <span style={{ fontSize:8, marginLeft:2, opacity:0.7 }}>▾</span>
          </button>
          {langDropOpen && (
            <div style={{
              position:'absolute', top:'calc(100% + 6px)', right:0,
              background:'#0f0f17', border:'1px solid rgba(0,212,255,0.25)',
              borderRadius:6, overflow:'hidden', minWidth:130,
              boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:999,
            }}>
              {(['id', 'en'] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => { setLang(l); setLangDropOpen(false); }}
                  style={{
                    display:'block', width:'100%', textAlign:'left',
                    padding:'8px 14px', background: lang === l ? 'rgba(0,212,255,0.1)' : 'transparent',
                    border:'none', borderBottom:'1px solid #1e1e2e',
                    color: lang === l ? '#00d4ff' : '#94a3b8',
                    cursor:'pointer', fontSize:11,
                    fontFamily: spaceMono.style.fontFamily, letterSpacing:'0.06em',
                    transition:'background 0.12s',
                  }}
                  onMouseEnter={e => { if (lang !== l) (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (lang !== l) (e.currentTarget as HTMLButtonElement).style.background='transparent'; }}
                >
                  {l === 'id' ? t('settings.lang_id') : t('settings.lang_en')}
                  {lang === l && <span style={{ float:'right', color:'#00d4ff' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User avatar + logout */}
        {user && (
          <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:4, flexShrink:0 }}>
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="avatar"
                style={{ width:24, height:24, borderRadius:'50%', border:'1px solid rgba(0,212,255,0.3)', flexShrink:0 }}
              />
            )}
            <span style={{ fontSize:10, color:'#475569', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user.user_metadata?.full_name || user.email}
            </span>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{
                fontSize:9, padding:'3px 8px',
                background:'transparent', border:'1px solid rgba(239,68,68,0.3)',
                color:'#ef4444', borderRadius:4, cursor:'pointer',
                letterSpacing:'0.08em', transition:'all 0.15s', whiteSpace:'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; }}
            >{t('nav.logout')}</button>
          </div>
        )}
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, padding:'20px 12px 60px 12px', maxWidth:600, margin:'0 auto', width:'100%', boxSizing:'border-box' }}>

        {/* ════════════════ DASHBOARD TAB ════════════════ */}
        {activeTab === 'DASHBOARD' && (
          <div>

            {/* GREETING HEADER */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-6">
              <div style={{ minWidth:0, maxWidth:'100%' }}>
                <p className={spaceMono.className} style={{ fontSize:11, color:'#475569', letterSpacing:'0.12em', marginBottom:5 }}>
                  {t('dashboard.greeting_prefix')} {t(`greeting.${greeting}`)}
                </p>
                <h1 className={spaceMono.className} style={{ fontSize:'clamp(28px,8vw,44px)', fontWeight:700, color:'#00d4ff', lineHeight:1, letterSpacing:'-0.01em', wordBreak:'break-word' }}>
                  {profile.nickname}
                </h1>
              </div>
              <div className={spaceMono.className} style={{ fontSize:11, color:'#475569', border:'1px solid #1e1e2e', padding:'7px 16px', background:'#0f0f17', display:'flex', gap:10, alignItems:'center', flexShrink:0, maxWidth:'100%', overflow:'hidden' }}>
                <span style={{ whiteSpace:'nowrap' }}>{dateStr}</span>
                <span style={{ color:'#2d2d3d' }}>·</span>
                <span style={{ color:'#f8fafc', whiteSpace:'nowrap' }}>{clockStr}</span>
              </div>
            </div>

            {/* ── MONTHLY BUDGET BAR ── */}
            {(() => {
              const { isOver, pct, remaining, spent, label } = currentMonthStats;
              const todayTxs = transactions.filter(t => {
                const d = new Date(t.timestamp);
                const now = new Date();
                return d.toDateString() === now.toDateString() && t.type === 'DEBIT';
              });
              const todaySpentLocal = todayTxs.reduce((a: number, t: any) => a + t.amount, 0);
              const remainingDaysLocal = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth()+1, 0).getDate() - n.getDate() + 1; })();
              const avgDailySpendLocal = transactions.length > 0 ? currentMonthStats.spent / new Date().getDate() : 0;
              const bisaJajanHariLocal = avgDailySpendLocal > 0 ? Math.floor(currentMonthStats.remaining / avgDailySpendLocal) : remainingDaysLocal;

              return (
                <>
                  {/* Monthly Budget Bar */}
                  <div style={{
                    marginBottom: 16,
                    background: isOver ? 'rgba(239,68,68,0.06)' : 'rgba(0,212,255,0.04)',
                    border: `1px solid ${isOver ? '#ef4444' : '#1e1e2e'}`,
                    borderLeft: `4px solid ${isOver ? '#ef4444' : '#00d4ff'}`,
                    borderRadius: 6, padding: '14px 20px',
                    display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
                    boxShadow: isOver ? '0 0 20px rgba(239,68,68,0.15)' : 'none',
                    animation: isOver ? 'budget-pulse 2s ease-in-out infinite' : 'none',
                    transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => { if (!isOver) (e.currentTarget as HTMLDivElement).style.boxShadow='0 0 16px rgba(0,212,255,0.12)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = isOver ? '0 0 20px rgba(239,68,68,0.15)' : 'none'; }}
                  >
                    <div style={{ fontSize: 22, flexShrink: 0 }}>{isOver ? '🚨' : '💰'}</div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 9, color: isOver ? '#ef4444' : '#475569', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
                          {t('budget.monthly')} · {label}
                        </span>
                        <span className={spaceMono.className} style={{ fontSize: 11, color: isOver ? '#ef4444' : '#00d4ff', fontWeight: 700 }}>
                          Rp {spent.toLocaleString('id-ID')} / Rp {MONTHLY_BUDGET.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div style={{ height: 8, background: '#1e1e2e', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: isOver ? 'linear-gradient(90deg,#ef4444,#dc2626)' : pct > 70 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#00d4ff,#10b981)',
                          borderRadius: 4, transition: 'width 0.5s ease',
                          boxShadow: isOver ? '0 0 8px rgba(239,68,68,0.5)' : '0 0 8px rgba(0,212,255,0.4)',
                        }} />
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {isOver ? (
                        <>
                          <div className={spaceMono.className} style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 2 }}>+Rp {Math.abs(remaining).toLocaleString('id-ID')}</div>
                          <div style={{ fontSize: 8, color: '#ef4444', letterSpacing: '0.1em', border: '1px solid #ef4444', padding: '2px 8px', borderRadius: 3, background: 'rgba(239,68,68,0.12)', whiteSpace: 'nowrap' }}>{t('budget.over_label')}</div>
                        </>
                      ) : (
                        <>
                          <div className={spaceMono.className} style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 2 }}>Rp {remaining.toLocaleString('id-ID')}</div>
                          <div style={{ fontSize: 8, color: '#10b981', letterSpacing: '0.1em', border: '1px solid #10b981', padding: '2px 8px', borderRadius: 3, background: 'rgba(16,185,129,0.1)', whiteSpace: 'nowrap' }}>{t('budget.remaining')}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── HERO METRIC: Bisa Jajan Berapa? ── */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(0,100,255,0.04) 100%)',
                    border: '1px solid rgba(0,212,255,0.25)',
                    borderRadius: 12, padding: '28px 24px',
                    marginBottom: 16, textAlign: 'center', position: 'relative', overflow: 'hidden',
                    transition: 'all 0.25s',
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform='translateY(-2px)'; el.style.boxShadow='0 12px 40px rgba(0,212,255,0.1), 0 0 60px rgba(0,212,255,0.04)'; el.style.borderColor='rgba(0,212,255,0.45)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform='translateY(0)'; el.style.boxShadow='none'; el.style.borderColor='rgba(0,212,255,0.25)'; }}
                  >
                    {/* top gradient bar */}
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, #00d4ff, #ffd700, transparent)', opacity:0.7 }} />
                    <p className={spaceMono.className} style={{ fontSize:11, color:'#475569', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:12 }}>{t('dashboard.safe_funds')}</p>
                    <p className={spaceMono.className} style={{ fontSize:'clamp(28px, 6vw, 52px)', fontWeight:700, color:'#ffd700', textShadow:'0 0 32px rgba(255,215,0,0.35)', letterSpacing:'-0.02em', lineHeight:1, marginBottom:14 }}>
                      Rp {Math.max(0, remaining).toLocaleString('id-ID')}
                    </p>
                    <div>
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap:6,
                        padding:'5px 16px', borderRadius:20,
                        fontFamily: spaceMono.style.fontFamily, fontSize:12, fontWeight:700, letterSpacing:'0.04em',
                        ...(isOver
                          ? { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', boxShadow:'0 0 12px rgba(239,68,68,0.2)' }
                          : bisaJajanHariLocal <= 3
                            ? { background:'rgba(255,149,0,0.1)', border:'1px solid rgba(255,149,0,0.3)', color:'#ff9500', boxShadow:'0 0 12px rgba(255,149,0,0.15)' }
                            : { background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.3)', color:'#00ff88', boxShadow:'0 0 12px rgba(0,255,136,0.15)' }),
                      }}>
                        {isOver ? t('dashboard.over_budget') : t('dashboard.safe_days', { n: bisaJajanHariLocal })}
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab('ANALYTICS')}
                      className={spaceMono.className}
                      style={{
                        marginTop:16, padding:'7px 20px', background:'rgba(0,212,255,0.08)',
                        border:'1px solid rgba(0,212,255,0.3)', color:'#00d4ff', borderRadius:6,
                        cursor:'pointer', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase',
                        transition:'all 0.2s',
                      }}
                      onMouseEnter={e => { const el=e.currentTarget as HTMLButtonElement; el.style.background='rgba(0,212,255,0.18)'; el.style.boxShadow='0 0 16px rgba(0,212,255,0.3)'; }}
                      onMouseLeave={e => { const el=e.currentTarget as HTMLButtonElement; el.style.background='rgba(0,212,255,0.08)'; el.style.boxShadow='none'; }}
                    >
                      {t('dashboard.see_analysis')}
                    </button>
                  </div>

                  {/* ── TODAY'S TRANSACTIONS ── */}
                  <div style={{
                    background:'#0f0f17', border:'1px solid #1e1e2e', borderRadius:8, padding:'18px 20px',
                    transition:'all 0.2s',
                  }}
                    onMouseEnter={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#2d2d3d'; el.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)'; }}
                    onMouseLeave={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#1e1e2e'; el.style.boxShadow='none'; }}
                  >
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                      <p style={{ fontSize:9, color:'#475569', letterSpacing:'0.14em', textTransform:'uppercase' }}>{t('dashboard.today_txs')}</p>
                      {todayTxs.length > 0 && (
                        <span className={spaceMono.className} style={{ fontSize:12, fontWeight:700, color:'#ef4444' }}>
                          −Rp {todaySpentLocal.toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>

                    {transactions.length === 0 ? (
                      /* New user empty state */
                      <div style={{ textAlign:'center', padding:'32px 20px' }}>
                        <div style={{ fontSize:48, marginBottom:12, animation:'float-anim 3s ease-in-out infinite' }}>🚀</div>
                        <p className={spaceMono.className} style={{ fontSize:14, fontWeight:700, color:'#f8fafc', marginBottom:10 }}>{t('dashboard.empty_title')}</p>
                        <p style={{ fontSize:12, color:'#475569', lineHeight:1.7, maxWidth:440, margin:'0 auto 20px' }}>
                          {t('dashboard.empty_desc')}{' '}
                          <em style={{ color:'#00d4ff' }}>{t('dashboard.empty_hint')}</em>
                        </p>
                        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                          <button
                            onClick={() => setActiveTab('OPTIONS')}
                            className={spaceMono.className}
                            style={{ padding:'10px 20px', background:'linear-gradient(135deg, #00d4ff, #0055dd)', border:'none', color:'#000', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:700, letterSpacing:'0.08em', boxShadow:'0 0 20px rgba(0,212,255,0.4)', transition:'all 0.2s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow='0 0 32px rgba(0,212,255,0.6)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform='translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow='0 0 20px rgba(0,212,255,0.4)'; }}
                          >
                            {t('dashboard.start_now')}
                          </button>
                        </div>
                      </div>
                    ) : todayTxs.length === 0 ? (
                      /* Has data but no tx today */
                      <div style={{ textAlign:'center', padding:'28px 20px' }}>
                        <div style={{ fontSize:32, marginBottom:10 }}>✨</div>
                        <p style={{ fontSize:12, color:'#475569', marginBottom:8 }}>{t('dashboard.no_today')}</p>
                        <p style={{ fontSize:11, color:'#334155', lineHeight:1.6 }}>
                          {t('dashboard.no_today_hint')}
                        </p>
                      </div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {todayTxs.slice(0, 5).map((trx: any) => {
                          const catColor = CATEGORY_COLORS[trx.category] || '#64748b';
                          return (
                            <div key={trx.id} style={{
                              display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                              background:'rgba(255,255,255,0.02)', border:'1px solid #1e1e2e',
                              borderRadius:8, transition:'all 0.15s',
                            }}
                              onMouseEnter={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#2d2d3d'; el.style.background='rgba(255,255,255,0.04)'; el.style.transform='translateX(3px)'; }}
                              onMouseLeave={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#1e1e2e'; el.style.background='rgba(255,255,255,0.02)'; el.style.transform='translateX(0)'; }}
                            >
                              <span style={{ fontSize:8, padding:'2px 7px', border:`1px solid ${catColor}`, color:catColor, background:`${catColor}18`, letterSpacing:'0.08em', borderRadius:3, flexShrink:0 }}>{trx.category}</span>
                              <span style={{ flex:1, fontSize:12, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{trx.description}</span>
                              <span className={spaceMono.className} style={{ fontSize:12, fontWeight:700, color:'#ef4444', flexShrink:0 }}>−Rp {trx.amount.toLocaleString('id-ID')}</span>
                            </div>
                          );
                        })}
                        {todayTxs.length > 5 && (
                          <button onClick={() => setActiveTab('HISTORY')} className={spaceMono.className} style={{ fontSize:9, color:'#475569', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.1em', textTransform:'uppercase', padding:'4px 0' }}>
                            {t('dashboard.more_txs', { n: todayTxs.length - 5 })}
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => setActiveTab('OPTIONS')}
                      className={spaceMono.className}
                      style={{
                        width:'100%', marginTop:14, padding:'10px', background:'none',
                        border:'1px solid rgba(0,212,255,0.2)', color:'#475569', borderRadius:6,
                        cursor:'pointer', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase',
                        transition:'all 0.2s',
                      }}
                      onMouseEnter={e => { const el=e.currentTarget as HTMLButtonElement; el.style.borderColor='rgba(0,212,255,0.5)'; el.style.color='#00d4ff'; el.style.background='rgba(0,212,255,0.06)'; el.style.boxShadow='0 0 12px rgba(0,212,255,0.15)'; }}
                      onMouseLeave={e => { const el=e.currentTarget as HTMLButtonElement; el.style.borderColor='rgba(0,212,255,0.2)'; el.style.color='#475569'; el.style.background='none'; el.style.boxShadow='none'; }}
                    >
                      {t('dashboard.add_tx')}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ════════════════ HISTORY TAB ════════════════ */}
        {activeTab === 'HISTORY' && (
          <div>
            <h2 className={spaceMono.className} style={{ fontSize:18, fontWeight:700, color:'#f8fafc', marginBottom:6 }}>{t('history.title')}</h2>
            <p style={{ fontSize:11, color:'#475569', marginBottom:16, letterSpacing:'0.06em' }}>
              {t('history.subtitle')} ·{' '}
              {filterMonth === 'all' ? t('history.all_periods').toLowerCase() : (() => {
                const [y, m] = filterMonth.split('-');
                const MN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                return `${MN[parseInt(m)-1]} ${y}`;
              })()}
            </p>

            {/* ── PERIOD FILTER ── */}
            <div style={{ marginBottom:16, background:'#0f0f17', border:'1px solid #1e1e2e', borderRadius:6, padding:'14px 18px' }}>
              <p style={{ fontSize:8, color:'#334155', letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:10 }}>{t('history.filter_label')}</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(['all', ...historyFilters] as string[]).map(opt => {
                  const active = filterMonth === opt;
                  let label = t('history.all_periods');
                  if (opt !== 'all') {
                    const [y, m] = opt.split('-');
                    const MN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                    label = `${MN[parseInt(m)-1]} ${y}`;
                  }
                  return (
                    <button key={opt} onClick={() => setFilterMonth(opt)} style={{
                      padding:'6px 16px', cursor:'pointer',
                      fontFamily: spaceMono.style.fontFamily,
                      fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase',
                      background: active ? 'rgba(0,212,255,0.12)' : '#13131c',
                      border: `1px solid ${active ? '#00d4ff' : '#252530'}`,
                      color: active ? '#00d4ff' : '#475569',
                      borderRadius:4, transition:'all 0.15s',
                      boxShadow: active ? '0 0 8px rgba(0,212,255,0.2)' : 'none',
                    }}>{label}</button>
                  );
                })}
              </div>
            </div>

            {/* ── MONTHLY BUDGET BANNER (shown when a specific month is selected) ── */}
            {filterMonth !== 'all' && (() => {
              const { spent, pct, isOver, remaining } = monthlyBudgetStats;
              const [y, m] = filterMonth.split('-');
              const MN_FULL = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
              const periodLabel = `${MN_FULL[parseInt(m)-1]} ${y}`;
              return (
                <div style={{
                  marginBottom:16,
                  background: isOver ? 'rgba(239,68,68,0.06)' : 'rgba(0,212,255,0.03)',
                  border: `1px solid ${isOver ? '#ef4444' : '#1e1e2e'}`,
                  borderLeft: `4px solid ${isOver ? '#ef4444' : '#00d4ff'}`,
                  borderRadius:6, padding:'12px 18px',
                  display:'flex', alignItems:'center', gap:16,
                  boxShadow: isOver ? '0 0 16px rgba(239,68,68,0.12)' : 'none',
                  animation: isOver ? 'budget-pulse 2s ease-in-out infinite' : 'none',
                }}>
                  <div style={{ fontSize:20 }}>{isOver ? '🚨' : '💰'}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                      <span style={{ fontSize:8, color: isOver ? '#ef4444' : '#475569', letterSpacing:'0.14em', textTransform:'uppercase', fontWeight:700 }}>
                        BUDGET LIMIT · {periodLabel}
                      </span>
                      <span className={spaceMono.className} style={{ fontSize:10, color: isOver ? '#ef4444' : '#00d4ff', fontWeight:700 }}>
                        Rp {spent.toLocaleString('id-ID')} / Rp {MONTHLY_BUDGET.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div style={{ height:4, background:'#1e1e2e', borderRadius:2, overflow:'hidden' }}>
                      <div style={{
                        height:'100%', width:`${pct}%`, borderRadius:2, transition:'width 0.4s ease',
                        background: isOver
                          ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                          : pct > 70
                            ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                            : 'linear-gradient(90deg,#00d4ff,#10b981)',
                      }} />
                    </div>
                  </div>
                  <div style={{ flexShrink:0, textAlign:'right' }}>
                    <div className={spaceMono.className} style={{ fontSize:12, fontWeight:700, color: isOver ? '#ef4444' : '#10b981', marginBottom:3 }}>
                      {isOver ? '+' : ''}Rp {Math.abs(remaining).toLocaleString('id-ID')}
                    </div>
                    <div style={{ fontSize:7, color: isOver ? '#ef4444' : '#10b981', letterSpacing:'0.1em', border: `1px solid ${isOver ? '#ef4444' : '#10b981'}`, padding:'2px 7px', borderRadius:3, background: isOver ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)', whiteSpace:'nowrap' }}>
                      {isOver ? t('history.over_limit') : t('history.remaining')}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* transaction count */}
            <p style={{ fontSize:9, color:'#334155', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12 }}>
              {t('history.tx_found', { n: filteredTransactions.length })}
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {filteredTransactions.map((trx: any) => {
                const txDate = new Date(trx.timestamp);
                const isEditing = editingTx && editingTx.id === trx.id;
                if (isEditing) {
                  return (
                    <div key={trx.id} style={{ background:'#0f0f17', border:'1px solid rgba(0,212,255,0.4)', borderRadius:8, padding:20 }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        {[
                          { label: t('history.desc_label'),   type:'text',   val:editingTx.description, key:'description' },
                          { label: t('history.amount_label'), type:'number', val:editingTx.amount,       key:'amount'      },
                        ].map(f => (
                          <div key={f.key}>
                            <label style={{ display:'block', fontSize:9, color:'#475569', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>{f.label}</label>
                            <input type={f.type} value={f.val}
                              onChange={e => setEditingTx({ ...editingTx, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                              style={{ width:'100%', background:'#1a1a24', border:'1px solid #2d2d3d', borderRadius:6, padding:'9px 12px', color:'#f8fafc', fontSize:12, outline:'none' }} />
                          </div>
                        ))}
                        <div>
                          <label style={{ display:'block', fontSize:9, color:'#475569', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>{t('history.date_label')}</label>
                          <input type="datetime-local" value={editingTx.timestamp.slice(0,16)}
                            onChange={e => setEditingTx({ ...editingTx, timestamp: new Date(e.target.value).toISOString() })}
                            style={{ width:'100%', background:'#1a1a24', border:'1px solid #2d2d3d', borderRadius:6, padding:'9px 12px', color:'#f8fafc', fontSize:12, outline:'none' }} />
                        </div>
                        <div>
                          <label style={{ display:'block', fontSize:9, color:'#475569', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>{t('history.category_label')}</label>
                          <select value={editingTx.category} onChange={e => setEditingTx({ ...editingTx, category: e.target.value })}
                            style={{ width:'100%', background:'#1a1a24', border:'1px solid #2d2d3d', borderRadius:6, padding:'9px 12px', color:'#f8fafc', fontSize:12, outline:'none' }}>
                            {['PAYLATER','EQUIPMENT','FOOD & BEVERAGE','TRANSPORTATION','ENTERTAINMENT','INVESTMENT','INCOME','CASH','OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                        <button onClick={() => setEditingTx(null)} style={{ padding:'8px 16px', background:'none', border:'1px solid #2d2d3d', color:'#64748b', borderRadius:6, cursor:'pointer', fontSize:11 }}>{t('history.cancel')}</button>
                        <button onClick={saveEditedTransaction} style={{ padding:'8px 16px', background:'#00d4ff', color:'#000', border:'none', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:700 }}>{t('history.save')}</button>
                      </div>
                    </div>
                  );
                }
                const catColor = CATEGORY_COLORS[trx.category] || '#64748b';
                return (
                  <div key={trx.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 18px', background:'#0f0f17', border:'1px solid #1e1e2e', borderRadius:8, transition:'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#2d2d3d')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e2e')}>
                    <div style={{ background:'#1a1a24', border:'1px solid #1e1e2e', borderRadius:6, padding:'6px 10px', textAlign:'center', flexShrink:0, minWidth:52 }}>
                      <div style={{ fontSize:8, color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em' }}>{txDate.toLocaleDateString('id-ID',{month:'short'})}</div>
                      <div className={spaceMono.className} style={{ fontSize:20, fontWeight:700, color:'#f8fafc', lineHeight:1.1 }}>{txDate.getDate()}</div>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'#f8fafc', marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{trx.description}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, color:'#475569' }}>{txDate.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</span>
                        <span style={{ fontSize:8, padding:'2px 8px', border:`1px solid ${catColor}`, color:catColor, background:`${catColor}18`, letterSpacing:'0.1em', textTransform:'uppercase', borderRadius:3 }}>{trx.category}</span>
                        <span style={{ fontSize:10, color:'#334155' }}>· {trx.source}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p className={spaceMono.className} style={{ fontSize:14, fontWeight:700, color: trx.type === 'CREDIT' ? '#10b981' : trx.category === 'PAYLATER' ? '#ef4444' : '#f8fafc' }}>
                        {trx.type === 'DEBIT' ? '−' : '+'} Rp {trx.amount.toLocaleString('id-ID')}
                      </p>
                      <p style={{ fontSize:9, color:'#334155', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:3 }}>
                        {trx.category === 'PAYLATER' ? t('misc.utang') : trx.type === 'CREDIT' ? t('misc.pemasukan') : t('misc.pengeluaran')}
                      </p>
                    </div>
                    <button onClick={() => setEditingTx({ ...trx })}
                      style={{ background:'none', border:'1px solid #1e1e2e', color:'#334155', width:32, height:32, borderRadius:6, cursor:'pointer', fontSize:13, flexShrink:0, transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color='#f59e0b'; (e.currentTarget as HTMLButtonElement).style.borderColor='#f59e0b'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color='#334155'; (e.currentTarget as HTMLButtonElement).style.borderColor='#1e1e2e'; }}>✎</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════ ANALYTICS TAB ════════════════ */}
        {activeTab === 'ANALYTICS' && (
          <div>

            {/* ── ADVANCED KPI METRICS ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:16 }}>
              {[
                { label: t('analytics.paylater'),        value:`Rp ${fin.paylaterDebt.toLocaleString('id-ID')}`,       color:'#ef4444', sub: t('analytics.active_debt') },
                { label: t('analytics.current_cash'),    value:`Rp ${currentCash.toLocaleString('id-ID')}`,            color:'#00d4ff', sub: t('analytics.liquid') },
                { label: t('analytics.income_added'),    value:`+ Rp ${fin.totalIncome.toLocaleString('id-ID')}`,      color:'#10b981', sub: t('analytics.dividen') },
                { label: t('analytics.worth_remaining'), value:`Rp ${fin.monthRemaining.toLocaleString('id-ID')}`,     color: fin.monthRemaining < 0 ? '#ef4444' : '#f8fafc', sub: fin.monthRemaining >= 0 ? t('analytics.on_track') : t('analytics.overrun') },
                { label: t('analytics.debt_ratio'),      value: fin.totalAllocation > 0 ? `${((fin.paylaterDebt/fin.totalAllocation)*100).toFixed(1)}%` : '0%', color: fin.paylaterDebt > fin.totalAllocation*0.3 ? '#ef4444' : '#10b981', sub: t('analytics.paylater_vs') },
                { label: t('analytics.invest_growth'),   value:`+Rp ${(fin.totalIncome/1000).toFixed(0)}k`,            color:'#a855f7', sub: t('analytics.est_income') },
              ].map(card => (
                <div key={card.label} style={{
                  background:'#0f0f17', border:'1px solid #1e1e2e', borderTop:`2px solid ${card.color}`,
                  padding:'16px 18px', borderRadius:6, transition:'all 0.2s', cursor:'default',
                }}
                  onMouseEnter={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor=card.color; el.style.transform='translateY(-4px)'; el.style.boxShadow=`0 8px 32px rgba(0,0,0,0.3), 0 0 24px ${card.color}33`; }}
                  onMouseLeave={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#1e1e2e'; el.style.borderTopColor=card.color; el.style.transform='translateY(0)'; el.style.boxShadow='none'; }}
                >
                  <p style={{ fontSize:9, color:'#475569', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:8 }}>{card.label}</p>
                  <p className={spaceMono.className} style={{ fontSize:16, fontWeight:700, color:card.color, lineHeight:1, marginBottom:6 }}>{card.value}</p>
                  <p style={{ fontSize:9, color:'#334155', letterSpacing:'0.08em' }}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* ── ALLOCATION BREAKDOWN DONUT ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div style={{ background:'#0f0f17', border:'1px solid #1e1e2e', borderRadius:8, padding:'18px 20px', transition:'all 0.2s' }}
                onMouseEnter={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#2d2d3d'; el.style.boxShadow='0 8px 28px rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#1e1e2e'; el.style.boxShadow='none'; }}
              >
                <p style={{ fontSize:9, color:'#475569', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:16 }}>{t('analytics.allocation')}</p>
                <div style={{ display:'flex', gap:18, alignItems:'center', marginBottom:16 }}>
                  <div style={{ position:'relative', width:140, height:140, flexShrink:0 }}>
                    <svg width="140" height="140" viewBox="0 0 140 140" style={{ display:'block', transform:'rotate(-90deg)' }}>
                      <circle cx="70" cy="70" r="52" fill="none" stroke="#1e1e2e" strokeWidth="18" />
                      {!loading && (() => {
                        const R = 52; const C = 2 * Math.PI * R; let off = 0;
                        return fin.categoryData.map(cat => {
                          const dash = (cat.percentage / 100) * C;
                          const el = (
                            <circle key={cat.name} cx="70" cy="70" r={R} fill="none"
                              stroke={cat.color} strokeWidth="18"
                              strokeDasharray={`${dash} ${C - dash}`}
                              strokeDashoffset={-off} strokeLinecap="butt"
                              style={{ filter:`drop-shadow(0 0 6px ${cat.color}66)`, transition:'all 0.6s' }}
                            />
                          );
                          off += dash; return el;
                        });
                      })()}
                    </svg>
                    <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
                      <div className={spaceMono.className} style={{ fontSize:11, fontWeight:700, color:'#f8fafc', whiteSpace:'nowrap' }}>
                        Rp {(fin.totalAllocation/1_000_000).toFixed(2)}M
                      </div>
                    </div>
                  </div>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
                    {fin.categoryData.map(cat => (
                      <div key={cat.name}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                          <span style={{ fontSize:9, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em' }}>{cat.name}</span>
                          <span className={spaceMono.className} style={{ fontSize:9, color:cat.color, fontWeight:700 }}>{cat.percentage}%</span>
                        </div>
                        <div style={{ height:3, background:'#1e1e2e', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${cat.percentage}%`, background:cat.color, borderRadius:2, transition:'width 0.5s ease', boxShadow:`0 0 6px ${cat.color}66` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Category pick chips */}
                <div style={{ borderTop:'1px solid #1e1e2e', paddingTop:14 }}>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: expandedCategory ? 10 : 0 }}>
                    {fin.categoryData.map(cat => {
                      const active = expandedCategory === cat.name;
                      return (
                        <button key={cat.name} onClick={() => setExpandedCategory(active ? null : cat.name)} style={{
                          display:'flex', alignItems:'center', gap:5, padding:'4px 10px',
                          background: active ? `${cat.color}18` : '#13131c',
                          border: `1px solid ${active ? cat.color : '#252530'}`,
                          borderRadius:4, cursor:'pointer',
                          boxShadow: active ? `0 0 10px ${cat.color}44` : 'none',
                          transition:'all 0.15s',
                        }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background:cat.color, display:'inline-block', flexShrink:0 }} />
                          <span className={spaceMono.className} style={{ fontSize:8, color: active ? cat.color : '#64748b', textTransform:'uppercase', letterSpacing:'0.08em' }}>{cat.name} {cat.percentage}%</span>
                        </button>
                      );
                    })}
                  </div>
                  {expandedCategory && (
                    <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:4 }}>
                      {expandedCategory === 'CASH' ? (
                        <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:4, border:'1px solid #1e1e2e' }}>
                          <span style={{ fontSize:11, color:'#94a3b8' }}>{t('misc.liquid_cash')}</span>
                          <span className={spaceMono.className} style={{ fontWeight:700, color:CATEGORY_COLORS['CASH'], fontSize:11 }}>Rp {currentCash.toLocaleString('id-ID')}</span>
                        </div>
                      ) : (
                        transactions.filter(t => t.category === expandedCategory && t.type === 'DEBIT').map((t, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:4, border:'1px solid #1e1e2e' }}>
                            <span style={{ fontSize:11, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{t.description}</span>
                            <span className={spaceMono.className} style={{ fontWeight:700, color:CATEGORY_COLORS[expandedCategory], fontSize:11, flexShrink:0 }}>Rp {t.amount.toLocaleString('id-ID')}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── SHORT-ANALYSIS (gated by ≥5 transactions) ── */}
              <div style={{ background:'#0f0f17', border:'1px solid rgba(123,97,255,0.2)', borderRadius:8, padding:'18px 20px', position:'relative', transition:'all 0.2s' }}
                onMouseEnter={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='rgba(123,97,255,0.4)'; el.style.boxShadow='0 0 32px rgba(123,97,255,0.08)'; }}
                onMouseLeave={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='rgba(123,97,255,0.2)'; el.style.boxShadow='none'; }}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <p style={{ fontSize:9, color:'#7b61ff', letterSpacing:'0.14em', textTransform:'uppercase' }}>{t('analytics.ai_short')}</p>
                  <span style={{ fontSize:8, padding:'2px 9px', color:'#a855f7', border:'1px solid #a855f7', background:'rgba(168,85,247,0.1)', letterSpacing:'0.1em', borderRadius:2 }}>{t('analytics.ai_generated')}</span>
                </div>

                {transactions.length < 5 ? (
                  /* Gate: need ≥5 transactions */
                  <div style={{ textAlign:'center', padding:'32px 20px' }}>
                    <div style={{ fontSize:36, marginBottom:10, opacity:0.5 }}>🤖</div>
                    <p className={spaceMono.className} style={{ fontSize:11, color:'#7b61ff', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>{t('analytics.gate_title')}</p>
                    <p style={{ fontSize:12, color:'#475569', lineHeight:1.65, maxWidth:300, margin:'0 auto 16px' }}>
                      {t('analytics.gate_desc1')} <strong style={{color:'#00d4ff'}}>5 {t('analytics.gate_progress')}</strong>.<br/>
                      {t('analytics.gate_desc2')} <span style={{color:'#00d4ff'}}>{transactions.length}</span>.
                    </p>
                    <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.05)', maxWidth:200, margin:'0 auto', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(100,(transactions.length/5)*100)}%`, background:'linear-gradient(90deg,#7b61ff,#00d4ff)', borderRadius:2, transition:'width 0.6s', boxShadow:'0 0 6px rgba(0,212,255,0.4)' }} />
                    </div>
                    <p className={spaceMono.className} style={{ fontSize:10, color:'#334155', marginTop:8 }}>{transactions.length}/5 {t('analytics.gate_progress')}</p>
                  </div>
                ) : (
                  /* Unlocked analysis */
                  <>
                    <p style={{ fontSize:11, color:'#94a3b8', lineHeight:1.8, flex:1, marginBottom:16 }}>
                      Injeksi dividen (<span style={{ color:'#00d4ff', fontWeight:700 }}>Rp {fin.totalIncome.toLocaleString('id-ID')}</span>) dan struktur portofolio fundamental menunjukkan pertumbuhan positif. Namun, likuiditas kamu terjebak dalam{' '}
                      <em style={{ color:'#f59e0b' }}>disonansi kognitif</em>: memegang kas besar (<span style={{ color:'#00d4ff', fontWeight:700 }}>Rp {currentCash.toLocaleString('id-ID')}</span>) namun mengakumulasi{' '}
                      <em>Accounts Payable</em> / PayLater berbunga tinggi (<span style={{ color:'#ef4444', fontWeight:700 }}>Rp {fin.paylaterDebt.toLocaleString('id-ID')}</span>) untuk pengeluaran non-produktif. Segera rekapitalisasi utang tersebut.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div style={{ background:'#13131c', border:'1px solid #1e1e2e', padding:'12px 14px', borderRadius:4, transition:'all 0.2s' }}
                        onMouseEnter={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#ef4444'; el.style.boxShadow='0 0 16px rgba(239,68,68,0.2)'; }}
                        onMouseLeave={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#1e1e2e'; el.style.boxShadow='none'; }}
                      >
                        <div style={{ fontSize:18, marginBottom:4 }}>⚡</div>
                        <p style={{ fontSize:9, color:'#475569', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>DEBT RATIO</p>
                        <p className={spaceMono.className} style={{ fontSize:18, fontWeight:700, color:'#ef4444' }}>
                          {fin.totalAllocation > 0 ? ((fin.paylaterDebt / fin.totalAllocation) * 100).toFixed(1) : '0.0'}%
                        </p>
                      </div>
                      <div style={{ background:'#13131c', border:'1px solid #1e1e2e', padding:'12px 14px', borderRadius:4, transition:'all 0.2s' }}
                        onMouseEnter={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#10b981'; el.style.boxShadow='0 0 16px rgba(16,185,129,0.2)'; }}
                        onMouseLeave={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#1e1e2e'; el.style.boxShadow='none'; }}
                      >
                        <div style={{ fontSize:18, marginBottom:4 }}>📈</div>
                        <p style={{ fontSize:9, color:'#475569', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>INVEST GROWTH</p>
                        <p className={spaceMono.className} style={{ fontSize:18, fontWeight:700, color:'#10b981' }}>+Rp {(fin.totalIncome / 1000).toFixed(0)}k</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Chat button always visible */}
                <button
                  onClick={() => setChatOpen(o => !o)}
                  className={spaceMono.className}
                  style={{
                    width:'100%', padding:'9px', marginTop:8,
                    background: chatOpen ? '#00d4ff' : 'rgba(0,212,255,0.08)',
                    border:`1px solid ${chatOpen ? '#00d4ff' : 'rgba(0,212,255,0.3)'}`,
                    color: chatOpen ? '#000' : '#00d4ff', borderRadius:6,
                    cursor:'pointer', fontSize:10, fontWeight:700, letterSpacing:'0.08em',
                    transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  }}
                  onMouseEnter={e => { if (!chatOpen) { const el=e.currentTarget as HTMLButtonElement; el.style.background='rgba(0,212,255,0.18)'; el.style.boxShadow='0 0 16px rgba(0,212,255,0.3)'; } }}
                  onMouseLeave={e => { if (!chatOpen) { const el=e.currentTarget as HTMLButtonElement; el.style.background='rgba(0,212,255,0.08)'; el.style.boxShadow='none'; } }}
                >
                  {t('analytics.chat_btn')}
                </button>

                {/* Chat panel overlay */}
                {chatOpen && (
                  <div style={{
                    position:'absolute', top:0, left:0, right:0, bottom:0,
                    background:'#0c0c14', borderRadius:8, border:'1px solid rgba(0,212,255,0.3)',
                    display:'flex', flexDirection:'column', zIndex:50, overflow:'hidden',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #1e1e2e', background:'#0f0f17', flexShrink:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:'#00d4ff', display:'inline-block', boxShadow:'0 0 6px #00d4ff' }} />
                        <span className={spaceMono.className} style={{ fontSize:10, color:'#00d4ff', letterSpacing:'0.1em' }}>{t('analytics.chat_header')}</span>
                      </div>
                      <button onClick={() => setChatOpen(false)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:16, lineHeight:1 }}>x</button>
                    </div>
                    <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                      {chatMsgs.length === 0 && (
                        <div style={{ textAlign:'center', padding:'20px 10px' }}>
                          <div style={{ fontSize:24, marginBottom:8 }}>🤖</div>
                          <p style={{ fontSize:10, color:'#475569', lineHeight:1.6 }}>{t('analytics.chat_welcome').split('\n').map((line, i) => <span key={i}>{i > 0 && <br/>}{line}</span>)}</p>
                          {[t('analytics.chat_q1'), t('analytics.chat_q2'), t('analytics.chat_q3')].map(q => (
                            <button key={q} onClick={() => { setChatInput(q); }} style={{ display:'block', width:'100%', margin:'4px 0', padding:'6px 10px', background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.2)', color:'#64748b', borderRadius:4, cursor:'pointer', fontSize:9, textAlign:'left', letterSpacing:'0.04em' }}>{q}</button>
                          ))}
                        </div>
                      )}
                      {chatMsgs.map((m, i) => (
                        <div key={i} style={{ alignSelf: m.role==='user'?'flex-end':'flex-start', maxWidth:'85%', background: m.role==='user'?'rgba(0,212,255,0.12)':'#13131c', border:`1px solid ${m.role==='user'?'rgba(0,212,255,0.3)':'#1e1e2e'}`, borderRadius: m.role==='user'?'12px 12px 0 12px':'12px 12px 12px 0', padding:'8px 12px' }}>
                          <p style={{ fontSize:11, color:'#e2e8f0', lineHeight:1.6, whiteSpace:'pre-wrap', margin:0 }}>{m.text}</p>
                        </div>
                      ))}
                      {chatLoading && (
                        <div style={{ alignSelf:'flex-start', padding:'8px 12px', background:'#13131c', border:'1px solid #1e1e2e', borderRadius:'12px 12px 12px 0' }}>
                          <span style={{ fontSize:18 }}>⋯</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:6, padding:'10px 14px', borderTop:'1px solid #1e1e2e', flexShrink:0 }}>
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&!e.shiftKey&&sendChat()} placeholder={t('analytics.chat_placeholder')} style={{ flex:1, background:'#1a1a24', border:'1px solid #2d2d3d', borderRadius:6, padding:'8px 12px', color:'#f8fafc', fontSize:11, outline:'none' }} />
                      <button onClick={sendChat} disabled={chatLoading} style={{ padding:'8px 14px', background: chatLoading?'#1e1e2e':'#00d4ff', border:'none', borderRadius:6, color:'#000', fontWeight:700, fontSize:11, cursor: chatLoading?'not-allowed':'pointer' }}>↑</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── QUANTITATIVE AI ANALYST (strategic recommendations) ── */}
            <div style={{ background:'#0f0f17', border:'1px solid #1e1e2e', borderTop:'2px solid #7b61ff', borderRadius:8, padding:28, marginBottom:16, display:'flex', gap:20 }}>
              <div style={{ width:56, height:56, background:'rgba(123,97,255,0.12)', border:'1px solid rgba(123,97,255,0.4)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>👔</div>
              <div style={{ flex: 1 }}>
                <h2 className={spaceMono.className} style={{ fontSize:16, fontWeight:700, color:'#f8fafc', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>{t('analytics.quant_title')}</h2>
                <p style={{ fontSize:11, color:'#475569', letterSpacing:'0.06em', marginBottom:12 }}>{t('analytics.quant_sub')}</p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:9, padding:'3px 10px', border:'1px solid rgba(123,97,255,0.5)', color:'#7b61ff', background:'rgba(123,97,255,0.1)', letterSpacing:'0.12em', textTransform:'uppercase', borderRadius:3 }}>{t('analytics.quant_badge')}</span>
                  {!aiAssessment && !loadingAssessment && (
                    <button onClick={fetchAssessment} style={{ background:'transparent', border:'1px solid #1e1e2e', color:'#94a3b8', fontSize:10, padding:'4px 10px', borderRadius:4, cursor:'pointer' }}>{t('analytics.generate_btn')}</button>
                  )}
                  {aiAssessment && (
                    <button onClick={fetchAssessment} style={{ background:'transparent', border:'1px solid #1e1e2e', color:'#94a3b8', fontSize:10, padding:'4px 10px', borderRadius:4, cursor:'pointer' }}>{t('analytics.refresh_btn')}</button>
                  )}
                </div>
              </div>
            </div>

            {loadingAssessment ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ width:40, height:40, border:'3px solid rgba(123,97,255,0.2)', borderTopColor:'#7b61ff', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
                <p className={spaceMono.className} style={{ color:'#7b61ff', fontSize:12, letterSpacing:'0.1em' }}>{t('analytics.loading')}</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : aiAssessment ? (
              <>
                {aiAssessment.diagnostics?.map((section: any) => (
                  <div key={section.title} style={{ background:'#0f0f17', border:'1px solid #1e1e2e', borderRadius:8, padding:'20px 24px', marginBottom:12 }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor='#2d2d3d')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor='#1e1e2e')}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, paddingBottom:12, borderBottom:'1px solid #1e1e2e' }}>
                      <span style={{ fontSize:18 }}>{section.icon}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:'#f8fafc', letterSpacing:'0.02em', textTransform:'uppercase' }}>{section.title}</span>
                    </div>
                    <div style={{ fontSize:12, lineHeight:1.85, color:'#94a3b8' }} dangerouslySetInnerHTML={{ __html: section.content }}></div>
                  </div>
                ))}
                
                <div style={{ background:'#0f0f17', border:'1px solid #1e1e2e', borderRadius:8, padding:'20px 24px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:12, borderBottom:'1px solid #1e1e2e' }}>
                    <span style={{ fontSize:18 }}>🎯</span>
                    <span style={{ fontSize:14, fontWeight:700, color:'#f8fafc', textTransform:'uppercase', letterSpacing:'0.02em' }}>{t('analytics.strategic_rec')}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                    {aiAssessment.recommendations?.map((step: any) => (
                      <div key={step.n} style={{ display:'flex', gap:14 }}>
                        <span className={spaceMono.className} style={{ fontSize:12, fontWeight:700, color:'#00d4ff', flexShrink:0, paddingTop:1 }}>{step.n}</span>
                        <div>
                          <p style={{ fontSize:13, fontWeight:700, color:'#f8fafc', marginBottom:4 }}>{step.title}</p>
                          <p style={{ fontSize:11, color:'#64748b', lineHeight:1.7 }}>{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {aiAssessment.quote && (
                    <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid #1e1e2e', borderLeft:'3px solid #7b61ff', paddingLeft:16 }}>
                      <p style={{ fontSize:11, fontStyle:'italic', color:'#64748b', lineHeight:1.8 }}>&ldquo;{aiAssessment.quote}&rdquo;</p>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ════════════════ SETTINGS TAB ════════════════ */}
        {activeTab === 'OPTIONS' && (
          <div>
            <h2 className={spaceMono.className} style={{ fontSize:18, fontWeight:700, color:'#f8fafc', marginBottom:6 }}>{t('settings.title')}</h2>
            <p style={{ fontSize:11, color:'#475569', marginBottom:28, letterSpacing:'0.06em' }}>{t('settings.subtitle')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
              {/* Profile */}
              <div style={{ background:'#0f0f17', border:'1px solid #1e1e2e', borderTop:'2px solid #7b61ff', borderRadius:8, padding:22 }}>
                <p style={{ fontSize:9, color:'#475569', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:16, paddingBottom:12, borderBottom:'1px solid #1e1e2e' }}>{t('settings.profile')}</p>
                {isEditingProfile ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[
                      {label: t('settings.full_name'), key:'fullName', val:tempProfile.fullName},
                      {label: t('settings.nickname'),  key:'nickname', val:tempProfile.nickname},
                      {label: t('settings.phone'),     key:'phone',    val:tempProfile.phone},
                      {label: t('settings.email'),     key:'email',    val:tempProfile.email},
                      {label: t('settings.address'),   key:'address',  val:tempProfile.address},
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display:'block', fontSize:9, color:'#475569', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>{f.label}</label>
                        <input value={f.val} onChange={e => setTempProfile({...tempProfile,[f.key]:e.target.value})}
                          style={{ width:'100%', background:'#1a1a24', border:'1px solid #2d2d3d', borderRadius:6, padding:'8px 12px', color:'#f8fafc', fontSize:12, outline:'none' }} />
                      </div>
                    ))}
                    <div style={{ display:'flex', gap:8, marginTop:4 }}>
                      <button onClick={saveProfile} style={{ flex:1, padding:'9px', background:'#10b981', border:'none', color:'#000', fontWeight:700, fontSize:11, borderRadius:6, cursor:'pointer' }}>{t('settings.save')}</button>
                      <button onClick={() => setIsEditingProfile(false)} style={{ flex:1, padding:'9px', background:'none', border:'1px solid #2d2d3d', color:'#64748b', fontSize:11, borderRadius:6, cursor:'pointer' }}>{t('settings.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display:'flex', gap:14, marginBottom:18, alignItems:'center' }}>
                      {/* Avatar */}
                      <label htmlFor="avatar-upload" style={{ cursor:'pointer', flexShrink:0, position:'relative' }}>
                        <div style={{ width:56, height:56, background:'rgba(123,97,255,0.12)', border:'2px solid rgba(123,97,255,0.4)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, overflow:'hidden', transition:'border-color 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(0,212,255,0.7)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(123,97,255,0.4)')}
                        >
                          {avatarUrl
                            ? <img src={avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : '👤'
                          }
                        </div>
                        <div style={{ position:'absolute', bottom:-4, right:-4, width:18, height:18, background:'#00d4ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#000', fontWeight:700 }}>✎</div>
                        <input id="avatar-upload" type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleAvatarUpload} style={{ display:'none' }} />
                      </label>
                      <div>
                        <p style={{ fontWeight:700, color:'#f8fafc', fontSize:14, marginBottom:2 }}>{profile.fullName}</p>
                        <p style={{ color:'#00d4ff', fontSize:12 }}>&quot;{profile.nickname}&quot;</p>
                        <p style={{ color:'#334155', fontSize:9, marginTop:4, letterSpacing:'0.08em' }}>{t('settings.avatar_hint')}</p>
                      </div>
                    </div>
                    {[{label:t('settings.phone'),val:profile.phone},{label:t('settings.email'),val:profile.email},{label:t('settings.address'),val:profile.address}].map(row => (
                      <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #1e1e2e', gap:12 }}>
                        <span style={{ fontSize:9, color:'#475569', letterSpacing:'0.12em', textTransform:'uppercase', flexShrink:0 }}>{row.label}</span>
                        <span style={{ fontSize:11, color:'#94a3b8', textAlign:'right', wordBreak:'break-all' }}>{row.val}</span>
                      </div>
                    ))}
                    <button onClick={() => { setTempProfile(profile); setIsEditingProfile(true); }}
                      style={{ width:'100%', marginTop:16, padding:'9px', background:'none', border:'1px solid rgba(0,212,255,0.3)', color:'#00d4ff', borderRadius:6, cursor:'pointer', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase' }}>
                      {t('settings.edit_profile')}
                    </button>
                  </>
                )}
              </div>
              {/* Security */}
              <div style={{ background:'#0f0f17', border:'1px solid #1e1e2e', borderTop:'2px solid #00d4ff', borderRadius:8, padding:22, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' }}>
                <p style={{ fontSize:9, color:'#475569', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:16, paddingBottom:12, borderBottom:'1px solid #1e1e2e', width:'100%', textAlign:'left' }}>{t('settings.security')}</p>
                <div style={{ fontSize:36, marginBottom:8 }}>🛡️</div>
                <p className={spaceMono.className} style={{ fontSize:36, fontWeight:700, color:'#00d4ff', marginBottom:4, lineHeight:1 }}>100%</p>
                <p style={{ fontSize:11, color:'#64748b', marginBottom:16 }}>{t('settings.security_ok')}</p>
                <div style={{ height:4, width:'100%', background:'#1e1e2e', borderRadius:2, marginBottom:20, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:'100%', background:'linear-gradient(90deg,#00d4ff,#10b981)', borderRadius:2 }} />
                </div>
                {['PIN & Biometric','Device Verified','Fraud Monitor'].map(item => (
                  <div key={item} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'9px 12px', background:'#1a1a24', borderRadius:6, marginBottom:6 }}>
                    <span style={{ fontSize:10, color:'#64748b' }}>{item}</span>
                    <span style={{ fontSize:8, padding:'2px 7px', border:'1px solid rgba(0,212,255,0.4)', color:'#00d4ff', background:'rgba(0,212,255,0.08)', letterSpacing:'0.1em' }}>Active</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Language Preference Section */}
            <div style={{ background:'#0f0f17', border:'1px solid #1e1e2e', borderTop:'2px solid #00d4ff', borderRadius:8, padding:22, marginBottom:16 }}>
              <p style={{ fontSize:9, color:'#475569', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:16, paddingBottom:12, borderBottom:'1px solid #1e1e2e' }}>{t('settings.language_section')}</p>
              <div style={{ display:'flex', gap:10 }}>
                {(['id', 'en'] as Lang[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    style={{
                      flex:1, padding:'10px 16px',
                      background: lang === l ? 'rgba(0,212,255,0.1)' : 'transparent',
                      border: `1px solid ${lang === l ? '#00d4ff' : '#2d2d3d'}`,
                      color: lang === l ? '#00d4ff' : '#475569',
                      borderRadius:6, cursor:'pointer', fontSize:12,
                      fontFamily: spaceMono.style.fontFamily, letterSpacing:'0.04em',
                      transition:'all 0.15s',
                      boxShadow: lang === l ? '0 0 10px rgba(0,212,255,0.2)' : 'none',
                    }}
                  >
                    {l === 'id' ? t('settings.lang_id') : t('settings.lang_en')}
                    {lang === l && <span style={{ marginLeft:6, color:'#00d4ff' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Form */}
            <div style={{ background:'#0f0f17', border:'1px solid #1e1e2e', borderTop:'2px solid #f59e0b', borderRadius:8, padding:28 }}>
              <p style={{ fontSize:9, color:'#475569', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:20, paddingBottom:12, borderBottom:'1px solid #1e1e2e' }}>{t('settings.tx_form_title')}</p>
              <div style={{ display:'flex', background:'#1a1a24', border:'1px solid #1e1e2e', borderRadius:6, padding:4, marginBottom:22, gap:4 }}>
                {[{val:'DEBIT',label:t('settings.debit_label'),col:'#f59e0b'},{val:'CREDIT',label:t('settings.credit_label'),col:'#10b981'}].map(btn => (
                  <button key={btn.val} onClick={() => setNewTxType(btn.val)}
                    style={{ flex:1, padding:'9px', background:newTxType===btn.val?`${btn.col}15`:'transparent', border:`1px solid ${newTxType===btn.val?btn.col:'transparent'}`, color:newTxType===btn.val?btn.col:'#475569', borderRadius:4, cursor:'pointer', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600, transition:'all 0.15s' }}>
                    {btn.label}
                  </button>
                ))}
              </div>
              <div style={{ background:'#1a1a24', border:'1px solid #1e1e2e', borderRadius:8, padding:'16px 20px', marginBottom:20, textAlign:'center' }}>
                <p style={{ fontSize:9, color:'#475569', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:8 }}>{t('settings.amount_label')}</p>
                <input type="number" placeholder="0" value={newTxAmount} onChange={e => setNewTxAmount(e.target.value)}
                  style={{ width:'100%', fontSize:36, fontWeight:700, background:'transparent', border:'none', outline:'none', textAlign:'center', color:newTxType==='DEBIT'?'#f59e0b':'#10b981', fontFamily:'inherit' }} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                  <label style={{ display:'block', fontSize:9, color:'#475569', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:7 }}>{t('settings.desc_label')}</label>
                  <input type="text" placeholder={t('settings.desc_placeholder')} value={newTxDesc} onChange={e => setNewTxDesc(e.target.value)}
                    style={{ width:'100%', background:'#1a1a24', border:'1px solid #2d2d3d', borderRadius:6, padding:'11px 14px', color:'#f8fafc', fontSize:12, outline:'none' }} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:9, color:'#475569', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:7 }}>{t('settings.category_label')}</label>
                  <select value={newTxCategory} onChange={e => setNewTxCategory(e.target.value)}
                    style={{ width:'100%', background:'#1a1a24', border:'1px solid #2d2d3d', borderRadius:6, padding:'11px 14px', color:'#f8fafc', fontSize:12, outline:'none', cursor:'pointer' }}>
                    {newTxType==='DEBIT'
                      ? ['PAYLATER','EQUIPMENT','FOOD & BEVERAGE','TRANSPORTATION','ENTERTAINMENT','INVESTMENT','OTHER'].map(c => <option key={c} value={c}>{c}</option>)
                      : <option value="INCOME">INCOME (Pendapatan Umum/Dividen)</option>}
                  </select>
                </div>
              </div>
              <button onClick={handleAddTransaction}
                style={{ width:'100%', padding:'14px', background:'#f59e0b', color:'#000', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:'0.08em', textTransform:'uppercase', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>↵</span> {t('settings.save_enter')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── FLOATING QUICK-RECORD FAB ── */}
      <div style={{ position:'fixed', bottom:42, right:24, zIndex:300 }}>
        {/* Expanded panel */}
        {fabOpen && (
          <div style={{
            position:'absolute', bottom:54, right:0,
            width:300, background:'#0f0f17',
            border:'1px solid rgba(0,212,255,0.4)', borderRadius:10,
            padding:16, boxShadow:'0 0 30px rgba(0,212,255,0.15)',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span className={spaceMono.className} style={{ fontSize:10, color:'#00d4ff', letterSpacing:'0.1em' }}>{t('fab.quick_record')}</span>
              <span style={{ fontSize:8, color:'#334155', letterSpacing:'0.1em' }}>{t('fab.ewallet')}</span>
            </div>
            {/* DEBIT / CREDIT toggle */}
            <div style={{ display:'flex', background:'#1a1a24', borderRadius:6, padding:3, gap:3, marginBottom:12 }}>
              {(['DEBIT','CREDIT'] as const).map(txType => (
                <button key={txType} onClick={() => setFabType(txType)} style={{
                  flex:1, padding:'6px 0', border:`1px solid ${fabType===txType?(txType==='DEBIT'?'#f59e0b':'#10b981'):'transparent'}`,
                  background: fabType===txType ? (txType==='DEBIT'?'rgba(245,158,11,0.15)':'rgba(16,185,129,0.15)') : 'transparent',
                  color: fabType===txType ? (txType==='DEBIT'?'#f59e0b':'#10b981') : '#475569',
                  borderRadius:4, cursor:'pointer', fontSize:10, letterSpacing:'0.08em',
                  fontFamily: spaceMono.style.fontFamily, fontWeight:700,
                }}>{txType==='DEBIT' ? t('fab.debit') : t('fab.credit')}</button>
              ))}
            </div>
            {/* Amount */}
            <input
              type="number" placeholder={t('fab.amount')}
              value={fabAmount} onChange={e => setFabAmount(e.target.value)}
              style={{ width:'100%', marginBottom:8, background:'#1a1a24', border:'1px solid #2d2d3d', borderRadius:6, padding:'9px 12px', color: fabType==='DEBIT'?'#f59e0b':'#10b981', fontSize:16, fontWeight:700, outline:'none', textAlign:'center', boxSizing:'border-box' }}
            />
            {/* Description */}
            <input
              type="text" placeholder={t('fab.desc')}
              value={fabDesc} onChange={e => setFabDesc(e.target.value)}
              onKeyDown={e => e.key==='Enter' && handleFabRecord()}
              style={{ width:'100%', marginBottom:8, background:'#1a1a24', border:'1px solid #2d2d3d', borderRadius:6, padding:'8px 12px', color:'#f8fafc', fontSize:11, outline:'none', boxSizing:'border-box' }}
            />
            {/* E-wallet source */}
            <select value={fabSource} onChange={e => setFabSource(e.target.value)}
              style={{ width:'100%', marginBottom:8, background:'#1a1a24', border:'1px solid #2d2d3d', borderRadius:6, padding:'8px 12px', color:'#94a3b8', fontSize:11, outline:'none', cursor:'pointer', boxSizing:'border-box' }}>
              {['ShopeePay','GoPay','OVO','DANA','LinkAja','BCA Mobile','Mandiri Livin','Cash','PayLater'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Category (DEBIT only) */}
            {fabType === 'DEBIT' && (
              <select value={fabCategory} onChange={e => setFabCategory(e.target.value)}
                style={{ width:'100%', marginBottom:12, background:'#1a1a24', border:'1px solid #2d2d3d', borderRadius:6, padding:'8px 12px', color:'#94a3b8', fontSize:11, outline:'none', cursor:'pointer', boxSizing:'border-box' }}>
                {['FOOD & BEVERAGE','TRANSPORTATION','ENTERTAINMENT','EQUIPMENT','INVESTMENT','PAYLATER','OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button onClick={handleFabRecord} style={{
              width:'100%', padding:'10px', borderRadius:6, border:'none',
              background: fabType==='DEBIT'?'#f59e0b':'#10b981',
              color:'#000', fontWeight:700, fontSize:12, cursor:'pointer',
              letterSpacing:'0.08em', fontFamily: spaceMono.style.fontFamily,
            }}>{t('fab.save')}</button>
          </div>
        )}
        {/* FAB button */}
        <button
          onClick={() => setFabOpen(o => !o)}
          style={{
            width:48, height:48, borderRadius:'50%',
            background: fabOpen ? '#1e1e2e' : 'linear-gradient(135deg,#00d4ff,#a855f7)',
            border: `2px solid ${fabOpen?'#334155':'#00d4ff'}`,
            color:'#fff', fontSize:22, cursor:'pointer',
            boxShadow: fabOpen ? 'none' : '0 0 20px rgba(0,212,255,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 0.2s',
          }}
          title="Quick Record Transaction"
        >{fabOpen ? '×' : '+'}</button>
      </div>

      {/* ── BOTTOM TICKER ── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:30, background:'#0c0c14', borderTop:'1px solid #1e1e2e', overflow:'hidden', display:'flex', alignItems:'center', zIndex:200 }}>
        <div style={{ flexShrink:0, height:'100%', display:'flex', alignItems:'center', padding:'0 12px', fontSize:8, letterSpacing:'0.14em', color:'#00d4ff', textTransform:'uppercase', background:'rgba(0,212,255,0.08)', borderRight:'1px solid rgba(0,212,255,0.3)' }}>
          ⬡ LIVE
        </div>
        <div style={{ flex:1, overflow:'hidden', height:'100%', display:'flex', alignItems:'center' }}>
          <div style={{ display:'flex', whiteSpace:'nowrap', animation:'ticker-scroll 30s linear infinite' }}>
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} className={spaceMono.className} style={{ fontSize:9, color:'#475569', padding:'0 24px', borderRight:'1px solid #1e1e2e', letterSpacing:'0.08em' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes ticker-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes budget-pulse {
            0%, 100% { box-shadow: 0 0 10px rgba(239,68,68,0.15); }
            50%       { box-shadow: 0 0 28px rgba(239,68,68,0.40); }
          }
          @keyframes chat-dots {
            0%, 100% { opacity:0.2; } 50% { opacity:1; }
          }
        `}</style>
      </div>
    </div>
  );
}
