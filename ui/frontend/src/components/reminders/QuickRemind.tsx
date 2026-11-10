'use client';

import {AlarmClock, CalendarClock} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useState} from 'react';
import {MicButton} from '@/components/ui/MicButton';
import {presetDueAt, reminderPresets, type ReminderPreset} from '@/domain/reminders';
import {formatDateTime} from '@/lib/format';
import {useApp} from '@/providers/AppProvider';
import type {Reminder} from '@/types';
import styles from './reminders.module.css';

function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Type (or say) what to remember, then tap when. No form, no save button. */
export function QuickRemind({defaultText = '', links = {}, placeholder, onAdded}: {defaultText?: string; links?: Pick<Reminder, 'workerId' | 'companyId'>; placeholder?: string; onAdded?: () => void}) {
  const t = useTranslations('reminders');
  const {addReminder, now, locale, canEdit} = useApp();
  const [text, setText] = useState(defaultText);
  const [custom, setCustom] = useState(false);
  const [customAt, setCustomAt] = useState(() => toLocalInput(presetDueAt('tomorrowMorning', new Date())));

  if (!canEdit) return null;

  function add(due: Date) {
    if (!text.trim()) return;
    addReminder(text, due, links);
    setText(defaultText);
    setCustom(false);
    onAdded?.();
  }

  return (
    <div className={styles.quick}>
      <label className={styles.quickInput}>
        <AlarmClock size={17} />
        <input onChange={(event) => setText(event.target.value)} placeholder={placeholder ?? t('placeholder')} value={text} />
        <MicButton compact onText={(spoken) => setText((current) => (current ? `${current} ${spoken}` : spoken))} />
      </label>
      <div className={styles.presets}>
        {reminderPresets.map((preset: ReminderPreset) => {
          const due = presetDueAt(preset, now);
          return (
            <button disabled={!text.trim()} key={preset} onClick={() => add(due)} title={formatDateTime(due, locale)} type="button">
              <strong>{t(`preset.${preset}`)}</strong>
              <small>{formatDateTime(due, locale)}</small>
            </button>
          );
        })}
        <button aria-expanded={custom} disabled={!text.trim()} onClick={() => setCustom((value) => !value)} type="button">
          <strong><CalendarClock size={14} /> {t('preset.custom')}</strong>
          <small>{t('pickTime')}</small>
        </button>
      </div>
      {custom && (
        <div className={styles.customRow}>
          <input aria-label={t('pickTime')} onChange={(event) => setCustomAt(event.target.value)} type="datetime-local" value={customAt} />
          <button onClick={() => add(new Date(customAt))} type="button">{t('setReminder')}</button>
        </div>
      )}
    </div>
  );
}
