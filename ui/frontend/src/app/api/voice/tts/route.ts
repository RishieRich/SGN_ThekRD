import {NextResponse} from 'next/server';
import {z} from 'zod';
import {ProviderError, sarvamSpeak} from '@/server/ai/providers';
import {getCurrentUser} from '@/server/session';

const requestSchema = z.object({
  text: z.string().trim().min(1).max(1500),
  locale: z.enum(['en', 'hi', 'mr', 'gu'])
});

/** Speaks a sentence with Sarvam in the person's language. The browser falls back to its own voice on any error. */
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({code: 'UNAUTHENTICATED'}, {status: 401});
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({code: 'INVALID_INPUT'}, {status: 400});
  try {
    const audio = await sarvamSpeak(parsed.data.text, parsed.data.locale);
    return new NextResponse(new Uint8Array(audio), {headers: {'content-type': 'audio/mpeg', 'cache-control': 'private, max-age=86400'}});
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 'error';
    return NextResponse.json({code: status}, {status: status === 'missing_key' ? 501 : 502});
  }
}
