'use client';

import Link from 'next/link';
import { Recipe } from '@/lib/types';

const CUISINE_COLORS: Record<string, string> = {
  Italian: 'badge-orange',
  Mexican: 'badge-green',
  Chinese: 'badge-blue',
  Japanese: 'badge-purple',
  Indian: 'badge-orange',
  American: 'badge-blue',
  French: 'badge-purple',
  Thai: 'badge-green',
};

function formatTime(minutes?: number) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function PlatformBadge({ platform }: { platform?: string }) {
  if (!platform) return null;
  return (
    <span className={`badge ${platform === 'youtube' ? 'badge-orange' : 'badge-blue'}`}>
      {platform === 'youtube' ? '▶ YouTube' : '🌐 Website'}
    </span>
  );
}

interface RecipeCardProps {
  recipe: Recipe;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export default function RecipeCard({ recipe, onDelete, compact = false }: RecipeCardProps) {
  const totalTime = recipe.total_time ?? (
    (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0) || undefined
  );

  const cuisineColor = recipe.cuisine
    ? CUISINE_COLORS[recipe.cuisine] ?? 'badge-purple'
    : 'badge-purple';

  return (
    <div
      className="glass-card"
      style={{
        padding: compact ? 16 : 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle top gradient accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: 'linear-gradient(90deg, #f97316, #ef4444)',
        borderRadius: '20px 20px 0 0',
      }} />

      {/* Platform + Cuisine badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        <PlatformBadge platform={recipe.source_platform} />
        {recipe.cuisine && (
          <span className={`badge ${cuisineColor}`}>{recipe.cuisine}</span>
        )}
        {recipe.difficulty && (
          <span className={`badge ${
            recipe.difficulty === 'Easy' ? 'badge-green' :
            recipe.difficulty === 'Hard' ? 'badge-orange' : 'badge-blue'
          }`}>
            {recipe.difficulty}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: compact ? 15 : 18,
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1.3,
        fontFamily: 'Outfit, sans-serif',
      }}>
        {recipe.title}
      </h3>

      {/* Description */}
      {!compact && recipe.description && (
        <p style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {recipe.description}
        </p>
      )}

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        color: 'var(--text-secondary)',
        fontSize: 13,
      }}>
        {totalTime && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>⏱</span> {formatTime(totalTime)}
          </span>
        )}
        {recipe.servings && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>👤</span> {recipe.servings} servings
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>📋</span> {recipe.ingredients.length} ingredients
        </span>
      </div>

      {/* Diet tags */}
      {!compact && recipe.diet && recipe.diet.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {recipe.diet.slice(0, 3).map((d) => (
            <span key={d} className="badge badge-green">{d}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {recipe.id && (
          <Link
            href={`/recipe/${recipe.id}`}
            className="btn btn-primary btn-sm"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            View Recipe
          </Link>
        )}
        {recipe.source_url && (
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm tooltip"
            data-tip="View original"
            style={{ padding: '8px 12px' }}
          >
            🔗
          </a>
        )}
        {onDelete && recipe.id && (
          <button
            onClick={() => onDelete(recipe.id!)}
            className="btn btn-ghost btn-sm tooltip"
            data-tip="Delete recipe"
            style={{ padding: '8px 12px', color: 'var(--error)' }}
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}
