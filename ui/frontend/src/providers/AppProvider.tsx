'use client';

import {NextIntlClientProvider} from 'next-intl';
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import en from '../../messages/en.json';
import hi from '../../messages/hi.json';
import mr from '../../messages/mr.json';
import gu from '../../messages/gu.json';
import {
  applyAbsentees,
  confirmAll,
  confirmCompany,
  emptyAttendance,
  markCompanyPresent,
  setAbsent,
  setAttendanceNote,
  setGateCount,
  toggleAbsent
} from '@/domain/attendance';
import {monthSummary, type MonthSummary} from '@/domain/billing';
import {toISODate} from '@/domain/dates';
import {buildHistory, type AttendanceHistory} from '@/domain/history';
import {createNote} from '@/domain/notes';
import {announceKey, createReminder, newlyDue, snoozeReminder} from '@/domain/reminders';
import {applyWorkerEdits, emptyWorkerEdits, patchWorker, type NewWorkerInput, createWorker, type WorkerEdits} from '@/domain/workers';
import {companies, sampleReminders, workers as sampleWorkers} from '@/data/sample-data';
import type {ImportKind} from '@/domain/imports';
import type {AppUser, AttendanceNote, Locale, LocalAttendance, NoteTag, Reminder, Shift, Worker, WorkerNote} from '@/types';

const messages = {en, hi, mr, gu};

export type InputMode = 'type' | 'speak' | 'excel';

export interface AssistantState {
  open: boolean;
  mode: InputMode;
  /** Text to work on as soon as the panel opens (from the Home bar). */
  text: string;
  excelKind: ImportKind | null;
  /** Changes on every open so the panel can react to a new request. */
  nonce: number;
}

export interface Toast {
  id: string;
  message: string;
  tone?: 'neutral' | 'success' | 'reminder';
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  duration?: number;
}

interface AppContextValue {
  user: AppUser;
  canEdit: boolean;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  hydrated: boolean;
  now: Date;
  todayISO: string;

  workers: Worker[];
  history: AttendanceHistory;
  month: MonthSummary;
  updateWorker: (workerId: string, patch: Partial<Worker>, options?: {silent?: boolean}) => void;
  addWorker: (input: NewWorkerInput) => Worker;
  addWorkers: (inputs: NewWorkerInput[]) => Worker[];
  markWorkersAbsent: (workerIds: string[]) => void;

  attendance: LocalAttendance;
  toggleWorkerAbsent: (workerId: string, companyId: string) => void;
  setWorkerAbsent: (workerId: string, companyId: string, absent: boolean) => void;
  markAllPresent: (companyId: string) => void;
  copyAbsentees: (absentIds: string[]) => void;
  confirmOneCompany: (companyId: string) => void;
  confirmEveryCompany: () => void;
  saveAttendanceNote: (workerId: string, note: AttendanceNote | null) => void;
  saveGateCount: (companyId: string, shift: Shift, count: number | null) => void;

  notes: WorkerNote[];
  addNote: (workerId: string, text: string, tag: NoteTag) => void;
  deleteNote: (noteId: string) => void;

  reminders: Reminder[];
  addReminder: (text: string, dueAt: Date, links?: Pick<Reminder, 'workerId' | 'companyId'>) => void;
  completeReminder: (reminderId: string, done?: boolean) => void;
  snooze: (reminderId: string, minutes: number) => void;
  deleteReminder: (reminderId: string) => void;
  remindersOpen: boolean;
  setRemindersOpen: (open: boolean) => void;

  assistant: AssistantState;
  openAssistant: (mode?: InputMode, options?: {text?: string; excelKind?: ImportKind}) => void;
  closeAssistant: () => void;

  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (toastId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const keys = {
  locale: 'arq-locale',
  workers: 'arq-workers-v1',
  notes: 'arq-notes-v1',
  reminders: 'arq-reminders-v1',
  announced: 'arq-reminders-announced-v1',
  nudge: 'arq-nudge-v1'
};

function attendanceKey(todayISO: string) {
  return `arq-attendance-${todayISO}`;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked; the app keeps working in memory.
  }
}

export function AppProvider({user, children}: {user: AppUser; children: React.ReactNode}) {
  const [locale, setLocaleState] = useState<Locale>(user.locale);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [attendance, setAttendance] = useState<LocalAttendance>(emptyAttendance);
  const [workerEdits, setWorkerEdits] = useState<WorkerEdits>(emptyWorkerEdits);
  const [notes, setNotes] = useState<WorkerNote[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [assistant, setAssistant] = useState<AssistantState>({open: false, mode: 'type', text: '', excelKind: null, nonce: 0});
  const openAssistant = useCallback(
    (mode: InputMode = 'type', options: {text?: string; excelKind?: ImportKind} = {}) =>
      setAssistant((current) => ({open: true, mode, text: options.text ?? '', excelKind: options.excelKind ?? null, nonce: current.nonce + 1})),
    []
  );
  const closeAssistant = useCallback(() => setAssistant((current) => ({...current, open: false})), []);
  const announced = useRef<Set<string>>(new Set());
  const todayISO = toISODate(now);
  const canEdit = user.role !== 'viewer';

  // Load everything saved on this device once, after the first render.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedLocale = readJSON<Locale | null>(keys.locale, null);
      if (storedLocale && storedLocale in messages) setLocaleState(storedLocale);
      setAttendance({...emptyAttendance, ...readJSON<LocalAttendance>(attendanceKey(toISODate(new Date())), emptyAttendance)});
      setWorkerEdits(readJSON<WorkerEdits>(keys.workers, emptyWorkerEdits));
      setNotes(readJSON<WorkerNote[]>(keys.notes, []));
      const storedReminders = readJSON<Reminder[] | null>(keys.reminders, null);
      setReminders(storedReminders ?? sampleReminders(new Date()));
      announced.current = new Set(readJSON<string[]>(keys.announced, []));
      setNow(new Date());
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Live clock for reminders and time-aware suggestions.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
    if (hydrated) writeJSON(keys.locale, locale);
  }, [hydrated, locale]);

