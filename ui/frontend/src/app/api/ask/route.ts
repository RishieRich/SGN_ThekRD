import {NextResponse} from 'next/server';
import {z} from 'zod';
import {geminiAnswer, ProviderError} from '@/server/ai/providers';
import {getCurrentUser} from '@/server/session';

const requestSchema = z.object({
  question: z.string().trim().min(2).max(500),
  locale: z.enum(['en', 'hi', 'mr', 'gu']),
  facts: z.record(z.string(), z.unknown())
});

const languageNames = {en: 'English (India)', hi: 'Hindi', mr: 'Marathi', gu: 'Gujarati'} as const;

/**
 * Open questions, answered by Gemini from facts the app has already worked out.
 * The model phrases; it never calculates money or counts (constitution: AI does not do arithmetic).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({code: 'UNAUTHENTICATED'}, {status: 401});
  const raw = await request.text();
  if (raw.length > 80_000) return NextResponse.json({code: 'TOO_LARGE'}, {status: 413});
  const parsed = requestSchema.safeParse((() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })());
  if (!parsed.success) return NextResponse.json({code: 'INVALID_INPUT'}, {status: 400});

  const {question, locale, facts} = parsed.data;
  const system = [
    'You are ARQ Sahayak, a helper inside ARQ Thekedar, an attendance and wages app for a labour contractor in Gujarat, India.',
    `Always answer in ${languageNames[locale]}, in plain everyday words, in one to three short sentences. No markdown, no bullet points, no emojis.`,
    'Use ONLY the facts JSON you are given. Every number in your answer must appear exactly in the facts.',
    'Never add, subtract, multiply, average, estimate or count anything yourself, and never invent names or numbers.',
    'Money values in the facts are already in rupees; write them with the ₹ sign and Indian digit grouping exactly as given.',
    'If the facts do not contain the answer, say briefly that you do not have that information yet, and suggest one related question that the facts can answer.',
    'Do not give legal, tax or financial advice; for PF or ESIC rules, suggest checking with their consultant.'
  ].join('\n');
  const prompt = `Facts (worked out by the app, ${new Date().toISOString().slice(0, 10)}):\n${JSON.stringify(facts)}\n\nQuestion: ${question}`;

  try {
    const {text, model} = await geminiAnswer({system, prompt});
    return NextResponse.json({answer: text, model});
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 'error';
    const detail = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ai] ${new URL(request.url).pathname}: ${status}: ${detail}`);
    // The provider's own message (never the key), so the owner can see what to fix.
    return NextResponse.json({code: status, detail}, {status: status === 'missing_key' ? 501 : 502});
  }
}
