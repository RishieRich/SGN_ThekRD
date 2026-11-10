'use client';

import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  History,
  ListPlus,
  Lock,
  MessageCircleMore,
  Mic,
  NotebookPen,
  RotateCcw,
  Search,
  Sparkles,
  UserRoundCheck,
  Users,
  X
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useTranslations} from 'next-intl';
import {useRouter, useSearchParams} from 'next/navigation';
import {Suspense, useMemo, useRef, useState} from 'react';
import {Petals} from '@/components/celebrate/Petals';
import {Ring} from '@/components/charts/Ring';
import {Sparkline} from '@/components/charts/Sparkline';
import {Avatar} from '@/components/ui/Avatar';
import {Card, Pill} from '@/components/ui/Card';
import {MicButton} from '@/components/ui/MicButton';
import {companies} from '@/data/sample-data';
import {
  absentWorkersForCompany,
  activeWorkersForCompany,
  companyAttendance,
  gateDifference,
  gateKey,
  parseNameList,
  searchWorkers,
  shiftAttendance,
  todayTotals
} from '@/domain/attendance';
import {addDays} from '@/domain/dates';
import {companyTrend, findDay, likelyAbsent, presentOnDay} from '@/domain/history';
import {todayStrength, worstLevel} from '@/domain/strength';
import {formatDate} from '@/lib/format';
import {whatsappUrl} from '@/lib/share';
import {useApp} from '@/providers/AppProvider';
import {attendanceTags, type AttendanceTag, type Company, type Shift, type Worker, type WorkerRole} from '@/types';
import styles from './hajri.module.css';

const roles: Array<WorkerRole | 'all'> = ['all', 'helper', 'fitter', 'welder', 'supervisor'];

export default function HajriPage() {
  return (
    <Suspense>
      <HajriScreen />
    </Suspense>
  );
}

function useShareToday() {
  const share = useTranslations('share');
  const {locale, todayISO, workers, attendance} = useApp();
  return (company: Company) => {
    const lines = todayStrength(workers, attendance, company)
      .map((row) => share('shiftLine', {shift: share(row.shift), present: row.present, usual: row.usual}))
      .join('\n');
    return share('todayCount', {
      client: company.name,
      date: formatDate(todayISO, locale, {day: 'numeric', month: 'long'}),
      lines,
      manDays: companyAttendance(workers, attendance, company.id).manDays
    });
  };
}