  useEffect(() => {
    if (hydrated) writeJSON(attendanceKey(todayISO), attendance);
  }, [attendance, hydrated, todayISO]);
  useEffect(() => {
    if (hydrated) writeJSON(keys.workers, workerEdits);
  }, [hydrated, workerEdits]);
  useEffect(() => {
    if (hydrated) writeJSON(keys.notes, notes);
  }, [hydrated, notes]);
  useEffect(() => {
    if (hydrated) writeJSON(keys.reminders, reminders);
  }, [hydrated, reminders]);

  const workers = useMemo(() => applyWorkerEdits(sampleWorkers, workerEdits), [workerEdits]);
  const workersRef = useRef(workers);
  useEffect(() => {
    workersRef.current = workers;
  }, [workers]);
  // Past days are fixed facts, so history is built from the original placements.
  const history = useMemo(() => buildHistory(sampleWorkers, companies, todayISO), [todayISO]);
  const month = useMemo(() => monthSummary(history, workers, companies, todayISO), [history, workers, todayISO]);

  const dismissToast = useCallback((toastId: string) => setToasts((current) => current.filter((toast) => toast.id !== toastId)), []);
  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((current) => [...current.slice(-3), {...toast, id}]);
  }, []);

  const t = useMemo(() => {
    const dictionary = messages[locale] as unknown as Record<string, Record<string, string>>;
    return (section: string, key: string, params: Record<string, string | number> = {}) =>
      (dictionary[section]?.[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
  }, [locale]);

  // Announce reminders the moment they fall due.
  useEffect(() => {
    if (!hydrated) return;
    const due = newlyDue(reminders, now, announced.current);
    if (!due.length) return;
    for (const reminder of due) {
      announced.current.add(announceKey(reminder));
      pushToast({
        message: reminder.text,
        tone: 'reminder',
        actionLabel: t('reminders', 'markDone'),
        onAction: () => setReminders((current) => current.map((item) => (item.id === reminder.id ? {...item, done: true} : item))),
        duration: 12_000
      });
    }
    writeJSON(keys.announced, [...announced.current].slice(-200));
  }, [hydrated, now, pushToast, reminders, t]);

  // A gentle morning nudge once a day if Hajri is still open after 10 AM.
  useEffect(() => {
    if (!hydrated || attendance.allConfirmed || now.getHours() < 10) return;
    const timer = window.setTimeout(() => {
      if (readJSON<string | null>(keys.nudge, null) === todayISO) return;
      writeJSON(keys.nudge, todayISO);
      pushToast({message: t('reminders', 'hajriNudge'), tone: 'reminder', actionLabel: t('reminders', 'openHajri'), href: '/hajri', duration: 10_000});
    }, 0);

    return () => window.clearTimeout(timer);
  }, [attendance.allConfirmed, hydrated, now, pushToast, t, todayISO]);

  const setLocale = useCallback((nextLocale: Locale) => setLocaleState(nextLocale), []);

  const updateWorker = useCallback(
    (workerId: string, patch: Partial<Worker>, options: {silent?: boolean} = {}) => {
      if (!canEdit) return;
      const before = workersRef.current.find((worker) => worker.id === workerId);
      if (!before) return;
      const previous = Object.fromEntries(Object.keys(patch).map((key) => [key, before[key as keyof Worker]])) as Partial<Worker>;
      setWorkerEdits((current) => patchWorker(current, workerId, patch));
      if (!options.silent) {
        pushToast({
          message: t('toast', 'saved', {name: before.name}),
          tone: 'success',
          actionLabel: t('toast', 'undo'),
          onAction: () => setWorkerEdits((current) => patchWorker(current, workerId, previous)),
          duration: 4_000
        });
      }
    },
    [canEdit, pushToast, t]
  );

  const addWorker = useCallback(
    (input: NewWorkerInput) => {
      const worker = createWorker(input, workersRef.current);
      // Keep the ref current so two quick adds before a re-render never share an id.
      workersRef.current = [...workersRef.current, worker];
      setWorkerEdits((current) => ({...current, added: [...current.added, worker]}));
      return worker;
    },
    []
  );

  const addWorkers = useCallback((inputs: NewWorkerInput[]) => {
    const created: Worker[] = [];
    let pool = workersRef.current;
    for (const input of inputs) {
      const worker = createWorker(input, pool);
      pool = [...pool, worker];
      created.push(worker);
    }
    workersRef.current = pool;
    setWorkerEdits((current) => ({...current, added: [...current.added, ...created]}));
    return created;
  }, []);

  const markWorkersAbsent = useCallback(
    (workerIds: string[]) =>
      setAttendance((current) =>
        workerIds.reduce((next, workerId) => {
          const worker = workersRef.current.find((item) => item.id === workerId);
          return worker?.companyId ? setAbsent(next, workerId, worker.companyId, true) : next;
        }, current)
      ),
    []
  );

  const toggleWorkerAbsent = useCallback(
    (workerId: string, companyId: string) => setAttendance((current) => toggleAbsent(current, workerId, companyId)),
    []
  );
  const setWorkerAbsent = useCallback(
    (workerId: string, companyId: string, absent: boolean) => setAttendance((current) => setAbsent(current, workerId, companyId, absent)),
    []
  );
  const markAllPresent = useCallback(
    (companyId: string) => setAttendance((current) => markCompanyPresent(current, workersRef.current, companyId)),
    []
  );
  const copyAbsentees = useCallback(
    (absentIds: string[]) => setAttendance((current) => applyAbsentees(current, workersRef.current, absentIds)),
    []
  );
  const confirmOneCompany = useCallback(
    (companyId: string) => setAttendance((current) => confirmCompany(current, companyId, companies)),
    []
  );
  const confirmEveryCompany = useCallback(() => setAttendance((current) => confirmAll(current, companies)), []);
  const saveAttendanceNote = useCallback(
    (workerId: string, note: AttendanceNote | null) => setAttendance((current) => setAttendanceNote(current, workerId, note)),
    []
  );
  const saveGateCount = useCallback(
    (companyId: string, shift: Shift, count: number | null) => setAttendance((current) => setGateCount(current, companyId, shift, count)),
    []
  );

  const addNote = useCallback(
    (workerId: string, text: string, tag: NoteTag) => {
      if (!text.trim()) return;
      setNotes((current) => [createNote(workerId, text, tag, user.name, new Date()), ...current]);
    },
    [user.name]
  );
  const deleteNote = useCallback((noteId: string) => setNotes((current) => current.filter((note) => note.id !== noteId)), []);

  const addReminder = useCallback(
    (text: string, dueAt: Date, links: Pick<Reminder, 'workerId' | 'companyId'> = {}) => {
      if (!text.trim()) return;
      setReminders((current) => [...current, createReminder(text, dueAt, new Date(), links)]);
      pushToast({message: t('reminders', 'added'), tone: 'success', duration: 3_000});
    },
    [pushToast, t]
  );
  const completeReminder = useCallback(
    (reminderId: string, done = true) =>
      setReminders((current) => current.map((reminder) => (reminder.id === reminderId ? {...reminder, done} : reminder))),
    []
  );
  const snooze = useCallback(
    (reminderId: string, minutes: number) =>
      setReminders((current) => current.map((reminder) => (reminder.id === reminderId ? snoozeReminder(reminder, minutes, new Date()) : reminder))),
    []
  );
  const deleteReminder = useCallback((reminderId: string) => setReminders((current) => current.filter((reminder) => reminder.id !== reminderId)), []);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      canEdit,
      locale,
      setLocale,
      hydrated,
      now,
      todayISO,
      workers,
      history,
      month,
      updateWorker,
      addWorker,
      addWorkers,
      markWorkersAbsent,
      attendance,
      toggleWorkerAbsent,
      setWorkerAbsent,
      markAllPresent,
      copyAbsentees,
      confirmOneCompany,
      confirmEveryCompany,
      saveAttendanceNote,
      saveGateCount,
      notes,
      addNote,
      deleteNote,
      reminders,
      addReminder,
      completeReminder,
      snooze,
      deleteReminder,
      remindersOpen,
      setRemindersOpen,
      assistant,
      openAssistant,
      closeAssistant,
      toasts,
      pushToast,
      dismissToast
    }),
    [
      addNote, addReminder, addWorker, addWorkers, assistant, closeAssistant, markWorkersAbsent, openAssistant, attendance, canEdit, completeReminder, confirmEveryCompany, confirmOneCompany, copyAbsentees,
      deleteNote, deleteReminder, dismissToast, history, hydrated, locale, markAllPresent, month, notes, now, pushToast, reminders,
      remindersOpen, saveAttendanceNote, saveGateCount, setLocale, setWorkerAbsent, snooze, toasts, todayISO, toggleWorkerAbsent,
      updateWorker, user, workers
    ]
  );

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Kolkata">
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </NextIntlClientProvider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
