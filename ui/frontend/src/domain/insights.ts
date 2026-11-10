import type {Company, Invoice, LocalAttendance, UserRole, Worker} from '@/types';
import type {MonthSummary} from './billing';
import {chequesExpected} from './billing';
import {addDays, dayOfMonth, daysInMonth} from './dates';
import type {AttendanceHistory} from './history';
import {attendanceStreak, findDay, workerMonthRecord, workerRecord} from './history';
import {dayStrength, todayStrength} from './strength';

export type SuggestionSeverity = 'problem' | 'pending' | 'positive';
export type SuggestionAudience = 'owner' | 'client';

export type SuggestionAction =
  | {kind: 'link'; href: string; label: 'fillAttendance' | 'seeWorkers' | 'openProfile' | 'findBackup' | 'reviewAttendance'}
  | {kind: 'remind'; label: 'remindMe'; reminderKey: string; companyId?: string; workerId?: string}
  | {kind: 'share'; label: 'shareWhatsApp'; message: 'todayCount' | 'shortNotice' | 'chequeReminder' | 'monthCount'; companyId: string};

/** Params ending in `Paise` are money; `shift` and `role` are translated by the UI. */
export type SuggestionParams = Record<string, string | number>;

export interface Suggestion {
  id: string;
  key: string;
  params: SuggestionParams;
  severity: SuggestionSeverity;
  audience: SuggestionAudience;
  action?: SuggestionAction;
}

export interface SuggestionInput {
  now: Date;
  todayISO: string;
  role: UserRole;
  workers: Worker[];
  companies: Company[];
  attendance: LocalAttendance;
  history: AttendanceHistory;
  month: MonthSummary;
  invoices: Invoice[];
}

const severityOrder: Record<SuggestionSeverity, number> = {problem: 0, pending: 1, positive: 2};

