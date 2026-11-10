import 'server-only';
import type {Locale} from '@/types';

/**
 * Gemini and Sarvam, called only from the server. Keys come from .env and never reach the browser.
 * Every function throws ProviderError with a plain reason the UI can show; key values never appear in it.
 */

export type ProviderStatus = 'connected' | 'missing_key' | 'invalid_key' | 'no_credits' | 'error';

export class ProviderError extends Error {
  constructor(
    public status: ProviderStatus,
    message: string
  ) {
    super(message);
  }
}

function env(name: string) {
  const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
  return value ? value : undefined;
}

export function providerKeys() {
  return {gemini: Boolean(env('GEMINI_API_KEY')), sarvam: Boolean(env('SARVAM_API_KEY'))};
}

const sarvamLanguage: Record<Locale, string> = {en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', gu: 'gu-IN'};

async function readError(response: Response) {
  try {
    const body = (await response.json()) as {error?: {message?: string; status?: string; code?: string}};
    return body.error?.message ?? body.error?.code ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

const geminiBase = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiModel {
  name: string;
  supportedGenerationMethods?: string[];
}

let modelCache: {at: number; models: string[]} | null = null;

export async function geminiModels(): Promise<string[]> {
  const key = env('GEMINI_API_KEY');
  if (!key) throw new ProviderError('missing_key', 'GEMINI_API_KEY is empty');
  if (modelCache && Date.now() - modelCache.at < 10 * 60_000) return modelCache.models;
  const response = await fetch(`${geminiBase}/models?pageSize=200`, {headers: {'x-goog-api-key': key}, cache: 'no-store'});
  if (!response.ok) {
    const message = await readError(response);
    const invalid = response.status === 400 || response.status === 401 || response.status === 403;
    throw new ProviderError(invalid ? 'invalid_key' : 'error', message);
  }
  const body = (await response.json()) as {models?: GeminiModel[]};
  const models = (body.models ?? [])
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
    .map((model) => model.name.replace(/^models\//, ''));
  modelCache = {at: Date.now(), models};
  return models;
}

/** GEMINI_MODEL_CHAT if set; otherwise the newest stable "flash" text model this key can use. */
export async function geminiChatModel() {
  const configured = env('GEMINI_MODEL_CHAT');
  if (configured) return configured;
  const models = await geminiModels();
  const version = (name: string) => Number(name.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  const stableFlash = models
    .filter((name) => /^gemini-[\d.]+-flash$/.test(name))
    .sort((left, right) => version(right) - version(left));
  const anyFlash = models
    .filter((name) => /flash/.test(name) && !/lite|image|tts|audio|live|embed|thinking|exp/.test(name))
    .sort((left, right) => version(right) - version(left));
  const chosen = stableFlash[0] ?? anyFlash[0] ?? models.find((name) => name.startsWith('gemini'));
  if (!chosen) throw new ProviderError('error', 'No Gemini text model is available for this key');
  return chosen;
}

export async function geminiAnswer({system, prompt}: {system: string; prompt: string}) {
  const key = env('GEMINI_API_KEY');
  if (!key) throw new ProviderError('missing_key', 'GEMINI_API_KEY is empty');
  const model = await geminiChatModel();
  const response = await fetch(`${geminiBase}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {'x-goog-api-key': key, 'content-type': 'application/json'},
    body: JSON.stringify({
      systemInstruction: {parts: [{text: system}]},
      contents: [{role: 'user', parts: [{text: prompt}]}],
      generationConfig: {temperature: 0.2, maxOutputTokens: 2048}
    }),
    cache: 'no-store'
  });
  if (!response.ok) {
    const message = await readError(response);
    throw new ProviderError(response.status === 401 || response.status === 403 ? 'invalid_key' : 'error', message);
  }
  const body = (await response.json()) as {candidates?: Array<{content?: {parts?: Array<{text?: string; thought?: boolean}>}}>};
  const text = (body.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) throw new ProviderError('error', 'Gemini returned an empty answer');
  return {text, model};
}

// ---------------------------------------------------------------------------
// Sarvam
// ---------------------------------------------------------------------------

const sarvamBase = 'https://api.sarvam.ai';

function sarvamKey() {
  const key = env('SARVAM_API_KEY');
  if (!key) throw new ProviderError('missing_key', 'SARVAM_API_KEY is empty');
  return key;
}

async function sarvamFailure(response: Response): Promise<never> {
  const message = await readError(response);
  if (response.status === 403 || response.status === 401) throw new ProviderError('invalid_key', message);
  if (response.status === 402) throw new ProviderError('no_credits', message);
  throw new ProviderError('error', message);
}

/**
 * Checks the key without spending credit: an empty request is rejected as invalid input (400/422)
 * when the key is good, and with 403 when it is not.
 */
export async function sarvamCheck() {
  const response = await fetch(`${sarvamBase}/text-to-speech`, {
    method: 'POST',
    headers: {'api-subscription-key': sarvamKey(), 'content-type': 'application/json'},
    body: '{}',
    cache: 'no-store'
  });
  if (response.status === 400 || response.status === 422 || response.ok) return;
  await sarvamFailure(response);
}

export function sarvamTtsModel() {
  return env('SARVAM_TTS_MODEL') ?? 'bulbul:v3';
}

export function sarvamSttModel() {
  return env('SARVAM_STT_MODEL') ?? 'saaras:v4';
}

export async function sarvamSpeak(text: string, locale: Locale) {
  const speaker = env(`SARVAM_TTS_SPEAKER_${locale.toUpperCase()}`);
  const response = await fetch(`${sarvamBase}/text-to-speech`, {
    method: 'POST',
    headers: {'api-subscription-key': sarvamKey(), 'content-type': 'application/json'},
    body: JSON.stringify({
      text,
      language_code: sarvamLanguage[locale],
      model: sarvamTtsModel(),
      ...(speaker ? {speaker} : {}),
      pace: 0.95,
      output_audio_codec: 'mp3'
    }),
    cache: 'no-store'
  });
  if (!response.ok) await sarvamFailure(response);
  const body = (await response.json()) as {audios?: string[]};
  const audio = body.audios?.[0];
  if (!audio) throw new ProviderError('error', 'Sarvam returned no audio');
  return Buffer.from(audio, 'base64');
}

export async function sarvamTranscribe(audio: Blob, locale: Locale) {
  const form = new FormData();
  const extension = ['mp4', 'ogg', 'mpeg', 'mp3', 'wav', 'aac', 'flac'].find((type) => audio.type.includes(type)) ?? 'webm';
  form.append('file', audio, `speech.${extension === 'mpeg' ? 'mp3' : extension}`);
  form.append('model', sarvamSttModel());
  form.append('language_code', sarvamLanguage[locale]);
  const response = await fetch(`${sarvamBase}/speech-to-text`, {
    method: 'POST',
    headers: {'api-subscription-key': sarvamKey()},
    body: form,
    cache: 'no-store'
  });
  if (!response.ok) await sarvamFailure(response);
  const body = (await response.json()) as {transcript?: string};
  return (body.transcript ?? '').trim();
}
