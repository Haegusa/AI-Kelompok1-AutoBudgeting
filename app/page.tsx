'use client';

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import BinusianMonthlyBudgeting from './components/AntiGravityDashboard';
import LandingPage from './components/LandingPage';
import { Space_Mono } from 'next/font/google';

const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'] });

export default function Home() {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#070710',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: '3px solid rgba(0,212,255,0.12)',
          borderTopColor: '#00d4ff',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p className={spaceMono.className} style={{ fontSize: 12, color: '#334155', letterSpacing: '0.1em' }}>
          LOADING…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <LandingPage />;

  return <BinusianMonthlyBudgeting user={user} />;
}
