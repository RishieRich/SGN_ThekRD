import {describe, expect, it} from 'vitest';
import {companies, invoices, workers} from '@/data/sample-data';
import {
  applyAbsentees,
  confirmCompany,
  emptyAttendance,
  gateDifference,
  parseNameList,
  searchWorkers,
  setAttendanceNote,
  setGateCount,
  shiftAttendance,
  toggleAbsent
} from './attendance';
import {monthSummary, ratePaiseFor} from './billing';
import {addDays, previousMonthSameDay, toISODate} from './dates';
import {buildHistory, findDay, presentOnDay, reliabilityOf, workerMonthRecord, workerRecord} from './history';
import {buildSuggestions} from './insights';
import {createNote, notesForWorker} from './notes';
import {presetDueAt, reminderBuckets, snoozeReminder, createReminder} from './reminders';
import {strengthLevel, todayStrength} from './strength';
import {applyWorkerEdits, createWorker, emptyWorkerEdits, patchWorker, stepWage} from './workers';

const today = '2026-11-10';
const history = buildHistory(workers, companies, today);
const manoj = workers.find((worker) => worker.name === 'Manoj Kumar')!;

describe('history', () => {
  it('is deterministic and ends yesterday', () => {
    const again = buildHistory(workers, companies, today);
    expect(again.days).toEqual(history.days);
    expect(history.days[0].date).toBe('2026-10-01');
    expect(history.days.at(-1)?.date).toBe('2026-11-09');
  });

  it('keeps the sample stories', () => {
    expect(workerMonthRecord(history, manoj.id, today).absent).toBe(6);
    const yesterday = findDay(history, '2026-11-09')!;
    expect(presentOnDay(history, yesterday, 'sarigam-chemicals', 'night')).toEqual({present: 9, usual: 12, absent: 3});
  });

  it('closes Vapi Fab Works on Sundays', () => {
    const sunday = findDay(history, '2026-11-08')!;
    expect(sunday.offCompanyIds).toEqual(['vapi-fab-works']);
    expect(presentOnDay(history, sunday, 'vapi-fab-works').usual).toBe(0);
  });

  it('labels reliability', () => {
    expect(reliabilityOf(95)).toBe('regular');
    expect(reliabilityOf(80)).toBe('sometimes');
    expect(reliabilityOf(60)).toBe('often');
    expect(reliabilityOf(null)).toBe('new');
    expect(workerRecord(history, manoj.id, 14).absentDays).toBeGreaterThanOrEqual(6);
  });
});

describe('month summary', () => {
  it('estimates billing and wages in integer paise', () => {
    const month = monthSummary(history, workers, companies, today);
    expect(month.confirmedDays).toBe(9);
    expect(Number.isInteger(month.basePaise)).toBe(true);
    expect(Number.isInteger(month.grossWagesPaise)).toBe(true);
    expect(month.cashWagesPaise + month.bankWagesPaise).toBe(month.grossWagesPaise);
    expect(month.companies.reduce((sum, row) => sum + row.manDays, 0)).toBe(month.manDays);
    expect(month.basePaise).toBeGreaterThan(month.grossWagesPaise);
  });

  it('uses role rates and flat rates', () => {
    expect(ratePaiseFor(companies[0], 'welder')).toBe(76_000);
    expect(ratePaiseFor(companies[1], 'welder')).toBe(65_000);
  });

  it('compares with the same day last month', () => {
    expect(previousMonthSameDay('2026-03-31')).toBe('2026-02-28');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(toISODate(new Date(2026, 10, 10, 1, 30))).toBe('2026-11-10');
  });
});

