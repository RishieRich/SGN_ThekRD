import type {Company, Invoice, Worker, WorkerRole} from '@/types';
import type {AttendanceHistory, HistoryDay} from './history';
import {monthDays, lastMonthToDateDays} from './history';

/** Billing rate for one man-day of this role at this company, or null if none is set. */
export function ratePaiseFor(company: Company, role: WorkerRole): number | null {
  if (company.rateType === 'role') return company.roleRatesPaise?.[role] ?? null;
  return company.flatRatePaise ?? null;
}

export interface CompanyMonth {
  companyId: string;
  manDays: number;
  /** Estimated bill base (man-days × rate), excluding PF, ESIC and GST. */
  basePaise: number;
  grossWagesPaise: number;
  cashWagesPaise: number;
  bankWagesPaise: number;
  /** Base minus wages per man-day, or null when no man-days yet. */
  marginPerManDayPaise: number | null;
  missingRateCount: number;
}

export interface MonthSummary {
  companies: CompanyMonth[];
  manDays: number;
  basePaise: number;
  grossWagesPaise: number;
  cashWagesPaise: number;
  bankWagesPaise: number;
  lastMonthToDateManDays: number;
  /** Rounded percent change vs the same days last month, or null if no comparison. */
  changePercent: number | null;
  confirmedDays: number;
}

function accumulate(
  days: HistoryDay[],
  history: AttendanceHistory,
  workersById: Map<string, Worker>,
  companies: Company[]
): CompanyMonth[] {
  const rows = new Map<string, CompanyMonth>(
    companies.map((company) => [
      company.id,
      {companyId: company.id, manDays: 0, basePaise: 0, grossWagesPaise: 0, cashWagesPaise: 0, bankWagesPaise: 0, marginPerManDayPaise: null, missingRateCount: 0}
    ])
  );
  const companiesById = new Map(companies.map((company) => [company.id, company]));

  for (const day of days) {
    const absent = new Set(day.absentIds);
    const off = new Set(day.offCompanyIds);
    for (const [workerId, placement] of Object.entries(history.placements)) {
      if (off.has(placement.companyId) || absent.has(workerId)) continue;
      const worker = workersById.get(workerId);
      const company = companiesById.get(placement.companyId);
      const row = rows.get(placement.companyId);
      if (!worker || !company || !row) continue;
      row.manDays += 1;
      const rate = ratePaiseFor(company, worker.role);
      if (rate === null) row.missingRateCount += 1;
      else row.basePaise += rate;
      row.grossWagesPaise += worker.dailyWagePaise;
      if (worker.payMode === 'cash') row.cashWagesPaise += worker.dailyWagePaise;
      else row.bankWagesPaise += worker.dailyWagePaise;
    }
  }

  for (const row of rows.values()) {
    row.marginPerManDayPaise = row.manDays === 0 ? null : Math.round((row.basePaise - row.grossWagesPaise) / row.manDays);
  }
  return [...rows.values()];
}

export function monthSummary(history: AttendanceHistory, workers: Worker[], companies: Company[], todayISO: string): MonthSummary {
  const workersById = new Map(workers.map((worker) => [worker.id, worker]));
  const current = monthDays(history, todayISO);
  const rows = accumulate(current, history, workersById, companies);
  const previous = accumulate(lastMonthToDateDays(history, todayISO), history, workersById, companies);
  const sum = (items: CompanyMonth[], key: keyof Omit<CompanyMonth, 'companyId' | 'marginPerManDayPaise'>) =>
    items.reduce((total, item) => total + item[key], 0);
  const manDays = sum(rows, 'manDays');
  const lastMonthToDateManDays = sum(previous, 'manDays');
  return {
    companies: rows,
    manDays,
    basePaise: sum(rows, 'basePaise'),
    grossWagesPaise: sum(rows, 'grossWagesPaise'),
    cashWagesPaise: sum(rows, 'cashWagesPaise'),
    bankWagesPaise: sum(rows, 'bankWagesPaise'),
    lastMonthToDateManDays,
    changePercent:
      lastMonthToDateManDays === 0 ? null : Math.round(((manDays - lastMonthToDateManDays) * 100) / lastMonthToDateManDays),
    confirmedDays: current.length
  };
}

export function chequesExpected(invoices: Invoice[]) {
  const pending = invoices.filter((invoice) => !invoice.paid);
  return {
    pending,
    totalPaise: pending.reduce((total, invoice) => total + invoice.totalPaise, 0)
  };
}

/** Gross wages for a worker: man-days × daily wage. */
export function grossWagePaise(manDays: number, dailyWagePaise: number) {
  if (!Number.isInteger(manDays) || !Number.isInteger(dailyWagePaise)) throw new Error('Man-days and wage must be integers.');
  return manDays * dailyWagePaise;
}
