'use client';

import { useState } from 'react';
import { DM_Sans, Space_Mono } from 'next/font/google';
import { supabase } from '../lib/supabase';

const dmSans    = DM_Sans({ subsets: ['latin'] });
const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'] });

const FEATURES = [
  { icon: '📊', title: 'Real-Time Dashboard',   desc: 'Track every rupiah across all your wallets — ShopeePay, GoPay, BCA, and more — in one live command center.' },
  { icon: '🤖', title: 'HAEGUSA-AI Assistant',  desc: 'Ask anything about your finances in Bahasa. Powered by Gemini Flash with 8-key rotation for zero downtime.' },
  { icon: '📈', title: 'Smart Analytics',        desc: 'Weekly spend trends, category breakdowns, and PayLater debt tracking so you never get blindsided.' },
  { icon: '⚡', title: 'Instant Record',         desc: 'Log a transaction in 2 taps with the floating quick-record button. No friction, no excuses.' },
  { icon: '🔔', title: 'Budget Alerts',          desc: 'Glowing red warnings when your monthly budget is breached. Know before it\'s too late.' },
  { icon: '🔐', title: 'Secure & Private',       desc: 'Your data lives in Supabase with row-level security. Sign in with Google — zero passwords needed.' },
];

const STATS = [
  { value: 'Rp 0',  label: 'Hidden Fees'    },
  { value: '8x',    label: 'AI Key Rotation' },
  { value: '100%',  label: 'Private & Secure'},
  { value: '∞',     label: 'Transactions'    },
];

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo },
    });
    if (err) { setError(err.message); setLoading(false); }
    // on success, browser redirects → no need to setLoading(false)
  };

  return (
    <div className={dmSans.className} style={{
      background: '#070710', color: '#e2e8f0', minHeight: '100vh',
      overflowX: 'hidden', position: 'relative',
    }}>

      {/* ── Ambient glow blobs ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%',  width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(16,185,129,0.03) 0%, transparent 70%)' }} />
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 60,
        background: 'rgba(7,7,16,0.8)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,212,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #00d4ff, #0066ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0,212,255,0.5)',
          }}>
            <span className={spaceMono.className} style={{ fontSize: 14, fontWeight: 700, color: '#070710' }}>B</span>
          </div>
          <span className={spaceMono.className} style={{ fontSize: 15, fontWeight: 700, color: '#00d4ff', letterSpacing: '0.05em', textShadow: '0 0 20px rgba(0,212,255,0.4)' }}>
            BudgetOS
          </span>
          <span style={{ fontSize: 10, color: '#334155', letterSpacing: '0.15em', textTransform: 'uppercase', marginLeft: 4 }}>
            by AI-Kelompok1
          </span>
        </div>

        <button
          id="nav-signin-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 20px', borderRadius: 8,
            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)',
            color: '#00d4ff', cursor: loading ? 'wait' : 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.16)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.08)'; }}
        >
          {loading ? '⏳' : '→'} Sign In
        </button>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 40px 80px', textAlign: 'center', maxWidth: 820, margin: '0 auto' }}>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
          <span className={spaceMono.className} style={{ fontSize: 11, color: '#10b981', letterSpacing: '0.1em' }}>LIVE · BINUS JAKARTA · AI-KELOMPOK1</span>
        </div>

        <h1 className={spaceMono.className} style={{
          fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.08,
          background: 'linear-gradient(135deg, #f8fafc 0%, #00d4ff 50%, #a855f7 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 24, letterSpacing: '-0.02em',
        }}>
          Your Financial<br />Command Center
        </h1>

        <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7, marginBottom: 48, maxWidth: 580, margin: '0 auto 48px' }}>
          Stop guessing where your money goes. BudgetOS gives Binusian students a real-time,
          AI-powered financial dashboard — built for the Jakarta student life.
        </p>

        {/* CTA Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <button
            id="hero-google-signin-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
              padding: '16px 40px', borderRadius: 12,
              background: loading ? 'rgba(255,255,255,0.05)' : '#fff',
              border: 'none', cursor: loading ? 'wait' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 40px rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.4)',
              transition: 'all 0.25s',
              fontSize: 16, fontWeight: 700, color: '#111',
              minWidth: 280,
            }}
            onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(255,255,255,0.2), 0 16px 48px rgba(0,0,0,0.5)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.4)'; }}
          >
            {loading ? (
              <>
                <span style={{ fontSize: 22 }}>⏳</span>
                Redirecting to Google…
              </>
            ) : (
              <>
                {/* Google Logo SVG */}
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {error && (
            <div style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}

          <p style={{ fontSize: 12, color: '#334155', letterSpacing: '0.04em' }}>
            Free · No credit card · Secured by Supabase
          </p>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(0,212,255,0.08)', borderBottom: '1px solid rgba(0,212,255,0.08)', padding: '32px 40px', background: 'rgba(0,212,255,0.02)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, textAlign: 'center' }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div className={spaceMono.className} style={{ fontSize: 32, fontWeight: 700, color: '#00d4ff', textShadow: '0 0 24px rgba(0,212,255,0.4)', marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p className={spaceMono.className} style={{ fontSize: 11, color: '#475569', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>// FEATURES</p>
          <h2 className={spaceMono.className} style={{ fontSize: 36, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>Everything you need,<br /><span style={{ color: '#00d4ff' }}>nothing you don't.</span></h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(15,15,23,0.8)', border: '1px solid rgba(0,212,255,0.1)',
                borderRadius: 16, padding: '28px 24px', transition: 'all 0.25s',
                backdropFilter: 'blur(8px)', cursor: 'default',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(0,212,255,0.3)';
                el.style.background = 'rgba(15,15,30,0.95)';
                el.style.transform = 'translateY(-4px)';
                el.style.boxShadow = '0 16px 48px rgba(0,0,0,0.4), 0 0 24px rgba(0,212,255,0.06)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(0,212,255,0.1)';
                el.style.background = 'rgba(15,15,23,0.8)';
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
              <h3 className={spaceMono.className} style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 10, letterSpacing: '0.02em' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO PREVIEW CARD ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 40px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{
          background: 'rgba(12,12,20,0.9)', border: '1px solid rgba(0,212,255,0.15)',
          borderRadius: 20, padding: '32px', backdropFilter: 'blur(12px)',
          boxShadow: '0 0 80px rgba(0,212,255,0.05), 0 32px 80px rgba(0,0,0,0.5)',
        }}>
          {/* Fake nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }} />
            <span className={spaceMono.className} style={{ fontSize: 11, color: '#00d4ff', letterSpacing: '0.1em' }}>BINUSIAN-BUDGETING · LIVE</span>
            <div style={{ flex: 1 }} />
            <span className={spaceMono.className} style={{ fontSize: 11, color: '#334155' }}>00:00:00</span>
          </div>
          {/* Fake KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'PAYLATER',    value: 'Rp 1.12M', color: '#ef4444' },
              { label: 'CASH',        value: 'Rp 5.45M', color: '#00d4ff' },
              { label: 'INCOME',      value: '+Rp 359k',  color: '#10b981' },
              { label: 'REMAINING',   value: 'Rp 4.68M', color: '#f8fafc' },
            ].map(c => (
              <div key={c.label} style={{ background: '#0f0f17', border: '1px solid #1e1e2e', borderTop: `2px solid ${c.color}`, padding: '14px 16px', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</div>
                <div className={spaceMono.className} style={{ fontSize: 16, fontWeight: 700, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,212,255,0.03)', borderRadius: 10, border: '1px dashed rgba(0,212,255,0.12)' }}>
            <span style={{ fontSize: 13, color: '#475569' }}>↑ Live dashboard preview — yours after sign in</span>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '60px 40px 80px', textAlign: 'center', borderTop: '1px solid rgba(0,212,255,0.08)' }}>
        <h2 className={spaceMono.className} style={{ fontSize: 28, fontWeight: 700, color: '#f8fafc', marginBottom: 12 }}>
          Ready to take control?
        </h2>
        <p style={{ fontSize: 15, color: '#64748b', marginBottom: 36 }}>
          It takes 10 seconds. Sign in with Google and your dashboard is ready.
        </p>
        <button
          id="bottom-google-signin-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: '15px 36px', borderRadius: 12, background: '#fff',
            border: 'none', cursor: loading ? 'wait' : 'pointer',
            fontSize: 15, fontWeight: 700, color: '#111',
            boxShadow: '0 0 40px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.4)',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Redirecting…' : 'Get Started Free'}
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: 'relative', zIndex: 1, padding: '24px 40px', borderTop: '1px solid rgba(0,212,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={spaceMono.className} style={{ fontSize: 11, color: '#1e293b' }}>© 2026 AI-Kelompok1 · BINUS Jakarta</span>
        <span style={{ fontSize: 11, color: '#1e293b' }}>Powered by Next.js · Supabase · Gemini AI</span>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
