import type {Reminder} from '@/types';

export type ReminderPreset = 'oneHour' | 'thisEvening' | 'tomorrowMorning' | 'nextMonday';
export const reminderPresets: ReminderPreset[] = ['oneHour', 'thisEvening', 'tomorrowMorning', 'nextMonday'];

export function presetDueAt(preset: ReminderPreset, now: Date): Date {
  const due = new Date(now);
  switch (preset) {
    case 'oneHour':
      due.setMinutes(due.getMinutes() + 60, 0, 0);
      return due;
    case 'thisEvening':
      due.setHours(18, 0, 0, 0);
      if (due <= now) due.setDate(due.getDate() + 1);
      return due;
    case 'tomorrowMorning':
      due.setDate(due.getDate() + 1);
      due.setHours(9, 0, 0, 0);
      return due;
    case 'nextMonday': {
      const daysAhead = ((8 - due.getDay()) % 7) || 7;
      due.setDate(due.getDate() + daysAhead);
      due.setHours(9, 0, 0, 0);
      return due;
    }
  }
}

export function createReminder(text: string, dueAt: Date, now: Date, links: Pick<Reminder, 'workerId' | 'companyId'> = {}): Reminder {
  return {
    id: `rem-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    dueAt: dueAt.toISOString(),
    done: false,
    createdAt: now.toISOString(),
    workerId: links.workerId ?? null,
    companyId: links.companyId ?? null
  };
}

export function snoozeReminder(reminder: Reminder, minutes: number, now: Date): Reminder {
  return {...reminder, dueAt: new Date(now.getTime() + minutes * 60_000).toISOString(), done: false};
}

function isSameLocalDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

export function reminderBuckets(reminders: Reminder[], now: Date) {
  const open = reminders.filter((reminder) => !reminder.done).sort((left, right) => left.dueAt.localeCompare(right.dueAt));
  const overdue = open.filter((reminder) => new Date(reminder.dueAt) <= now);
  const today = open.filter((reminder) => new Date(reminder.dueAt) > now && isSameLocalDay(new Date(reminder.dueAt), now));
  const later = open.filter((reminder) => new Date(reminder.dueAt) > now && !isSameLocalDay(new Date(reminder.dueAt), now));
  const done = reminders.filter((reminder) => reminder.done).sort((left, right) => right.dueAt.localeCompare(left.dueAt));
  return {overdue, today, later, done};
}

/** Reminders that became due and have not been announced yet. */
export function newlyDue(reminders: Reminder[], now: Date, announcedIds: Set<string>) {
  return reminders.filter((reminder) => !reminder.done && new Date(reminder.dueAt) <= now && !announcedIds.has(`${reminder.id}@${reminder.dueAt}`));
}

export function announceKey(reminder: Reminder) {
  return `${reminder.id}@${reminder.dueAt}`;
}
