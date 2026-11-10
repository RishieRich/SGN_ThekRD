'use client';

import {AudioLines, Bot, Mic, RefreshCw, Send, Sparkles, Speaker, UserRound} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useTranslations} from 'next-intl';
import {FormEvent, useEffect, useState} from 'react';
import {Card, Pill} from '@/components/ui/Card';
import {companies} from '@/data/sample-data';
import {buildCompanyWorkRows} from '@/domain/dashboard';
import {workerMonthRecord} from '@/domain/history';
import {formatNumber} from '@/lib/format';
import {speak} from '@/lib/speech';
import {useApp} from '@/providers/AppProvider';
import styles from './ask.module.css';

const questionKeys = ['chipOne', 'chipTwo', 'chipThree', 'chipFour'] as const;
const answerKeys = ['answerOne', 'answerTwo', 'answerThree', 'answerFour'] as const;

export default function AskPage() {
  const t = useTranslations('ask');
  const common = useTranslations('common');
  const assistant = useTranslations('assistant');
  const {locale, month, workers, history, todayISO, openAssistant, ai, canEdit} = useApp();
  const topCompany = [...buildCompanyWorkRows(companies, month.companies.map((row) => row.manDays))].sort((left, right) => right.manDays - left.manDays)[0];
  const mostAbsent = workers
    .filter((worker) => worker.status === 'active')
    .map((worker) => ({worker, absent: workerMonthRecord(history, worker.id, todayISO).absent}))
    .sort((left, right) => right.absent - left.absent)[0];
  const answerParams: Array<Record<string, string | number>> = [
    {count: formatNumber(month.manDays, locale)},
    {client: topCompany?.company.name ?? '', pct: topCompany?.sharePercent ?? 0},
    {worker: mostAbsent?.worker.name ?? '', days: mostAbsent?.absent ?? 0},
    {count: workers.filter((worker) => worker.status === 'active' && worker.pfStatus === 'pending').length}
  ];
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  function askSuggested(index: number) {
    setSelectedQuestion(index);
  }

  // Typed or spoken questions go to ARQ Sahayak, which answers from the app's own numbers.
  function submit(event: FormEvent) {
    event.preventDefault();
    const text = customQuestion.trim();
    if (!text) return;
    openAssistant('type', {text});
    setCustomQuestion('');
  }

  const answer = selectedQuestion === null ? null : t(answerKeys[selectedQuestion], answerParams[selectedQuestion]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>{!ai.gemini && <span>{common('notConnected')}</span>}<h1>{t('title')}</h1><p>{t('subtitle')}</p></div>
        {!ai.gemini && <Pill tone="warning">{common('gemini')} · {common('notConnected')}</Pill>}
      </header>

      {canEdit && <ConnectionStatus />}

      {!ai.gemini && (
        <Card className={styles.connectionCard}>
          <span><Sparkles size={22} /></span>
          <div><h2>{t('connectionTitle')}</h2><p>{t('connectionBody')}</p></div>
        </Card>
      )}

      <section className={styles.chatWindow}>
        <div className={styles.botIntro}>
          <span><Bot size={21} /></span>
          <div><strong>{t('title')}</strong><p>{t('subtitle')}</p></div>
        </div>

        <div className={styles.suggestions}>
          {questionKeys.map((key, index) => <button key={key} onClick={() => askSuggested(index)} type="button">{t(key)}</button>)}
        </div>

        <AnimatePresence mode="wait">
          {selectedQuestion !== null && answer && (
            <motion.div animate={{opacity: 1, y: 0}} className={styles.exchange} exit={{opacity: 0, y: -6}} initial={{opacity: 0, y: 8}} key={selectedQuestion}>
              <div className={styles.userBubble}><span><UserRound size={16} /></span><p>{t(questionKeys[selectedQuestion])}</p></div>
              <div className={styles.answerCard}>
                <span className={styles.botIcon}><Bot size={18} /></span>
                <div><p>{answer}</p><small>{t('source')}</small></div>
                <button aria-label={t('listen')} onClick={() => speak(answer, locale)} type="button"><Speaker size={17} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <form className={styles.composer} onSubmit={submit}>
        <button aria-label={assistant('mode.speak')} onClick={() => openAssistant('speak')} type="button"><Mic size={20} /></button>
        <input onChange={(event) => setCustomQuestion(event.target.value)} placeholder={t('placeholder')} value={customQuestion} />
        <button aria-label={t('send')} type="submit"><Send size={19} /></button>
      </form>
    </div>
  );
}

type ProviderState = 'connected' | 'missing_key' | 'invalid_key' | 'no_credits' | 'error';
interface Health {
  round: number;
  gemini: {status: ProviderState; chatModel?: string};
  sarvam: {status: ProviderState; ttsModel?: string; sttModel?: string};
}

/** Owner and admin: is each AI key working right now? With buttons to try each one. */
function ConnectionStatus() {
  const t = useTranslations('ask');
  const {locale, openAssistant} = useApp();
  const [round, setRound] = useState(0);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/health', {cache: 'no-store'})
      .then((response) => response.json() as Promise<Omit<Health, 'round'>>)
      .then((body) => {
        if (live) setHealth({...body, round});
      })
      .catch(() => {
        if (live) setHealth({round, gemini: {status: 'error'}, sarvam: {status: 'error'}});
      });
    return () => {
      live = false;
    };
  }, [round]);

  const checking = !health || health.round !== round;
  const rows = [
    {
      key: 'gemini' as const,
      icon: Sparkles,
      detail: health?.gemini.chatModel,
      action: {label: t('tryQuestion'), run: () => openAssistant('type', {text: t('sampleQuestion')})},
      second: null
    },
    {
      key: 'sarvam' as const,
      icon: AudioLines,
      detail: health?.sarvam.ttsModel ? `${health.sarvam.ttsModel} · ${health.sarvam.sttModel}` : undefined,
      action: {label: t('testVoice'), run: () => speak(t('voiceSample'), locale)},
      second: {label: t('testMic'), run: () => openAssistant('speak')}
    }
  ];

  return (
    <section aria-busy={checking} aria-label={t('statusTitle')} className={styles.statusCard}>
      <div className={styles.statusHead}>
        <div><h2>{t('statusTitle')}</h2><p>{t('statusHint')}</p></div>
        <button disabled={checking} onClick={() => setRound((value) => value + 1)} type="button">
          <RefreshCw className={checking ? styles.spinning : undefined} size={15} /> {t('checkAgain')}
        </button>
      </div>
      {rows.map((row) => {
        const status = checking ? 'checking' : (health?.[row.key].status ?? 'error');
        const Icon = row.icon;
        return (
          <div className={styles.statusRow} key={row.key}>
            <span className={styles.statusIcon}><Icon size={18} /></span>
            <div className={styles.statusText}>
              <strong>{t(`provider.${row.key}.name`)}</strong>
              <small>{t(`provider.${row.key}.purpose`)}{status === 'connected' && row.detail ? ` · ${row.detail}` : ''}</small>
            </div>
            <span className={styles.statusChip} data-status={status}>{t(`status.${status}`)}</span>
            {status === 'connected' && (
              <div className={styles.statusActions}>
                <button onClick={row.action.run} type="button">{row.action.label}</button>
                {row.second && <button onClick={row.second.run} type="button">{row.second.label}</button>}
              </div>
            )}
            {status !== 'connected' && status !== 'checking' && (
              <p className={styles.statusFix}>{t(`fix.${status}`, {name: row.key === 'gemini' ? 'GEMINI_API_KEY' : 'SARVAM_API_KEY'})}</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
