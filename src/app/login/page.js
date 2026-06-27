'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase-client';

export default function LoginPage() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const signIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Sign-in failed');

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: '36px 40px', textAlign: 'center', minWidth: 300,
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🌊</div>
        <h1 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>FloodWatch Nepal</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Sign in to manage alerts and stations</p>

        <button
          onClick={signIn}
          disabled={loading}
          style={{
            width: '100%', padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
            background: '#fff', color: '#1f2937', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && (
          <div style={{ marginTop: 14, fontSize: 12, color: '#ef4444' }}>{error}</div>
        )}
      </div>
    </div>
  );
}
