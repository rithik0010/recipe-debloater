'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import UrlInput from '@/components/UrlInput';
import RecipeDisplay from '@/components/RecipeDisplay';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { Recipe, ExtractionResult } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

// ── Razorpay loader ──────────────────────────────────────────────────────────
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-checkout-js')) { resolve(true); return; }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Demo recipe ──────────────────────────────────────────────────────────────
const DEMO_RECIPE: Recipe = {
  title: 'Classic Spaghetti Carbonara',
  description: 'A traditional Roman pasta dish made with eggs, Pecorino Romano, guanciale, and black pepper. Rich, creamy, and ready in 20 minutes.',
  ingredients: [
    { item: 'Spaghetti', amount: '400', unit: 'g' },
    { item: 'Guanciale or pancetta', amount: '150', unit: 'g' },
    { item: 'Eggs', amount: '4', unit: '' },
    { item: 'Pecorino Romano', amount: '100', unit: 'g', notes: 'finely grated' },
    { item: 'Black pepper', amount: '2', unit: 'tsp', notes: 'freshly cracked' },
    { item: 'Salt', amount: '', unit: '', notes: 'for pasta water' },
  ],
  instructions: [
    { step: 1, text: 'Bring a large pot of salted water to a boil. Cook spaghetti until al dente per package instructions.' },
    { step: 2, text: 'While pasta cooks, cut guanciale into cubes and fry over medium heat until crispy. Remove from heat.' },
    { step: 3, text: 'Whisk eggs with grated Pecorino Romano and cracked black pepper in a bowl.' },
    { step: 4, text: 'Reserve 1 cup pasta water. Drain spaghetti and add to pan with guanciale off heat.' },
    { step: 5, text: 'Pour egg mixture over pasta, tossing quickly. Add pasta water as needed to create a creamy sauce.' },
    { step: 6, text: 'Serve immediately topped with extra Pecorino and black pepper.' },
  ],
  prep_time: 5,
  cook_time: 20,
  total_time: 25,
  servings: 4,
  cuisine: 'Italian',
  difficulty: 'Medium',
  diet: ['Dairy-Free option'],
  tags: ['pasta', 'italian', 'quick', 'classic'],
  source_url: 'https://example.com',
  source_platform: 'website',
};

// ── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '⚡', title: 'Instant Extraction',
    color: 'rgba(249,115,22,0.15)',
    desc: 'AI-powered extraction strips ads, life stories, and SEO filler. Get just the recipe in under 3 seconds.',
  },
  {
    icon: '▶', title: 'YouTube Recipes',
    color: 'rgba(239,68,68,0.15)',
    desc: 'Paste any cooking video URL. We transcribe the audio and extract every ingredient and step.',
  },
  {
    icon: '📚', title: 'Personal Cookbook',
    color: 'rgba(168,85,247,0.15)',
    desc: 'Every recipe you extract is saved to your private cookbook. Access it from any device, anytime.',
  },
  {
    icon: '🧪', title: 'Ingredient Scaling',
    color: 'rgba(34,197,94,0.15)',
    desc: 'Scale any recipe from 1× to 4× with one tap. Ingredient amounts adjust instantly.',
  },
  {
    icon: '👨‍🍳', title: 'Cook Mode',
    color: 'rgba(59,130,246,0.15)',
    desc: 'Step-by-step focused cooking view with built-in timers. No distractions, just the current step.',
  },
  {
    icon: '🔒', title: 'Private & Secure',
    color: 'rgba(249,115,22,0.15)',
    desc: 'Your cookbook is yours alone. Secured with Google OAuth. No data sharing, ever.',
  },
];

const PRICING = [
  {
    name: 'Free',
    price: '₹0',
    period: '/month',
    highlight: false,
    isUpgrade: false,
    cta: 'Start for Free',
    ctaLink: '/dashboard',
    features: ['10 extractions/day', 'Personal cookbook', 'Website recipes', 'YouTube recipes', 'Ingredient checklist'],
  },
  {
    name: 'Pro',
    price: '₹419',
    period: '/month',
    highlight: true,
    isUpgrade: true,
    cta: 'Upgrade to Pro',
    features: ['200 extractions/day', 'Everything in Free', 'Priority AI processing', 'Serving size scaler', 'Cook mode', 'Email support'],
  },
];