function HajriScreen() {
  const t = useTranslations('hajri');
  const common = useTranslations('common');
  const router = useRouter();
  const params = useSearchParams();
  const {attendance, workers, history, todayISO, locale, copyAbsentees, confirmOneCompany, confirmEveryCompany, pushToast, canEdit} = useApp();
  const selectedCompanyId = params.get('company');
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const shareToday = useShareToday();

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const yesterday = findDay(history, addDays(todayISO, -1));

  function openCompany(companyId: string | null) {
    router.push(companyId ? `/hajri?company=${companyId}` : '/hajri', {scroll: true});
  }

  function completeCompany(company: Company) {
    confirmOneCompany(company.id);
    openCompany(null);
    pushToast({message: t('companyConfirmed', {client: company.name}), tone: 'success', actionLabel: t('sendCount'), onAction: () => window.open(whatsappUrl(shareToday(company)), '_blank', 'noopener')});
  }

  function completeAll() {
    confirmEveryCompany();
    setConfirmOpen(false);
    setCelebrated(true);
    window.setTimeout(() => setCelebrated(false), 4200);
  }

  function sameAsYesterday() {
    if (!yesterday) return;
    const before = attendance.absentWorkerIds;
    copyAbsentees(yesterday.absentIds);
    pushToast({
      message: t('copiedYesterday', {count: yesterday.absentIds.length}),
      tone: 'success',
      actionLabel: t('undo'),
      onAction: () => copyAbsentees(before),
      duration: 6_000
    });
  }

  if (selectedCompany) {
    return <CompanySheet company={selectedCompany} onBack={() => openCompany(null)} onDone={() => completeCompany(selectedCompany)} shareText={shareToday(selectedCompany)} />;
  }

  const totals = todayTotals(workers, attendance, companies);
  const readyCount = attendance.touchedCompanyIds.length;
  const confirmedCount = attendance.confirmedCompanyIds.length;
  const isToday = selectedDate === todayISO;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>{formatDate(todayISO, locale, {weekday: 'long', day: 'numeric', month: 'long'})}</span>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        <div className={styles.headerProgress}>
          <Ring label={t('companyProgress', {done: confirmedCount, total: companies.length})} size={62} stroke={7} tone="royal" value={confirmedCount / companies.length}>
            <strong>{confirmedCount}/{companies.length}</strong>
          </Ring>
          <span>
            <strong>{t('confirmedOf', {done: confirmedCount, total: companies.length})}</strong>
            <small>{t('presentAbsent', {present: totals.present, absent: totals.absent})}</small>
          </span>
        </div>
      </header>

      <section aria-label={t('pickDay')} className={styles.dateStrip}>
        {[-6, -5, -4, -3, -2, -1, 0].map((offset) => {
          const date = addDays(todayISO, offset);
          const day = findDay(history, date);
          const counts = day ? presentOnDay(history, day) : null;
          const active = selectedDate === date;
          return (
            <button aria-pressed={active} className={active ? styles.dateActive : styles.dateButton} key={date} onClick={() => setSelectedDate(date)} type="button">
              <span>{formatDate(date, locale, {weekday: 'short'})}</span>
              <strong>{Number(date.slice(8, 10))}</strong>
              {offset === 0 ? (
                attendance.allConfirmed ? <CheckCircle2 size={12} /> : <Clock3 size={12} />
              ) : (
                <small>{counts && counts.usual ? `${Math.round((counts.present * 100) / counts.usual)}%` : '—'}</small>
              )}
            </button>
          );
        })}
      </section>

      {!isToday ? (
        <PastDay date={selectedDate} onBack={() => setSelectedDate(todayISO)} />
      ) : (
        <>
          {canEdit && <QuickMark />}

          <section className={styles.quickActions}>
            <button disabled={!canEdit || !yesterday} onClick={sameAsYesterday} type="button">
              <RotateCcw size={20} /><span><strong>{t('sameYesterday')}</strong><small>{t('sameYesterdayHint', {count: yesterday?.absentIds.length ?? 0})}</small></span>
            </button>
            <button onClick={() => setNotice(t('voiceUnavailable'))} type="button">
              <Mic size={20} /><span><strong>{t('sayAbsent')}</strong><small>{t('sayAbsentHint')}</small></span>
            </button>
            <button onClick={() => setNotice(t('photoUnavailable'))} type="button">
              <Camera size={20} /><span><strong>{t('gatePhotos')}</strong><small>{common('notConnected')}</small></span>
            </button>
          </section>

          <AnimatePresence>
            {notice && (
              <motion.div animate={{opacity: 1, height: 'auto'}} className={styles.notice} exit={{opacity: 0, height: 0}} initial={{opacity: 0, height: 0}}>
                <span>{notice}</span><button aria-label={common('close')} onClick={() => setNotice(null)} type="button"><X size={17} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          <section className={styles.companyGrid}>
            {companies.map((company, index) => (
              <CompanyCard company={company} index={index} key={company.id} onOpen={() => openCompany(company.id)} />
            ))}
          </section>

          {canEdit && (
            <div className={styles.confirmBar}>
              <div><strong>{totals.present}</strong><span>{common('manDays')}</span></div>
              <button disabled={readyCount < companies.length || attendance.allConfirmed} onClick={() => setConfirmOpen(true)} type="button">
                <UserRoundCheck size={20} /> {attendance.allConfirmed ? t('allDone') : readyCount < companies.length ? t('openRemaining', {count: companies.length - readyCount}) : t('confirmAll')}
              </button>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {confirmOpen && <ConfirmSheet onCancel={() => setConfirmOpen(false)} onConfirm={completeAll} />}
      </AnimatePresence>

      <Petals active={celebrated} />
      <AnimatePresence>
        {celebrated && (
          <motion.div animate={{opacity: 1, y: 0}} className={styles.celebration} exit={{opacity: 0, y: 20}} initial={{opacity: 0, y: 20}}>
            <CheckCircle2 size={22} /><span>{t('celebration')}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** One search box for all five companies: type 2–3 letters, tap the name, done. */
function QuickMark() {
  const t = useTranslations('hajri');
  const common = useTranslations('common');
  const roleNames = useTranslations('roles');
  const {workers, attendance, history, todayISO, setWorkerAbsent, toggleWorkerAbsent} = useApp();
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const absentIds = useMemo(() => new Set(attendance.absentWorkerIds), [attendance.absentWorkerIds]);
  const isList = /[,;\n]/.test(query);
  const results = useMemo(() => (isList ? [] : searchWorkers(workers, query, 6)), [isList, query, workers]);
  const parsed = useMemo(() => (isList ? parseNameList(workers, query) : null), [isList, query, workers]);
  const absentWorkers = workers.filter((worker) => absentIds.has(worker.id));
  const yesterday = findDay(history, addDays(todayISO, -1));
  const yesterdayWorkers = workers.filter((worker) => yesterday?.absentIds.includes(worker.id) && !absentIds.has(worker.id)).slice(0, 8);
  const likely = likelyAbsent(history, workers, 10).filter((item) => !absentIds.has(item.worker.id)).slice(0, 6);
  const companyOf = (worker: Worker) => companies.find((company) => company.id === worker.companyId);

  function mark(worker: Worker) {
    if (!worker.companyId) return;
    toggleWorkerAbsent(worker.id, worker.companyId);
    setQuery('');
    input.current?.focus();
  }

  function markList() {
    parsed?.matched.forEach((worker) => worker.companyId && setWorkerAbsent(worker.id, worker.companyId, true));
    setQuery(parsed?.ambiguous.map((item) => item.text).join(', ') ?? '');
  }

  return (
    <Card className={styles.quickMark}>
      <div className={styles.quickMarkHead}>
        <div>
          <h2>{t('quickMarkTitle')}</h2>
          <p>{t('quickMarkHint')}</p>
        </div>
        <Pill tone={absentWorkers.length ? 'warning' : 'success'}>{absentWorkers.length} {common('absent')}</Pill>
      </div>
      <label className={styles.bigSearch}>
        <Search size={20} />
        <input
          aria-label={t('searchAbsent')}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && results[0]) {
              event.preventDefault();
              mark(results[0]);
            }
            if (event.key === 'Escape') setQuery('');
          }}
          placeholder={t('searchAbsent')}
          ref={input}
          value={query}
        />
        {query && <button aria-label={common('close')} className={styles.clearSearch} onClick={() => setQuery('')} type="button"><X size={16} /></button>}
        <MicButton onText={(text) => setQuery(text)} />
      </label>

      {results.length > 0 && (
        <ul className={styles.results}>
          {results.map((worker, index) => {
            const company = companyOf(worker);
            const isAbsent = absentIds.has(worker.id);
            return (
              <li key={worker.id}>
                <button className={isAbsent ? styles.resultAbsent : styles.result} onClick={() => mark(worker)} type="button">
                  <Avatar colorIndex={company?.colorIndex} name={worker.name} size="sm" />
                  <span><strong>{worker.name}</strong><small>{company?.name} · {common(worker.shift)} · {roleNames(worker.role)}</small></span>
                  <span className={styles.resultAction}>{isAbsent ? t('undoAbsent') : index === 0 ? t('markAbsentEnter') : t('markAbsent')}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {query.trim().length >= 2 && !isList && results.length === 0 && <p className={styles.noMatch}>{t('noMatch')}</p>}

      {parsed && (
        <div className={styles.listParse}>
          <p><ListPlus size={16} /> {t('listFound', {count: parsed.matched.length})}</p>
          {parsed.matched.length > 0 && <div className={styles.chipTray}>{parsed.matched.map((worker) => <span className={styles.previewChip} key={worker.id}>{worker.name}</span>)}</div>}
          {parsed.ambiguous.map((item) => (
            <div className={styles.ambiguous} key={item.text}>
              <small>{t('whichOne', {name: item.text})}</small>
              <div className={styles.chipTray}>
                {item.options.map((worker) => (
                  <button key={worker.id} onClick={() => worker.companyId && setWorkerAbsent(worker.id, worker.companyId, true)} type="button">
                    {worker.name} · {companyOf(worker)?.shortName}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {parsed.unmatched.length > 0 && <small className={styles.unmatched}>{t('notFound', {names: parsed.unmatched.join(', ')})}</small>}
          <button className={styles.listButton} disabled={!parsed.matched.length} onClick={markList} type="button">{t('markListAbsent', {count: parsed.matched.length})}</button>
        </div>
      )}

      {absentWorkers.length > 0 && (
        <div className={styles.trayBlock}>
          <span className={styles.trayLabel}>{t('absentToday')}</span>
          <div className={styles.chipTray}>
            {absentWorkers.map((worker) => (
              <button aria-label={t('undoAbsentFor', {name: worker.name})} className={styles.absentChip} data-color={companyOf(worker)?.colorIndex} key={worker.id} onClick={() => mark(worker)} type="button">
                <i />{worker.name}<X size={13} />
              </button>
            ))}
          </div>
        </div>
      )}

      {!query && (yesterdayWorkers.length > 0 || likely.length > 0) && (
        <div className={styles.suggestBlock}>
          {yesterdayWorkers.length > 0 && (
            <div>
              <span className={styles.trayLabel}><History size={13} /> {t('absentYesterday')}</span>
              <div className={styles.chipTray}>
                {yesterdayWorkers.map((worker) => (
                  <button className={styles.suggestChip} key={worker.id} onClick={() => mark(worker)} type="button">+ {worker.name}</button>
                ))}
              </div>
            </div>
          )}
          {likely.length > 0 && (
            <div>
              <span className={styles.trayLabel}><Sparkles size={13} /> {t('oftenAbsent')}</span>
              <div className={styles.chipTray}>
                {likely.map((item) => (
                  <button className={styles.suggestChip} key={item.worker.id} onClick={() => mark(item.worker)} title={`${item.record.rate}%`} type="button">
                    + {item.worker.name} <small>{item.record.rate}%</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function CompanyCard({company, index, onOpen}: {company: Company; index: number; onOpen: () => void}) {
  const t = useTranslations('hajri');
  const common = useTranslations('common');
  const {workers, attendance, history} = useApp();
  const count = companyAttendance(workers, attendance, company.id);
  const strength = todayStrength(workers, attendance, company);
  const level = worstLevel(strength);
  const isConfirmed = attendance.confirmedCompanyIds.includes(company.id);
  const isTouched = attendance.touchedCompanyIds.includes(company.id);
  const absent = absentWorkersForCompany(workers, attendance, company.id);
  const trend = companyTrend(history, company.id, 14);

  return (
    <motion.button
      animate={{opacity: 1, y: 0}}
      className={styles.companyCard}
      data-confirmed={isConfirmed ? 'true' : undefined}
      initial={{opacity: 0, y: 10}}
      onClick={onOpen}
      transition={{delay: index * 0.04}}
      type="button"
    >
      <span className={styles.companyColor} data-color={company.colorIndex} />
      <div className={styles.companyCardTop}>
        <span className={styles.companyMonogram} data-color={company.colorIndex}>{company.shortName}</span>
        <div className={styles.companyName}>
          <h2>{company.name}</h2>
          <span>{company.location}</span>
        </div>
        <Ring colorIndex={isConfirmed ? undefined : company.colorIndex} label={t('peoplePresent', {present: count.present, usual: count.usual})} size={50} stroke={6} tone={isConfirmed ? 'success' : 'brass'} value={count.usual ? count.present / count.usual : 0}>
          {isConfirmed ? <Check className={styles.ringCheck} size={18} /> : <small className={styles.ringPct}>{count.usual ? Math.round((count.present * 100) / count.usual) : 0}%</small>}
        </Ring>
      </div>
      <div className={styles.shiftCounts}>
        {strength.map((row) => (
          <span data-level={row.level} key={row.shift}><small>{common(row.shift)}</small><strong>{row.present}/{row.usual}</strong></span>
        ))}
        <span data-level={count.absent ? 'warning' : 'ok'}><small>{common('absent')}</small><strong>{count.absent}</strong></span>
      </div>
      <div className={styles.absentPreview}>
        {absent.length ? (
          <>
            {absent.slice(0, 3).map((worker) => <span key={worker.id}>{worker.name.split(' ')[0]}</span>)}
            {absent.length > 3 && <span>+{absent.length - 3}</span>}
          </>
        ) : (
          <small>{t('everyonePresent')}</small>
        )}
      </div>
      <div className={styles.openCompany}>
        <Pill tone={isConfirmed ? 'success' : level === 'danger' ? 'danger' : isTouched ? 'warning' : 'neutral'}>
          {isConfirmed ? common('confirmed') : level === 'danger' ? t('shortStaff') : isTouched ? t('inProgress') : t('notStarted')}
        </Pill>
        <Sparkline colorIndex={company.colorIndex} height={26} label={t('trendLabel', {client: company.name})} values={trend} width={84} />
        <ChevronRight size={18} />
      </div>
    </motion.button>
  );
}

function PastDay({date, onBack}: {date: string; onBack: () => void}) {
  const t = useTranslations('hajri');
  const common = useTranslations('common');
  const {history, workers, locale} = useApp();
  const day = findDay(history, date);
  if (!day) return null;
  const totals = presentOnDay(history, day);
  return (
    <Card className={styles.pastDay}>
      <div className={styles.pastHead}>
        <span className={styles.pastIcon}><Lock size={18} /></span>
        <div>
          <h2>{formatDate(date, locale, {weekday: 'long', day: 'numeric', month: 'long'})}</h2>
          <p>{t('pastDayHint', {present: totals.present, usual: totals.usual})}</p>
        </div>
        <button className={styles.textButton} onClick={onBack} type="button">{t('backToToday')}</button>
      </div>
      <div className={styles.pastGrid}>
        {companies.map((company) => {
          const counts = presentOnDay(history, day, company.id);
          const absentees = workers.filter((worker) => day.absentIds.includes(worker.id) && history.placements[worker.id]?.companyId === company.id);
          const closed = day.offCompanyIds.includes(company.id);
          return (
            <div className={styles.pastCompany} key={company.id}>
              <span className={styles.companyMonogram} data-color={company.colorIndex}>{company.shortName}</span>
              <div>
                <strong>{company.name}</strong>
                <small>{closed ? t('closedDay') : `${counts.present}/${counts.usual} ${common('present')}`}</small>
                {absentees.length > 0 && <p>{absentees.map((worker) => worker.name).join(', ')}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ConfirmSheet({onCancel, onConfirm}: {onCancel: () => void; onConfirm: () => void}) {
  const t = useTranslations('hajri');
  const common = useTranslations('common');
  const {workers, attendance} = useApp();
  const totals = todayTotals(workers, attendance, companies);
  return (
    <motion.div animate={{opacity: 1}} className={styles.modalBackdrop} exit={{opacity: 0}} initial={{opacity: 0}}>
      <motion.div animate={{y: 0}} className={styles.confirmSheet} exit={{y: 40}} initial={{y: 40}} role="dialog">
        <span className={styles.confirmIcon}><CheckCircle2 size={28} /></span>
        <h2>{t('confirmationTitle')}</h2>
        <p>{t('confirmationBody', {manDays: totals.present, companies: companies.length})}</p>
        <div className={styles.confirmSummary}>
          {companies.map((company) => {
            const count = companyAttendance(workers, attendance, company.id);
            const absent = absentWorkersForCompany(workers, attendance, company.id);
            return (
              <span key={company.id}>
                <strong><i className={styles.dot} data-color={company.colorIndex} />{company.name}</strong>
                <small>{count.manDays} {common('manDays')} · {count.absent} {common('absent')}</small>
                {absent.length > 0 && <em>{absent.slice(0, 5).map((worker) => worker.name).join(', ')}{absent.length > 5 ? ` ${t('moreCount', {count: absent.length - 5})}` : ''}</em>}
              </span>
            );
          })}
        </div>
        <div className={styles.modalActions}>
          <button onClick={onCancel} type="button">{common('cancel')}</button>
          <button onClick={onConfirm} type="button">{t('yesConfirm')}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CompanySheet({company, onBack, onDone, shareText}: {company: Company; onBack: () => void; onDone: () => void; shareText: string}) {
  const t = useTranslations('hajri');
  const common = useTranslations('common');
  const roleNames = useTranslations('roles');
  const {workers, attendance, history, toggleWorkerAbsent, markAllPresent, saveGateCount, canEdit} = useApp();
  const [view, setView] = useState<'absent' | 'full'>('absent');
  const [shift, setShift] = useState<Shift | 'all'>('all');
  const [role, setRole] = useState<WorkerRole | 'all'>('all');
  const [search, setSearch] = useState('');
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const roster = useMemo(() => activeWorkersForCompany(workers, company.id), [company.id, workers]);
  const absentIds = useMemo(() => new Set(attendance.absentWorkerIds), [attendance.absentWorkerIds]);
  const count = companyAttendance(workers, attendance, company.id);
  const shifts = (['day', 'night'] as Shift[]).filter((item) => roster.some((worker) => worker.shift === item));
  const isConfirmed = attendance.confirmedCompanyIds.includes(company.id);
  const likely = likelyAbsent(history, workers, 6, company.id).filter((item) => !absentIds.has(item.worker.id));

  const visibleWorkers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return roster
      .filter((worker) => {
        const matchesShift = shift === 'all' || worker.shift === shift;
        const matchesRole = role === 'all' || worker.role === role;
        const matchesSearch = !query || worker.name.toLocaleLowerCase().split(' ').some((part) => part.startsWith(query)) || worker.name.toLocaleLowerCase().includes(query);
        const matchesView = view === 'full' || absentIds.has(worker.id) || Boolean(query);
        return matchesShift && matchesRole && matchesSearch && matchesView;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [absentIds, role, roster, search, shift, view]);

  function toggle(worker: Worker) {
    if (!canEdit) return;
    toggleWorkerAbsent(worker.id, company.id);
    if (search) setSearch('');
  }

  return (
    <div className={styles.sheetPage}>
      <header className={styles.sheetHeader}>
        <button aria-label={common('back')} onClick={onBack} type="button"><ArrowLeft size={21} /></button>
        <span className={styles.companyMonogram} data-color={company.colorIndex}>{company.shortName}</span>
        <div><h1>{company.name}</h1><p>{t('peoplePresent', {present: count.present, usual: count.usual})}</p></div>
        <div className={styles.sheetHeaderActions}>
          <Pill tone={isConfirmed ? 'success' : count.absent > 0 ? 'warning' : 'neutral'}>{isConfirmed ? common('confirmed') : `${count.absent} ${common('absent')}`}</Pill>
          <a className={styles.shareButton} href={whatsappUrl(shareText)} rel="noreferrer" target="_blank"><MessageCircleMore size={16} /> {t('sendCount')}</a>
        </div>
      </header>

      <div className={styles.shiftTabs} role="tablist">
        <button aria-selected={shift === 'all'} onClick={() => setShift('all')} role="tab" type="button">{t('allShifts')} <span>{count.present}/{count.usual}</span></button>
        {shifts.map((item) => {
          const counts = shiftAttendance(workers, attendance, company.id, item);
          return <button aria-selected={shift === item} key={item} onClick={() => setShift(item)} role="tab" type="button">{common(item)} <span>{counts.present}/{counts.usual}</span></button>;
        })}
      </div>

      <div className={styles.sheetToolbar}>
        <div className={styles.viewToggle}>
          <button className={view === 'absent' ? styles.toggleActive : ''} onClick={() => setView('absent')} type="button">{t('absentOnly')}</button>
          <button className={view === 'full' ? styles.toggleActive : ''} onClick={() => setView('full')} type="button">{t('fullList')}</button>
        </div>
        <label className={styles.searchBox}>
          <Search size={18} />
          <input autoFocus={view === 'absent'} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter' && search && visibleWorkers[0]) toggle(visibleWorkers[0]);
          }} placeholder={view === 'absent' ? t('searchAbsent') : t('searchWorker')} value={search} />
          <MicButton onText={(text) => setSearch(text)} />
        </label>
        <div className={styles.roleFilters}>
          {roles.map((item) => (
            <button className={role === item ? styles.roleActive : ''} key={item} onClick={() => setRole(item)} type="button">
              {item === 'all' ? t('roleAll') : roleNames(item)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.gateRow}>
        {shifts.map((item) => {
          const difference = gateDifference(attendance, workers, company.id, item);
          const value = attendance.gateCounts?.[gateKey(company.id, item)];
          return (
            <label className={styles.gateField} key={item}>
              <span>{t('gateCount', {shift: common(item)})}</span>
              <input
                disabled={!canEdit}
                inputMode="numeric"
                onChange={(event) => saveGateCount(company.id, item, event.target.value === '' ? null : Number(event.target.value))}
                placeholder="—"
                type="number"
                value={value ?? ''}
              />
              {difference !== null && (
                <em data-state={difference === 0 ? 'ok' : 'warn'}>
                  {difference === 0 ? t('gateMatch') : difference > 0 ? t('gateMorePresent', {count: difference}) : t('gateFewerPresent', {count: -difference})}
                </em>
              )}
            </label>
          );
        })}
      </div>

      <div className={styles.listSummary}>
        <span><Users size={17} /> {count.present} {common('present')} · {count.absent} {common('absent')}</span>
        {canEdit && <button onClick={() => markAllPresent(company.id)} type="button">{t('allPresent')}</button>}
      </div>

      {view === 'absent' && !search && likely.length > 0 && canEdit && (
        <div className={styles.inlineSuggest}>
          <span className={styles.trayLabel}><Sparkles size={13} /> {t('usuallyAbsentHere')}</span>
          <div className={styles.chipTray}>
            {likely.map((item) => <button className={styles.suggestChip} key={item.worker.id} onClick={() => toggle(item.worker)} type="button">+ {item.worker.name} <small>{item.record.rate}%</small></button>)}
          </div>
        </div>
      )}

      <Card className={styles.workerList}>
        {view === 'absent' && !search && count.absent === 0 ? (
          <div className={styles.emptyAbsent}>
            <span><Check size={27} /></span><h2>{t('noAbsences')}</h2><p>{t('noAbsencesHint')}</p>
          </div>
        ) : visibleWorkers.length === 0 ? (
          <div className={styles.emptyAbsent}><span><Search size={25} /></span><h2>{t('noMatch')}</h2></div>
        ) : (
          visibleWorkers.map((worker) => (
            <WorkerTickRow
              isAbsent={absentIds.has(worker.id)}
              key={worker.id}
              noteOpen={noteFor === worker.id}
              onNote={() => setNoteFor((current) => (current === worker.id ? null : worker.id))}
              onToggle={() => toggle(worker)}
              roleName={roleNames(worker.role)}
              worker={worker}
            />
          ))
        )}
      </Card>

      {canEdit && (
        <div className={styles.sheetFooter}>
          <div><strong>{count.manDays}</strong><span>{common('manDays')}</span></div>
          <button onClick={onDone} type="button"><CheckCircle2 size={20} /> {isConfirmed ? t('doneCompany') : t('confirmCompany')}</button>
        </div>
      )}
    </div>
  );
}

function WorkerTickRow({worker, isAbsent, onToggle, onNote, noteOpen, roleName}: {worker: Worker; isAbsent: boolean; onToggle: () => void; onNote: () => void; noteOpen: boolean; roleName: string}) {
  const t = useTranslations('hajri');
  const common = useTranslations('common');
  const tags = useTranslations('attendanceTags');
  const {attendance, saveAttendanceNote, canEdit} = useApp();
  const note = attendance.notes?.[worker.id];

  return (
    <div className={styles.tickRowWrap} data-absent={isAbsent ? 'true' : undefined}>
      <div className={styles.tickRow}>
        <button className={styles.tickMain} disabled={!canEdit} onClick={onToggle} type="button">
          <Avatar name={worker.name} size="sm" />
          <span className={styles.workerName}>
            <strong>{worker.name}</strong>
            <small>{roleName} · {common(worker.shift)}{note?.tag ? ` · ${tags(note.tag)}` : ''}{note?.text ? ` · “${note.text}”` : ''}</small>
          </span>
          <span className={isAbsent ? styles.absentCheck : styles.presentCheck}>{isAbsent ? <X size={18} /> : <Check size={18} />}</span>
        </button>
        {canEdit && (
          <button aria-expanded={noteOpen} aria-label={t('addNoteFor', {name: worker.name})} className={note ? styles.noteButtonActive : styles.noteButton} onClick={onNote} type="button">
            <NotebookPen size={16} />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {noteOpen && (
          <motion.div animate={{height: 'auto', opacity: 1}} className={styles.noteEditor} exit={{height: 0, opacity: 0}} initial={{height: 0, opacity: 0}}>
            <div className={styles.tagRow}>
              {attendanceTags.map((tag: AttendanceTag) => (
                <button
                  aria-pressed={note?.tag === tag}
                  key={tag}
                  onClick={() => saveAttendanceNote(worker.id, {tag: note?.tag === tag ? null : tag, text: note?.text ?? ''})}
                  type="button"
                >
                  {tags(tag)}
                </button>
              ))}
            </div>
            <label className={styles.noteInput}>
              <input
                onChange={(event) => saveAttendanceNote(worker.id, {tag: note?.tag ?? null, text: event.target.value})}
                placeholder={t('notePlaceholder')}
                value={note?.text ?? ''}
              />
              <MicButton compact onText={(text) => saveAttendanceNote(worker.id, {tag: note?.tag ?? null, text: note?.text ? `${note.text} ${text}` : text})} />
            </label>
            <small className={styles.noteHint}>{t('noteHint')}</small>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
