// Upstash Redis via REST API — no binary dependencies, works on Vercel edge
import crypto from 'crypto';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL!;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url.toLowerCase().trim()).digest('hex');
}

async function upstash(command: string[]): Promise<unknown> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.warn('⚠️ Upstash not configured — caching disabled');
    return null;
  }
  const res = await fetch(`${UPSTASH_URL}/${command.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const data = await res.json() as { result: unknown };
  return data.result;
}

export async function getCached<T>(url: string): Promise<T | null> {
  try {
    const key = `recipe:${hashUrl(url)}`;
    const result = await upstash(['GET', key]);
    if (result && typeof result === 'string') {
      return JSON.parse(result) as T;
    }
    return null;
  } catch (e) {
    console.error('Cache GET error:', e);
    return null;
  }
}

export async function setCached<T>(url: string, data: T): Promise<void> {
  try {
    const key = `recipe:${hashUrl(url)}`;
    await upstash(['SET', key, JSON.stringify(data), 'EX', String(CACHE_TTL)]);
  } catch (e) {
    console.error('Cache SET error:', e);
  }
}

export async function incrementProviderCount(provider: string): Promise<number> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `provider:${provider}:${today}`;
    const count = await upstash(['INCR', key]);
    // Set TTL on first increment
    await upstash(['EXPIRE', key, '86400']);
    return Number(count) || 0;
  } catch {
    return 0;
  }
}

export async function getProviderCount(provider: string): Promise<number> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `provider:${provider}:${today}`;
    const count = await upstash(['GET', key]);
    return Number(count) || 0;
  } catch {
    return 0;
  }
}
