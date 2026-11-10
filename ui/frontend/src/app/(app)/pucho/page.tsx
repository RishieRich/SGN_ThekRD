'use client';

import {Bot, Mic, Send, Sparkles, Speaker, UserRound} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useTranslations} from 'next-intl';
import {FormEvent, useState} from 'react';
import {Card, Pill} from '@/components/ui/Card';
import {companies} from '@/data/sample-data';
import {buildCompanyWorkRows} from '@/domain/dashboard';
import {workerMonthRecord} from '@/domain/history';
import {formatNumber} from '@/lib/format';
import {speakInBrowser} from '@/lib/speech';
import {useApp} from '@/providers/AppProvider';
import styles from './ask.module.css';

const questionKeys = ['chipOne', 'chipTwo', 'chipThree', 'chipFour'] as const;
const answerKeys = ['answerOne', 'answerTwo', 'answerThree', 'answerFour'] as const;

export default function AskPage() {
  const t = useTranslations('ask');
  const common = useTranslations('common');
  const {locale, month, workers, history, todayISO} = useApp();
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
  const [connectionMessage, setConnectionMessage] = useState(false);

  function askSuggested(index: number) {
    setSelectedQuestion(index);
    setConnectionMessage(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!customQuestion.trim()) return;
    setSelectedQuestion(null);
    setConnectionMessage(true);
  }

  const answer = selectedQuestion === null ? null : t(answerKeys[selectedQuestion], answerParams[selectedQuestion]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><span>{common('notConnected')}</span><h1>{t('title')}</h1><p>{t('subtitle')}</p></div>
        <Pill tone="warning">{common('gemini')} · {common('notConnected')}</Pill>
      </header>

      <Card className={styles.connectionCard}>
        <span><Sparkles size={22} /></span>
        <div><h2>{t('connectionTitle')}</h2><p>{t('connectionBody')}</p></div>
      </Card>

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
                <button aria-label={common('notConnected')} onClick={() => speakInBrowser(answer, locale)} type="button"><Speaker size={17} /></button>
              </div>
            </motion.div>
          )}
          {connectionMessage && (
            <motion.div animate={{opacity: 1, y: 0}} className={styles.answerCard} initial={{opacity: 0, y: 8}} key="connection">
              <span className={styles.botIcon}><Bot size={18} /></span><div><p>{t('connectionBody')}</p></div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <form className={styles.composer} onSubmit={submit}>
        <button aria-label={common('notConnected')} onClick={() => setConnectionMessage(true)} type="button"><Mic size={20} /></button>
        <input onChange={(event) => setCustomQuestion(event.target.value)} placeholder={t('placeholder')} value={customQuestion} />
        <button aria-label={t('send')} type="submit"><Send size={19} /></button>
      </form>
    </div>
  );
}
