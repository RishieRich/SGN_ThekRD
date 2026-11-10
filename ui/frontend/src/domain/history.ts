import type {Company, Shift, Worker} from '@/types';
import {addDays, dayOfMonth, isSunday, monthKey, previousMonthSameDay, toISODate, fromISODate} from './dates';

/**
 * Confirmed attendance for past days. In the local MVP this is generated
 * deterministically from the sample roster; later it comes from the database.
 */
export interface HistoryDay {
  date: string;
  absentIds: string[];
  /** Companies closed that day (e.g. Vapi Fab Works on Sundays). */
  offCompanyIds: string[];
}

export interface AttendanceHistory {
  days: HistoryDay[];
  /** Home placement used for each worker on past days. */
  placements: Record<string, {companyId: string; shift: Shift}>;
}

function hash(text: string) {
  let value = 2026;
  for (let index = 0; index < text.length; index += 1) {
    value = Math.imul(value ^ text.charCodeAt(index), 2654435761);
  }
  return value >>> 0;
}

function seededUnit(text: string) {
  let value = hash(text) + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

/** Manoj Kumar's story: absent 6 days in the current month (spec 14.3). */
const manojAbsentDays = new Set([2, 3, 5, 6, 8, 9]);

export function buildHistory(workers: Worker[], companies: Company[], todayISO: string): AttendanceHistory {
  const today = fromISODate(todayISO);
  const start = toISODate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const yesterday = addDays(todayISO, -1);
  const placed = workers.filter((worker) => worker.status === 'active' && worker.companyId);
  const placements = Object.fromEntries(
    placed.map((worker) => [worker.id, {companyId: worker.companyId as string, shift: worker.shift}])
  );
  const sarigamNight = placed.filter((worker) => worker.companyId === 'sarigam-chemicals' && worker.shift === 'night');
  const days: HistoryDay[] = [];

  for (let date = start; date <= yesterday; date = addDays(date, 1)) {
    const offCompanyIds = companies.filter((company) => !company.worksSunday && isSunday(date)).map((company) => company.id);
    const off = new Set(offCompanyIds);
    const absentIds: string[] = [];
    const inCurrentMonth = monthKey(date) === monthKey(todayISO);

    for (const worker of placed) {
      if (off.has(worker.companyId as string)) continue;
      if (worker.name === 'Manoj Kumar' && inCurrentMonth) {
        if (manojAbsentDays.has(dayOfMonth(date))) absentIds.push(worker.id);
        continue;
      }
      const absenceChance = ((100 - worker.attendancePercent) / 100) * 0.7;
      if (seededUnit(`${worker.id}:${date}`) < absenceChance) absentIds.push(worker.id);
    }

    // Yesterday's story: Sarigam Chemicals night shift at 9 of 12 (spec 14.4).
    if (date === yesterday) {
      const present = sarigamNight.filter((worker) => !absentIds.includes(worker.id));
      const needed = Math.max(0, 3 - (sarigamNight.length - present.length));
      present.slice(0, needed).forEach((worker) => absentIds.push(worker.id));
    }

    days.push({date, absentIds, offCompanyIds});
  }

  return {days, placements};
}

export function presentOnDay(history: AttendanceHistory, day: HistoryDay, companyId?: string, shift?: Shift) {
  const absent = new Set(day.absentIds);
  const off = new Set(day.offCompanyIds);
  let present = 0;
  let usual = 0;
  for (const [workerId, placement] of Object.entries(history.placements)) {
    if (companyId && placement.companyId !== companyId) continue;
    if (shift && placement.shift !== shift) continue;
    if (off.has(placement.companyId)) continue;
    usual += 1;
    if (!absent.has(workerId)) present += 1;
  }
  return {present, usual, absent: usual - present};
}

export interface DailyPoint {
  date: string;
  manDays: number;
  usual: number;
  byCompany: Record<string, number>;
}

export function dailySeries(history: AttendanceHistory, companies: Company[], lastDays: number): DailyPoint[] {
  return history.days.slice(-lastDays).map((day) => {
    const byCompany = Object.fromEntries(
      companies.map((company) => [company.id, presentOnDay(history, day, company.id).present])
    );
    const total = presentOnDay(history, day);
    return {date: day.date, manDays: total.present, usual: total.usual, byCompany};
  });
}

export function findDay(history: AttendanceHistory, date: string) {
  return history.days.find((day) => day.date === date);
}

export type CalendarStatus = 'present' | 'absent' | 'off' | 'none';

export function workerCalendar(history: AttendanceHistory, workerId: string, lastDays: number) {
  const placement = history.placements[workerId];
  return history.days.slice(-lastDays).map((day) => {
    let status: CalendarStatus = 'none';
    if (placement) {
      if (day.offCompanyIds.includes(placement.companyId)) status = 'off';
      else status = day.absentIds.includes(workerId) ? 'absent' : 'present';
    }
    return {date: day.date, status};
  });
}

export interface WorkerRecord {
  workingDays: number;
  presentDays: number;
  absentDays: number;
  /** Rounded attendance percent over the window; null if there is no history. */
  rate: number | null;
  currentAbsentStreak: number;
  lastAbsent: string | null;
}

export function workerRecord(history: AttendanceHistory, workerId: string, lastDays = 30): WorkerRecord {
  const calendar = workerCalendar(history, workerId, lastDays);
  const working = calendar.filter((cell) => cell.status === 'present' || cell.status === 'absent');
  const absentDays = working.filter((cell) => cell.status === 'absent').length;
  let currentAbsentStreak = 0;
  for (let index = working.length - 1; index >= 0 && working[index].status === 'absent'; index -= 1) currentAbsentStreak += 1;
  const lastAbsent = [...working].reverse().find((cell) => cell.status === 'absent')?.date ?? null;
  return {
    workingDays: working.length,
    presentDays: working.length - absentDays,
    absentDays,
    rate: working.length === 0 ? null : Math.round(((working.length - absentDays) * 100) / working.length),
    currentAbsentStreak,
    lastAbsent
  };
}

export function workerMonthRecord(history: AttendanceHistory, workerId: string, todayISO: string) {
  const month = monthKey(todayISO);
  const placement = history.placements[workerId];
  let present = 0;
  let absent = 0;
  if (!placement) return {present, absent};
  for (const day of history.days) {
    if (monthKey(day.date) !== month || day.offCompanyIds.includes(placement.companyId)) continue;
    if (day.absentIds.includes(workerId)) absent += 1;
    else present += 1;
  }
  return {present, absent};
}

export type Reliability = 'regular' | 'sometimes' | 'often' | 'new';

export function reliabilityOf(rate: number | null): Reliability {
  if (rate === null) return 'new';
  if (rate >= 90) return 'regular';
  if (rate >= 75) return 'sometimes';
  return 'often';
}

/** Consecutive confirmed days ending yesterday (today counts once confirmed). */
export function attendanceStreak(history: AttendanceHistory, todayConfirmed: boolean) {
  return history.days.length + (todayConfirmed ? 1 : 0);
}

export function monthDays(history: AttendanceHistory, todayISO: string) {
  return history.days.filter((day) => monthKey(day.date) === monthKey(todayISO));
}

/** Days of last month up to the same day-of-month, for like-for-like comparison. */
export function lastMonthToDateDays(history: AttendanceHistory, todayISO: string) {
  const sameDayLastMonth = previousMonthSameDay(todayISO);
  const lastMonth = monthKey(sameDayLastMonth);
  return history.days.filter((day) => monthKey(day.date) === lastMonth && day.date < sameDayLastMonth);
}

/** Average attendance percent across a series of days. */
export function averageAttendanceRate(points: Array<{manDays: number; usual: number}>) {
  const days = points.filter((point) => point.usual > 0);
  if (!days.length) return 0;
  return Math.round((days.reduce((sum, point) => sum + point.manDays / point.usual, 0) * 100) / days.length);
}

/** Workers most likely to be absent (lowest recent attendance), for one-tap suggestions. */
export function likelyAbsent(history: AttendanceHistory, workers: Worker[], limit: number, companyId?: string) {
  return workers
    .filter((worker) => worker.status === 'active' && worker.companyId && (!companyId || worker.companyId === companyId))
    .map((worker) => ({worker, record: workerRecord(history, worker.id, 30)}))
    .filter((item) => item.record.rate !== null && item.record.rate < 90)
    .sort((left, right) => (left.record.rate ?? 100) - (right.record.rate ?? 100))
    .slice(0, limit);
}

/** Daily attendance ratio for one company over the last days (skips closed days). */
export function companyTrend(history: AttendanceHistory, companyId: string, lastDays: number) {
  return history.days
    .slice(-lastDays)
    .map((day) => presentOnDay(history, day, companyId))
    .filter((counts) => counts.usual > 0)
    .map((counts) => counts.present / counts.usual);
}
