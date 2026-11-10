'use client';

import {CheckCircle2, Download, FileSpreadsheet, RefreshCw, ShieldCheck, UploadCloud, UserX} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useMemo, useRef, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {ChoiceChips} from '@/components/ui/ChoiceChips';
import {companies} from '@/data/sample-data';
import {attendanceFromSheet, attendanceTemplate, detectColumns, guessKind, workersFromSheet, workersTemplate, type ImportKind, type NamesMeaning} from '@/domain/imports';
import {formatINR} from '@/domain/money';
import {downloadCsv, readSpreadsheet, SpreadsheetError, type SheetRows} from '@/lib/spreadsheet';
import {useApp} from '@/providers/AppProvider';
import type {Worker} from '@/types';
import styles from './assistant.module.css';

const accept = '.xlsx,.csv,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const companyOf = (worker: Worker) => companies.find((company) => company.id === worker.companyId);

/** Drop an Excel or CSV sheet: today's attendance or a worker list. Read on the device, previewed, then confirmed. */
export function ExcelImport({initialKind, onDone}: {initialKind: ImportKind | null; onDone: () => void}) {
  const t = useTranslations('excel');
  const [file, setFile] = useState<{name: string; rows: SheetRows} | null>(null);
  const [kind, setKind] = useState<ImportKind>(initialKind ?? 'attendance');
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function load(chosen: File | undefined) {
    if (!chosen) return;
    setError(null);
    setReading(chosen.name);
    try {
      const rows = await readSpreadsheet(chosen);
      setFile({name: chosen.name, rows});
      setKind(guessKind(detectColumns(rows), initialKind ?? undefined));
    } catch (problem) {
      setError(t(`error.${problem instanceof SpreadsheetError ? problem.reason : 'unreadable'}`));
    } finally {
      setReading(null);
    }
  }

  if (!file) {
    return (
      <div className={styles.excel}>
        <label
          className={styles.drop}
          data-dragging={dragging ? 'true' : undefined}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void load(event.dataTransfer.files[0]);
          }}
        >
          <input accept={accept} hidden onChange={(event) => void load(event.target.files?.[0])} ref={input} type="file" />
          <span className={styles.dropIcon}>{reading ? <RefreshCw className={styles.spin} size={26} /> : <UploadCloud size={28} />}</span>
          <strong>{reading ? t('reading', {file: reading}) : t('dropHint')}</strong>
          <small><ShieldCheck size={13} /> {t('formats')}</small>
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.templates}>
          <span>{t('templatesTitle')}</span>
          <button onClick={() => downloadCsv('arq-hajri-template.csv', attendanceTemplate)} type="button"><Download size={14} /> {t('templateAttendance')}</button>
          <button onClick={() => downloadCsv('arq-workers-template.csv', workersTemplate)} type="button"><Download size={14} /> {t('templateWorkers')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.excel}>
      <div className={styles.fileBar}>
        <FileSpreadsheet size={20} />
        <span><strong>{file.name}</strong><small>{t('rows', {count: Math.max(0, file.rows.length - (detectColumns(file.rows).headerRow + 1))})}</small></span>
        <button onClick={() => setFile(null)} type="button"><RefreshCw size={14} /> {t('another')}</button>
      </div>
      <div className={styles.kindRow}>
        <span>{t('kindLabel')}</span>
        <ChoiceChips choices={[{value: 'attendance', label: t('kindAttendance')}, {value: 'workers', label: t('kindWorkers')}]} label={t('kindLabel')} onChange={setKind} size="sm" value={kind} />
      </div>
      {kind === 'attendance' ? <AttendancePreview onDone={onDone} rows={file.rows} /> : <WorkersPreview onDone={onDone} rows={file.rows} />}
    </div>
  );
}

