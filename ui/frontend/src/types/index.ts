export const locales = ['en', 'hi', 'mr', 'gu'] as const;
export type Locale = (typeof locales)[number];

export type UserRole = 'owner' | 'admin' | 'viewer';
export type WorkerRole = 'helper' | 'fitter' | 'welder' | 'supervisor';
export type Shift = 'day' | 'night';

export const workerRoles: WorkerRole[] = ['helper', 'fitter', 'welder', 'supervisor'];

export interface AppUser {
  id: string;
  name: string;
  initials: string;
  phone: string;
  role: UserRole;
  locale: Locale;
  previewPin: string;
}

export interface Company {
  id: string;
  name: string;
  shortName: string;
  location: string;
  colorIndex: number;
  dayHeadcount: number;
  nightHeadcount: number;
  rateType: 'flat' | 'role';
  /** Billing rate per man-day for flat-rate companies, in paise. */
  flatRatePaise?: number;
  /** Billing rate per man-day by role for role-rate companies, in paise. */
  roleRatesPaise?: Record<WorkerRole, number>;
  worksSunday: boolean;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  role: WorkerRole;
  companyId: string | null;
  shift: Shift;
  dailyWagePaise: number;
  payMode: 'cash' | 'bank';
  pfStatus: 'done' | 'pending';
  esicStatus: 'done' | 'pending';
  status: 'active' | 'inactive';
  /** Seed reliability used only to generate sample history. Display uses history. */
  attendancePercent: number;
  isNew?: boolean;
}

export type AttendanceTag = 'late' | 'halfDay' | 'sentHome' | 'overtime';
export const attendanceTags: AttendanceTag[] = ['late', 'halfDay', 'sentHome', 'overtime'];

export interface AttendanceNote {
  tag: AttendanceTag | null;
  text: string;
}

export interface LocalAttendance {
  absentWorkerIds: string[];
  touchedCompanyIds: string[];
  confirmedCompanyIds: string[];
  allConfirmed: boolean;
  /** Per-worker notes for today. Notes never change man-days. */
  notes?: Record<string, AttendanceNote>;
  /** Gate register counts keyed by `${companyId}:${shift}`. */
  gateCounts?: Record<string, number>;
}

export type NoteTag = 'general' | 'pay' | 'documents' | 'behaviour' | 'health';
export const noteTags: NoteTag[] = ['general', 'pay', 'documents', 'behaviour', 'health'];

export interface WorkerNote {
  id: string;
  workerId: string;
  text: string;
  tag: NoteTag;
  createdAt: string;
  author: string;
}

export interface Reminder {
  id: string;
  text: string;
  dueAt: string;
  done: boolean;
  createdAt: string;
  workerId?: string | null;
  companyId?: string | null;
  sample?: boolean;
}

export interface Issue {
  id: string;
  type: 'injury' | 'health' | 'statutory' | 'dispute' | 'advance';
  workerName: string;
  companyName: string;
  summary: string;
  daysOpen: number;
  sensitive?: boolean;
}

export interface Invoice {
  id: string;
  companyId: string;
  month: string;
  totalPaise: number;
  deliveredDaysAgo: number;
  paid: boolean;
}
