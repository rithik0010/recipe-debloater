import { Recipe } from '@/lib/types';
import { extractYouTubeId } from '@/lib/utils/urlDetector';
import { parseRecipeFromText } from './aiParser';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_AUDIO_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// ─── Main entry point ────────────────────────────────────────────────────────

export async function extractVideoRecipe(url: string): Promise<Recipe> {
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

  // Step 2: If no captions, use Groq Whisper
  if (!transcript) {
    try {
      const audioResult = await transcribeVideoAudio(url);
      transcript = audioResult.transcript;
      title = audioResult.title || '';
      console.log('✅ Used Groq Whisper transcription');
    } catch (err) {
      throw new Error(
        `Failed to extract video content: ${err instanceof Error ? err.message : String(err)}`
      );
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

async function fetchYouTubeCaptions(
  url: string
): Promise<{ transcript: string; title: string }> {
  const { YoutubeTranscript } = await import('youtube-transcript');

  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error('Could not extract video ID from URL');

  const entries = await YoutubeTranscript.fetchTranscript(videoId);
  const transcript = entries
    .map((e: { text: string }) => e.text.replace(/\[.*?\]/g, '').trim())
    .filter(Boolean)
    .join(' ');

  // Get title via YouTube oEmbed (no auth required)
  let title = '';
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (oembedRes.ok) {
      const oembedData = (await oembedRes.json()) as { title?: string };
      title = oembedData.title ?? '';
    }
  } catch {
    // title stays empty
  }

  return { transcript: transcript.slice(0, 15000), title };
}

// ─── Groq Whisper Transcription via ytdl-core ────────────────────────────────

async function transcribeVideoAudio(
  url: string
): Promise<{ transcript: string; title: string }> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  const ytdl = await import('@distube/ytdl-core');

  // Validate YouTube URL
  if (!ytdl.default.validateURL(url)) {
    throw new Error('Not a valid YouTube URL for audio extraction');
  }

  // Get video info
  const info = await ytdl.default.getInfo(url);
  const title = info.videoDetails.title || '';

  // Choose best audio-only format under 25MB (Groq limit)
  const audioFormats = ytdl.default
    .filterFormats(info.formats, 'audioonly')
    .sort((a, b) => (Number(b.audioBitrate) || 0) - (Number(a.audioBitrate) || 0));

  if (!audioFormats.length) {
    throw new Error('No audio stream found for this video');
  }

  // Use lowest bitrate (smallest file) to stay under Groq 25MB limit
  const format = audioFormats[audioFormats.length - 1];

  // Stream audio and collect into buffer (Vercel /tmp or in-memory)
  const audioStream = ytdl.default(url, { format });
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    audioStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    audioStream.on('end', resolve);
    audioStream.on('error', reject);
  });

  const audioBuffer = Buffer.concat(chunks);

  if (audioBuffer.length > 25 * 1024 * 1024) {
    throw new Error('Audio file too large for Groq Whisper (>25MB). Use shorter videos.');
  }

  // Send to Groq Whisper API
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/mp4' }), 'audio.mp4');
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
    throw new Error(`Groq Whisper failed: ${whisperRes.status} — ${errText.slice(0, 300)}`);
  }

  const transcript = await whisperRes.text();
  return { transcript: transcript.slice(0, 15000), title };
}