export function buildSuggestions(input: SuggestionInput): Suggestion[] {
  const {now, todayISO, role, workers, companies, attendance, history, month, invoices} = input;
  const list: Suggestion[] = [];
  const active = workers.filter((worker) => worker.status === 'active');
  const companyName = (id: string) => companies.find((company) => company.id === id)?.name ?? id;

  // Today's attendance.
  const confirmedCount = attendance.confirmedCompanyIds.length;
  if (!attendance.allConfirmed) {
    const late = now.getHours() >= 11;
    list.push({
      id: 'today',
      key: late ? 'todayLate' : 'todayPending',
      params: {left: companies.length - confirmedCount},
      severity: late ? 'problem' : 'pending',
      audience: 'owner',
      action: {kind: 'link', href: '/hajri', label: 'fillAttendance'}
    });
  } else {
    list.push({id: 'today', key: 'todayDone', params: {}, severity: 'positive', audience: 'owner', action: {kind: 'link', href: '/hajri', label: 'reviewAttendance'}});
  }

  // Short today (live, from the draft).
  const unplaced = active.filter((worker) => !worker.companyId);
  const shortToday = companies
    .map((company) => {
      const rows = todayStrength(workers, attendance, company);
      return {company, short: rows.reduce((total, row) => total + (row.level === 'ok' ? 0 : row.short), 0)};
    })
    .filter((item) => item.short > 0)
    .sort((left, right) => right.short - left.short);

  for (const item of shortToday) {
    list.push({
      id: `short-${item.company.id}`,
      key: 'shortToday',
      params: {client: item.company.name, count: item.short},
      severity: 'problem',
      audience: 'owner',
      action: {kind: 'link', href: unplaced.length ? '/kaamgar?filter=unplaced' : `/kaamgar?company=${item.company.id}`, label: 'findBackup'}
    });
    list.push({
      id: `short-client-${item.company.id}`,
      key: 'clientShortNotice',
      params: {client: item.company.name, count: item.short},
      severity: 'problem',
      audience: 'client',
      action: {kind: 'share', label: 'shareWhatsApp', message: 'shortNotice', companyId: item.company.id}
    });
  }

  // Yesterday's weak shifts: keep backups ready.
  const yesterday = findDay(history, addDays(todayISO, -1));
  if (yesterday) {
    const weakest = companies
      .flatMap((company) => dayStrength(history, yesterday, company).map((row) => ({company, row})))
      .filter((item) => item.row.level !== 'ok' && item.row.short >= 2)
      .sort((left, right) => left.row.ratio - right.row.ratio)[0];
    if (weakest) {
      list.push({
        id: `yesterday-${weakest.company.id}-${weakest.row.shift}`,
        key: 'shortYesterday',
        params: {client: weakest.company.name, shift: weakest.row.shift, present: weakest.row.present, usual: weakest.row.usual},
        severity: 'pending',
        audience: 'owner',
        action: {kind: 'link', href: `/hajri?company=${weakest.company.id}`, label: 'fillAttendance'}
      });
    }
  }

  // People to call: absent several days in a row.
  const streaks = active
    .filter((worker) => worker.companyId)
    .map((worker) => ({worker, record: workerRecord(history, worker.id, 14)}))
    .filter((item) => item.record.currentAbsentStreak >= 2)
    .sort((left, right) => right.record.currentAbsentStreak - left.record.currentAbsentStreak)
    .slice(0, 2);
  for (const item of streaks) {
    list.push({
      id: `streak-${item.worker.id}`,
      key: 'absentStreak',
      params: {worker: item.worker.name, days: item.record.currentAbsentStreak},
      severity: 'pending',
      audience: 'owner',
      action: {kind: 'link', href: `/kaamgar?worker=${item.worker.id}`, label: 'openProfile'}
    });
  }

  // Most absent this month.
  const mostAbsent = active
    .map((worker) => ({worker, absent: workerMonthRecord(history, worker.id, todayISO).absent}))
    .sort((left, right) => right.absent - left.absent)[0];
  if (mostAbsent && mostAbsent.absent >= 3 && !streaks.some((item) => item.worker.id === mostAbsent.worker.id)) {
    list.push({
      id: `most-absent-${mostAbsent.worker.id}`,
      key: 'absentMost',
      params: {worker: mostAbsent.worker.name, days: mostAbsent.absent},
      severity: 'pending',
      audience: 'owner',
      action: {kind: 'link', href: `/kaamgar?worker=${mostAbsent.worker.id}`, label: 'openProfile'}
    });
  }

  // Unplaced workers, matched to a short company when there is one.
  if (unplaced.length) {
    const target = shortToday[0];
    list.push({
      id: 'unplaced',
      key: target ? 'unplacedShort' : 'unplaced',
      params: target ? {count: unplaced.length, client: target.company.name} : {count: unplaced.length},
      severity: 'pending',
      audience: 'owner',
      action: {kind: 'link', href: '/kaamgar?filter=unplaced', label: 'seeWorkers'}
    });
  }

  // Statutory gaps.
  const pfPending = active.filter((worker) => worker.pfStatus === 'pending').length;
  const esicPending = active.filter((worker) => worker.esicStatus === 'pending').length;
  if (pfPending) {
    list.push({id: 'pf', key: 'pfMissing', params: {count: pfPending}, severity: 'pending', audience: 'owner', action: {kind: 'link', href: '/kaamgar?filter=pfPending', label: 'seeWorkers'}});
  }
  if (esicPending) {
    list.push({id: 'esic', key: 'esicMissing', params: {count: esicPending}, severity: 'pending', audience: 'owner', action: {kind: 'link', href: '/kaamgar?filter=esicPending', label: 'seeWorkers'}});
  }

  // Cheques.
  const cheques = chequesExpected(invoices);
  for (const invoice of cheques.pending.filter((item) => item.deliveredDaysAgo >= 5)) {
    list.push({
      id: `cheque-${invoice.id}`,
      key: 'chequePending',
      params: {client: companyName(invoice.companyId), days: invoice.deliveredDaysAgo},
      severity: 'pending',
      audience: 'owner',
      action: {kind: 'remind', label: 'remindMe', reminderKey: 'chequeCall', companyId: invoice.companyId}
    });
    list.push({
      id: `cheque-client-${invoice.id}`,
      key: 'clientChequeReminder',
      params: {client: companyName(invoice.companyId), totalPaise: invoice.totalPaise},
      severity: 'pending',
      audience: 'client',
      action: {kind: 'share', label: 'shareWhatsApp', message: 'chequeReminder', companyId: invoice.companyId}
    });
  }

  // Cash plan.
  if (month.grossWagesPaise > 0) {
    list.push({
      id: 'cash-plan',
      key: cheques.totalPaise >= month.grossWagesPaise ? 'cashPlanCovered' : 'cashPlanGap',
      params: {wagesPaise: month.grossWagesPaise, chequesPaise: cheques.totalPaise, gapPaise: Math.abs(cheques.totalPaise - month.grossWagesPaise)},
      severity: cheques.totalPaise >= month.grossWagesPaise ? 'positive' : 'problem',
      audience: 'owner'
    });
  }

  // Positives.
  if (month.changePercent !== null && month.changePercent !== 0) {
    list.push({
      id: 'month-vs-last',
      key: month.changePercent > 0 ? 'monthUp' : 'monthDown',
      params: {pct: Math.abs(month.changePercent)},
      severity: month.changePercent > 0 ? 'positive' : 'pending',
      audience: 'owner'
    });
  }

  if (role !== 'viewer') {
    const best = [...month.companies]
      .filter((row) => row.marginPerManDayPaise !== null)
      .sort((left, right) => (right.marginPerManDayPaise ?? 0) - (left.marginPerManDayPaise ?? 0))[0];
    if (best?.marginPerManDayPaise) {
      list.push({id: 'best-margin', key: 'bestMargin', params: {client: companyName(best.companyId), amountPaise: best.marginPerManDayPaise}, severity: 'positive', audience: 'owner'});
    }
  }

  list.push({id: 'streak', key: 'streak', params: {days: attendanceStreak(history, attendance.allConfirmed)}, severity: 'positive', audience: 'owner'});

  // Client-facing: share counts once confirmed; agree month count near month end.
  for (const companyId of attendance.confirmedCompanyIds) {
    list.push({
      id: `share-${companyId}`,
      key: 'clientTodayCount',
      params: {client: companyName(companyId)},
      severity: 'positive',
      audience: 'client',
      action: {kind: 'share', label: 'shareWhatsApp', message: 'todayCount', companyId}
    });
  }
  if (!attendance.confirmedCompanyIds.length) {
    list.push({id: 'share-tip', key: 'clientShareTip', params: {}, severity: 'positive', audience: 'client', action: {kind: 'link', href: '/hajri', label: 'fillAttendance'}});
  }
  const day = dayOfMonth(todayISO);
  if (day >= daysInMonth(todayISO) - 4 || day <= 3) {
    for (const company of companies) {
      list.push({
        id: `month-count-${company.id}`,
        key: 'clientMonthCount',
        params: {client: company.name},
        severity: 'pending',
        audience: 'client',
        action: {kind: 'share', label: 'shareWhatsApp', message: 'monthCount', companyId: company.id}
      });
    }
  }

  return list.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]);
}

