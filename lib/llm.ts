import { GoogleGenerativeAI } from '@google/generative-ai';

import { SYSTEM_PROMPT } from './prompts';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  // We don't throw here — components catch and degrade. Logging once is enough.
  console.warn('EXPO_PUBLIC_GEMINI_API_KEY is missing; LLM calls will fail.');
}

const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const TEXT_MODEL = 'gemini-flash-latest';

export type LLMError = {
  kind: 'no_api_key' | 'rate_limit' | 'parse' | 'network' | 'unknown';
  message: string;
};

export type LLMResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: LLMError };

// Strip any ```json fences Gemini occasionally adds, then JSON.parse.
function tryParseJson<T>(raw: string): T | null {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  // Find the first { and last } in case there's leading prose
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export async function callLLMJson<T>(
  userPrompt: string,
  opts: { maxOutputTokens?: number } = {}
): Promise<LLMResult<T>> {
  if (!client) {
    return {
      ok: false,
      error: { kind: 'no_api_key', message: 'Gemini API key missing' },
    };
  }
  try {
    const model = client.getGenerativeModel({
      model: TEXT_MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: opts.maxOutputTokens ?? 600,
        responseMimeType: 'application/json',
      },
    });
    const res = await model.generateContent(userPrompt);
    const text = res.response.text();
    const parsed = tryParseJson<T>(text);
    if (!parsed) {
      return {
        ok: false,
        error: {
          kind: 'parse',
          message: `Could not parse JSON from Gemini: ${text.slice(0, 200)}`,
        },
      };
    }
    return { ok: true, data: parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    if (lower.includes('rate') || lower.includes('quota') || lower.includes('429')) {
      return { ok: false, error: { kind: 'rate_limit', message: msg } };
    }
    if (lower.includes('fetch') || lower.includes('network')) {
      return { ok: false, error: { kind: 'network', message: msg } };
    }
    return { ok: false, error: { kind: 'unknown', message: msg } };
  }
}
