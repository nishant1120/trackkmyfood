import { GoogleGenerativeAI } from '@google/generative-ai';

import {
  buildFoodParsePrompt,
  FOOD_PHOTO_PROMPT,
  SYSTEM_PROMPT,
  type ParseFoodResponse,
} from './prompts';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  // We don't throw here — components catch and degrade. Logging once is enough.
  console.warn('EXPO_PUBLIC_GEMINI_API_KEY is missing; LLM calls will fail.');
}

const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// gemini-flash-latest currently resolves to a "thinking" model with a 20/day
// free quota. We pin to 2.5-flash-lite for a 1000/day quota and immediate
// JSON output (no thinking budget eaten before the response).
const TEXT_MODEL = 'gemini-2.5-flash-lite';

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
        maxOutputTokens: opts.maxOutputTokens ?? 1200,
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

// Light validation of the LLM's parsed response before we trust it.
function isParseFoodResponse(x: unknown): x is ParseFoodResponse {
  if (!x || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return false;
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') return false;
    const it = item as Record<string, unknown>;
    if (typeof it.name !== 'string') return false;
    if (typeof it.quantity !== 'number') return false;
    if (typeof it.unit !== 'string') return false;
    if (typeof it.calories_kcal !== 'number') return false;
  }
  return true;
}

// Strip the "data:image/jpeg;base64," prefix that web file readers produce.
function stripDataUrlPrefix(b64: string): { data: string; mime: string } {
  const m = b64.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (m) return { mime: m[1], data: m[2] };
  return { mime: 'image/jpeg', data: b64 };
}

export async function parseFoodPhoto(
  imageBase64: string
): Promise<LLMResult<ParseFoodResponse>> {
  if (!client) {
    return { ok: false, error: { kind: 'no_api_key', message: 'Gemini API key missing' } };
  }
  const { data, mime } = stripDataUrlPrefix(imageBase64);
  try {
    const model = client.getGenerativeModel({
      model: TEXT_MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json',
      },
    });
    const res = await model.generateContent([
      { text: FOOD_PHOTO_PROMPT },
      { inlineData: { mimeType: mime, data } },
    ]);
    const text = res.response.text();
    const parsed = (() => {
      let s = text.trim();
      if (s.startsWith('```')) s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const first = s.indexOf('{');
      const last = s.lastIndexOf('}');
      if (first >= 0 && last > first) s = s.slice(first, last + 1);
      try {
        return JSON.parse(s) as ParseFoodResponse;
      } catch {
        return null;
      }
    })();
    if (!parsed || !isParseFoodResponse(parsed)) {
      return {
        ok: false,
        error: { kind: 'parse', message: `Could not parse JSON: ${text.slice(0, 200)}` },
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

export async function parseFoodText(userInput: string): Promise<LLMResult<ParseFoodResponse>> {
  const result = await callLLMJson<ParseFoodResponse>(
    buildFoodParsePrompt(userInput),
    { maxOutputTokens: 1200 }
  );
  if (!result.ok) return result;
  if (!isParseFoodResponse(result.data)) {
    return {
      ok: false,
      error: {
        kind: 'parse',
        message: 'Gemini returned an unexpected JSON shape.',
      },
    };
  }
  return { ok: true, data: result.data };
}
