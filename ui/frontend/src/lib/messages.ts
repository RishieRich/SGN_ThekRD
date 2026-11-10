import en from '../../messages/en.json';
import type {Locale} from '@/types';

export type Messages = typeof en;

export const locales: Locale[] = ['en', 'hi', 'mr', 'gu'];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as string[]).includes(value);
}

/**
 * Only English ships with the page. Hindi, Marathi and Gujarati are separate small files that load the
 * first time someone picks them, so most people never download languages they don't read.
 */
const loaders: Record<Exclude<Locale, 'en'>, () => Promise<{default: unknown}>> = {
  hi: () => import('../../messages/hi.json'),
  mr: () => import('../../messages/mr.json'),
  gu: () => import('../../messages/gu.json')
};

const cache: Partial<Record<Locale, Messages>> = {en};

export function messagesFor(locale: Locale): Messages {
  return cache[locale] ?? en;
}

export async function loadMessages(locale: Locale): Promise<Messages> {
  const cached = cache[locale];
  if (cached) return cached;
  const loaded = (await loaders[locale as Exclude<Locale, 'en'>]()).default as Messages;
  cache[locale] = loaded;
  return loaded;
}
