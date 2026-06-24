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

  useEffect(() => {
    // Check if user is already onboarded
    const checkStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      
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
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const finalCash = isSkip ? 0 : (parseFloat(cash) || 0);
    const finalDebt = isSkip ? 0 : (parseFloat(debt) || 0);

    // Update profile
    await supabase
      .from('profiles')
      .update({
        current_cash: finalCash,
        current_debt: finalDebt, // Assuming current_debt exists in profiles
        is_onboarded: true
      })
      .eq('id', session.user.id);
      
    // Redirect to dashboard (home)
    router.replace('/');
  };

  if (initializing) {
    return <div className="min-h-screen bg-[#070710] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className={`${dmSans.className} min-h-screen bg-[#070710] text-[#e2e8f0] flex flex-col items-center justify-center p-4`}>
      <div className="w-full max-w-md bg-[#111827] border border-[#00d4ff]/20 rounded-2xl p-8 shadow-[0_0_40px_rgba(0,212,255,0.1)]">
        
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0066ff] flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.5)]">
            <span className={`${spaceMono.className} text-xl font-bold text-[#070710]`}>B</span>
          </div>
        </div>
        
        <h1 className={`${spaceMono.className} text-2xl font-bold text-center text-[#00d4ff] mb-2`}>
          Welcome to BudgetOS
        </h1>
        <p className="text-sm text-center text-slate-400 mb-8">
          Mari siapkan akunmu sebelum mulai.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Berapa total kas/uang liquidmu saat ini?
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
              <input 
                type="number"
                className="w-full bg-[#0d1a2e] border border-[#00d4ff]/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] transition-all"
                placeholder="0"
                value={cash}
                onChange={e => setCash(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Apakah ada saldo utang/Paylater aktif?
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
              <input 
                type="number"
                className="w-full bg-[#0d1a2e] border border-[#ff4466]/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#ff4466] focus:ring-1 focus:ring-[#ff4466] transition-all"
                placeholder="0"
                value={debt}
                onChange={e => setDebt(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="w-full bg-[#00d4ff] hover:bg-[#00b8e6] text-[#070710] font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Menyimpan...' : 'Simpan & Mulai'}
            </button>
            
            <button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="w-full bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-400 font-medium py-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              Lewati, mulai dari Rp 0
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
