'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface AuthModalProps {
  onClose: () => void;
  defaultTab?: 'signin' | 'signup';
}

export default function AuthModal({ onClose, defaultTab = 'signin' }: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = getSupabaseBrowser();

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (tab === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Check your email for a confirmation link!' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
        window.location.reload();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Authentication failed' });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setMessage({ type: 'error', text: error.message });
      setGoogleLoading(false);
    }
    // Browser will redirect — no need to reset loading
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '40px 36px',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 4,
            borderRadius: 6,
            transition: 'var(--transition)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🍳</div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {tab === 'signin'
              ? 'Sign in to access your personal cookbook'
              : 'Start building your recipe collection'}
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 'var(--radius-md)',
            padding: 4,
            marginBottom: 24,
          }}
        >
          {(['signin', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setMessage(null); }}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition)',
                background: tab === t ? 'var(--accent-gradient)' : 'transparent',
                color: tab === t ? 'white' : 'var(--text-secondary)',
              }}
            >
              {t === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            width: '100%',
            padding: '12px 20px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-primary)',
            fontSize: 14,
            fontWeight: 600,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'var(--transition)',
            marginBottom: 20,
            opacity: googleLoading ? 0.7 : 1,
          }}
          onMouseEnter={(e) => !googleLoading && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        >
          {googleLoading ? (
            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M47.53 24.56c0-1.64-.15-3.22-.42-4.74H24v8.97h13.22c-.57 2.99-2.3 5.53-4.9 7.23v6h7.93c4.64-4.28 7.28-10.58 7.28-17.46z"/>
              <path fill="#34A853" d="M24 48c6.66 0 12.25-2.21 16.33-5.98l-7.93-6c-2.2 1.48-5.02 2.35-8.4 2.35-6.47 0-11.95-4.37-13.9-10.24H1.96v6.19C5.99 42.59 14.37 48 24 48z"/>
              <path fill="#FBBC05" d="M10.1 28.13A14.85 14.85 0 0 1 9.3 24c0-1.43.25-2.82.8-4.13v-6.19H1.96A23.94 23.94 0 0 0 0 24c0 3.9.93 7.59 2.57 10.87l7.53-5.87-.0 1.13z"/>
              <path fill="#EA4335" d="M24 9.5c3.65 0 6.93 1.25 9.51 3.71l7.12-7.12C36.24 2.19 30.66 0 24 0 14.37 0 5.99 5.41 1.96 13.32l7.94 6.19C11.81 13.87 17.53 9.5 24 9.5z"/>
            </svg>
          )}
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or with email</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
              required
              minLength={6}
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          {message && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                color: message.type === 'success' ? '#4ade80' : '#f87171',
              }}
            >
              {message.type === 'success' ? '✅' : '⚠️'} {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {loading ? (
              <><span className="spinner" /> {tab === 'signin' ? 'Signing in...' : 'Creating account...'}</>
            ) : (
              tab === 'signin' ? '→ Sign In' : '🚀 Create Account'
            )}
          </button>
        </form>

        {tab === 'signin' && (
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <button
              onClick={() => { setTab('signup'); setMessage(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-start)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              Sign up free
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
