import type {Locale} from '@/types';

const localeMap: Record<Locale, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  gu: 'gu-IN'
};

export function rupeesToPaise(rupees: number) {
  if (!Number.isInteger(rupees)) throw new Error('Rupees must be an integer in this local MVP.');
  return rupees * 100;
}

export function applyBasisPoints(paise: number, basisPoints: number) {
  if (!Number.isInteger(paise) || !Number.isInteger(basisPoints)) {
    throw new Error('Money and basis points must be integers.');
  }
  return Math.floor((paise * basisPoints + 5_000) / 10_000);
}

export function formatINR(paise: number, locale: Locale = 'en', compact = false) {
  if (!Number.isInteger(paise)) throw new Error('Money must be integer paise.');
  const rupees = Math.trunc(paise / 100);
  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard'
  }).format(rupees);
}
