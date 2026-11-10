import {createHmac, timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {findUser} from '@/data/users';

export const sessionCookieName = 'arq-session';

function sessionSecret() {
  const configured = process.env.SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production.');
  }
  return 'arq-thekedar-local-preview-only';
}

function signature(payload: string) {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function createSessionValue(userId: string) {
  const payload = Buffer.from(userId, 'utf8').toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function readSessionValue(value: string | undefined) {
  if (!value) return undefined;
  const [payload, suppliedSignature] = value.split('.');
  if (!payload || !suppliedSignature) return undefined;
  const expectedSignature = signature(payload);
  const expected = Buffer.from(expectedSignature);
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return undefined;
  return Buffer.from(payload, 'base64url').toString('utf8');
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = readSessionValue(cookieStore.get(sessionCookieName)?.value);
  return findUser(userId);
}
