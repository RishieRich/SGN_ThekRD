'use client';

import {ArrowRight, Bell, CheckCircle2, HelpCircle, Minus, Moon, Plus, Speaker, Sun, UserPlus, UserRound, UserX, X} from 'lucide-react';
import {useTranslations} from 'next-intl';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {ChoiceChips} from '@/components/ui/ChoiceChips';
import {InlineText} from '@/components/ui/InlineText';
import {companies} from '@/data/sample-data';
import {todayTotals} from '@/domain/attendance';
import type {Command, QuestionTopic} from '@/domain/commands';
import {workerMonthRecord} from '@/domain/history';
import {formatINR} from '@/domain/money';
import {presetDueAt, reminderPresets, type ReminderPreset} from '@/domain/reminders';
import {stepWage, type NewWorkerInput} from '@/domain/workers';
import {formatNumber} from '@/lib/format';
import {speakInBrowser} from '@/lib/speech';
import {useApp} from '@/providers/AppProvider';
import {workerRoles, type Worker} from '@/types';
import styles from './assistant.module.css';

const companyOf = (worker: Worker) => companies.find((company) => company.id === worker.companyId);

interface ProposalProps {
  command: Command;
  heard: string;
  onDone: () => void;
  onTry: (text: string) => void;
}

export function Proposal({command, heard, onDone, onTry}: ProposalProps) {
  const t = useTranslations('assistant');
  return (
    <div className={styles.proposal}>
      <p className={styles.heard}><span>{t('youSaid')}</span> “{heard}”</p>
      {(command.kind === 'absent' || command.kind === 'present') && <NamesProposal command={command} onDone={onDone} />}
      {command.kind === 'remind' && <RemindProposal onDone={onDone} preset={command.preset} text={command.text} />}
      {command.kind === 'addWorker' && <AddWorkerProposal input={command.input} onDone={onDone} />}
      {command.kind === 'question' && <Answer topic={command.topic} />}
      {command.kind === 'openWorker' && <WorkerFound onDone={onDone} worker={command.worker} />}
      {command.kind === 'unknown' && <NotUnderstood onTry={onTry} suggestions={command.suggestions} />}
    </div>
  );
}

function Actions({onCancel, onConfirm, confirmLabel, disabled}: {onCancel: () => void; onConfirm: () => void; confirmLabel: string; disabled?: boolean}) {
  const common = useTranslations('common');
  const t = useTranslations('assistant');
  const {canEdit} = useApp();
  return (
    <>
      {!canEdit && <p className={styles.readOnly}>{t('viewerReadOnly')}</p>}
      <div className={styles.actions}>
        <button className={styles.secondary} onClick={onCancel} type="button">{common('cancel')}</button>
        <button className={styles.primary} disabled={disabled || !canEdit} onClick={onConfirm} type="button">
          <CheckCircle2 size={17} /> {confirmLabel}
        </button>
      </div>
    </>
  );
}

