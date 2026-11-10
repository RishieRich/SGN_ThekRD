import type {AttendanceNote, Company, LocalAttendance, Shift, Worker} from '@/types';
import {looseKey, nameKey} from './names';

export const emptyAttendance: LocalAttendance = {
  absentWorkerIds: [],
  touchedCompanyIds: [],
  confirmedCompanyIds: [],
  allConfirmed: false
};

export function activeWorkersForCompany(workers: Worker[], companyId: string) {
  return workers.filter((worker) => worker.status === 'active' && worker.companyId === companyId);
}

export function companyAttendance(workers: Worker[], attendance: LocalAttendance, companyId: string) {
  const roster = activeWorkersForCompany(workers, companyId);
  const absent = new Set(attendance.absentWorkerIds);
  const present = roster.filter((worker) => !absent.has(worker.id)).length;
  return {
    present,
    absent: roster.length - present,
    usual: roster.length,
    manDays: present
  };
}

export function shiftAttendance(workers: Worker[], attendance: LocalAttendance, companyId: string, shift: 'day' | 'night') {
  const roster = activeWorkersForCompany(workers, companyId).filter((worker) => worker.shift === shift);
  const absent = new Set(attendance.absentWorkerIds);
  const present = roster.filter((worker) => !absent.has(worker.id)).length;
  return {present, usual: roster.length, absent: roster.length - present};
}

export function totalManDays(workers: Worker[], attendance: LocalAttendance, companies: Company[]) {
  return companies.reduce((total, company) => total + companyAttendance(workers, attendance, company.id).manDays, 0);
}

export function toggleAbsent(attendance: LocalAttendance, workerId: string, companyId: string): LocalAttendance {
  const absent = new Set(attendance.absentWorkerIds);
  if (absent.has(workerId)) absent.delete(workerId);
  else absent.add(workerId);
  const touched = new Set(attendance.touchedCompanyIds);
  touched.add(companyId);
  return {
    ...attendance,
    absentWorkerIds: [...absent],
    touchedCompanyIds: [...touched],
    // A change after confirming needs a fresh confirm for that company.
    confirmedCompanyIds: attendance.confirmedCompanyIds.filter((id) => id !== companyId),
    allConfirmed: false
  };
}

export function markCompanyPresent(attendance: LocalAttendance, workers: Worker[], companyId: string): LocalAttendance {
  const companyWorkerIds = new Set(activeWorkersForCompany(workers, companyId).map((worker) => worker.id));
  const touched = new Set(attendance.touchedCompanyIds);
  touched.add(companyId);
  return {
    ...attendance,
    absentWorkerIds: attendance.absentWorkerIds.filter((id) => !companyWorkerIds.has(id)),
    touchedCompanyIds: [...touched],
    confirmedCompanyIds: attendance.confirmedCompanyIds.filter((id) => id !== companyId),
    allConfirmed: false
  };
}

export function confirmCompany(attendance: LocalAttendance, companyId: string, companies: Company[] = []): LocalAttendance {
  const confirmed = new Set(attendance.confirmedCompanyIds);
  confirmed.add(companyId);
  const touched = new Set(attendance.touchedCompanyIds);
  touched.add(companyId);
  const allConfirmed = companies.length > 0 && companies.every((company) => confirmed.has(company.id));
  return {...attendance, touchedCompanyIds: [...touched], confirmedCompanyIds: [...confirmed], allConfirmed};
}

export function confirmAll(attendance: LocalAttendance, companies: Company[]): LocalAttendance {
  return {
    ...attendance,
    touchedCompanyIds: companies.map((company) => company.id),
    confirmedCompanyIds: companies.map((company) => company.id),
    allConfirmed: true
  };
}

export function absentWorkersForCompany(workers: Worker[], attendance: LocalAttendance, companyId: string) {
  const absent = new Set(attendance.absentWorkerIds);
  return activeWorkersForCompany(workers, companyId).filter((worker) => absent.has(worker.id));
}

/** Mark exactly these workers absent (used by "Same as yesterday"); everyone else present. */
export function applyAbsentees(attendance: LocalAttendance, workers: Worker[], absentIds: string[]): LocalAttendance {
  const activeIds = new Set(workers.filter((worker) => worker.status === 'active' && worker.companyId).map((worker) => worker.id));
  const companyIds = new Set(workers.filter((worker) => worker.status === 'active' && worker.companyId).map((worker) => worker.companyId as string));
  return {
    ...attendance,
    absentWorkerIds: absentIds.filter((id) => activeIds.has(id)),
    touchedCompanyIds: [...new Set([...attendance.touchedCompanyIds, ...companyIds])],
    confirmedCompanyIds: [],
    allConfirmed: false
  };
}

