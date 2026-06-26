// Jina Reader API — free website scraping, no API key needed for basic use
// Converts any webpage into clean markdown, stripping ads and clutter

const JINA_BASE = 'https://r.jina.ai';
const JINA_API_KEY = process.env.JINA_API_KEY; // optional for higher limits

export async function scrapeWebsite(url: string): Promise<string> {
  const jinaUrl = `${JINA_BASE}/${url}`;

  const headers: Record<string, string> = {
    Accept: 'text/plain',
    'X-Return-Format': 'markdown',
    'X-Remove-Selector': 'nav, footer, .ad, .advertisement, .sidebar, #comments, .social-share',
  };

  if (JINA_API_KEY) {
    headers['Authorization'] = `Bearer ${JINA_API_KEY}`;
  }

  const res = await fetch(jinaUrl, { headers, signal: AbortSignal.timeout(30000) });

  if (!res.ok) {
    throw new Error(`Jina Reader failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();

  if (!text || text.length < 100) {
    throw new Error('Jina returned empty or too-short content');
  }

  // Trim to max 15,000 chars to stay within Groq token limits
  return text.slice(0, 15000);
}
