'use client';

import { useState, useEffect, useCallback } from 'react';
import { Recipe, Ingredient, Instruction } from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(min?: number) {
  if (!min) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Scale a numeric string by a multiplier, returns formatted string */
function scaleAmount(amount: string, scale: number): string {
  if (!amount) return amount;
  const num = parseFloat(amount.replace(/[^\d.\/]/g, ''));
  if (isNaN(num)) return amount;
  // Handle fractions like "1/2"
  if (amount.includes('/')) {
    const [n, d] = amount.split('/').map(Number);
    if (!isNaN(n) && !isNaN(d) && d !== 0) {
      const result = (n / d) * scale;
      return formatDecimal(result);
    }
  }
  return formatDecimal(num * scale);
}

function formatDecimal(n: number): string {
  if (n === Math.round(n)) return String(Math.round(n));
  // Round to 1 decimal
  const rounded = Math.round(n * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : String(rounded);
}

/** Extract timer durations (in seconds) from step text */
function extractTimers(text: string): number[] {
  const timers: number[] = [];
  // Match "X min", "X minute(s)", "X hour(s)"
  const minMatch = text.matchAll(/(\d+)\s*(?:to\s*\d+\s*)?min(?:ute)?s?/gi);
  for (const m of minMatch) timers.push(parseInt(m[1]) * 60);
  const hrMatch = text.matchAll(/(\d+)\s*hour?s?/gi);
  for (const m of hrMatch) timers.push(parseInt(m[1]) * 3600);
  return [...new Set(timers)]; // dedupe
}

// ── Timer Component ───────────────────────────────────────────────────────────

function StepTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { setRunning(false); setDone(true); return; }
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [running, remaining]);

  const reset = useCallback(() => { setRemaining(seconds); setRunning(false); setDone(false); }, [seconds]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: done ? 'rgba(34,197,94,0.15)' : running ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : running ? 'rgba(249,115,22,0.3)' : 'var(--border)'}`,
        borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600,
        color: done ? '#4ade80' : running ? '#fb923c' : 'var(--text-muted)',
        cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s',
      }}
      onClick={done ? reset : () => setRunning(!running)}
      title={done ? 'Click to reset' : running ? 'Click to pause' : `Start ${label} timer`}
    >
      {done ? '✅' : running ? '⏸' : '⏱'}
      {done ? 'Done!' : running
        ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : label}
    </span>
  );
}

// ── Ingredient List ───────────────────────────────────────────────────────────

function IngredientList({ ingredients, scale }: { ingredients: Ingredient[]; scale: number }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const progress = ingredients.length > 0 ? Math.round((checked.size / ingredients.length) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{checked.size}/{ingredients.length} checked</span>
        <span style={{ fontSize: 12, color: 'var(--accent-start)', fontWeight: 600 }}>{progress}%</span>
      </div>
      <div className="progress-bar" style={{ marginBottom: 16, height: 4 }}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {ingredients.map((ing, i) => (
        <div
          key={i}
          className={`check-item ${checked.has(i) ? 'checked' : ''}`}
          onClick={() => toggle(i)}
          role="checkbox"
          aria-checked={checked.has(i)}
          tabIndex={0}
          onKeyDown={(e) => e.key === ' ' && toggle(i)}
        >
          <div className={`check-box ${checked.has(i) ? 'checked' : ''}`}>
            {checked.has(i) && (
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: 6 }}>
              {scaleAmount(ing.amount, scale)} {ing.unit}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{ing.item}</span>
            {ing.notes && (
              <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>({ing.notes})</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Cook Mode ─────────────────────────────────────────────────────────────────

function CookMode({ instructions, onExit }: { instructions: Instruction[]; onExit: () => void }) {
  const [step, setStep] = useState(0);
  const current = instructions[step];
  const timers = extractTimers(current.text);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: '#080c14',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {instructions.map((_, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 999,
                background: i === step ? 'var(--accent-start)' : i < step ? 'rgba(249,115,22,0.4)' : 'var(--border)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Step {step + 1} of {instructions.length}</span>
        <button onClick={onExit} className="btn btn-ghost btn-sm">✕ Exit Cook Mode</button>
      </div>

      {/* Main step */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', maxWidth: 700, margin: '0 auto', width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--accent-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 900, fontFamily: 'Outfit, sans-serif',
          boxShadow: '0 0 40px var(--accent-glow)',
          marginBottom: 36,
        }}>
          {step + 1}
        </div>

        <p style={{ fontSize: 'clamp(18px, 3vw, 24px)', lineHeight: 1.7, color: 'var(--text-primary)', marginBottom: 32, fontFamily: 'Outfit, sans-serif', fontWeight: 500 }}>
          {current.text}
        </p>

        {/* Timers */}
        {timers.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
            {timers.map((t) => <StepTimer key={t} seconds={t} />)}
          </div>
        )}

        {current.tip && (
          <div style={{ padding: '14px 20px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 'var(--radius-md)', fontSize: 14, color: 'var(--accent-start)', marginBottom: 24, maxWidth: 500 }}>
            💡 {current.tip}
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ padding: '24px', display: 'flex', gap: 16, justifyContent: 'center', borderTop: '1px solid var(--border)' }}>
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn btn-ghost" style={{ minWidth: 120 }}>
          ← Previous
        </button>
        {step < instructions.length - 1 ? (
          <button onClick={() => setStep((s) => s + 1)} className="btn btn-primary" style={{ minWidth: 120 }}>
            Next Step →
          </button>
        ) : (
          <button onClick={onExit} className="btn btn-primary" style={{ minWidth: 120, background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
            🎉 Done!
          </button>
        )}
      </div>
    </div>
  );
}

// ── Instruction List (normal view) ────────────────────────────────────────────

function InstructionList({ instructions }: { instructions: Instruction[] }) {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div>
      {instructions.map((inst) => {
        const timers = extractTimers(inst.text);
        const isActive = activeStep === inst.step;
        return (
          <div
            key={inst.step}
            className="step-card"
            onClick={() => setActiveStep(isActive ? null : inst.step)}
            style={{
              cursor: 'pointer',
              borderColor: isActive ? 'var(--accent-start)' : undefined,
              background: isActive ? 'rgba(249,115,22,0.06)' : undefined,
              transition: 'var(--transition)',
            }}
          >
            <div className="step-number">{inst.step}</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.65 }}>{inst.text}</p>

              {/* Inline timers */}
              {timers.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {timers.map((t) => <StepTimer key={t} seconds={t} />)}
                </div>
              )}

              {inst.tip && isActive && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(249,115,22,0.1)', borderLeft: '3px solid var(--accent-start)', borderRadius: '0 8px 8px 0', fontSize: 13, color: 'var(--accent-start)' }}>
                  💡 {inst.tip}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Scale Selector ────────────────────────────────────────────────────────────

const SCALE_OPTIONS = [
  { label: '½×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
  { label: '4×', value: 4 },
];

// ── Main RecipeDisplay ────────────────────────────────────────────────────────

interface RecipeDisplayProps {
  recipe: Recipe;
}

export default function RecipeDisplay({ recipe }: RecipeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(1);
  const [cookMode, setCookMode] = useState(false);

  const totalTime = recipe.total_time ?? (((recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)) || undefined);

  function copyToClipboard() {
    const text = [
      `# ${recipe.title}`,
      '',
      recipe.servings ? `Serves: ${Math.round(recipe.servings * scale)}` : '',
      '',
      '## Ingredients',
      ...recipe.ingredients.map(
        (i) => `- ${scaleAmount(i.amount, scale)} ${i.unit} ${i.item}${i.notes ? ` (${i.notes})` : ''}`
      ),
      '',
      '## Instructions',
      ...recipe.instructions.map((i) => `${i.step}. ${i.text}`),
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      {cookMode && <CookMode instructions={recipe.instructions} onExit={() => setCookMode(false)} />}

      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Header card ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 32, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f97316, #ef4444)' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              {/* Badges */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {recipe.source_platform && (
                  <span className={`badge ${recipe.source_platform === 'youtube' ? 'badge-orange' : 'badge-blue'}`}>
                    {recipe.source_platform === 'youtube' ? '▶ YouTube' : '🌐 Website'}
                  </span>
                )}
                {recipe.cuisine && <span className="badge badge-purple">{recipe.cuisine}</span>}
                {recipe.difficulty && (
                  <span className={`badge ${recipe.difficulty === 'Easy' ? 'badge-green' : recipe.difficulty === 'Hard' ? 'badge-orange' : 'badge-blue'}`}>
                    {recipe.difficulty}
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>
                {recipe.title}
              </h1>

              {recipe.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.65, maxWidth: 680 }}>
                  {recipe.description}
                </p>
              )}
            </div>

            {/* Cook Mode CTA */}
            <button
              onClick={() => setCookMode(true)}
              className="btn btn-primary"
              style={{ gap: 8, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              👨‍🍳 Start Cooking
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 12, marginTop: 24 }}>
            {[
              { label: 'Prep', value: formatTime(recipe.prep_time), icon: '⚡' },
              { label: 'Cook', value: formatTime(recipe.cook_time), icon: '🔥' },
              { label: 'Total', value: formatTime(totalTime), icon: '⏱' },
              { label: 'Serves', value: recipe.servings ? `${Math.round(recipe.servings * scale)}` : null, icon: '👤' },
            ].filter((s) => s.value).map((stat) => (
              <div key={stat.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Diet tags */}
          {recipe.diet && recipe.diet.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              {recipe.diet.map((d) => <span key={d} className="badge badge-green">{d}</span>)}
            </div>
          )}

          {/* Actions row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={copyToClipboard} className="btn btn-ghost btn-sm">
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
            <button onClick={() => window.print()} className="btn btn-ghost btn-sm">🖨 Print</button>
            {recipe.source_url && (
              <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                🔗 Original
              </a>
            )}
          </div>
        </div>

        {/* ── Serving scaler ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            ⚖️ Serving size
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {SCALE_OPTIONS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setScale(value)}
                style={{
                  padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: scale === value ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.06)',
                  color: scale === value ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                  boxShadow: scale === value ? '0 0 16px var(--accent-glow)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {scale !== 1 && (
            <span style={{ fontSize: 13, color: 'var(--accent-start)', fontWeight: 600 }}>
              Scaled {scale < 1 ? 'down' : 'up'} for {recipe.servings ? Math.round(recipe.servings * scale) : `${scale}×`} servings
            </span>
          )}
        </div>

        {/* ── Two-column content ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(0, 2fr)', gap: 20, alignItems: 'start' }}>
          {/* Ingredients (sticky) */}
          <div className="glass-card" style={{ padding: 24, position: 'sticky', top: 80 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              🧂 Ingredients
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>({recipe.ingredients.length})</span>
            </h2>
            <IngredientList ingredients={recipe.ingredients} scale={scale} />
          </div>

          {/* Instructions */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                📋 Instructions
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>({recipe.instructions.length} steps)</span>
              </h2>
              <button onClick={() => setCookMode(true)} className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
                👨‍🍳 Cook Mode
              </button>
            </div>
            <InstructionList instructions={recipe.instructions} />
          </div>
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="glass-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Tags:</span>
              {recipe.tags.map((tag) => <span key={tag} className="badge badge-blue">{tag}</span>)}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .recipe-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
