'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import UrlInput from '@/components/UrlInput';
import RecipeDisplay from '@/components/RecipeDisplay';
import AuthModal from '@/components/AuthModal';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { Recipe, ExtractionResult } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(minutes?: number) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: '#22c55e',
  Medium: '#f59e0b',
  Hard: '#ef4444',
};

// ── Recipe List Card ──────────────────────────────────────────────────────────

function CookbookCard({
  recipe,
  onClick,
  onDelete,
}: {
  recipe: Recipe;
  onClick: () => void;
  onDelete: (id: string) => void;
}) {
  const totalTime = recipe.total_time ?? (((recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)) || undefined);

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        cursor: 'pointer',
        transition: 'var(--transition)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card-hover)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-hover)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, #f97316, #ef4444)',
      }} />

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
        {recipe.source_platform && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
            background: recipe.source_platform === 'youtube' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
            color: recipe.source_platform === 'youtube' ? '#f87171' : '#60a5fa',
          }}>
            {recipe.source_platform === 'youtube' ? '▶ YouTube' : '🌐 Website'}
          </span>
        )}
        {recipe.cuisine && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(249,115,22,0.12)', color: '#fb923c' }}>
            {recipe.cuisine}
          </span>
        )}
        {recipe.difficulty && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: DIFFICULTY_COLOR[recipe.difficulty] ?? 'var(--text-secondary)' }}>
            {recipe.difficulty}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 17, fontWeight: 700, fontFamily: 'Outfit, sans-serif', lineHeight: 1.3, color: 'var(--text-primary)', margin: 0 }}>
        {recipe.title}
      </h3>

      {/* Description */}
      {recipe.description && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {recipe.description}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, color: 'var(--text-muted)', fontSize: 12, flexWrap: 'wrap' }}>
        {totalTime && <span>⏱ {formatTime(totalTime)}</span>}
        {recipe.servings && <span>👤 {recipe.servings} servings</span>}
        <span>📋 {recipe.ingredients.length} ingredients</span>
        <span>📝 {recipe.instructions.length} steps</span>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--accent-start)', fontWeight: 600 }}>
          View full recipe →
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); if (recipe.id) onDelete(recipe.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: 4, borderRadius: 6, transition: 'var(--transition)' }}
          title="Delete recipe"
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);
  const [authModal, setAuthModal] = useState<'signin' | 'signup' | null>(null);

  // View state: 'list' | 'extract-result' | 'recipe-detail'
  const [view, setView] = useState<'list' | 'extract-result' | 'recipe-detail'>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [extractionsToday, setExtractionsToday] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  const FREE_DAILY_LIMIT = 10;

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: import('@supabase/supabase-js').Session | null } }) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: import('@supabase/supabase-js').AuthChangeEvent, session: import('@supabase/supabase-js').Session | null) => {
        setUser(session?.user ?? null);
        setToken(session?.access_token ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Load saved recipes ──────────────────────────────────────────────────────
  const loadSavedRecipes = useCallback(async (accessToken: string) => {
    setListLoading(true);
    try {
      const res = await fetch('/api/recipes', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json() as { success: boolean; recipes: Recipe[] };
        if (data.success) setSavedRecipes(data.recipes);
      }
    } catch { /* silent */ } finally {
      setListLoading(false);
    }
  }, []);

  // ── Load today's real extraction count from DB ────────────────────────────
  const loadUsage = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch('/api/usage', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json() as { success: boolean; extractionsToday: number };
        if (data.success) setExtractionsToday(data.extractionsToday);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (token) {
      loadSavedRecipes(token);
      loadUsage(token);
    }
    else if (user === null) setListLoading(false);
  }, [token, user, loadSavedRecipes, loadUsage]);

  // ── Extract ─────────────────────────────────────────────────────────────────
  async function handleExtract(url: string) {
    if (!token) { setAuthModal('signup'); return; }

    setExtractLoading(true);
    setExtractError('');
    setSelectedRecipe(null);
    setView('list');

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url }),
      });
      const data: ExtractionResult & { limitReached?: boolean } = await res.json();

      if (!data.success || !data.recipe) {
        if (data.limitReached) {
          setLimitReached(true);
          setExtractError('');
        } else {
          setExtractError(data.error ?? 'Extraction failed. Please try again.');
        }
        return;
      }

      setFromCache(data.fromCache ?? false);
      setExtractionsToday((p) => p + 1);

      // Refresh the list so the new recipe appears
      await loadSavedRecipes(token);

      // Show the newly extracted recipe
      setSelectedRecipe(data.recipe);
      setView('extract-result');

      setTimeout(() => document.getElementById('recipe-top')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setExtractLoading(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!token) return;
    const res = await fetch(`/api/recipes?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
      if (selectedRecipe?.id === id) { setSelectedRecipe(null); setView('list'); }
    }
  }

  const filteredRecipes = savedRecipes.filter((r) =>
    !search ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisine?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Loading (resolving session) ─────────────────────────────────────────────
  if (user === undefined) {
    return (
      <>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      </>
    );
  }

  // ── Unauthenticated ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <Navbar />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 24 }} className="animate-float">🍳</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 800, marginBottom: 16 }}>
            Your personal <span className="gradient-text">cookbook</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 460, marginBottom: 36, lineHeight: 1.7 }}>
            Create a free account to save recipes, build your collection, and access them from any device.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => setAuthModal('signup')} className="btn btn-primary btn-lg">🚀 Create Free Account</button>
            <button onClick={() => setAuthModal('signin')} className="btn btn-outline btn-lg">Sign In</button>
          </div>
        </div>
        {authModal && <AuthModal defaultTab={authModal} onClose={() => setAuthModal(null)} />}
      </>
    );
  }

  // ── Authenticated ───────────────────────────────────────────────────────────
  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <div id="recipe-top" />

        {/* ── Full recipe view (after click or extraction) ── */}
        {(view === 'recipe-detail' || view === 'extract-result') && selectedRecipe ? (
          <div>
            {/* Back button */}
            <button
              onClick={() => { setView('list'); setSelectedRecipe(null); }}
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: 24, gap: 8 }}
            >
              ← Back to My Cookbook
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, margin: 0 }}>
                {view === 'extract-result' ? '✨ Extracted Recipe' : selectedRecipe.title}
              </h1>
              {fromCache && view === 'extract-result' && (
                <span className="badge badge-blue">⚡ Cached</span>
              )}
              {view === 'extract-result' && (
                <span style={{ fontSize: 13, color: '#4ade80' }}>✅ Saved to your cookbook</span>
              )}
            </div>

            <RecipeDisplay recipe={selectedRecipe} />
          </div>
        ) : (
          /* ── List view (default) ── */
          <div>
            {/* Header */}
            <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                  📚 My Cookbook
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                  {savedRecipes.length === 0 ? 'No recipes yet — extract your first one below' : `${savedRecipes.length} recipe${savedRecipes.length !== 1 ? 's' : ''} saved`}
                </p>
              </div>
              {/* Daily usage counter */}
              <div style={{
                background: limitReached ? 'rgba(239,68,68,0.08)' : 'var(--bg-card)',
                border: `1px solid ${limitReached ? 'rgba(239,68,68,0.35)' : extractionsToday >= 8 ? 'rgba(249,115,22,0.35)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '10px 20px',
                fontSize: 13,
                color: 'var(--text-secondary)',
                textAlign: 'center',
                minWidth: 130,
              }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: limitReached ? '#f87171' : extractionsToday >= 8 ? '#fb923c' : 'var(--text-primary)',
                }}>
                  {extractionsToday}/{FREE_DAILY_LIMIT}
                </div>
                <div>today&apos;s extractions</div>
                <div className="progress-bar" style={{ marginTop: 6 }}>
                  <div className="progress-fill" style={{
                    width: `${Math.min((extractionsToday / FREE_DAILY_LIMIT) * 100, 100)}%`,
                    background: limitReached ? 'linear-gradient(90deg,#ef4444,#dc2626)' : extractionsToday >= 8 ? 'linear-gradient(90deg,#f97316,#ef4444)' : undefined,
                  }} />
                </div>
                {limitReached && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#f87171', fontWeight: 600 }}>Limit reached</div>
                )}
                {!limitReached && extractionsToday >= 8 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#fb923c', fontWeight: 600 }}>{FREE_DAILY_LIMIT - extractionsToday} left today</div>
                )}
              </div>
            </div>

            {/* Extract a Recipe */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 36 }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)' }}>
                🔗 Add a New Recipe
              </h2>

              {/* Limit reached — show upgrade wall instead of input */}
              {limitReached ? (
                <div style={{
                  padding: '28px 24px',
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                    Daily limit reached
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                    You&apos;ve used all <strong style={{ color: 'var(--text-primary)' }}>10 free extractions</strong> for today.
                    Upgrade to Pro for <strong style={{ color: '#fb923c' }}>200 extractions/day</strong>.
                  </p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="/#pricing" className="btn btn-primary">
                      💳 Upgrade to Pro — ₹419/month
                    </a>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      Resets at midnight
                    </span>
                  </div>
                </div>
              ) : (
                <UrlInput onExtract={handleExtract} loading={extractLoading} />
              )}

              {extractError && (
                <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: 14 }}>
                  ⚠️ {extractError}
                </div>
              )}

              {extractLoading && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
                  {['🔍 Analyzing URL...', '📄 Fetching content...', '🤖 AI extracting recipe...'].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0, animation: `slideIn 0.4s ease ${i * 0.6}s forwards` }}>
                      <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                      {step}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recipe library */}
            {listLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
              </div>
            ) : savedRecipes.length > 0 ? (
              <div>
                {/* Search */}
                {savedRecipes.length > 2 && (
                  <div style={{ marginBottom: 20 }}>
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search your recipes..."
                      className="input"
                      style={{ width: '100%', maxWidth: 340 }}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                  {filteredRecipes.map((recipe) => (
                    <CookbookCard
                      key={recipe.id}
                      recipe={recipe}
                      onClick={() => { setSelectedRecipe(recipe); setView('recipe-detail'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>

                {filteredRecipes.length === 0 && search && (
                  <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                    <p>No recipes match &ldquo;{search}&rdquo;</p>
                  </div>
                )}
              </div>
            ) : (
              /* Empty state */
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: 64, marginBottom: 20 }} className="animate-float">🍳</div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
                  Your cookbook is empty
                </h3>
                <p style={{ fontSize: 14, maxWidth: 360, margin: '0 auto' }}>
                  Paste any recipe website URL or YouTube cooking video link above to get started.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
