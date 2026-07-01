import { NextRequest, NextResponse } from 'next/server';

// Vercel: allow up to 60 seconds for video/website extraction
export const maxDuration = 60;
import { detectUrlType, normalizeUrl } from '@/lib/utils/urlDetector';
import { scrapeWebsite } from '@/lib/services/scraper';
import { extractVideoRecipe } from '@/lib/services/videoExtractor';
import { parseRecipeFromText } from '@/lib/services/aiParser';
import { getCached, setCached } from '@/lib/services/cache';
import { saveRecipe, getExtractionCount, logExtraction, getUserProfile, getSupabase } from '@/lib/services/db';
import { Recipe } from '@/lib/types';

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 200;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url?: string };
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ success: false, error: 'Only HTTP/HTTPS URLs are supported' }, { status: 400 });
    }

    // ─── Auth (optional — allow guest extraction with strict limits) ──────────
    let userId: string | null = null;
    let userPlan: 'free' | 'pro' = 'free';

    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        const profile = await getUserProfile(user.id);
        userPlan = profile?.plan ?? 'free';
      }
    }

    // ─── Rate limiting ────────────────────────────────────────────────────────
    if (userId) {
      const dailyLimit = userPlan === 'pro' ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
      const extractionCount = await getExtractionCount(userId);
      if (extractionCount >= dailyLimit) {
        return NextResponse.json(
          {
            success: false,
            error: `Daily limit reached (${dailyLimit} extractions/day). ${
              userPlan === 'free' ? 'Upgrade to Pro for 200 extractions/day.' : 'Contact support.'
            }`,
            limitReached: true,
            plan: userPlan,
          },
          { status: 429 }
        );
      }
    }

    // ─── Cache check ──────────────────────────────────────────────────────────
    const normalizedUrl = normalizeUrl(url);
    const cached = await getCached<Recipe>(normalizedUrl);
    if (cached) {
      console.log('✅ Cache hit for:', normalizedUrl);

      // Even on a cache hit, we still need to save the recipe for this user
      // if they haven't extracted it before (so it appears in their cookbook).
      if (userId) {
        await logExtraction(userId, normalizedUrl);
        const savedFromCache = await saveRecipe(cached, userId);
        if (savedFromCache?.id) cached.id = savedFromCache.id;
      }

      return NextResponse.json({ success: true, recipe: cached, fromCache: true });
    }

    // ─── URL type detection ───────────────────────────────────────────────────
    const urlType = detectUrlType(normalizedUrl);
    console.log(`🔍 URL type: ${urlType} → ${normalizedUrl}`);

    let recipe: Recipe;

    if (urlType === 'youtube' || urlType === 'video') {
      // ─── Video pipeline ───────────────────────────────────────────────────
      recipe = await extractVideoRecipe(normalizedUrl);
      recipe.source_url = normalizedUrl;
      recipe.source_platform = urlType === 'youtube' ? 'youtube' : 'other';
    } else {
      // ─── Website pipeline ─────────────────────────────────────────────────
      const content = await scrapeWebsite(normalizedUrl);
      recipe = await parseRecipeFromText(content, 'website');
      recipe.source_url = normalizedUrl;
      recipe.source_platform = 'website';
    }

    // ─── Cache + persist ──────────────────────────────────────────────────────
    await setCached(normalizedUrl, recipe);

    if (userId) {
      await logExtraction(userId, normalizedUrl);
      const saved = await saveRecipe(recipe, userId);
      if (saved?.id) recipe.id = saved.id;
    }

    return NextResponse.json({ success: true, recipe, fromCache: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ /api/extract error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
