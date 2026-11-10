import {NextResponse} from 'next/server';
import {ProviderError, sarvamTranscribe} from '@/server/ai/providers';
import {getCurrentUser} from '@/server/session';
import type {Locale} from '@/types';

const locales: Locale[] = ['en', 'hi', 'mr', 'gu'];
const maxBytes = 4 * 1024 * 1024;

/** Turns a short recording (up to about 30 seconds) into text with Sarvam, in the person's language. */
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({code: 'UNAUTHENTICATED'}, {status: 401});
  const form = await request.formData().catch(() => null);
  const audio = form?.get('audio');
  const locale = form?.get('locale');
  if (!(audio instanceof Blob) || audio.size === 0 || audio.size > maxBytes || typeof locale !== 'string' || !locales.includes(locale as Locale)) {
    return NextResponse.json({code: 'INVALID_INPUT'}, {status: 400});
  }
  try {
    const text = await sarvamTranscribe(audio, locale as Locale);
    return NextResponse.json({text});
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 'error';
    const detail = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ai] ${new URL(request.url).pathname}: ${status}: ${detail}`);
    // The provider's own message (never the key), so the owner can see what to fix.
    return NextResponse.json({code: status, detail}, {status: status === 'missing_key' ? 501 : 502});
  }
}