describe('attendance helpers', () => {
  const shree = companies[0];

  it('copies yesterday and requires a fresh confirm after a change', () => {
    const yesterday = findDay(history, '2026-11-09')!;
    const copied = applyAbsentees(emptyAttendance, workers, yesterday.absentIds);
    expect(copied.absentWorkerIds).toEqual(yesterday.absentIds);
    const confirmed = confirmCompany(copied, shree.id, companies);
    expect(confirmed.confirmedCompanyIds).toContain(shree.id);
    const changed = toggleAbsent(confirmed, manoj.id, shree.id);
    expect(changed.confirmedCompanyIds).not.toContain(shree.id);
  });

  it('completes the day when every company is confirmed', () => {
    const all = companies.reduce((state, company) => confirmCompany(state, company.id, companies), emptyAttendance);
    expect(all.allConfirmed).toBe(true);
  });

  it('stores notes without changing man-days', () => {
    const withNote = setAttendanceNote(emptyAttendance, manoj.id, {tag: 'late', text: 'came at '});
    expect(withNote.notes?.[manoj.id]).toEqual({tag: 'late', text: 'came at '});
    expect(setAttendanceNote(emptyAttendance, manoj.id, {tag: null, text: '   '}).notes?.[manoj.id]).toBeUndefined();
    expect(withNote.absentWorkerIds).toHaveLength(0);
    expect(setAttendanceNote(withNote, manoj.id, null).notes?.[manoj.id]).toBeUndefined();
  });

  it('flags a gate count mismatch', () => {
    const onSheet = shiftAttendance(workers, emptyAttendance, shree.id, 'day').present;
    const withGate = setGateCount(emptyAttendance, shree.id, 'day', onSheet - 2);
    expect(gateDifference(withGate, workers, shree.id, 'day')).toBe(2);
    expect(gateDifference(emptyAttendance, workers, shree.id, 'day')).toBeNull();
  });

  it('finds workers by partial name and parses pasted lists', () => {
    expect(searchWorkers(workers, 'mano')[0].name).toBe('Manoj Kumar');
    const parsed = parseNameList(workers, 'Absent: Manoj Kumar, Ramesh, xyzq');
    expect(parsed.matched.map((worker) => worker.name)).toContain('Manoj Kumar');
    expect(parsed.ambiguous[0]?.text).toBe('Ramesh');
    expect(parsed.unmatched).toEqual(['xyzq']);
  });
});

describe('strength', () => {
  it('uses 90% and 75% thresholds', () => {
    expect(strengthLevel(27, 30)).toBe('ok');
    expect(strengthLevel(24, 30)).toBe('warning');
    expect(strengthLevel(20, 30)).toBe('danger');
    expect(todayStrength(workers, emptyAttendance, companies[0]).every((row) => row.level === 'ok')).toBe(true);
  });
});

describe('workers, notes and reminders', () => {
  it('applies edits and adds workers', () => {
    const edits = patchWorker(emptyWorkerEdits, manoj.id, {dailyWagePaise: 50_000});
    const added = createWorker({name: '  Nitin   Gavit ', phone: '', role: 'helper', companyId: null, shift: 'day', dailyWagePaise: 48_000}, workers);
    const merged = applyWorkerEdits(workers, {...edits, added: [added]});
    expect(merged.find((worker) => worker.id === manoj.id)?.dailyWagePaise).toBe(50_000);
    expect(merged.at(-1)?.name).toBe('Nitin Gavit');
    expect(stepWage(1_000, -1)).toBe(1_000);
  });

  it('hides health notes from viewers', () => {
    const now = new Date(2026, 10, 10, 9);
    const notes = [createNote(manoj.id, 'Fever', 'health', 'Rajesh', now), createNote(manoj.id, 'Asked for advance', 'pay', 'Rajesh', now)];
    expect(notesForWorker(notes, manoj.id, 'owner')).toHaveLength(2);
    expect(notesForWorker(notes, manoj.id, 'viewer')).toHaveLength(1);
  });

  it('computes reminder presets and buckets', () => {
    const now = new Date(2026, 10, 10, 19, 15);
    expect(presetDueAt('thisEvening', now).getDate()).toBe(11);
    expect(presetDueAt('tomorrowMorning', now).getHours()).toBe(9);
    expect(presetDueAt('nextMonday', now).getDay()).toBe(1);
    const reminder = createReminder('Call', new Date(2026, 10, 10, 19), now);
    expect(reminderBuckets([reminder], now).overdue).toHaveLength(1);
    expect(reminderBuckets([snoozeReminder(reminder, 60, now)], now).today).toHaveLength(1);
  });
});

describe('suggestions', () => {
  it('suggests deterministic actions for the owner and the clients', () => {
    const month = monthSummary(history, workers, companies, today);
    const suggestions = buildSuggestions({
      now: new Date(2026, 10, 10, 11, 30),
      todayISO: today,
      role: 'owner',
      workers,
      companies,
      attendance: emptyAttendance,
      history,
      month,
      invoices
    });
    const keys = suggestions.map((item) => item.key);
    expect(keys[0]).toBe('todayLate');
    expect(keys).toContain('shortYesterday');
    expect(keys).toContain('pfMissing');
    expect(keys).toContain('unplaced');
    expect(keys).toContain('chequePending');
    expect(suggestions.some((item) => item.audience === 'client')).toBe(true);
    const viewer = buildSuggestions({now: new Date(2026, 10, 10, 9), todayISO: today, role: 'viewer', workers, companies, attendance: emptyAttendance, history, month, invoices});
    expect(viewer.some((item) => item.key === 'bestMargin')).toBe(false);
  });
});
