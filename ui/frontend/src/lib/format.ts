import type {Locale} from '@/types';
import {fromISODate} from '@/domain/dates';

export const intlLocale: Record<Locale, string> = {en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', gu: 'gu-IN'};

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale[locale]).format(value);
}

export function formatDate(iso: string, locale: Locale, options: Intl.DateTimeFormatOptions = {day: 'numeric', month: 'short'}) {
  return new Intl.DateTimeFormat(intlLocale[locale], options).format(fromISODate(iso));
}

export function formatTime(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale[locale], {hour: 'numeric', minute: '2-digit'}).format(date);
}

export function formatDateTime(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale[locale], {weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'}).format(date);
}

export function formatRelative(date: Date, now: Date, locale: Locale) {
  const formatter = new Intl.RelativeTimeFormat(intlLocale[locale], {numeric: 'auto'});
  const minutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}
