'use client';

import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Flame,
  MessageCircle,
  Plus,
  Speaker,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users
} from 'lucide-react';
import {motion} from 'motion/react';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {SiteScene} from '@/components/ambient/SiteScene';
import {InputBar} from '@/components/assistant/InputBar';
import {BarList} from '@/components/charts/BarList';
import {Ring} from '@/components/charts/Ring';
import {TrendChart, type TrendPoint} from '@/components/charts/TrendChart';
import {ReminderRow} from '@/components/reminders/RemindersPanel';
import {SuggestionList, useSuggestions, useSuggestionText} from '@/components/suggestions/SuggestionList';
import {Card, Pill} from '@/components/ui/Card';
import {companies, invoices, issues} from '@/data/sample-data';
import {todayTotals} from '@/domain/attendance';
import {chequesExpected} from '@/domain/billing';
import {buildCompanyWorkRows} from '@/domain/dashboard';
import {daysInMonth} from '@/domain/dates';
import {attendanceStreak, averageAttendanceRate, dailySeries} from '@/domain/history';
import {formatINR} from '@/domain/money';
import {reminderBuckets} from '@/domain/reminders';
import {todayStrength} from '@/domain/strength';
import {greetingName} from '@/data/users';
import {formatDate, formatNumber} from '@/lib/format';
import {speak} from '@/lib/speech';
import {useApp} from '@/providers/AppProvider';
import styles from './home.module.css';

const rise = (delay: number) => ({
  initial: {opacity: 0, y: 12},
  animate: {opacity: 1, y: 0},
  transition: {duration: 0.35, delay}
});

const levelIcon = {ok: CheckCircle2, warning: AlertTriangle, danger: AlertTriangle};

