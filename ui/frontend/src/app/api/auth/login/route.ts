import bcrypt from 'bcryptjs';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {findUser} from '@/data/users';
import {createSessionValue, sessionCookieName} from '@/server/session';

const requestSchema = z.object({
  userId: z.string().min(1),
  pin: z.string().regex(/^\d{4}$/)
});

const pinHashes: Record<string, string> = {
  rajesh: '$2b$10$wHzGZKId7y6L41IfGc.QkOUOXkR/0inqOssVql0KMQgwJJGDM/7US',
  admin: '$2b$10$o.F0GLgFDTA/tCoGmjxs9u/Qm44CXCl8ZUpCaLFjjFFxUOEmaLo3q',
  viewer: '$2b$10$TCTfmGSfqEECQb3RdZN1beDhYs2/t3RzKD62pd4NZ2Aelxjk0Y2sO'
};

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({code: 'INVALID_INPUT'}, {status: 400});

  const user = findUser(parsed.data.userId);
  const hash = pinHashes[parsed.data.userId];
  if (!user || !hash || !(await bcrypt.compare(parsed.data.pin, hash))) {
    return NextResponse.json({code: 'WRONG_PIN'}, {status: 401});
  }

  const response = NextResponse.json({ok: true});
  response.cookies.set(sessionCookieName, createSessionValue(user.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/'
  });
  return response;
}
