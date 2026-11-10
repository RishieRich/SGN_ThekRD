'use client';

import {AlarmClockPlus, AlertTriangle, ArrowRight, CheckCircle2, Clock3, Copy, MessageCircleMore, Sparkles, Speaker} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {companies, invoices} from '@/data/sample-data';
import {companyAttendance} from '@/domain/attendance';
import {buildSuggestions, type Suggestion, type SuggestionAudience} from '@/domain/insights';
import {formatINR} from '@/domain/money';
import {presetDueAt} from '@/domain/reminders';
import {todayStrength} from '@/domain/strength';
import {formatDate} from '@/lib/format';
import {copyText, whatsappUrl} from '@/lib/share';
import {speak} from '@/lib/speech';
import {useApp} from '@/providers/AppProvider';
import styles from './suggestions.module.css';

type Translate = ReturnType<typeof useTranslations>;

export function useSuggestions() {
  const {now, todayISO, user, workers, attendance, history, month} = useApp();
  return useMemo(
    () => buildSuggestions({now, todayISO, role: user.role, workers, companies, attendance, history, month, invoices}),
    [attendance, history, month, now, todayISO, user.role, workers]
  );
}

/** Renders a suggestion sentence: money params are formatted, shift names translated. */
export function useSuggestionText() {
  const t = useTranslations('insights');
  const common = useTranslations('common');
  const {locale} = useApp();
  return (suggestion: Suggestion) => {
    const params = Object.fromEntries(
      Object.entries(suggestion.params).map(([key, value]) => {
        if (key.endsWith('Paise') && typeof value === 'number') return [key.replace(/Paise$/, ''), formatINR(value, locale, true)];
        if (key === 'shift' && typeof value === 'string') return [key, common(value)];
        return [key, value];
      })
    );
    return t(suggestion.key, params);
  };
}

function useShareMessage() {
  const share = useTranslations('share');
  const {locale, todayISO, workers, attendance, month} = useApp();
  return (kind: 'todayCount' | 'shortNotice' | 'chequeReminder' | 'monthCount', companyId: string) => {
    const company = companies.find((item) => item.id === companyId);
    if (!company) return '';
    const date = formatDate(todayISO, locale, {day: 'numeric', month: 'long'});
    if (kind === 'todayCount') {
      const shifts = todayStrength(workers, attendance, company);
      const lines = shifts.map((row) => share('shiftLine', {shift: share(row.shift), present: row.present, usual: row.usual})).join('\n');
      return share('todayCount', {client: company.name, date, lines, manDays: companyAttendance(workers, attendance, companyId).manDays});
    }
    if (kind === 'shortNotice') {
      const short = todayStrength(workers, attendance, company).reduce((total, row) => total + row.short, 0);
      return share('shortNotice', {client: company.name, date, count: short});
    }
    if (kind === 'chequeReminder') {
      const invoice = invoices.find((item) => item.companyId === companyId && !item.paid);
      return share('chequeReminder', {client: company.name, amount: invoice ? formatINR(invoice.totalPaise, locale) : '', month: invoice?.month ?? ''});
    }
    const row = month.companies.find((item) => item.companyId === companyId);
    return share('monthCount', {client: company.name, manDays: row?.manDays ?? 0, date});
  };
}

const severityIcon = {problem: AlertTriangle, pending: Clock3, positive: CheckCircle2};

function SuggestionItem({suggestion, index, text, t}: {suggestion: Suggestion; index: number; text: string; t: Translate}) {
  const {locale, now, addReminder, canEdit, pushToast} = useApp();
  const reminderText = useTranslations('reminderText');
  const shareMessage = useShareMessage();
  const Icon = severityIcon[suggestion.severity];
  const action = suggestion.action;

  async function copyShare(message: string) {
    const copied = await copyText(message);
    pushToast({message: copied ? t('copied') : message, tone: copied ? 'success' : 'neutral'});
  }

  return (
    <motion.li
      animate={{opacity: 1, y: 0}}
      className={styles.item}
      data-severity={suggestion.severity}
      exit={{opacity: 0, height: 0}}
      initial={{opacity: 0, y: 8}}
      layout
      transition={{delay: Math.min(index * 0.04, 0.2)}}
    >
      <span className={styles.icon}><Icon size={16} /></span>
      <div className={styles.body}>
        <p>{text}</p>
        {action && (
          <div className={styles.actions}>
            {action.kind === 'link' && (
              <Link className={styles.primary} href={action.href}>{t(`action.${action.label}`)} <ArrowRight size={14} /></Link>
            )}
            {action.kind === 'remind' && canEdit && (
              <button
                className={styles.primary}
                onClick={() =>
                  addReminder(reminderText(action.reminderKey, {client: String(suggestion.params.client ?? '')}), presetDueAt('tomorrowMorning', now), {
                    companyId: action.companyId ?? null,
                    workerId: action.workerId ?? null
                  })
                }
                type="button"
              >
                <AlarmClockPlus size={14} /> {t('action.remindTomorrow')}
              </button>
            )}
            {action.kind === 'share' && (
              <>
                <a className={styles.whatsapp} href={whatsappUrl(shareMessage(action.message, action.companyId))} rel="noreferrer" target="_blank">
                  <MessageCircleMore size={14} /> {t('action.shareWhatsApp')}
                </a>
                <button className={styles.secondary} onClick={() => copyShare(shareMessage(action.message, action.companyId))} type="button">
                  <Copy size={13} /> {t('action.copy')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <button aria-label={t('listen')} className={styles.speak} onClick={() => speak(text, locale)} type="button"><Speaker size={15} /></button>
    </motion.li>
  );
}

export function SuggestionList({limit = 5, initialAudience = 'owner'}: {limit?: number; initialAudience?: SuggestionAudience}) {
  const t = useTranslations('insights');
  const {locale} = useApp();
  const suggestions = useSuggestions();
  const render = useSuggestionText();
  const [audience, setAudience] = useState<SuggestionAudience>(initialAudience);
  const [expanded, setExpanded] = useState(false);
  const visible = suggestions.filter((item) => item.audience === audience);
  const shown = expanded ? visible : visible.slice(0, limit);
  const counts = {owner: suggestions.filter((item) => item.audience === 'owner').length, client: suggestions.filter((item) => item.audience === 'client').length};

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2><Sparkles size={18} /> {t('title')}</h2>
          <p>{t('subtitle')}</p>
        </div>
        <button aria-label={t('listenAll')} className={styles.speakAll} onClick={() => speak(shown.map(render).join('. '), locale)} type="button"><Speaker size={16} /></button>
      </div>
      <div aria-label={t('title')} className={styles.tabs} role="tablist">
        {(['owner', 'client'] as SuggestionAudience[]).map((key) => (
          <button aria-selected={audience === key} key={key} onClick={() => { setAudience(key); setExpanded(false); }} role="tab" type="button">
            {t(`audience.${key}`)} <span>{counts[key]}</span>
          </button>
        ))}
      </div>
      <ul className={styles.list}>
        <AnimatePresence initial={false}>
          {shown.map((suggestion, index) => (
            <SuggestionItem index={index} key={suggestion.id} suggestion={suggestion} t={t} text={render(suggestion)} />
          ))}
        </AnimatePresence>
      </ul>
      {visible.length > limit && (
        <button className={styles.more} onClick={() => setExpanded((value) => !value)} type="button">
          {expanded ? t('showLess') : t('showMore', {count: visible.length - limit})}
        </button>
      )}
    </div>
  );
}
