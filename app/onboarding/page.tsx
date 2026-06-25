'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Space_Mono, DM_Sans } from 'next/font/google';
import { supabase } from '../lib/supabase';

const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'] });
const dmSans = DM_Sans({ subsets: ['latin'] });

export default function OnboardingPage() {
  const router = useRouter();
  const [cash, setCash] = useState('');
  const [debt, setDebt] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_onboarded')
        .eq('id', session.user.id)
        .single();

      if (profile?.is_onboarded) {
        router.replace('/');
      } else {
        setInitializing(false);
      }
    };
    checkStatus();
  }, [router]);

  const handleSave = async (isSkip: boolean = false) => {
    setErrorMsg('');
    setSuccessMsg('');

    // Input validation — reject negative values
    if (!isSkip) {
      const parsedCash = parseFloat(cash);
      const parsedDebt = parseFloat(debt);
      if (cash !== '' && (isNaN(parsedCash) || parsedCash < 0)) {
        setErrorMsg('Jumlah kas tidak valid. Masukkan angka positif.');
        return;
      }
      if (debt !== '' && (isNaN(parsedDebt) || parsedDebt < 0)) {
        setErrorMsg('Jumlah utang tidak valid. Masukkan angka positif.');
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg('Sesi tidak ditemukan. Silakan login ulang.');
        setLoading(false);
        return;
      }

      const finalCash = isSkip ? 0 : (parseFloat(cash) || 0);
      const finalDebt = isSkip ? 0 : (parseFloat(debt) || 0);

      // Attempt full update (cash + debt + onboarded flag)
      const { error: fullError } = await supabase
        .from('profiles')
        .update({ current_cash: finalCash, current_debt: finalDebt, is_onboarded: true })
        .eq('id', session.user.id);

      if (fullError) {
        // Fault-tolerant fallback: update without current_debt (column may not exist yet)
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update({ current_cash: finalCash, is_onboarded: true })
          .eq('id', session.user.id);

        if (fallbackError) {
          setErrorMsg(`Gagal menyimpan: ${fallbackError.message}`);
          setLoading(false);
          return;
        }
      }

      // Only redirect AFTER confirmed success
      setSuccessMsg('Data tersimpan! Mengarahkan ke dasbor...');
      setTimeout(() => router.replace('/'), 800);

    } catch (err: any) {
      setErrorMsg(`Kesalahan jaringan: ${err?.message ?? 'Unknown error'}`);
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div style={{ minHeight:'100vh', background:'#070710', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40, height:40, border:'4px solid rgba(0,212,255,0.3)', borderTop:'4px solid #00d4ff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className={dmSans.className} style={{ minHeight:'100vh', background:'#070710', color:'#e2e8f0', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:448, background:'#111827', border:'1px solid rgba(0,212,255,0.2)', borderRadius:16, padding:32, boxShadow:'0 0 40px rgba(0,212,255,0.1)' }}>

        {/* Logo */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,#00d4ff,#0066ff)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(0,212,255,0.5)' }}>
            <span className={spaceMono.className} style={{ fontSize:20, fontWeight:700, color:'#070710' }}>B</span>
          </div>
        </div>

        <h1 className={spaceMono.className} style={{ fontSize:24, fontWeight:700, textAlign:'center', color:'#00d4ff', marginBottom:8 }}>
          Welcome to BudgetOS
        </h1>
        <p style={{ fontSize:14, textAlign:'center', color:'#94a3b8', marginBottom:32 }}>
          Mari siapkan akunmu sebelum mulai.
        </p>

        {/* Error message */}
        {errorMsg && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#ef4444', lineHeight:1.5 }}>
            ⚠ {errorMsg}
          </div>
        )}

        {/* Success message */}
        {successMsg && (
          <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.4)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#10b981', lineHeight:1.5 }}>
            ✓ {successMsg}
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

          {/* Cash input */}
          <div>
            <label style={{ display:'block', fontSize:14, fontWeight:500, color:'#cbd5e1', marginBottom:8 }}>
              Berapa total kas/uang liquidmu saat ini?
            </label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}>Rp</span>
              <input
                id="onboarding-cash"
                type="number" min="0" placeholder="0"
                value={cash}
                disabled={loading}
                onChange={e => { setCash(e.target.value); setErrorMsg(''); }}
                onFocus={e => e.target.style.borderColor='#00d4ff'}
                onBlur={e => e.target.style.borderColor='rgba(0,212,255,0.2)'}
                style={{ width:'100%', background:'#0d1a2e', border:'1px solid rgba(0,212,255,0.2)', borderRadius:12, padding:'12px 16px 12px 40px', color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
              />
            </div>
          </div>

          {/* Debt input */}
          <div>
            <label style={{ display:'block', fontSize:14, fontWeight:500, color:'#cbd5e1', marginBottom:8 }}>
              Apakah ada saldo utang/Paylater aktif?
            </label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}>Rp</span>
              <input
                id="onboarding-debt"
                type="number" min="0" placeholder="0"
                value={debt}
                disabled={loading}
                onChange={e => { setDebt(e.target.value); setErrorMsg(''); }}
                onFocus={e => e.target.style.borderColor='#ff4466'}
                onBlur={e => e.target.style.borderColor='rgba(255,68,102,0.2)'}
                style={{ width:'100%', background:'#0d1a2e', border:'1px solid rgba(255,68,102,0.2)', borderRadius:12, padding:'12px 16px 12px 40px', color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', flexDirection:'column', gap:12, paddingTop:8 }}>
            <button
              id="onboarding-save-btn"
              onClick={() => handleSave(false)}
              disabled={loading}
              style={{ width:'100%', background: loading?'rgba(0,212,255,0.4)':'#00d4ff', color:'#070710', fontWeight:700, padding:'12px 0', borderRadius:12, border:'none', cursor:loading?'not-allowed':'pointer', fontSize:15, boxShadow:'0 0 20px rgba(0,212,255,0.3)', transition:'all 0.2s' }}
            >
              {loading ? 'Menyimpan...' : 'Simpan & Mulai'}
            </button>
            <button
              id="onboarding-skip-btn"
              onClick={() => handleSave(true)}
              disabled={loading}
              style={{ width:'100%', background:'transparent', border:'1px solid #334155', color:'#64748b', fontWeight:500, padding:'12px 0', borderRadius:12, cursor:loading?'not-allowed':'pointer', fontSize:14, transition:'all 0.2s' }}
            >
              Lewati, mulai dari Rp 0
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

