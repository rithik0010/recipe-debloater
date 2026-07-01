import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const results: Record<string, unknown> = {};

  try {
    const keys = [
      'GROQ_API_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'JINA_API_KEY',
      'ALLOWED_ORIGIN'
    ];

    const envInfo: Record<string, unknown> = {};

    for (const key of keys) {
      const val = process.env[key];
      if (val === undefined) {
        envInfo[key] = { status: 'MISSING' };
      } else {
        envInfo[key] = {
          status: 'PRESENT',
          length: val.length,
          preview_start: val.slice(0, 4),
          preview_end: val.slice(-4),
          hasWhitespace: /\s/.test(val),
          hasQuotes: val.startsWith('"') || val.endsWith('"') || val.startsWith("'") || val.endsWith("'"),
          hasCarriageReturn: val.includes('\r') || val.includes('\n'),
        };
      }
    }

    results.env = envInfo;
    results.status = 'success';
  } catch (e) {
    results.status = 'error';
    results.error = String(e);
  }

  return NextResponse.json(results, { status: 200 });
}
