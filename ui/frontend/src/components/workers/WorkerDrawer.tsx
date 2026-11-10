'use client';

import {AlertTriangle, CheckCircle2, Clock3, Minus, NotebookPen, Phone, Plus, Send, Trash2, UserRoundX, UserRoundCheck} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useTranslations} from 'next-intl';
import {useState} from 'react';
import {CalendarHeat} from '@/components/charts/CalendarHeat';
import {Ring} from '@/components/charts/Ring';
import {QuickRemind} from '@/components/reminders/QuickRemind';
import {Avatar} from '@/components/ui/Avatar';
import {ChoiceChips} from '@/components/ui/ChoiceChips';
import {InlineText} from '@/components/ui/InlineText';
import {MicButton} from '@/components/ui/MicButton';
import {Pill} from '@/components/ui/Card';
import {Sheet} from '@/components/ui/Sheet';
import {companies} from '@/data/sample-data';
import {grossWagePaise} from '@/domain/billing';
import {reliabilityOf, workerCalendar, workerMonthRecord, workerRecord} from '@/domain/history';
import {workerTips} from '@/domain/insights';
import {formatINR} from '@/domain/money';
import {notesForWorker} from '@/domain/notes';
import {todayStrength, worstLevel} from '@/domain/strength';
import {maskPhone, phoneDigits, stepWage} from '@/domain/workers';
import {formatDate, formatRelative} from '@/lib/format';
import {whatsappUrl} from '@/lib/share';
import {useApp} from '@/providers/AppProvider';
import {noteTags, workerRoles, type NoteTag, type Worker} from '@/types';
import styles from './workers.module.css';

const reliabilityTone = {regular: 'success', sometimes: 'warning', often: 'danger', new: 'royal'} as const;

export function WorkerDrawer({worker, onClose}: {worker: Worker | null; onClose: () => void}) {
  const common = useTranslations('common');
  return (
    <Sheet
      closeLabel={common('close')}
      leading={worker ? <Avatar colorIndex={companies.find((company) => company.id === worker.companyId)?.colorIndex} name={worker.name} size="lg" /> : null}
      onClose={onClose}
      open={Boolean(worker)}
      size="wide"
      subtitle={worker ? <WorkerSubtitle worker={worker} /> : null}
      title={worker ? <WorkerName worker={worker} /> : ''}
    >
      {worker && <WorkerProfile worker={worker} />}
    </Sheet>
  );
}

function WorkerName({worker}: {worker: Worker}) {
  const t = useTranslations('profile');
  const {updateWorker, canEdit} = useApp();
  return (
    <InlineText
      disabled={!canEdit}
      label={t('name')}
      onSave={(name) => updateWorker(worker.id, {name})}
      size="lg"
      validate={(value) => value.length >= 2}
      value={worker.name}
    />
  );
}

function WorkerSubtitle({worker}: {worker: Worker}) {
  const common = useTranslations('common');
  const roles = useTranslations('roles');
  const workersT = useTranslations('workers');
  const company = companies.find((item) => item.id === worker.companyId);
  return <>{roles(worker.role)} · {company?.name ?? workersT('unplaced')} · {common(worker.shift)}</>;
}

