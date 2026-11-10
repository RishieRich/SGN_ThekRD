/** Local calendar date as YYYY-MM-DD (never UTC, so IST mornings stay on the right day). */
export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromISODate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(iso: string, days: number) {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function daysInMonth(iso: string) {
  const date = fromISODate(iso);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function dayOfMonth(iso: string) {
  return Number(iso.slice(8, 10));
}

export function isSunday(iso: string) {
  return fromISODate(iso).getDay() === 0;
}

export function previousMonthSameDay(iso: string) {
  const date = fromISODate(iso);
  const target = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return toISODate(target);
}