export type WorkerTipKey = 'unplaced' | 'unplacedShort' | 'pfPending' | 'esicPending' | 'absentStreak' | 'oftenAbsent' | 'noPhone' | 'newWorker' | 'inactive';

export interface WorkerTip {
  key: WorkerTipKey;
  params: SuggestionParams;
  severity: SuggestionSeverity;
}

/** Small, deterministic nudges shown on a worker's profile. */
export function workerTips(
  worker: Worker,
  record: {rate: number | null; currentAbsentStreak: number},
  shortCompanyName: string | null
): WorkerTip[] {
  const tips: WorkerTip[] = [];
  if (worker.status === 'inactive') return [{key: 'inactive', params: {}, severity: 'pending'}];
  if (!worker.companyId) {
    tips.push(shortCompanyName ? {key: 'unplacedShort', params: {client: shortCompanyName}, severity: 'problem'} : {key: 'unplaced', params: {}, severity: 'pending'});
  }
  if (record.currentAbsentStreak >= 2) tips.push({key: 'absentStreak', params: {days: record.currentAbsentStreak}, severity: 'problem'});
  else if (record.rate !== null && record.rate < 80) tips.push({key: 'oftenAbsent', params: {pct: record.rate}, severity: 'pending'});
  if (worker.pfStatus === 'pending') tips.push({key: 'pfPending', params: {}, severity: 'pending'});
  if (worker.esicStatus === 'pending') tips.push({key: 'esicPending', params: {}, severity: 'pending'});
  if (!worker.phone.replace(/\D/g, '')) tips.push({key: 'noPhone', params: {}, severity: 'pending'});
  if (worker.isNew) tips.push({key: 'newWorker', params: {}, severity: 'positive'});
  return tips;
}
