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
let lastGoodModel: string | null = null;

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
/**
 * Text models to try, best first: GEMINI_MODEL_CHAT if set, then the newest stable "flash" models.
 * A busy model hands over to the next one instead of failing the question.
 */
export async function geminiChatModels() {
  const configured = env('GEMINI_MODEL_CHAT');
  const models = await geminiModels();
  const version = (name: string) => Number(name.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  const stableFlash = models
    .filter((name) => /^gemini-[\d.]+-flash$/.test(name))
    .sort((left, right) => version(right) - version(left));
  const anyFlash = models
    .filter((name) => /flash/.test(name) && !/lite|image|tts|audio|live|embed|thinking|exp/.test(name))
    .sort((left, right) => version(right) - version(left));
  const ranked = [...new Set([...(configured ? [configured] : []), ...stableFlash, ...anyFlash])].slice(0, 3);
  // The model that answered last goes first while it keeps answering (newest models are often the busiest).
  if (lastGoodModel && ranked.includes(lastGoodModel)) return [lastGoodModel, ...ranked.filter((name) => name !== lastGoodModel)];
  if (!ranked.length) throw new ProviderError('error', 'No Gemini text model is available for this key');
  return ranked;
}

export async function geminiChatModel() {
  return (await geminiChatModels())[0];
}

type GeminiReply = {candidates?: Array<{content?: {parts?: Array<{text?: string; thought?: boolean}>}}>};

/** Short answers from given facts need little reasoning; less thinking answers much faster. */
function thinkingFor(model: string) {
  if (/^gemini-([3-9]|\d{2})/.test(model)) return {thinkingConfig: {thinkingLevel: 'low'}};
  if (/^gemini-2\.5-flash/.test(model)) return {thinkingConfig: {thinkingBudget: 0}};
  return {};
}

async function askModel(key: string, model: string, system: string, prompt: string, signal: AbortSignal) {
  const startedAt = Date.now();
  const send = (withThinking: boolean) =>
    fetch(`${geminiBase}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {'x-goog-api-key': key, 'content-type': 'application/json'},
      body: JSON.stringify({
        systemInstruction: {parts: [{text: system}]},
        contents: [{role: 'user', parts: [{text: prompt}]}],
        generationConfig: {temperature: 0.2, maxOutputTokens: 2048, ...(withThinking ? thinkingFor(model) : {})}
      }),
      cache: 'no-store',
      signal
    });
  let response = await send(true);
  // A model that doesn't take the thinking setting is asked again without it.
  if (response.status === 400 && Object.keys(thinkingFor(model)).length) response = await send(false);
  if (!response.ok) {
    const message = await readError(response);
    console.info(`[ai] gemini ${model}: ${response.status} in ${Date.now() - startedAt}ms: ${message}`);
    throw new ProviderError(response.status === 401 || response.status === 403 ? 'invalid_key' : 'error', `${model}: ${message}`);
  }
  const body = (await response.json()) as GeminiReply;
  const text = (body.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  console.info(`[ai] gemini ${model}: ${response.status} in ${Date.now() - startedAt}ms`);
  if (!text) throw new ProviderError('error', `${model} returned an empty answer`);
  return {text, model};
}

/**
 * Asks the best model first. If it is busy or slow, the next model is asked after a short wait too,
 * and the first good answer wins. A busy model then costs about three seconds instead of the whole answer.
 */
export async function geminiAnswer({system, prompt}: {system: string; prompt: string}) {
  const key = env('GEMINI_API_KEY');
  if (!key) throw new ProviderError('missing_key', 'GEMINI_API_KEY is empty');
  const models = await geminiChatModels();
  const controller = new AbortController();
  const staggerMs = 3000;
  const overallMs = 30_000;

  return new Promise<{text: string; model: string}>((resolve, reject) => {
    let started = 0;
    let running = 0;
    let settled = false;
    let lastError: unknown = null;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const finish = (outcome: () => void) => {
      if (settled) return;
      settled = true;
      timers.forEach(clearTimeout);
      controller.abort();
      outcome();
    };

    const launch = () => {
      if (settled || started >= models.length) return;
      const model = models[started++];
      running += 1;
      askModel(key, model, system, prompt, controller.signal)
        .then((result) => {
          lastGoodModel = result.model;
          finish(() => resolve(result));
        })
        .catch((error: unknown) => {
          running -= 1;
          if (settled) return;
          lastError = error;
          if (error instanceof ProviderError && error.status === 'invalid_key') return finish(() => reject(error));
          launch();
          if (running === 0 && started >= models.length) finish(() => reject(lastError));
        });
    };

    launch();
    for (let index = 1; index < models.length; index += 1) timers.push(setTimeout(launch, staggerMs * index));
    timers.push(
      setTimeout(() => {
        console.info(`[ai] gemini: no answer within ${overallMs}ms`);
        finish(() => reject(new ProviderError('error', 'Gemini did not answer in time')));
      }, overallMs)
    );
  });
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
