import type {Shift, Worker, WorkerRole} from '@/types';

export interface WorkerEdits {
  patches: Record<string, Partial<Worker>>;
  added: Worker[];
}

export const emptyWorkerEdits: WorkerEdits = {patches: {}, added: []};

/** Sample roster with the user's local edits and additions applied. */
export function applyWorkerEdits(base: Worker[], edits: WorkerEdits): Worker[] {
  const merged = base.map((worker) => (edits.patches[worker.id] ? {...worker, ...edits.patches[worker.id], id: worker.id} : worker));
  const added = edits.added.map((worker) => (edits.patches[worker.id] ? {...worker, ...edits.patches[worker.id], id: worker.id} : worker));
  return [...merged, ...added];
}

export function patchWorker(edits: WorkerEdits, workerId: string, patch: Partial<Worker>): WorkerEdits {
  return {...edits, patches: {...edits.patches, [workerId]: {...edits.patches[workerId], ...patch}}};
}

const defaultWages: Record<WorkerRole, number> = {
  helper: 48_000,
  fitter: 61_000,
  welder: 65_000,
  supervisor: 75_000
};

export function defaultWagePaise(role: WorkerRole) {
  return defaultWages[role];
}

export const wageStepPaise = 1_000;

export function stepWage(currentPaise: number, direction: 1 | -1) {
  return Math.max(wageStepPaise, currentPaise + direction * wageStepPaise);
}

export interface NewWorkerInput {
  name: string;
  phone: string;
  role: WorkerRole;
  companyId: string | null;
  shift: Shift;
  dailyWagePaise: number;
}

export function createWorker(input: NewWorkerInput, existing: Worker[]): Worker {
  const next = existing.filter((worker) => worker.id.startsWith('new-')).length + 1;
  return {
    id: `new-${String(next).padStart(3, '0')}-${Date.now().toString(36)}`,
    name: input.name.trim().replace(/\s+/g, ' '),
    phone: input.phone.trim(),
    role: input.role,
    companyId: input.companyId,
    shift: input.shift,
    dailyWagePaise: input.dailyWagePaise,
    payMode: 'cash',
    pfStatus: 'pending',
    esicStatus: 'pending',
    status: 'active',
    attendancePercent: 100,
    isNew: true
  };
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toLocaleUpperCase();
}

/** Viewers see a masked phone (constitution C7). */
export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '•••';
  return `••••• ••${digits.slice(-3)}`;
}

export function phoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}
