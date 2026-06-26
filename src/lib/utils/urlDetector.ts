import { UrlType } from '@/lib/types';

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?v=/,
  /youtu\.be\//,
  /youtube\.com\/shorts\//,
  /youtube\.com\/embed\//,
];

const VIDEO_PATTERNS = [
  /vimeo\.com\//,
  /tiktok\.com\//,
  /instagram\.com\/(reels|p)\//,
  /dailymotion\.com\/video\//,
  /twitch\.tv\//,
];

export function detectUrlType(url: string): UrlType {
  const normalized = url.toLowerCase();
  if (YOUTUBE_PATTERNS.some((p) => p.test(normalized))) return 'youtube';
  if (VIDEO_PATTERNS.some((p) => p.test(normalized))) return 'video';
  return 'website';
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove tracking params
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'ref'].forEach(
      (param) => parsed.searchParams.delete(param)
    );
    return parsed.toString();
  } catch {
    return url;
  }
}
