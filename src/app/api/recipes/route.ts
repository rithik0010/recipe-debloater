import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserRecipes, deleteRecipe } from '@/lib/services/db';

async function getUserFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.id ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const recipes = await getUserRecipes(userId);
  return NextResponse.json({ success: true, recipes });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const recipeId = searchParams.get('id');
  if (!recipeId) {
    return NextResponse.json({ success: false, error: 'Recipe ID required' }, { status: 400 });
  }

  const ok = await deleteRecipe(recipeId, userId);
  if (!ok) {
    return NextResponse.json({ success: false, error: 'Failed to delete recipe' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
