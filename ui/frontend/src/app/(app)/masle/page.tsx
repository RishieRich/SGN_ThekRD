'use client';

import {AlertCircle, Banknote, Bandage, ChevronRight, FileWarning, HeartPulse, Plus, X} from 'lucide-react';
import {motion} from 'motion/react';
import {useTranslations} from 'next-intl';
import {useState} from 'react';
import {Card, Pill} from '@/components/ui/Card';
import {issues} from '@/data/sample-data';
import {useApp} from '@/providers/AppProvider';
import type {Issue} from '@/types';
import styles from './issues.module.css';

const typeIcons = {
  injury: Bandage,
  health: HeartPulse,
  statutory: FileWarning,
  dispute: AlertCircle,
  advance: Banknote
};

export default function IssuesPage() {
  const t = useTranslations('issues');
  const common = useTranslations('common');
  const {user, canEdit} = useApp();
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [notice, setNotice] = useState(false);
  const visibleIssues = issues.filter((issue) => !(user.role === 'viewer' && issue.sensitive));

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><span>{t('open')}</span><h1>{t('title')}</h1><p>{t('subtitle')}</p></div>
        {canEdit && <button onClick={() => setNotice(true)} type="button"><Plus size={18} /> {t('newIssue')}</button>}
      </header>

      {notice && <div className={styles.notice}><span>{t('localOnly')}</span><button aria-label={common('close')} onClick={() => setNotice(false)} type="button"><X size={17} /></button></div>}

      <section className={styles.issueStats}>
        <Card className={styles.statCard}><strong>{visibleIssues.length}</strong><span>{t('open')}</span></Card>
        <Card className={styles.statCard}><strong>2</strong><span>{t('statutory')}</span></Card>
        <Card className={styles.statCard}><strong>1</strong><span>{t('dispute')}</span></Card>
      </section>

      <div className={styles.tabs}>
        <button className={tab === 'open' ? styles.tabActive : ''} onClick={() => setTab('open')} type="button">{t('open')} <span>{visibleIssues.length}</span></button>
        <button className={tab === 'closed' ? styles.tabActive : ''} onClick={() => setTab('closed')} type="button">{t('closed')} <span>0</span></button>
      </div>

      {tab === 'closed' ? (
        <Card className={styles.empty}><span><AlertCircle size={25} /></span><p>{t('noClosed')}</p></Card>
      ) : (
        <section className={styles.issueList}>
          {visibleIssues.map((issue, index) => <IssueCard index={index} issue={issue} key={issue.id} />)}
        </section>
      )}
    </div>
  );
}

function IssueCard({issue, index}: {issue: Issue; index: number}) {
  const t = useTranslations('issues');
  const Icon = typeIcons[issue.type];
  return (
    <motion.button animate={{opacity: 1, y: 0}} className={styles.issueCard} initial={{opacity: 0, y: 8}} transition={{delay: index * 0.04}} type="button">
      <span className={styles.issueIcon} data-type={issue.type}><Icon size={21} /></span>
      <span className={styles.issueBody}>
        <span><Pill tone={issue.type === 'health' ? 'danger' : issue.type === 'statutory' ? 'warning' : 'royal'}>{t(issue.type)}</Pill><small>{t('daysOpen', {days: issue.daysOpen})}</small></span>
        <strong>{issue.workerName}</strong>
        <p>{issue.summary}</p>
        <small>{issue.companyName}</small>
      </span>
      <ChevronRight size={19} />
    </motion.button>
  );
}
