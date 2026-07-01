'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import AuthModal from '@/components/AuthModal';
import type { User } from '@supabase/supabase-js';

const Logo = () => (
  <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
    <div style={{
      width: 36,
      height: 36,
      background: 'linear-gradient(135deg, #f97316, #ef4444)',
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20,
    }}>
      🍳
    </div>
    <span style={{
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 700,
      fontSize: 18,
      color: 'var(--text-primary)',
      letterSpacing: '-0.02em',
    }}>
      Recipe<span className="gradient-text">De-Bloater</span>
    </span>
  </Link>
);

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<'signin' | 'signup' | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: import('@supabase/supabase-js').Session | null } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: import('@supabase/supabase-js').AuthChangeEvent, session: import('@supabase/supabase-js').Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    window.location.href = '/';
  }

  const userInitial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(8, 12, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
        }}>
          <Logo />

          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="desktop-nav">
            <Link href="/#features" className="btn btn-ghost btn-sm">Features</Link>
            <Link href="/#pricing" className="btn btn-ghost btn-sm">Pricing</Link>
            <Link href="/dashboard" className="btn btn-ghost btn-sm">Dashboard</Link>

            {user ? (
              /* Logged-in user avatar + dropdown */
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition)',
                    boxShadow: '0 0 0 2px transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-start)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px transparent')}
                  title={user.email ?? 'Account'}
                >
                  {userInitial}
                </button>

                {userMenuOpen && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '110%',
                      right: 0,
                      zIndex: 100,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 8,
                      minWidth: 200,
                      boxShadow: 'var(--shadow-lg)',
                    }}>
                      <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                        {user.email}
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        style={{
                          display: 'block',
                          padding: '8px 12px',
                          fontSize: 14,
                          color: 'var(--text-primary)',
                          textDecoration: 'none',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'var(--transition)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        📚 My Cookbook
                      </Link>
                      <button
                        onClick={handleSignOut}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          fontSize: 14,
                          color: '#f87171',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'var(--transition)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Not logged in — show Sign In + Sign Up */
              <>
                <button
                  onClick={() => setAuthModal('signin')}
                  className="btn btn-ghost btn-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthModal('signup')}
                  className="btn btn-primary btn-sm"
                >
                  Sign Up Free →
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: 22,
              padding: 8,
            }}
            className="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div style={{
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border)',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <Link href="/#features" className="btn btn-ghost" onClick={() => setMenuOpen(false)}>Features</Link>
            <Link href="/#pricing" className="btn btn-ghost" onClick={() => setMenuOpen(false)}>Pricing</Link>
            <Link href="/dashboard" className="btn btn-ghost" onClick={() => setMenuOpen(false)}>Dashboard</Link>
            {user ? (
              <button onClick={handleSignOut} className="btn btn-ghost" style={{ color: '#f87171' }}>
                🚪 Sign Out
              </button>
            ) : (
              <>
                <button onClick={() => { setMenuOpen(false); setAuthModal('signin'); }} className="btn btn-ghost">
                  Sign In
                </button>
                <button onClick={() => { setMenuOpen(false); setAuthModal('signup'); }} className="btn btn-primary">
                  Sign Up Free →
                </button>
              </>
            )}
          </div>
        )}

        <style>{`
          @media (max-width: 640px) {
            .desktop-nav { display: none !important; }
            .mobile-menu-btn { display: block !important; }
          }
        `}</style>
      </nav>

      {/* Auth Modal */}
      {authModal && (
        <AuthModal
          defaultTab={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}
    </>
  );
}
