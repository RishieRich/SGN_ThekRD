'use client';

import {BellRing, Building2, Check, Clock3, RotateCcw, Trash2, UserRound} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {Sheet} from '@/components/ui/Sheet';
import {companies} from '@/data/sample-data';
import {reminderBuckets} from '@/domain/reminders';
import {formatDateTime, formatRelative} from '@/lib/format';
import {useApp} from '@/providers/AppProvider';
import type {Reminder} from '@/types';
import {QuickRemind} from './QuickRemind';
import styles from './reminders.module.css';

export function ReminderRow({reminder}: {reminder: Reminder}) {
  const t = useTranslations('reminders');
  const common = useTranslations('common');
  const {now, locale, workers, completeReminder, snooze, deleteReminder, canEdit, setRemindersOpen} = useApp();
  const due = new Date(reminder.dueAt);
  const overdue = !reminder.done && due <= now;
  const worker = reminder.workerId ? workers.find((item) => item.id === reminder.workerId) : null;
  const company = reminder.companyId ? companies.find((item) => item.id === reminder.companyId) : null;

  return (
    <motion.li animate={{opacity: 1, x: 0}} className={styles.row} data-done={reminder.done ? 'true' : undefined} data-overdue={overdue ? 'true' : undefined} exit={{opacity: 0, x: 20}} initial={{opacity: 0, x: -8}} layout>
      <button
        aria-label={reminder.done ? t('markOpen') : t('markDone')}
        className={styles.check}
        disabled={!canEdit}
        onClick={() => completeReminder(reminder.id, !reminder.done)}
        type="button"
      >
        {reminder.done && <Check size={15} />}
      </button>
      <div className={styles.rowBody}>
        <p>{reminder.text}</p>
        <span className={styles.meta}>
          <span className={overdue ? styles.overdue : undefined}><Clock3 size={12} /> {formatRelative(due, now, locale)} · {formatDateTime(due, locale)}</span>
          {worker && <Link href={`/kaamgar?worker=${worker.id}`} onClick={() => setRemindersOpen(false)}><UserRound size={12} /> {worker.name}</Link>}
          {company && <span><Building2 size={12} /> {company.name}</span>}
        </span>
        {canEdit && !reminder.done && overdue && (
          <span className={styles.snoozes}>
            <button onClick={() => snooze(reminder.id, 60)} type="button"><RotateCcw size={12} /> {t('snoozeHour')}</button>
            <button onClick={() => snooze(reminder.id, 60 * 24)} type="button"><RotateCcw size={12} /> {t('snoozeDay')}</button>
          </span>
        )}
      </div>
      {canEdit && (
        <button aria-label={common('delete')} className={styles.delete} onClick={() => deleteReminder(reminder.id)} type="button"><Trash2 size={15} /></button>
      )}
    </motion.li>
  );
}

export function RemindersPanel() {
  const t = useTranslations('reminders');
  const common = useTranslations('common');
  const {reminders, now, remindersOpen, setRemindersOpen} = useApp();
  const buckets = reminderBuckets(reminders, now);
  const groups: Array<{key: string; title: string; items: Reminder[]}> = [
    {key: 'overdue', title: t('overdue'), items: buckets.overdue},
    {key: 'today', title: t('today'), items: buckets.today},
    {key: 'later', title: t('later'), items: buckets.later},
    {key: 'done', title: t('done'), items: buckets.done.slice(0, 8)}
  ];
  const openCount = buckets.overdue.length + buckets.today.length + buckets.later.length;

  return (
    <Sheet
      closeLabel={common('close')}
      leading={<span className={styles.sheetIcon}><BellRing size={20} /></span>}
      onClose={() => setRemindersOpen(false)}
      open={remindersOpen}
      subtitle={t('subtitle', {count: openCount})}
      title={t('title')}
    >
      <section className={styles.addBlock}>
        <h3>{t('addTitle')}</h3>
        <QuickRemind />
      </section>
      {openCount === 0 && buckets.done.length === 0 && (
        <div className={styles.empty}><BellRing size={26} /><p>{t('empty')}</p></div>
      )}
      {groups.map((group) =>
        group.items.length ? (
          <section className={styles.group} key={group.key}>
            <h3 data-group={group.key}>{group.title} <span>{group.items.length}</span></h3>
            <ul>
              <AnimatePresence initial={false}>
                {group.items.map((reminder) => <ReminderRow key={reminder.id} reminder={reminder} />)}
              </AnimatePresence>
            </ul>
          </section>
        ) : null
      )}
    </Sheet>
  );
}
