import type {Company, LocalAttendance, UserRole, Worker} from '@/types';
import {todayTotals} from './attendance';
import type {MonthSummary} from './billing';
import {workerMonthRecord, type AttendanceHistory} from './history';

/**
 * Everything the AI may say, already worked out here (constitution: AI never calculates money or counts).
 * Phone numbers, health notes and bank details are never included. Viewers don't get per-worker wages.
 */
export function buildFacts({
  workers,
  companies,
  attendance,
  month,
  history,
  todayISO,
  role
}: {
  workers: Worker[];
  companies: Company[];
  attendance: LocalAttendance;
  month: MonthSummary;
  history: AttendanceHistory;
  todayISO: string;
  role: UserRole;
}) {
  const rupees = (paise: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(paise / 100))}`;
  const active = workers.filter((worker) => worker.status === 'active');
  const companyName = (id: string | null) => companies.find((company) => company.id === id)?.name ?? 'Not placed yet';
  const totals = todayTotals(workers, attendance, companies);
  const roles = ['helper', 'fitter', 'welder', 'supervisor'] as const;
  const countRoles = (list: Worker[]) => Object.fromEntries(roles.map((item) => [item, list.filter((worker) => worker.role === item).length]));
  const absentToday = new Set(attendance.absentWorkerIds);
  const records = new Map(active.map((worker) => [worker.id, workerMonthRecord(history, worker.id, todayISO)]));
  const owner = role !== 'viewer';

  return {
    date: todayISO,
    today: {
      presentCount: totals.present,
      absentCount: totals.absent,
      usualHeadcount: totals.usual,
      hajriConfirmedFor: companies.filter((company) => attendance.confirmedCompanyIds.includes(company.id)).map((company) => company.name),
      hajriStillOpenFor: companies.filter((company) => !attendance.confirmedCompanyIds.includes(company.id)).map((company) => company.name),
      absentWorkers: active.filter((worker) => absentToday.has(worker.id)).map((worker) => worker.name)
    },
    thisMonth: {
      manDays: month.manDays,
      confirmedDays: month.confirmedDays,
      changeVsSameDaysLastMonthPercent: month.changePercent,
      estimatedBillBeforePfEsicGst: rupees(month.basePaise),
      grossWages: rupees(month.grossWagesPaise),
      cashWages: rupees(month.cashWagesPaise),
      bankWages: rupees(month.bankWagesPaise),
      byCompany: month.companies.map((row) => ({
        company: companyName(row.companyId),
        manDays: row.manDays,
        estimatedBillBeforePfEsicGst: rupees(row.basePaise),
        grossWages: rupees(row.grossWagesPaise)
      }))
    },
    workforce: {
      activeWorkers: active.length,
      byRole: countRoles(active),
      byCompany: companies.map((company) => {
        const placed = active.filter((worker) => worker.companyId === company.id);
        return {
          company: company.name,
          location: company.location,
          workers: placed.length,
          dayShift: placed.filter((worker) => worker.shift === 'day').length,
          nightShift: placed.filter((worker) => worker.shift === 'night').length,
          byRole: countRoles(placed)
        };
      }),
      notPlacedYet: active.filter((worker) => !worker.companyId).length,
      pfPendingCount: active.filter((worker) => worker.pfStatus === 'pending').length,
      esicPendingCount: active.filter((worker) => worker.esicStatus === 'pending').length,
      paidInCash: active.filter((worker) => worker.payMode === 'cash').length,
      paidByBank: active.filter((worker) => worker.payMode === 'bank').length
    },
    workers: active.map((worker) => ({
      name: worker.name,
      role: worker.role,
      company: companyName(worker.companyId),
      shift: worker.shift,
      ...(owner ? {dailyWage: rupees(worker.dailyWagePaise), pay: worker.payMode} : {}),
      pf: worker.pfStatus,
      esic: worker.esicStatus,
      absentToday: absentToday.has(worker.id),
      daysPresentThisMonth: records.get(worker.id)?.present ?? 0,
      daysAbsentThisMonth: records.get(worker.id)?.absent ?? 0
    }))
  };
}