export default function HomePage() {
  const t = useTranslations('home');
  const common = useTranslations('common');
  const scene = useTranslations('scene');
  const roles = useTranslations('login');
  const router = useRouter();
  const {user, locale, attendance, workers, history, month, todayISO, now, reminders, setRemindersOpen} = useApp();
  const greeting = greetingName(user, roles(user.role));
  const suggestions = useSuggestions();
  const renderSuggestion = useSuggestionText();

  const totals = todayTotals(workers, attendance, companies);
  const todayManDays = totals.present;
  const absentToday = totals.absent;
  const confirmedCompanies = attendance.confirmedCompanyIds.length;
  const streak = attendanceStreak(history, attendance.allConfirmed);
  const today = formatDate(todayISO, locale, {weekday: 'long', day: 'numeric', month: 'long'});
  const monthDaysTotal = daysInMonth(todayISO);
  const cheques = chequesExpected(invoices);

  const series = dailySeries(history, companies, 30);
  const trendPoints: TrendPoint[] = [
    ...series.map((point) => ({
      key: point.date,
      label: formatDate(point.date, locale),
      longLabel: formatDate(point.date, locale, {weekday: 'short', day: 'numeric', month: 'short'}),
      value: point.manDays,
      reference: point.usual
    })),
    {key: todayISO, label: common('today'), longLabel: formatDate(todayISO, locale, {weekday: 'short', day: 'numeric', month: 'short'}), value: todayManDays, reference: totals.usual, draft: !attendance.allConfirmed}
  ];
  const averageRate = averageAttendanceRate(series);

  const workRows = buildCompanyWorkRows(companies, month.companies.map((row) => row.manDays));
  const marginRows = [...month.companies]
    .filter((row) => row.marginPerManDayPaise !== null)
    .sort((left, right) => (right.marginPerManDayPaise ?? 0) - (left.marginPerManDayPaise ?? 0));
  const wagesMax = Math.max(month.grossWagesPaise, cheques.totalPaise, 1);
  const buckets = reminderBuckets(reminders, now);
  const upcoming = [...buckets.overdue, ...buckets.today, ...buckets.later].slice(0, 3);
  const subtitle = !attendance.allConfirmed && now.getHours() < 12 ? t('subtitleMorning') : t('subtitle');

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <motion.span className={styles.date} {...rise(0)}>{today}</motion.span>
          <h1 aria-label={t('greeting', {name: greeting})}>
            {t('greeting', {name: greeting}).split(' ').map((word, index) => (
              <motion.span
                animate={{opacity: 1, y: 0, filter: 'blur(0px)'}}
                aria-hidden="true"
                initial={{opacity: 0, y: 14, filter: 'blur(6px)'}}
                key={`${word}-${index}`}
                transition={{duration: 0.45, delay: 0.06 + index * 0.07, ease: [0.22, 1, 0.36, 1]}}
              >
                {word}{' '}
              </motion.span>
            ))}
          </h1>
          <motion.p {...rise(0.18)}>{subtitle}</motion.p>
        </div>
        <motion.div className={styles.heroBottom} {...rise(0.26)}>
          <div className={styles.heroBar}>
            <InputBar excelKind="attendance" tone="glass" />
          </div>
          <div className={styles.headerActions}>
            <Pill tone="royal"><Flame size={13} /> {t('streak', {days: streak})}</Pill>
            <button className={styles.listenAll} onClick={() => speak(suggestions.filter((item) => item.audience === 'owner').slice(0, 5).map(renderSuggestion).join('. '), locale)} type="button">
              <Speaker size={16} /> {t('listenAll')}
            </button>
          </div>
        </motion.div>
        <motion.figure animate={{opacity: 1, scale: 1}} className={styles.heroScene} initial={{opacity: 0, scale: 0.98}} transition={{duration: 0.6, delay: 0.1}}>
          <SiteScene companies={companies} label={scene('label', {done: confirmedCompanies, total: companies.length})} litIds={attendance.confirmedCompanyIds} />
          <figcaption>
            <span className={styles.sceneLegend}><i data-lit="true" />{scene('lit', {done: confirmedCompanies, total: companies.length})}</span>
            <span>{scene('heroCaption')}</span>
          </figcaption>
        </motion.figure>
      </section>

      <section className={styles.dashboardGrid}>
        <motion.div className={styles.todayArea} {...rise(0)}>
          <Card className={attendance.allConfirmed ? styles.todayDone : styles.todayCard}>
            <div className={styles.todayTop}>
              <span className={styles.todayIcon}>{attendance.allConfirmed ? <CheckCircle2 size={25} /> : <ClipboardCheck size={25} />}</span>
              <Pill tone={attendance.allConfirmed ? 'success' : 'warning'}>{attendance.allConfirmed ? common('confirmed') : common('pending')}</Pill>
            </div>
            <div className={styles.todayBody}>
              <div className={styles.todayContent}>
                <span>{common('today')}</span>
                <h2>{attendance.allConfirmed ? t('attendanceDone') : t('attendancePending')}</h2>
                <p>{t('todayLine', {present: todayManDays, absent: absentToday, total: totals.usual})}</p>
              </div>
              <Ring label={t('companiesConfirmed', {done: confirmedCompanies, total: companies.length})} size={104} stroke={9} tone="light" value={confirmedCompanies / companies.length}>
                <strong className={styles.ringNumber}>{confirmedCompanies}/{companies.length}</strong>
                <small className={styles.ringCaption}>{common('companies')}</small>
              </Ring>
            </div>
            <div className={styles.companyDots}>
              {companies.map((company) => (
                <span data-color={company.colorIndex} data-done={attendance.confirmedCompanyIds.includes(company.id) ? 'true' : undefined} key={company.id} title={company.name}>
                  {attendance.confirmedCompanyIds.includes(company.id) && <CheckCircle2 size={11} />}
                  {company.shortName}
                </span>
              ))}
            </div>
            <div className={styles.todayFooter}>
              <span><strong>{formatNumber(todayManDays, locale)}</strong><small>{common('manDays')}</small></span>
              <span><strong>{absentToday}</strong><small>{common('absent')}</small></span>
              <Link href="/hajri">{attendance.allConfirmed ? t('reviewAttendance') : t('fillAttendance')}<ArrowRight size={18} /></Link>
            </div>
          </Card>
        </motion.div>

        <motion.div className={styles.monthArea} {...rise(0.04)}>
          <Card className={styles.monthCard}>
            <div className={styles.sectionHeading}>
              <div><span className={styles.kicker}>{common('thisMonth')}</span><h2>{t('monthHero')}</h2></div>
            </div>
            <div className={styles.monthMetrics}>
              <Ring label={t('daysConfirmed', {done: month.confirmedDays, total: monthDaysTotal})} size={108} value={month.confirmedDays / monthDaysTotal}>
                <strong className={styles.monthRingNumber}>{month.confirmedDays}</strong>
                <small className={styles.monthRingCaption}>/ {monthDaysTotal} {t('days')}</small>
              </Ring>
              <div className={styles.monthNumbers}>
                <strong className={styles.bigNumber}>{formatNumber(month.manDays, locale)}</strong>
                <span>{t('monthManDays')}</span>
                {month.changePercent !== null && (
                  <small className={month.changePercent >= 0 ? styles.deltaUp : styles.deltaDown}>
                    {month.changePercent >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {t('vsLastMonth', {pct: Math.abs(month.changePercent)})}
                  </small>
                )}
              </div>
            </div>
            <div className={styles.monthMoney}>
              <div><span>{t('estimatedBilling')}</span><strong>{formatINR(month.basePaise, locale, true)}</strong></div>
              <div><span>{t('wagesSoFar')}</span><strong>{formatINR(month.grossWagesPaise, locale, true)}</strong></div>
            </div>
            <p className={styles.footnote}>{t('estimateNote')}</p>
          </Card>
        </motion.div>

        <motion.div className={styles.trendArea} {...rise(0.08)}>
          <Card className={styles.standardCard}>
            <div className={styles.sectionHeading}>
              <div><h2>{t('trendTitle')}</h2><p>{t('trendHint', {pct: averageRate})}</p></div>
            </div>
            <TrendChart
              ariaLabel={t('trendTitle')}
              draftLabel={t('todayDraft')}
              formatValue={(value) => formatNumber(Math.round(value), locale)}
              points={trendPoints}
              referenceLabel={t('usualStrength')}
              seriesLabel={common('present')}
              tooltipExtra={(point) => (point.reference ? t('trendTooltip', {absent: point.reference - point.value, pct: Math.round((point.value * 100) / point.reference)}) : null)}
            />
          </Card>
        </motion.div>

        <motion.div className={styles.strengthArea} {...rise(0.12)}>
          <Card className={styles.standardCard}>
            <div className={styles.sectionHeading}>
              <div><h2>{t('strength')}</h2><p>{t('strengthHint')}</p></div>
              <span className={styles.liveTag}><i />{t('live')}</span>
            </div>
            <ul className={styles.strengthList}>
              {companies.map((company) => (
                <li key={company.id}>
                  <Link href={`/hajri?company=${company.id}`}>
                    <span className={styles.strengthName}><i data-color={company.colorIndex} />{company.name}</span>
                    {todayStrength(workers, attendance, company).map((row) => {
                      const Icon = levelIcon[row.level];
                      return (
                        <span className={styles.meterRow} data-level={row.level} key={row.shift}>
                          <small>{common(row.shift)}</small>
                          <span className={styles.meterTrack}><span style={{width: `${Math.round(row.ratio * 100)}%`}} /></span>
                          <strong>{row.present}/{row.usual}</strong>
                          <Icon aria-label={t(`level.${row.level}`)} size={14} />
                        </span>
                      );
                    })}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>

        <motion.div className={styles.workArea} {...rise(0.16)}>
          <Card className={styles.standardCard}>
            <div className={styles.sectionHeading}>
              <div><h2>{t('workByCompany')}</h2><p>{t('workByCompanyHint')}</p></div>
              <Users size={21} />
            </div>
            <BarList
              ariaLabel={t('workByCompany')}
              onSelect={(id) => router.push(`/kaamgar?company=${id}`)}
              rows={workRows.map((row) => {
                const money = month.companies.find((item) => item.companyId === row.company.id);
                return {
                  id: row.company.id,
                  label: row.company.name,
                  value: row.manDays,
                  colorIndex: row.company.colorIndex,
                  display: `${formatNumber(row.manDays, locale)} · ${row.sharePercent}%`,
                  detail: t('billDetail', {amount: formatINR(money?.basePaise ?? 0, locale, true)}),
                  description: `${row.company.name}: ${row.manDays} ${common('manDays')}, ${row.sharePercent}%`
                };
              })}
            />
          </Card>
        </motion.div>

        <motion.div className={styles.moneyArea} {...rise(0.2)}>
          <Card className={styles.standardCard}>
            <div className={styles.sectionHeading}>
              <div><h2>{t('cashPlan')}</h2><p>{t('cashPlanHint')}</p></div>
            </div>
            <div className={styles.cashBars}>
              <div>
                <span className={styles.cashLabel}><strong>{t('wagesSoFar')}</strong><b>{formatINR(month.grossWagesPaise, locale, true)}</b></span>
                <span aria-hidden="true" className={styles.cashTrack}>
                  <span className={styles.cashCash} style={{width: `${(month.cashWagesPaise * 100) / wagesMax}%`}} />
                  <span className={styles.cashBank} style={{width: `${(month.bankWagesPaise * 100) / wagesMax}%`}} />
                </span>
                <small className={styles.cashLegend}>
                  <span><i className={styles.keyCash} />{t('cash')} {formatINR(month.cashWagesPaise, locale, true)}</span>
                  <span><i className={styles.keyBank} />{t('bank')} {formatINR(month.bankWagesPaise, locale, true)}</span>
                </small>
              </div>
              <div>
                <span className={styles.cashLabel}><strong>{t('moneyIn')}</strong><b>{formatINR(cheques.totalPaise, locale, true)}</b></span>
                <span aria-hidden="true" className={styles.cashTrack}>
                  <span className={styles.cashIn} style={{width: `${(cheques.totalPaise * 100) / wagesMax}%`}} />
                </span>
                <small className={styles.cashLegend}>
                  {cheques.pending.map((invoice) => (
                    <span key={invoice.id}>{companies.find((company) => company.id === invoice.companyId)?.shortName} · {t('daysWaiting', {days: invoice.deliveredDaysAgo})}</span>
                  ))}
                </small>
              </div>
            </div>
            {user.role !== 'viewer' && (
              <>
                <h3 className={styles.subHeading}>{t('marginTitle')}</h3>
                <BarList
                  ariaLabel={t('marginTitle')}
                  rows={marginRows.map((row) => {
                    const company = companies.find((item) => item.id === row.companyId)!;
                    return {
                      id: row.companyId,
                      label: company.name,
                      value: row.marginPerManDayPaise ?? 0,
                      colorIndex: company.colorIndex,
                      display: t('perManDay', {amount: formatINR(row.marginPerManDayPaise ?? 0, locale)}),
                      description: `${company.name}: ${t('perManDay', {amount: formatINR(row.marginPerManDayPaise ?? 0, locale)})}`
                    };
                  })}
                />
              </>
            )}
          </Card>
        </motion.div>

        <motion.div className={styles.insightArea} {...rise(0.24)}>
          <Card className={styles.standardCard}>
            <SuggestionList limit={5} />
          </Card>
        </motion.div>

        <motion.div className={styles.reminderArea} {...rise(0.28)}>
          <Card className={styles.standardCard}>
            <div className={styles.sectionHeading}>
              <div><h2>{t('reminders')}</h2><p>{t('remindersHint')}</p></div>
              <BellRing size={21} />
            </div>
            {upcoming.length ? (
              <ul className={styles.reminderList}>{upcoming.map((reminder) => <ReminderRow key={reminder.id} reminder={reminder} />)}</ul>
            ) : (
              <p className={styles.emptyText}>{t('noReminders')}</p>
            )}
            <button className={styles.cardButton} onClick={() => setRemindersOpen(true)} type="button"><Plus size={16} /> {t('addReminder')}</button>
          </Card>
        </motion.div>

        <motion.div className={styles.quickArea} {...rise(0.32)}>
          <Card className={styles.quickCard}>
            <div className={styles.sectionHeading}><div><h2>{t('quickActions')}</h2></div><Plus size={21} /></div>
            <div className={styles.quickLinks}>
              <Link href="/hajri"><span><ClipboardCheck size={19} /></span><strong>{t('fillAttendance')}</strong><ChevronRight size={18} /></Link>
              <Link href="/kaamgar?add=1"><span><UserPlus size={19} /></span><strong>{t('addWorker')}</strong><ChevronRight size={18} /></Link>
              <Link href="/masle"><span><AlertTriangle size={19} /></span><strong>{t('openIssues')} · {issues.length}</strong><ChevronRight size={18} /></Link>
              <Link href="/pucho"><span><MessageCircle size={19} /></span><strong>{t('askData')}</strong><ChevronRight size={18} /></Link>
            </div>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}
