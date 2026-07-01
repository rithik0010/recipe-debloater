import { NextRequest, NextResponse } from 'next/server';
import { getRecipeById } from '@/lib/services/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipe = await getRecipeById(id);
  if (!recipe) {
    return NextResponse.json({ success: false, error: 'Recipe not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, recipe });
}
