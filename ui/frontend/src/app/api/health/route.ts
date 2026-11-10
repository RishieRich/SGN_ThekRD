import {NextResponse} from 'next/server';
import {geminiChatModel, geminiModels, ProviderError, providerKeys, sarvamCheck, sarvamSttModel, sarvamTtsModel, type ProviderStatus} from '@/server/ai/providers';
import {getCurrentUser} from '@/server/session';

export const dynamic = 'force-dynamic';

function failure(error: unknown): {status: ProviderStatus; detail: string} {
  if (error instanceof ProviderError) return {status: error.status, detail: error.message};
  return {status: 'error', detail: error instanceof Error ? error.message : 'Unknown error'};
}

/** Provider status for the owner and admin: connected, missing_key, invalid_key, no_credits or error. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({code: 'UNAUTHENTICATED'}, {status: 401});
  if (user.role === 'viewer') return NextResponse.json({code: 'FORBIDDEN'}, {status: 403});

  const keys = providerKeys();
  const [gemini, sarvam] = await Promise.all([
    (async () => {
      if (!keys.gemini) return {status: 'missing_key' as ProviderStatus};
      try {
        const models = await geminiModels();
        return {status: 'connected' as ProviderStatus, chatModel: await geminiChatModel(), textModels: models.filter((name) => name.startsWith('gemini')).length};
      } catch (error) {
        return failure(error);
      }
    })(),
    (async () => {
      if (!keys.sarvam) return {status: 'missing_key' as ProviderStatus};
      try {
        await sarvamCheck();
        return {status: 'connected' as ProviderStatus, ttsModel: sarvamTtsModel(), sttModel: sarvamSttModel()};
      } catch (error) {
        return failure(error);
      }
    })()
  ]);

  return NextResponse.json({gemini, sarvam}, {headers: {'cache-control': 'no-store'}});
}