const SUPPORTED_SITES = ['AllRecipes', 'NYT Cooking', 'Bon Appétit', 'Serious Eats', 'Food Network', 'YouTube', 'Tasty', 'Delish'];

// ── Typewriter hook ──────────────────────────────────────────────────────────
const RECIPE_EXAMPLES = [
  'https://www.allrecipes.com/recipe/butter-chicken',
  'https://youtube.com/watch?v=pasta-carbonara',
  'https://www.bonappetit.com/recipe/chocolate-cake',
  'https://www.seriouseats.com/best-biryani',
  'Paste any recipe URL or YouTube link...',
];

function useTypewriter(strings: string[], speed = 45, pause = 1800) {
  const [display, setDisplay] = useState('');
  const [strIndex, setStrIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = strings[strIndex % strings.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && charIndex <= current.length) {
      timeout = setTimeout(() => setCharIndex((c) => c + 1), speed);
      setDisplay(current.slice(0, charIndex));
    } else if (!deleting && charIndex > current.length) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIndex > 0) {
      timeout = setTimeout(() => setCharIndex((c) => c - 1), speed / 2);
      setDisplay(current.slice(0, charIndex));
    } else {
      setDeleting(false);
      setStrIndex((i) => (i + 1) % strings.length);
    }
    return () => clearTimeout(timeout);
  }, [charIndex, deleting, strIndex, strings, speed, pause]);

  return display;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const [demoActive, setDemoActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Recipe | null>(null);
  const [error, setError] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [recipesExtracted] = useState(12847); // social proof counter

  const typewriterText = useTypewriter(RECIPE_EXAMPLES);
  const resultRef = useRef<HTMLDivElement>(null);

  // ── Auth session ───────────────────────────────────────────────────────────
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

  // ── Extract ────────────────────────────────────────────────────────────────
  async function handleExtract(url: string) {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url }),
      });
      const data: ExtractionResult & { fromCache?: boolean } = await res.json();
      if (!data.success || !data.recipe) throw new Error(data.error ?? 'Extraction failed');
      setResult(data.recipe);
      setFromCache(data.fromCache ?? false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // ── Upgrade ────────────────────────────────────────────────────────────────
  async function handleUpgrade() {
    setUpgradeLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Could not load payment gateway');
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json() as { success: boolean; orderId: string; amount: number; currency: string; keyId: string; error?: string };
      if (!data.success) throw new Error(data.error ?? 'Could not create order');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: data.keyId, amount: data.amount, currency: data.currency, order_id: data.orderId,
        name: 'Recipe De-Bloater', description: 'Pro Plan — 200 extractions/day', theme: { color: '#f97316' },
        handler: () => { alert('🎉 Payment successful! Your Pro plan is being activated...'); window.location.reload(); },
      });
      rzp.open();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setUpgradeLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: 'clamp(60px,10vw,100px) 0 60px' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="animate-fade-in">

            {/* Social proof badge */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
              <div className="badge badge-orange" style={{ display: 'inline-flex' }}>
                🆓 100% Free · No Credit Card
              </div>
              <div className="badge badge-green" style={{ display: 'inline-flex' }}>
                🍳 {recipesExtracted.toLocaleString()} recipes extracted
              </div>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.8rem, 7vw, 5rem)',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 900,
              marginBottom: 24,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
            }}>
              Recipes Without{' '}
              <span className="gradient-text" style={{ display: 'block' }}>The Bloat.</span>
            </h1>

            <p style={{
              fontSize: 'clamp(16px, 2.2vw, 20px)',
              color: 'var(--text-secondary)',
              maxWidth: 560,
              margin: '0 auto 48px',
              lineHeight: 1.75,
            }}>
              Paste any recipe blog URL or YouTube cooking video.
              Get a <strong style={{ color: 'var(--text-primary)' }}>clean, structured recipe</strong> in seconds —
              no ads, no life stories, no &ldquo;jump to recipe&rdquo; button.
            </p>

            {/* Hero input */}
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <UrlInput
                onExtract={handleExtract}
                loading={loading}
                size="hero"
                placeholder={typewriterText || 'Paste a recipe URL or YouTube link...'}
              />
              {error && (
                <div style={{ marginTop: 16, padding: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: 14 }}>
                  ⚠️ {error}
                </div>
              )}
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
              <button
                onClick={() => setDemoActive(!demoActive)}
                className="btn btn-ghost btn-sm"
              >
                {demoActive ? '↑ Hide demo' : '👀 See a demo'}
              </button>
              <Link href="/dashboard" className="btn btn-ghost btn-sm">
                📚 Go to my cookbook →
              </Link>
            </div>
          </div>

          {/* Supported sites strip */}
          <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Works with
            </p>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
              {SUPPORTED_SITES.map((site) => (
                <span key={site} style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{site}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Demo Recipe ────────────────────────────────────────────────────── */}
      {demoActive && (
        <section style={{ padding: '0 0 60px' }} className="animate-fade-in">
          <div className="container" style={{ maxWidth: 1100 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700 }}>
                ✨ This is what you get — from a 10-minute cooking video
              </h2>
            </div>
            <RecipeDisplay recipe={DEMO_RECIPE} />
          </div>
        </section>
      )}

      {/* ─── Extraction Result ───────────────────────────────────────────────── */}
      {result && (
        <section ref={resultRef} id="result-section" style={{ padding: '0 0 60px' }} className="animate-fade-in">
          <div className="container" style={{ maxWidth: 1100 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700, color: '#4ade80' }}>
                ✅ Recipe extracted successfully!
                {fromCache && <span className="badge badge-blue" style={{ marginLeft: 12 }}>⚡ Cached</span>}
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 14 }}>
                {user
                  ? <><span style={{ color: '#4ade80' }}>📚 Saved to your cookbook</span> — find it in your <Link href="/dashboard" style={{ color: 'var(--accent-start)', textDecoration: 'underline' }}>Dashboard</Link></>
                  : <><Link href="/dashboard" style={{ color: 'var(--accent-start)' }}>Sign in</Link> to save this recipe to your library</>}
              </p>
            </div>
            <RecipeDisplay recipe={result} />
          </div>
        </section>
      )}

      {/* ─── Before / After ──────────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, marginBottom: 12 }}>
              Before vs. After
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
              This is the difference De-Bloater makes.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {/* Before */}
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>😩</span>
                <span style={{ fontWeight: 700, color: '#f87171', fontFamily: 'Outfit, sans-serif' }}>A typical recipe blog</span>
              </div>
              {['📸 15 photos of "my grandmother\'s kitchen"', '📝 800 words about a trip to Italy', '💬 "This recipe changed my life!"', '📢 Ads every 3 sentences', '🔁 Life story before every step', '🔽 Jump to Recipe button buried'].map((item) => (
                <div key={item} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)', opacity: 0.8 }}>
                  <span style={{ color: '#f87171', flexShrink: 0 }}>✗</span> {item}
                </div>
              ))}
            </div>

            {/* After */}
            <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>😌</span>
                <span style={{ fontWeight: 700, color: '#4ade80', fontFamily: 'Outfit, sans-serif' }}>Recipe De-Bloater output</span>
              </div>
              {['⏱ Prep time, cook time, total time', '📋 Clean ingredient list with amounts', '🔢 Step-by-step numbered instructions', '🍽 Servings & difficulty level', '🏷 Cuisine tags & diet info', '💾 Saved to your cookbook instantly'].map((item) => (
                <div key={item} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, marginBottom: 16 }}>
              Everything you need.{' '}
              <span className="gradient-text">Nothing you don&apos;t.</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 17, maxWidth: 500, margin: '0 auto' }}>
              Built for people who just want to cook. Zero clutter by design.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass-card"
                style={{ padding: 28, transition: 'var(--transition)', cursor: 'default' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <div className="feature-icon" style={{ background: f.color, fontSize: 26 }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it Works ────────────────────────────────────────────────────── */}
      <section className="section" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800 }}>
              How it works
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
            {[
              { n: '1', icon: '📋', title: 'Paste URL', desc: 'Any recipe website or YouTube cooking video link' },
              { n: '2', icon: '🤖', title: 'AI Extracts', desc: 'Groq AI strips ads, stories, and sponsor content instantly' },
              { n: '3', icon: '✨', title: 'Clean Recipe', desc: 'Structured ingredients, numbered steps, cook times — done' },
            ].map((step, i) => (
              <div key={step.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                {i < 2 && (
                  <div style={{ position: 'relative', width: '100%' }}>
                    <div style={{ width: 64, height: 64, background: 'var(--accent-gradient)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 0 30px var(--accent-glow)', margin: '0 auto' }}>
                      {step.icon}
                    </div>
                  </div>
                )}
                {i === 2 && (
                  <div style={{ width: 64, height: 64, background: 'var(--accent-gradient)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 0 30px var(--accent-glow)' }}>
                    {step.icon}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 12, color: 'var(--accent-start)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Step {step.n}</div>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, marginBottom: 16 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 17 }}>
              Start free. Upgrade when you need more.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 720, margin: '0 auto' }}>
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className="glass-card"
                style={{
                  padding: 36,
                  position: 'relative',
                  border: plan.highlight ? '1px solid rgba(249,115,22,0.45)' : undefined,
                  boxShadow: plan.highlight ? '0 0 50px rgba(249,115,22,0.14)' : undefined,
                  transition: 'var(--transition)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
              >
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-gradient)', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 18px', borderRadius: 999, whiteSpace: 'nowrap', animation: 'pulse-glow 2s ease-in-out infinite' }}>
                    ⭐ MOST POPULAR
                  </div>
                )}

                <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                  {plan.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 28 }}>
                  <span style={{ fontSize: 46, fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>{plan.price}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{plan.period}</span>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                      <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>

                {/* Trust badges */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  {plan.isUpgrade
                    ? ['No lock-in', 'Cancel anytime'].map((t) => <span key={t} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: 999, border: '1px solid var(--border)' }}>{t}</span>)
                    : ['No credit card', 'Always free'].map((t) => <span key={t} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: 999, border: '1px solid var(--border)' }}>{t}</span>)
                  }
                </div>

                {plan.isUpgrade ? (
                  <button onClick={handleUpgrade} disabled={upgradeLoading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    {upgradeLoading ? <><span className="spinner" /> Processing...</> : <>💳 {plan.cta}</>}
                  </button>
                ) : (
                  <Link href={plan.ctaLink ?? '/dashboard'} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA banner ──────────────────────────────────────────────────────── */}
      <section className="section" style={{ textAlign: 'center', paddingBottom: 100 }}>
        <div className="container" style={{ maxWidth: 600 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 20 }}>
            Stop scrolling through ads.<br />
            <span className="gradient-text">Just cook.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 36 }}>
            Free forever. No credit card required. Works with any recipe website or YouTube video.
          </p>
          <Link href="/dashboard" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
            Get Started Free — It&apos;s ₹0
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 0 32px', color: 'var(--text-muted)', fontSize: 13 }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              🍳 Recipe De-Bloater
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <Link href="/#features" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'var(--transition)' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>Features</Link>
              <Link href="/#pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'var(--transition)' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>Pricing</Link>
              <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'var(--transition)' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>Dashboard</Link>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p>Built with ❤️ using Next.js, Supabase &amp; Groq AI · Made in India 🇮🇳</p>
            <p>© {new Date().getFullYear()} Recipe De-Bloater. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
