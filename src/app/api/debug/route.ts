import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const results: Record<string, unknown> = {};

  // 1. Check env vars are set (not placeholders)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  results.env = {
    url_set: !!url,
    anon_key_set: !!anonKey && !anonKey.includes('XXXXXXXX'),
    service_key_set: !!serviceKey && !serviceKey.includes('XXXXXXXX'),
    anon_key_preview: anonKey.slice(0, 40) + '...',
    service_key_preview: serviceKey.slice(0, 40) + '...',
  };

  // 2. Check auth token (if provided)
  const authHeader = req.headers.get('authorization');
  let userId: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const anonClient = createClient(url, anonKey);
      const { data: { user }, error } = await anonClient.auth.getUser(token);
      results.auth = { user_id: user?.id ?? null, email: user?.email ?? null, error: error?.message ?? null };
      userId = user?.id ?? null;
    } catch (e) {
      results.auth = { error: String(e) };
    }
  } else {
    results.auth = { error: 'No Authorization header sent' };
  }

  // 3. Test admin client (service role key)
  try {
    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await adminClient.from('recipes').select('count').limit(1);
    results.admin_db = { ok: !error, error: error?.message ?? null, data };
  } catch (e) {
    results.admin_db = { ok: false, error: String(e) };
  }

  // 4. Try to fetch recipes for this user
  if (userId) {
    try {
      const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
      const { data, error, count } = await adminClient
        .from('recipes')
        .select('id, title, source_url, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      results.user_recipes = { count, error: error?.message ?? null, rows: data };
    } catch (e) {
      results.user_recipes = { error: String(e) };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