function Section({title, icon, children, aside}: {title: string; icon?: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>
        <h3>{icon}{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function WorkerProfile({worker}: {worker: Worker}) {
  const t = useTranslations('profile');
  const common = useTranslations('common');
  const roles = useTranslations('roles');
  const workersT = useTranslations('workers');
  const tipsT = useTranslations('workerTips');
  const {user, canEdit, history, todayISO, locale, attendance, workers, updateWorker} = useApp();

  const record = workerRecord(history, worker.id, 30);
  const monthRecord = workerMonthRecord(history, worker.id, todayISO);
  const reliability = reliabilityOf(record.rate);
  const absentToday = attendance.absentWorkerIds.includes(worker.id);
  const shortCompany = companies.find((company) => worstLevel(todayStrength(workers, attendance, company)) !== 'ok') ?? null;
  const tips = workerTips(worker, record, shortCompany?.name ?? null);
  const monthDays = monthRecord.present + (worker.companyId && !absentToday && attendance.confirmedCompanyIds.includes(worker.companyId) ? 1 : 0);
  const monthGross = grossWagePaise(monthDays, worker.dailyWagePaise);
  const weekdays = [1, 2, 3, 4, 5, 6, 7].map((day) => formatDate(`2026-06-${String(day).padStart(2, '0')}`, locale, {weekday: 'narrow'}));
  const digits = phoneDigits(worker.phone);

  const companyChoices = [
    ...companies.map((company) => ({value: company.id, label: company.name, colorIndex: company.colorIndex})),
    {value: 'none', label: workersT('unplaced')}
  ];

  return (
    <div className={styles.profile}>
      <div className={styles.factRow}>
        <div className={styles.fact}>
          <Ring size={58} stroke={6} tone={reliability === 'regular' ? 'success' : reliability === 'sometimes' ? 'warning' : reliability === 'often' ? 'danger' : 'royal'} value={(record.rate ?? 0) / 100}>
            <strong className={styles.factRing}>{record.rate === null ? '—' : `${record.rate}%`}</strong>
          </Ring>
          <span><Pill tone={reliabilityTone[reliability]}>{workersT(reliability)}</Pill><small>{t('last30')}</small></span>
        </div>
        <div className={styles.fact}>
          <span><strong>{monthRecord.present}</strong><small>{t('daysThisMonth')}</small></span>
        </div>
        <div className={styles.fact}>
          <span><strong>{monthRecord.absent}</strong><small>{t('absencesThisMonth')}</small></span>
        </div>
        <div className={styles.fact}>
          <span><strong>{formatINR(monthGross, locale, true)}</strong><small>{t('earnedSoFar')}</small></span>
        </div>
      </div>

      {tips.length > 0 && (
        <ul className={styles.tips}>
          {tips.map((tip) => (
            <li data-severity={tip.severity} key={tip.key}>
              {tip.severity === 'positive' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              <span>{tipsT(tip.key, tip.params)}</span>
            </li>
          ))}
        </ul>
      )}

      <Section title={t('placement')}>
        <ChoiceChips
          choices={companyChoices}
          disabled={!canEdit}
          label={workersT('company')}
          onChange={(value) => updateWorker(worker.id, {companyId: value === 'none' ? null : value})}
          size="sm"
          value={worker.companyId ?? 'none'}
        />
        <div className={styles.inlinePair}>
          <ChoiceChips
            choices={[{value: 'day', label: common('day')}, {value: 'night', label: common('night')}]}
            disabled={!canEdit}
            label={workersT('shift')}
            onChange={(shift) => updateWorker(worker.id, {shift})}
            size="sm"
            value={worker.shift}
          />
          <ChoiceChips
            choices={workerRoles.map((role) => ({value: role, label: roles(role)}))}
            disabled={!canEdit}
            label={workersT('role')}
            onChange={(role) => updateWorker(worker.id, {role})}
            size="sm"
            value={worker.role}
          />
        </div>
        <p className={styles.hint}>{t('placementHint')}</p>
      </Section>

      <Section title={t('pay')}>
        <div className={styles.payRow}>
          <div className={styles.stepper}>
            <button aria-label={t('wageDown')} disabled={!canEdit} onClick={() => updateWorker(worker.id, {dailyWagePaise: stepWage(worker.dailyWagePaise, -1)}, {silent: true})} type="button"><Minus size={16} /></button>
            <span>
              <InlineText
                disabled={!canEdit}
                display={formatINR(worker.dailyWagePaise, locale)}
                inputMode="numeric"
                label={workersT('dailyWage')}
                onSave={(value) => updateWorker(worker.id, {dailyWagePaise: Math.round(Number(value.replace(/[^\d]/g, ''))) * 100})}
                validate={(value) => Number(value.replace(/[^\d]/g, '')) >= 10}
                value={String(worker.dailyWagePaise / 100)}
              />
              <small>{t('perDay')}</small>
            </span>
            <button aria-label={t('wageUp')} disabled={!canEdit} onClick={() => updateWorker(worker.id, {dailyWagePaise: stepWage(worker.dailyWagePaise, 1)}, {silent: true})} type="button"><Plus size={16} /></button>
          </div>
          <ChoiceChips
            choices={[{value: 'cash', label: t('cash')}, {value: 'bank', label: t('bank')}]}
            disabled={!canEdit}
            label={t('payMode')}
            onChange={(payMode) => updateWorker(worker.id, {payMode})}
            size="sm"
            value={worker.payMode}
          />
        </div>
      </Section>

      <Section title={t('statutory')}>
        <div className={styles.statutoryGrid}>
          {(['pfStatus', 'esicStatus'] as const).map((field) => (
            <div key={field}>
              <span className={styles.fieldLabel}>{field === 'pfStatus' ? 'PF' : 'ESIC'}</span>
              <ChoiceChips
                choices={[{value: 'done', label: t('done')}, {value: 'pending', label: common('pending')}]}
                disabled={!canEdit}
                label={field === 'pfStatus' ? 'PF' : 'ESIC'}
                onChange={(value) => updateWorker(worker.id, {[field]: value} as Partial<Worker>)}
                size="sm"
                value={worker[field]}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('contact')}>
        <div className={styles.contactRow}>
          <Phone size={16} />
          {user.role === 'viewer' ? (
            <span className={styles.masked}>{maskPhone(worker.phone)}</span>
          ) : (
            <InlineText inputMode="tel" label={t('phone')} onSave={(phone) => updateWorker(worker.id, {phone})} placeholder={t('addPhone')} value={worker.phone} />
          )}
          {user.role !== 'viewer' && digits && (
            <span className={styles.contactActions}>
              <a href={`tel:+${digits}`}>{t('call')}</a>
              <a className={styles.whatsappLink} href={whatsappUrl('', digits)} rel="noreferrer" target="_blank">WhatsApp</a>
            </span>
          )}
        </div>
      </Section>

      <Section title={t('attendance')} aside={<small className={styles.muted}>{t('last5Weeks')}</small>}>
        <CalendarHeat
          cells={workerCalendar(history, worker.id, 34)}
          describe={(date, status) => `${formatDate(date, locale, {weekday: 'short', day: 'numeric', month: 'short'})}: ${status === 'today' ? common('today') : status === 'none' ? '—' : t(`status.${status}`)}`}
          legend={{present: common('present'), absent: common('absent'), off: t('status.off'), today: common('today')}}
          todayISO={todayISO}
          todayStatus={worker.companyId ? (absentToday ? 'absent' : 'present') : null}
          weekdayLabels={weekdays}
        />
      </Section>

      <NotesSection worker={worker} />

      {canEdit && (
        <Section icon={<Clock3 size={15} />} title={t('remindMe')}>
          <QuickRemind links={{workerId: worker.id, companyId: worker.companyId}} placeholder={t('remindPlaceholder', {name: worker.name.split(' ')[0]})} />
        </Section>
      )}

      {canEdit && (
        <button
          className={worker.status === 'active' ? styles.leaveButton : styles.rejoinButton}
          onClick={() => updateWorker(worker.id, {status: worker.status === 'active' ? 'inactive' : 'active'})}
          type="button"
        >
          {worker.status === 'active' ? <UserRoundX size={17} /> : <UserRoundCheck size={17} />}
          {worker.status === 'active' ? t('markLeft') : t('markActive')}
        </button>
      )}
    </div>
  );
}

function NotesSection({worker}: {worker: Worker}) {
  const t = useTranslations('profile');
  const tags = useTranslations('noteTags');
  const common = useTranslations('common');
  const {notes, user, canEdit, addNote, deleteNote, now, locale} = useApp();
  const [text, setText] = useState('');
  const [tag, setTag] = useState<NoteTag>('general');
  const list = notesForWorker(notes, worker.id, user.role);
  const availableTags = user.role === 'viewer' ? noteTags.filter((item) => item !== 'health') : noteTags;

  function submit() {
    if (!text.trim()) return;
    addNote(worker.id, text, tag);
    setText('');
    setTag('general');
  }

  return (
    <Section aside={<small className={styles.muted}>{list.length}</small>} icon={<NotebookPen size={15} />} title={t('notes')}>
      {canEdit && (
        <div className={styles.noteComposer}>
          <label className={styles.noteBox}>
            <textarea
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit();
              }}
              placeholder={t('notePlaceholder')}
              rows={2}
              value={text}
            />
            <span className={styles.noteBoxActions}>
              <MicButton compact onText={(spoken) => setText((current) => (current ? `${current} ${spoken}` : spoken))} />
              <button aria-label={t('addNote')} className={styles.sendNote} disabled={!text.trim()} onClick={submit} type="button"><Send size={15} /></button>
            </span>
          </label>
          <ChoiceChips choices={availableTags.map((item) => ({value: item, label: tags(item)}))} label={t('noteType')} onChange={setTag} size="sm" value={tag} />
        </div>
      )}
      {list.length === 0 ? (
        <p className={styles.emptyNotes}>{t('noNotes')}</p>
      ) : (
        <ul className={styles.noteList}>
          <AnimatePresence initial={false}>
            {list.map((note) => (
              <motion.li animate={{opacity: 1, y: 0}} exit={{opacity: 0, height: 0}} initial={{opacity: 0, y: -6}} key={note.id} layout>
                <span className={styles.noteTag} data-tag={note.tag}>{tags(note.tag)}</span>
                <p>{note.text}</p>
                <small>{note.author} · {formatRelative(new Date(note.createdAt), now, locale)}</small>
                {canEdit && <button aria-label={common('delete')} onClick={() => deleteNote(note.id)} type="button"><Trash2 size={14} /></button>}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Section>
  );
}
