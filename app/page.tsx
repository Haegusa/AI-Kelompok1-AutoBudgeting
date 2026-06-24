'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import BinusianMonthlyBudgeting from './components/AntiGravityDashboard';
import LandingPage from './components/LandingPage';
import { Space_Mono } from 'next/font/google';

const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'] });

export default function Home() {
  const router = useRouter();
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUserAndOnboarding = async (session: any) => {
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      setUser(session.user);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_onboarded')
        .eq('id', session.user.id)
        .single();
        
      if (profile && profile.is_onboarded === false) {
        router.replace('/onboarding');
      } else {
        setIsOnboarded(true);
        setLoading(false);
      }
    };

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUserAndOnboarding(session);
    });

    // Listen for auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserAndOnboarding(session);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading || (user && isOnboarded === null)) {
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
