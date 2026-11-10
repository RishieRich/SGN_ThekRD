import type {Company} from '@/types';

export interface CompanyWorkRow {
  company: Company;
  manDays: number;
  sharePercent: number;
  relativeWidth: number;
}

export function buildCompanyWorkRows(companies: Company[], manDays: number[]): CompanyWorkRow[] {
  const total = manDays.reduce((sum, value) => sum + value, 0);
  const maximum = Math.max(...manDays, 1);
  return companies.map((company, index) => ({
    company,
    manDays: manDays[index] ?? 0,
    sharePercent: total === 0 ? 0 : Math.round(((manDays[index] ?? 0) * 100) / total),
    relativeWidth: Math.round(((manDays[index] ?? 0) * 100) / maximum)
  }));
}
