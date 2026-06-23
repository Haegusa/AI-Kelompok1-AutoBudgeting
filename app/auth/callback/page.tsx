'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Space_Mono } from 'next/font/google';
import { supabase } from '../../lib/supabase';

const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'] });

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code   = params.get('code');

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      // Redirect to the dashboard regardless (session will be in storage)
      router.replace('/');
    };

    handleCallback();
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh', background: '#070710',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      {/* Animated spinner */}
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid rgba(0,212,255,0.15)',
        borderTopColor: '#00d4ff',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p className={spaceMono.className} style={{ fontSize: 13, color: '#00d4ff', letterSpacing: '0.1em' }}>
        SIGNING YOU IN…
      </p>
      <p style={{ fontSize: 12, color: '#334155' }}>
        Please wait while we set up your session.
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