export function setAbsent(attendance: LocalAttendance, workerId: string, companyId: string, absent: boolean): LocalAttendance {
  const isAbsent = attendance.absentWorkerIds.includes(workerId);
  if (isAbsent === absent) return attendance;
  return toggleAbsent(attendance, workerId, companyId);
}

export function setAttendanceNote(attendance: LocalAttendance, workerId: string, note: AttendanceNote | null): LocalAttendance {
  const notes = {...(attendance.notes ?? {})};
  if (!note || (!note.tag && !note.text.trim())) delete notes[workerId];
  // Keep the text as typed (spaces included); only whitespace-only notes are dropped.
  else notes[workerId] = {tag: note.tag, text: note.text};
  return {...attendance, notes};
}

export function gateKey(companyId: string, shift: Shift) {
  return `${companyId}:${shift}`;
}

export function setGateCount(attendance: LocalAttendance, companyId: string, shift: Shift, count: number | null): LocalAttendance {
  const gateCounts = {...(attendance.gateCounts ?? {})};
  const key = gateKey(companyId, shift);
  if (count === null || !Number.isFinite(count) || count < 0) delete gateCounts[key];
  else gateCounts[key] = Math.round(count);
  return {...attendance, gateCounts};
}

/** Positive when the sheet shows more present than the gate register. */
export function gateDifference(attendance: LocalAttendance, workers: Worker[], companyId: string, shift: Shift) {
  const gate = attendance.gateCounts?.[gateKey(companyId, shift)];
  if (gate === undefined) return null;
  return shiftAttendance(workers, attendance, companyId, shift).present - gate;
}

/** Comparable form of a name in any script (see domain/names). */
export function normaliseName(value: string) {
  return nameKey(value);
}

/** Simple prefix matching on any part of the name; best matches first. */
export function searchWorkers(workers: Worker[], query: string, limit = 8) {
  const needle = normaliseName(query);
  if (needle.length < 2) return [];
  const looseNeedle = looseKey(needle);
  return workers
    .filter((worker) => worker.status === 'active' && worker.companyId)
    .map((worker) => {
      const name = normaliseName(worker.name);
      const parts = name.split(' ');
      const loose = looseKey(name);
      const score =
        name === needle ? 3
        : loose === looseNeedle ? 2.5
        : name.startsWith(needle) ? 2
        : parts.some((part) => part.startsWith(needle)) ? 1
        : looseNeedle.length >= 3 && (loose.startsWith(looseNeedle) || loose.split(' ').some((part) => part.startsWith(looseNeedle))) ? 0.75
        : name.includes(needle) ? 0.5
        : 0;
      return {worker, score};
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.worker.name.localeCompare(right.worker.name))
    .slice(0, limit)
    .map((item) => item.worker);
}

/**
 * Turns pasted text such as "Absent: Manoj, Ravi; Suresh" into matched workers.
 * A name that matches more than one worker is returned as ambiguous for the user to pick.
 */
export function parseNameList(workers: Worker[], text: string) {
  const pieces = text
    .replace(/^[^:]*:/, (prefix) => (prefix.length < 20 ? '' : prefix))
    .split(/[,;\n]+|\band\b|\baur\b/i)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length >= 2);
  const matched: Worker[] = [];
  const ambiguous: Array<{text: string; options: Worker[]}> = [];
  const unmatched: string[] = [];
  for (const piece of pieces) {
    const options = searchWorkers(workers, piece, 6);
    const exact = options.filter((worker) => normaliseName(worker.name) === normaliseName(piece));
    if (exact.length === 1 || options.length === 1) matched.push(exact[0] ?? options[0]);
    else if (options.length > 1) ambiguous.push({text: piece, options});
    else unmatched.push(piece);
  }
  return {matched, ambiguous, unmatched};
}

/** Today's totals across all companies (present = man-days so far). */
export function todayTotals(workers: Worker[], attendance: LocalAttendance, companies: Company[]) {
  return companies.reduce(
    (totals, company) => {
      const count = companyAttendance(workers, attendance, company.id);
      return {present: totals.present + count.present, absent: totals.absent + count.absent, usual: totals.usual + count.usual};
    },
    {present: 0, absent: 0, usual: 0}
  );
}