function NamesProposal({command, onDone}: {command: Extract<Command, {kind: 'absent' | 'present'}>; onDone: () => void}) {
  const t = useTranslations('assistant');
  const {markWorkersAbsent, setWorkerAbsent, pushToast} = useApp();
  const [selected, setSelected] = useState<Worker[]>(command.matched);
  const [open, setOpen] = useState(command.ambiguous);
  const absent = command.kind === 'absent';

  function confirm() {
    if (absent) markWorkersAbsent(selected.map((worker) => worker.id));
    else for (const worker of selected) if (worker.companyId) setWorkerAbsent(worker.id, worker.companyId, false);
    pushToast({
      message: absent ? t('markedAbsent', {count: selected.length}) : t('markedPresent', {count: selected.length}),
      tone: 'success',
      actionLabel: t('openHajri'),
      href: '/hajri'
    });
    onDone();
  }

  return (
    <>
      <h4 className={styles.proposalTitle}>
        <span className={absent ? styles.iconDanger : styles.iconSuccess}>{absent ? <UserX size={17} /> : <CheckCircle2 size={17} />}</span>
        {absent ? t('absentTitle', {count: selected.length}) : t('presentTitle', {count: selected.length})}
      </h4>
      <div className={styles.nameChips} data-tone={absent ? 'danger' : 'success'}>
        {selected.map((worker) => (
          <button key={worker.id} onClick={() => setSelected((list) => list.filter((item) => item.id !== worker.id))} title={t('remove')} type="button">
            <Avatar colorIndex={companyOf(worker)?.colorIndex} name={worker.name} size="sm" />
            <span>{worker.name}<small>{companyOf(worker)?.shortName} · {worker.shift === 'night' ? <Moon size={10} /> : <Sun size={10} />}</small></span>
            <X size={14} />
          </button>
        ))}
      </div>
      {open.map((item) => (
        <div className={styles.pick} key={item.text}>
          <span>{t('pickOne', {name: item.text})}</span>
          <div>
            {item.options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setSelected((list) => (list.some((worker) => worker.id === option.id) ? list : [...list, option]));
                  setOpen((list) => list.filter((entry) => entry.text !== item.text));
                }}
                type="button"
              >
                {option.name} <small>{companyOf(option)?.shortName}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
      {command.unmatched.length > 0 && <p className={styles.muted}>{t('notFound', {names: command.unmatched.join(', ')})}</p>}
      <Actions confirmLabel={absent ? t('confirmAbsent', {count: selected.length}) : t('confirmPresent', {count: selected.length})} disabled={!selected.length} onCancel={onDone} onConfirm={confirm} />
    </>
  );
}

function RemindProposal({text, preset, onDone}: {text: string; preset: ReminderPreset; onDone: () => void}) {
  const t = useTranslations('assistant');
  const remindersT = useTranslations('reminders');
  const {addReminder} = useApp();
  const [value, setValue] = useState(text);
  const [when, setWhen] = useState<ReminderPreset>(preset);
  return (
    <>
      <h4 className={styles.proposalTitle}><span className={styles.iconWarm}><Bell size={17} /></span>{t('remindTitle')}</h4>
      <input aria-label={t('remindTitle')} className={styles.field} onChange={(event) => setValue(event.target.value)} value={value} />
      <ChoiceChips choices={reminderPresets.map((item) => ({value: item, label: remindersT(`preset.${item}`)}))} label={t('remindTitle')} onChange={setWhen} size="sm" value={when} />
      <Actions
        confirmLabel={t('remindConfirm')}
        disabled={value.trim().length < 2}
        onCancel={onDone}
        onConfirm={() => {
          addReminder(value.trim(), presetDueAt(when, new Date()));
          onDone();
        }}
      />
    </>
  );
}

function AddWorkerProposal({input, onDone}: {input: NewWorkerInput; onDone: () => void}) {
  const t = useTranslations('assistant');
  const roles = useTranslations('roles');
  const common = useTranslations('common');
  const workersT = useTranslations('workers');
  const quickAdd = useTranslations('quickAdd');
  const {addWorker, pushToast, locale} = useApp();
  const [draft, setDraft] = useState<NewWorkerInput>(input);
  const update = (patch: Partial<NewWorkerInput>) => setDraft((current) => ({...current, ...patch}));

  return (
    <>
      <h4 className={styles.proposalTitle}><span className={styles.iconViolet}><UserPlus size={17} /></span>{t('addTitle')}</h4>
      <div className={styles.workerDraft}>
        <InlineText label={quickAdd('name')} onSave={(name) => update({name})} size="lg" validate={(value) => value.length >= 2} value={draft.name} />
        <ChoiceChips choices={workerRoles.map((role) => ({value: role, label: roles(role)}))} label={workersT('role')} onChange={(role) => update({role})} size="sm" value={draft.role} />
        <ChoiceChips
          choices={[...companies.map((company) => ({value: company.id, label: company.name, colorIndex: company.colorIndex})), {value: 'none', label: t('noCompany')}]}
          label={workersT('company')}
          onChange={(value) => update({companyId: value === 'none' ? null : value})}
          size="sm"
          value={draft.companyId ?? 'none'}
        />
        <div className={styles.draftRow}>
          <ChoiceChips choices={[{value: 'day', label: common('day')}, {value: 'night', label: common('night')}]} label={workersT('shift')} onChange={(shift) => update({shift})} size="sm" value={draft.shift} />
          <span className={styles.stepper}>
            <button aria-label={quickAdd('wageDown')} onClick={() => update({dailyWagePaise: stepWage(draft.dailyWagePaise, -1)})} type="button"><Minus size={15} /></button>
            <strong>{formatINR(draft.dailyWagePaise, locale)}</strong>
            <button aria-label={quickAdd('wageUp')} onClick={() => update({dailyWagePaise: stepWage(draft.dailyWagePaise, 1)})} type="button"><Plus size={15} /></button>
          </span>
        </div>
        {draft.phone && <small className={styles.muted}>📞 {draft.phone}</small>}
      </div>
      <Actions
        confirmLabel={t('addConfirm')}
        disabled={draft.name.trim().length < 2}
        onCancel={onDone}
        onConfirm={() => {
          const worker = addWorker(draft);
          pushToast({message: quickAdd('added', {name: worker.name}), tone: 'success', actionLabel: quickAdd('openProfile'), href: `/kaamgar?worker=${worker.id}`});
          onDone();
        }}
      />
    </>
  );
}

function Answer({topic}: {topic: QuestionTopic}) {
  const t = useTranslations('assistant');
  const {workers, attendance, month, history, todayISO, locale} = useApp();
  const active = workers.filter((worker) => worker.status === 'active');
  const totals = todayTotals(workers, attendance, companies);
  const mostAbsent = active
    .map((worker) => ({worker, absent: workerMonthRecord(history, worker.id, todayISO).absent}))
    .sort((left, right) => right.absent - left.absent)[0];

  const answers: Record<QuestionTopic, {text: string; href: string}> = {
    today: {
      text: t('answer.today', {present: totals.present, absent: totals.absent, total: totals.usual, done: attendance.confirmedCompanyIds.length, companies: companies.length}),
      href: '/hajri'
    },
    month: {text: t('answer.month', {manDays: formatNumber(month.manDays, locale), days: month.confirmedDays}), href: '/home'},
    pf: {text: t('answer.pf', {count: active.filter((worker) => worker.pfStatus === 'pending').length}), href: '/kaamgar?filter=pfPending'},
    esic: {text: t('answer.esic', {count: active.filter((worker) => worker.esicStatus === 'pending').length}), href: '/kaamgar?filter=esicPending'},
    unplaced: {text: t('answer.unplaced', {count: active.filter((worker) => !worker.companyId).length}), href: '/kaamgar?filter=unplaced'},
    absentMost: {text: t('answer.absentMost', {worker: mostAbsent?.worker.name ?? '—', days: mostAbsent?.absent ?? 0}), href: '/kaamgar?filter=often'}
  };
  const answer = answers[topic];

  return (
    <>
      <h4 className={styles.proposalTitle}><span className={styles.iconViolet}><HelpCircle size={17} /></span>{t('answerTitle')}</h4>
      <p className={styles.answer}>{answer.text}</p>
      <div className={styles.actions}>
        <button className={styles.secondary} onClick={() => speakInBrowser(answer.text, locale)} type="button"><Speaker size={16} /> {t('listen')}</button>
        <Link className={styles.primary} href={answer.href}>{t('seeDetails')} <ArrowRight size={16} /></Link>
      </div>
    </>
  );
}

function WorkerFound({worker, onDone}: {worker: Worker; onDone: () => void}) {
  const t = useTranslations('assistant');
  const roles = useTranslations('roles');
  const router = useRouter();
  const {markWorkersAbsent, attendance, canEdit, pushToast, closeAssistant} = useApp();
  const company = companyOf(worker);
  const absentToday = attendance.absentWorkerIds.includes(worker.id);
  return (
    <>
      <h4 className={styles.proposalTitle}><span className={styles.iconViolet}><UserRound size={17} /></span>{t('foundTitle')}</h4>
      <div className={styles.found}>
        <Avatar colorIndex={company?.colorIndex} name={worker.name} />
        <span><strong>{worker.name}</strong><small>{roles(worker.role)} · {company?.name ?? '—'}</small></span>
      </div>
      <div className={styles.actions}>
        {canEdit && worker.companyId && !absentToday && (
          <button
            className={styles.secondary}
            onClick={() => {
              markWorkersAbsent([worker.id]);
              pushToast({message: t('markedAbsent', {count: 1}), tone: 'success', actionLabel: t('openHajri'), href: '/hajri'});
              onDone();
            }}
            type="button"
          >
            <UserX size={16} /> {t('markAbsentToday')}
          </button>
        )}
        <button
          className={styles.primary}
          onClick={() => {
            closeAssistant();
            router.push(`/kaamgar?worker=${worker.id}`);
          }}
          type="button"
        >
          {t('openProfile')} <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}

function NotUnderstood({suggestions, onTry}: {suggestions: Worker[]; onTry: (text: string) => void}) {
  const t = useTranslations('assistant');
  return (
    <>
      <h4 className={styles.proposalTitle}><span className={styles.iconWarm}><HelpCircle size={17} /></span>{t('unknownTitle')}</h4>
      <p className={styles.muted}>{t('unknownBody')}</p>
      {suggestions.length > 0 && (
        <div className={styles.pick}>
          <span>{t('didYouMean')}</span>
          <div>{suggestions.map((worker) => <button key={worker.id} onClick={() => onTry(worker.name)} type="button">{worker.name}</button>)}</div>
        </div>
      )}
    </>
  );
}
