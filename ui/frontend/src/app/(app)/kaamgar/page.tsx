'use client';

import {AlertTriangle, ChevronRight, FileSpreadsheet, FileWarning, NotebookPen, Plus, Search, UserRoundX, UsersRound, X} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Suspense, useMemo, useState} from 'react';
import {Ring} from '@/components/charts/Ring';
import {SegmentBar} from '@/components/charts/SegmentBar';
import {Avatar} from '@/components/ui/Avatar';
import {Card, Pill} from '@/components/ui/Card';
import {QuickAddWorker} from '@/components/workers/QuickAddWorker';
import {WorkerDrawer} from '@/components/workers/WorkerDrawer';
import {companies} from '@/data/sample-data';
import {reliabilityOf, workerRecord} from '@/domain/history';
import {formatINR} from '@/domain/money';
import {noteCounts} from '@/domain/notes';
import {useApp} from '@/providers/AppProvider';
import type {WorkerRole} from '@/types';
import styles from './workers.module.css';

type FilterKey = 'all' | WorkerRole | 'unplaced' | 'pfPending' | 'esicPending' | 'often' | 'notes' | 'inactive';
type SortKey = 'name' | 'attendance' | 'wage';

export default function WorkersPage() {
  return (
    <Suspense>
      <WorkersScreen />
    </Suspense>
  );
}

