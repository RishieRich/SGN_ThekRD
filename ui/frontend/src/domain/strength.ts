import type {Company, LocalAttendance, Shift, Worker} from '@/types';
import type {AttendanceHistory, HistoryDay} from './history';
import {presentOnDay} from './history';
import {activeWorkersForCompany} from './attendance';

export type StrengthLevel = 'ok' | 'warning' | 'danger';

export interface ShiftStrength {
  shift: Shift;
  present: number;
  usual: number;
  ratio: number;
  level: StrengthLevel;
  short: number;
}

export function strengthLevel(present: number, usual: number): StrengthLevel {
  if (usual === 0) return 'ok';
  const ratio = present / usual;
  if (ratio >= 0.9) return 'ok';
  if (ratio >= 0.75) return 'warning';
  return 'danger';
}

function shiftStrength(shift: Shift, present: number, usual: number): ShiftStrength {
  return {
    shift,
    present,
    usual,
    ratio: usual === 0 ? 1 : present / usual,
    level: strengthLevel(present, usual),
    short: Math.max(0, usual - present)
  };
}

/** Today's live strength per shift, from the draft attendance. */
export function todayStrength(workers: Worker[], attendance: LocalAttendance, company: Company): ShiftStrength[] {
  const absent = new Set(attendance.absentWorkerIds);
  const roster = activeWorkersForCompany(workers, company.id);
  return (['day', 'night'] as Shift[])
    .map((shift) => {
      const inShift = roster.filter((worker) => worker.shift === shift);
      const present = inShift.filter((worker) => !absent.has(worker.id)).length;
      return shiftStrength(shift, present, inShift.length);
    })
    .filter((row) => row.usual > 0);
}

export function dayStrength(history: AttendanceHistory, day: HistoryDay, company: Company): ShiftStrength[] {
  return (['day', 'night'] as Shift[])
    .map((shift) => {
      const counts = presentOnDay(history, day, company.id, shift);
      return shiftStrength(shift, counts.present, counts.usual);
    })
    .filter((row) => row.usual > 0);
}

/** The most severe level across a company's shifts. */
export function worstLevel(rows: ShiftStrength[]): StrengthLevel {
  if (rows.some((row) => row.level === 'danger')) return 'danger';
  if (rows.some((row) => row.level === 'warning')) return 'warning';
  return 'ok';
}
