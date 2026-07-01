import { createClient } from '@supabase/supabase-js';
import { Recipe } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side admin client (bypasses RLS)
export function getAdminSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

// Public client for browser/anon usage
export function getSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

// ─── Recipes ───

export async function saveRecipe(recipe: Recipe, userId: string): Promise<Recipe | null> {
  const db = getAdminSupabase();

  // Check if this user already has this recipe saved (avoid duplicates)
  const { data: existing } = await db
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .eq('source_url', recipe.source_url)
    .maybeSingle();

  if (existing) {
    return existing as Recipe;
  }

  const { data, error } = await db
    .from('recipes')
    .insert({
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      total_time: recipe.total_time,
      servings: recipe.servings,
      cuisine: recipe.cuisine,
      diet: recipe.diet,
      difficulty: recipe.difficulty,
      tags: recipe.tags,
      image_url: recipe.image_url,
      source_url: recipe.source_url,
      source_platform: recipe.source_platform,
      video_duration: recipe.video_duration,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('saveRecipe error:', error.message);
    return null;
  }
  return data as Recipe;
}

export async function getUserRecipes(userId: string): Promise<Recipe[]> {
  const db = getAdminSupabase();
  const { data, error } = await db
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getUserRecipes error:', error.message);
    return [];
  }
  return (data ?? []) as Recipe[];
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const db = getAdminSupabase();
  const { data, error } = await db.from('recipes').select('*').eq('id', id).single();
  if (error) return null;
  return data as Recipe;
}

export async function deleteRecipe(id: string, userId: string): Promise<boolean> {
  const db = getAdminSupabase();
  const { error } = await db.from('recipes').delete().eq('id', id).eq('user_id', userId);
  return !error;
}

// ─── Rate limiting ───

export async function getExtractionCount(userId: string): Promise<number> {
  const db = getAdminSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await db
    .from('extractions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`);
  return count ?? 0;
}

export async function logExtraction(userId: string, url: string): Promise<void> {
  const db = getAdminSupabase();
  await db.from('extractions').insert({ user_id: userId, url });
}

// ─── User profiles ───

export async function getUserProfile(userId: string) {
  const db = getAdminSupabase();
  const { data } = await db.from('profiles').select('*').eq('id', userId).single();
  return data;
}

export async function updateUserPlan(userId: string, plan: 'free' | 'pro'): Promise<void> {
  const db = getAdminSupabase();
  await db.from('profiles').update({ plan }).eq('id', userId);
}
