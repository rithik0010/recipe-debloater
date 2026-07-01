import { getProviderCount, incrementProviderCount } from './cache';

// ─── Provider definitions ───────────────────────────────────────────────────
const PROVIDERS = [
  {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: () => process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    dailyLimit: 950, // stay under 1000 with buffer
  },
  {
    name: 'cerebras',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    key: () => process.env.CEREBRAS_API_KEY,
    model: 'llama-3.3-70b',
    dailyLimit: 480,
  },
  {
    name: 'google',
    // Google uses OpenAI-compatible endpoint via AI Studio
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    key: () => process.env.GOOGLE_AI_API_KEY,
    model: 'gemini-2.0-flash',
    dailyLimit: 1400,
  },
  {
    name: 'nvidia',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    key: () => process.env.NVIDIA_API_KEY,
    model: 'meta/llama-3.3-70b-instruct',
    dailyLimit: 950,
  },
] as const;

// ─── Main router ────────────────────────────────────────────────────────────

export async function callFreeLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const errors: string[] = [];

  for (const provider of PROVIDERS) {
    const apiKey = provider.key();
    const isPlaceholder = !apiKey || apiKey.length < 10 || apiKey === 'xxx';
    if (isPlaceholder) {
      errors.push(`${provider.name}: no API key configured`);
      continue;
    }

    // Check daily usage from Upstash
    const count = await getProviderCount(provider.name);
    if (count >= provider.dailyLimit) {
      errors.push(`${provider.name}: daily limit reached (${count}/${provider.dailyLimit})`);
      console.log(`⚠️  ${provider.name} limit reached, trying next provider...`);
      continue;
    }

    try {
      const res = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 2500,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errBody = await res.text();
        errors.push(`${provider.name}: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
        console.error(`❌ ${provider.name} error:`, res.status, errBody.slice(0, 200));
        continue;
      }

      const data = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        errors.push(`${provider.name}: empty response content`);
        continue;
      }

      // Increment usage counter
      await incrementProviderCount(provider.name);
      console.log(`✅ Used ${provider.name} (count: ${count + 1}/${provider.dailyLimit})`);
      return content;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.name}: ${msg}`);
      console.error(`❌ ${provider.name} threw:`, msg);
    }
  }

  throw new Error(
    `All AI providers exhausted or failed:\n${errors.map((e) => `  • ${e}`).join('\n')}`
  );
}