function WorkersScreen() {
  const t = useTranslations('workers');
  const common = useTranslations('common');
  const roles = useTranslations('roles');
  const {locale, workers, history, notes, user, canEdit, openAssistant} = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');

  const filter = (params.get('filter') as FilterKey | null) ?? 'all';
  const companyFilter = params.get('company');
  const openWorkerId = params.get('worker');
  const addOpen = params.get('add') === '1';

  function setParam(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {scroll: false});
  }

  const records = useMemo(() => new Map(workers.map((worker) => [worker.id, workerRecord(history, worker.id, 30)])), [history, workers]);
  const notesByWorker = useMemo(() => noteCounts(notes, user.role), [notes, user.role]);
  const activeWorkers = workers.filter((worker) => worker.status === 'active');
  const reliability = (id: string) => reliabilityOf(records.get(id)?.rate ?? null);

  const counts: Record<FilterKey, number> = {
    all: workers.length,
    helper: workers.filter((worker) => worker.role === 'helper').length,
    fitter: workers.filter((worker) => worker.role === 'fitter').length,
    welder: workers.filter((worker) => worker.role === 'welder').length,
    supervisor: workers.filter((worker) => worker.role === 'supervisor').length,
    unplaced: activeWorkers.filter((worker) => worker.companyId === null).length,
    pfPending: activeWorkers.filter((worker) => worker.pfStatus === 'pending').length,
    esicPending: activeWorkers.filter((worker) => worker.esicStatus === 'pending').length,
    often: activeWorkers.filter((worker) => reliability(worker.id) === 'often').length,
    notes: workers.filter((worker) => notesByWorker.has(worker.id)).length,
    inactive: workers.filter((worker) => worker.status === 'inactive').length
  };

  const filters: Array<{key: FilterKey; label: string}> = [
    {key: 'all', label: common('all')},
    {key: 'helper', label: roles('helper')},
    {key: 'fitter', label: roles('fitter')},
    {key: 'welder', label: roles('welder')},
    {key: 'supervisor', label: roles('supervisor')},
    {key: 'unplaced', label: t('unplaced')},
    {key: 'pfPending', label: t('pfPending')},
    {key: 'esicPending', label: t('esicPending')},
    {key: 'often', label: t('oftenAbsent')},
    {key: 'notes', label: t('hasNotes')},
    {key: 'inactive', label: t('inactive')}
  ];

  const visibleWorkers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matches = workers.filter((worker) => {
      const company = companies.find((item) => item.id === worker.companyId);
      const matchesQuery = !query || `${worker.name} ${roles(worker.role)} ${company?.name ?? ''} ${canEdit ? worker.phone : ''}`.toLocaleLowerCase().includes(query);
      const matchesCompany = !companyFilter || worker.companyId === companyFilter;
      const matchesFilter =
        filter === 'all' ||
        (['helper', 'fitter', 'welder', 'supervisor'] as string[]).includes(filter) && worker.role === filter ||
        filter === 'unplaced' && worker.status === 'active' && worker.companyId === null ||
        filter === 'pfPending' && worker.status === 'active' && worker.pfStatus === 'pending' ||
        filter === 'esicPending' && worker.status === 'active' && worker.esicStatus === 'pending' ||
        filter === 'often' && worker.status === 'active' && reliability(worker.id) === 'often' ||
        filter === 'notes' && notesByWorker.has(worker.id) ||
        filter === 'inactive' && worker.status === 'inactive';
      return matchesQuery && matchesCompany && matchesFilter;
    });
    return matches.sort((left, right) => {
      if (sort === 'attendance') return (records.get(left.id)?.rate ?? 101) - (records.get(right.id)?.rate ?? 101);
      if (sort === 'wage') return right.dailyWagePaise - left.dailyWagePaise;
      return left.name.localeCompare(right.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, companyFilter, filter, notesByWorker, records, search, sort, workers]);

  const openWorker = workers.find((worker) => worker.id === openWorkerId) ?? null;
  const segments = companies.map((company) => ({
    id: company.id,
    label: company.shortName,
    value: activeWorkers.filter((worker) => worker.companyId === company.id).length,
    colorIndex: company.colorIndex
  }));
  const activeCompany = companies.find((company) => company.id === companyFilter);

  const summary: Array<{key: FilterKey; icon: React.ReactNode; value: number; label: string; tone?: 'warning' | 'danger'}> = [
    {key: 'all', icon: <UsersRound size={20} />, value: activeWorkers.length, label: t('active')},
    {key: 'often', icon: <AlertTriangle size={20} />, value: counts.often, label: t('oftenAbsent'), tone: 'danger'},
    {key: 'pfPending', icon: <FileWarning size={20} />, value: counts.pfPending, label: t('pfPending'), tone: 'warning'},
    {key: 'unplaced', icon: <UserRoundX size={20} />, value: counts.unplaced, label: t('unplaced'), tone: 'warning'}
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><span>{common('workers')}</span><h1>{t('title')}</h1><p>{t('subtitle', {count: workers.length})}</p></div>
        <div className={styles.headerActions}>
          {canEdit && <button onClick={() => openAssistant('excel', {excelKind: 'workers'})} type="button"><FileSpreadsheet size={18} /> {t('import')}</button>}
          {canEdit && <button onClick={() => setParam({add: '1'})} type="button"><Plus size={18} /> {t('add')}</button>}
        </div>
      </header>

      <section className={styles.summaryGrid}>
        {summary.map((item) => (
          <button aria-pressed={filter === item.key && !companyFilter} className={styles.summaryCard} data-tone={item.tone} key={item.key} onClick={() => setParam({filter: item.key === 'all' ? null : item.key, company: null})} type="button">
            <span>{item.icon}</span>
            <div><strong>{item.value}</strong><small>{item.label}</small></div>
          </button>
        ))}
      </section>

      <Card className={styles.distribution}>
        <div className={styles.distributionHead}>
          <h2>{t('byCompany')}</h2>
          {activeCompany && <button onClick={() => setParam({company: null})} type="button">{activeCompany.name} <X size={13} /></button>}
        </div>
        <SegmentBar activeId={companyFilter} ariaLabel={t('byCompany')} onSelect={(id) => setParam({company: companyFilter === id ? null : id})} segments={segments} />
      </Card>

      <section className={styles.listControls}>
        <label className={styles.searchBox}>
          <Search size={19} />
          <input onChange={(event) => setSearch(event.target.value)} placeholder={t('searchPlaceholder')} value={search} />
          {search && <button aria-label={common('close')} onClick={() => setSearch('')} type="button"><X size={15} /></button>}
        </label>
        <div className={styles.filters}>
          {filters.map((item) => (
            <button className={filter === item.key ? styles.filterActive : ''} key={item.key} onClick={() => setParam({filter: item.key === 'all' ? null : item.key})} type="button">
              {item.label}<span>{counts[item.key]}</span>
            </button>
          ))}
        </div>
      </section>

      <div className={styles.resultBar}>
        <span>{t('showing', {count: visibleWorkers.length})}</span>
        <label>
          {t('sortBy')}
          <select onChange={(event) => setSort(event.target.value as SortKey)} value={sort}>
            <option value="name">{t('sortName')}</option>
            <option value="attendance">{t('sortAttendance')}</option>
            <option value="wage">{t('sortWage')}</option>
          </select>
        </label>
      </div>

      <Card className={styles.workerTable}>
        {visibleWorkers.length === 0 ? (
          <div className={styles.empty}><Search size={25} /><p>{t('noResults')}</p></div>
        ) : visibleWorkers.map((worker) => {
          const company = companies.find((item) => item.id === worker.companyId);
          const record = records.get(worker.id);
          const level = reliabilityOf(record?.rate ?? null);
          const noteCount = notesByWorker.get(worker.id) ?? 0;
          return (
            <button className={styles.workerRow} data-inactive={worker.status === 'inactive' ? 'true' : undefined} key={worker.id} onClick={() => setParam({worker: worker.id})} type="button">
              <Avatar colorIndex={company?.colorIndex} name={worker.name} />
              <span className={styles.identity}>
                <strong>{worker.name}{worker.isNew && <em className={styles.newTag}>{t('new')}</em>}</strong>
                <small>{company?.name ?? t('unplaced')} · {common(worker.shift)}</small>
              </span>
              <span className={styles.role}><strong>{roles(worker.role)}</strong><small>{formatINR(worker.dailyWagePaise, locale)}</small></span>
              <span className={styles.attendance}>
                <Ring size={34} stroke={4} tone={level === 'regular' ? 'success' : level === 'sometimes' ? 'warning' : level === 'often' ? 'danger' : 'royal'} value={(record?.rate ?? 0) / 100} />
                <span><strong>{record?.rate === null || record?.rate === undefined ? '—' : `${record.rate}%`}</strong><small>{t(level)}</small></span>
              </span>
              <span className={styles.statuses}>
                {worker.pfStatus === 'pending' && <Pill tone="warning">PF</Pill>}
                {worker.esicStatus === 'pending' && <Pill tone="danger">ESIC</Pill>}
                {worker.status === 'inactive' && <Pill tone="neutral">{t('inactive')}</Pill>}
                {noteCount > 0 && <span className={styles.noteCount} title={t('notesCount', {count: noteCount})}><NotebookPen size={13} />{noteCount}</span>}
              </span>
              <ChevronRight size={18} />
            </button>
          );
        })}
      </Card>

      <WorkerDrawer onClose={() => setParam({worker: null})} worker={openWorker} />
      <QuickAddWorker onAdded={(worker) => setParam({add: null, worker: worker.id})} onClose={() => setParam({add: null})} open={addOpen} />
    </div>
  );
}
