import { Recipe } from '@/lib/types';
import { extractYouTubeId } from '@/lib/utils/urlDetector';
import { parseRecipeFromText } from './aiParser';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_AUDIO_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// ─── Main entry point ────────────────────────────────────────────────────────

export async function extractVideoRecipe(url: string): Promise<Recipe> {
  const videoId = extractYouTubeId(url) || url;

  // Step 1: Try free YouTube captions first (instant, no quota used)
  let transcript = '';
  let title = '';

  try {
    const captionResult = await fetchYouTubeCaptions(url);
    transcript = captionResult.transcript;
    title = captionResult.title;
    console.log('✅ Used YouTube captions');
  } catch (err) {
    console.log('❌ No captions available, falling back to audio transcription:', err);
  }

  // Step 2: If no captions, use Groq Whisper via YouTube audio stream
  if (!transcript) {
    try {
      const audioResult = await transcribeVideoAudio(url);
      transcript = audioResult.transcript;
      title = audioResult.title || videoId;
      console.log('✅ Used Groq Whisper transcription');
    } catch (err) {
      throw new Error(`Failed to extract video audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!transcript || transcript.length < 50) {
    throw new Error('Could not extract meaningful content from this video');
  }

  // Step 3: Parse recipe from transcript using Groq LLM
  const recipe = await parseRecipeFromText(transcript, 'video', title);
  return recipe;
}

// ─── YouTube Captions (via youtube-transcript) ───────────────────────────────

async function fetchYouTubeCaptions(url: string): Promise<{ transcript: string; title: string }> {
  // Dynamic import to keep bundle lean
  const { YoutubeTranscript } = await import('youtube-transcript');

  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error('Could not extract video ID from URL');

  const entries = await YoutubeTranscript.fetchTranscript(videoId);
  const transcript = entries.map((e: { text: string }) => e.text).join(' ');

  // Get title from oEmbed (no auth needed)
  let title = '';
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json() as { title?: string };
      title = oembedData.title || '';
    }
  } catch {
    // title stays empty, that's fine
  }

  return { transcript, title };
}

// ─── Groq Whisper Transcription ──────────────────────────────────────────────

async function transcribeVideoAudio(url: string): Promise<{ transcript: string; title: string }> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  // Fetch audio stream from YouTube using yt-dlp's JSON API
  // On Vercel, we use the yt-dlp-wrap npm package which ships the binary
  const { default: YTDlpWrap } = await import('yt-dlp-wrap');
  const ytDlp = new YTDlpWrap();

  // Get video info first (no download)
  const videoInfo = await ytDlp.getVideoInfo(url);
  const title = videoInfo.title || '';

  // Get best audio-only stream URL (no local download needed — we stream)
  const audioFormats = (videoInfo.formats || []).filter(
    (f: { acodec?: string; vcodec?: string; url?: string }) =>
      f.acodec !== 'none' && (f.vcodec === 'none' || !f.vcodec) && f.url
  );

  if (!audioFormats.length) {
    throw new Error('No audio-only stream found for this video');
  }

  // Sort by quality and pick best under 25MB (Groq limit)
  const sorted = audioFormats.sort(
    (a: { filesize?: number }, b: { filesize?: number }) =>
      (b.filesize ?? Infinity) - (a.filesize ?? Infinity)
  );
  const bestAudio = sorted.find(
    (f: { filesize?: number }) => !f.filesize || f.filesize < 24 * 1024 * 1024
  ) || sorted[sorted.length - 1];

  if (!bestAudio?.url) throw new Error('Could not get audio stream URL');

  // Stream audio directly to Groq Whisper (no disk I/O on Vercel)
  const audioRes = await fetch(bestAudio.url, { signal: AbortSignal.timeout(60000) });
  if (!audioRes.ok) throw new Error(`Failed to fetch audio stream: ${audioRes.status}`);

  const audioBlob = await audioRes.blob();

  // Send to Groq Whisper API
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'text');

  const whisperRes = await fetch(GROQ_AUDIO_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData,
    signal: AbortSignal.timeout(120000),
  });

  if (!whisperRes.ok) {
    const errText = await whisperRes.text();
    throw new Error(`Groq Whisper failed: ${whisperRes.status} — ${errText.slice(0, 200)}`);
  }

  const transcript = await whisperRes.text();
  return { transcript: transcript.slice(0, 15000), title };
}