function AttendancePreview({rows, onDone}: {rows: SheetRows; onDone: () => void}) {
  const t = useTranslations('excel');
  const {workers, markWorkersAbsent, copyAbsentees, pushToast, canEdit} = useApp();
  const [meaning, setMeaning] = useState<NamesMeaning>('absent');
  const [picked, setPicked] = useState<string[]>([]);
  const result = useMemo(() => attendanceFromSheet(rows, workers, meaning), [rows, workers, meaning]);
  const absentIds = [...new Set([...result.absentIds, ...(meaning === 'absent' || result.hasStatus ? picked : [])])];
  const absentWorkers = absentIds.map((id) => workers.find((worker) => worker.id === id)).filter((worker): worker is Worker => Boolean(worker));
  const replaces = result.hasStatus || meaning === 'present';

  function apply() {
    if (replaces) copyAbsentees(absentIds);
    else markWorkersAbsent(absentIds);
    pushToast({message: t('applied', {count: absentIds.length}), tone: 'success', actionLabel: t('openHajri'), href: '/hajri'});
    onDone();
  }

  return (
    <>
      {result.hasStatus ? (
        <p className={styles.callout}><CheckCircle2 size={15} /> {t('statusFound')}</p>
      ) : (
        <div className={styles.kindRow}>
          <span>{t('namesAre')}</span>
          <ChoiceChips choices={[{value: 'absent', label: t('namesAbsent')}, {value: 'present', label: t('namesPresent')}]} label={t('namesAre')} onChange={setMeaning} size="sm" value={meaning} />
        </div>
      )}
      <div className={styles.summaryStrip}>
        <span><strong>{result.matched.length}</strong>{t('matched')}</span>
        <span data-tone="danger"><strong>{absentIds.length}</strong>{t('willBeAbsent')}</span>
        {(result.ambiguous.length > 0 || result.unmatched.length > 0) && <span data-tone="warning"><strong>{result.ambiguous.length + result.unmatched.length}</strong>{t('needsLook')}</span>}
      </div>
      {absentWorkers.length > 0 && (
        <div className={styles.nameCloud}>
          {absentWorkers.slice(0, 30).map((worker) => (
            <span key={worker.id}><Avatar colorIndex={companyOf(worker)?.colorIndex} name={worker.name} size="sm" />{worker.name}</span>
          ))}
          {absentWorkers.length > 30 && <span className={styles.more}>{t('more', {count: absentWorkers.length - 30})}</span>}
        </div>
      )}
      {result.ambiguous.slice(0, 6).map((item) => (
        <div className={styles.pick} key={item.text}>
          <span>{t('which', {name: item.text})}</span>
          <div>
            {item.options.map((option) => (
              <button aria-pressed={picked.includes(option.id)} key={option.id} onClick={() => setPicked((list) => (list.includes(option.id) ? list.filter((id) => id !== option.id) : [...list, option.id]))} type="button">
                {option.name} <small>{companyOf(option)?.shortName}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
      {result.unmatched.length > 0 && <p className={styles.muted}>{t('notFound', {names: result.unmatched.slice(0, 8).join(', ')})}</p>}
      {result.unclear.length > 0 && <p className={styles.muted}>{t('unclear', {names: result.unclear.slice(0, 6).join(', ')})}</p>}
      <p className={styles.muted}>{replaces ? t('replaceNote') : t('addNote')}</p>
      <div className={styles.actions}>
        <button className={styles.secondary} onClick={onDone} type="button">{t('cancel')}</button>
        <button className={styles.primary} disabled={!canEdit || (!absentIds.length && !replaces)} onClick={apply} type="button">
          <UserX size={16} /> {t('applyAttendance', {count: absentIds.length})}
        </button>
      </div>
    </>
  );
}

function WorkersPreview({rows, onDone}: {rows: SheetRows; onDone: () => void}) {
  const t = useTranslations('excel');
  const roles = useTranslations('roles');
  const common = useTranslations('common');
  const {workers, addWorkers, pushToast, canEdit, locale} = useApp();
  const parsed = useMemo(() => workersFromSheet(rows, workers, companies), [rows, workers]);
  const [skip, setSkip] = useState<Set<number>>(() => new Set(parsed.flatMap((row, index) => (row.duplicate ? [index] : []))));
  const chosen = parsed.filter((_, index) => !skip.has(index));

  function apply() {
    const created = addWorkers(chosen.map((row) => row.input));
    pushToast({message: t('addedWorkers', {count: created.length}), tone: 'success', actionLabel: t('seeWorkers'), href: '/kaamgar'});
    onDone();
  }

  return (
    <>
      <div className={styles.summaryStrip}>
        <span><strong>{parsed.length}</strong>{t('rowsFound')}</span>
        <span data-tone="success"><strong>{chosen.length}</strong>{t('toAdd')}</span>
        {parsed.length - chosen.length > 0 && <span data-tone="warning"><strong>{parsed.length - chosen.length}</strong>{t('skipped')}</span>}
      </div>
      <ul className={styles.importList}>
        {parsed.slice(0, 60).map((row, index) => {
          const company = companies.find((item) => item.id === row.input.companyId);
          const included = !skip.has(index);
          return (
            <li data-off={included ? undefined : 'true'} key={`${row.input.name}-${index}`}>
              <label>
                <input
                  checked={included}
                  onChange={() => setSkip((current) => {
                    const next = new Set(current);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  })}
                  type="checkbox"
                />
                <Avatar colorIndex={company?.colorIndex} name={row.input.name} size="sm" />
                <span>
                  <strong>{row.input.name}</strong>
                  <small>{roles(row.input.role)} · {company?.shortName ?? t('noCompany')} · {common(row.input.shift)} · {formatINR(row.input.dailyWagePaise, locale)}</small>
                </span>
              </label>
              {row.duplicate && <em data-tone="warning">{t('duplicate')}</em>}
              {row.unknownCompany && <em data-tone="warning">{t('unknownCompany', {name: row.unknownCompany})}</em>}
            </li>
          );
        })}
      </ul>
      {parsed.length > 60 && <p className={styles.muted}>{t('more', {count: parsed.length - 60})}</p>}
      <div className={styles.actions}>
        <button className={styles.secondary} onClick={onDone} type="button">{t('cancel')}</button>
        <button className={styles.primary} disabled={!canEdit || !chosen.length} onClick={apply} type="button">
          <CheckCircle2 size={16} /> {t('addWorkers', {count: chosen.length})}
        </button>
      </div>
    </>
  );
}
