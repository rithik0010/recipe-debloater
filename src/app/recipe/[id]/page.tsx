'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import RecipeDisplay from '@/components/RecipeDisplay';
import { Recipe } from '@/lib/types';

export default function RecipePage() {
  const params = useParams();
  const id = params?.id as string;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((data: { success: boolean; recipe: Recipe; error?: string }) => {
        if (data.success && data.recipe) {
          setRecipe(data.recipe);
        } else {
          setError(data.error ?? 'Recipe not found');
        }
      })
      .catch(() => setError('Failed to load recipe'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ marginBottom: 24, display: 'inline-flex' }}>
          ← Back to Dashboard
        </Link>

        {loading && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading recipe...</p>
          </div>
        )}

        {error && !loading && (
          <div style={{
            textAlign: 'center',
            padding: 80,
            color: 'var(--text-secondary)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 24, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              Recipe not found
            </h2>
            <p>{error}</p>
            <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
              Go to Dashboard
            </Link>
          </div>
        )}

        {recipe && !loading && (
          <RecipeDisplay recipe={recipe} />
        )}
      </div>
    </>
  );
}
