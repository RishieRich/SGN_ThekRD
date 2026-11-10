'use client';

import {Minus, Plus, UserPlus} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useRef, useState} from 'react';
import {ChoiceChips} from '@/components/ui/ChoiceChips';
import {MicButton} from '@/components/ui/MicButton';
import {Sheet} from '@/components/ui/Sheet';
import {companies} from '@/data/sample-data';
import {formatINR} from '@/domain/money';
import {defaultWagePaise, stepWage} from '@/domain/workers';
import {useApp} from '@/providers/AppProvider';
import {workerRoles, type Shift, type Worker, type WorkerRole} from '@/types';
import styles from './workers.module.css';

/** Add a worker in under 30 seconds: a name and a few taps. Everything else can come later. */
export function QuickAddWorker({open, onClose, onAdded}: {open: boolean; onClose: () => void; onAdded: (worker: Worker) => void}) {
  const t = useTranslations('quickAdd');
  const common = useTranslations('common');
  const roles = useTranslations('roles');
  const workersT = useTranslations('workers');
  const {addWorker, locale, pushToast} = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<WorkerRole>('helper');
  const [companyId, setCompanyId] = useState<string>('none');
  const [shift, setShift] = useState<Shift>('day');
  const [wage, setWage] = useState(defaultWagePaise('helper'));
  const [count, setCount] = useState(0);
  const nameInput = useRef<HTMLInputElement>(null);
  const valid = name.trim().length >= 2;

  function chooseRole(next: WorkerRole) {
    setRole(next);
    setWage(defaultWagePaise(next));
  }

  function save(keepOpen: boolean) {
    if (!valid) {
      nameInput.current?.focus();
      return;
    }
    const worker = addWorker({name, phone, role, companyId: companyId === 'none' ? null : companyId, shift, dailyWagePaise: wage});
    setCount((value) => value + 1);
    setName('');
    setPhone('');
    pushToast({message: t('added', {name: worker.name}), tone: 'success', actionLabel: keepOpen ? undefined : t('openProfile'), onAction: () => onAdded(worker)});
    if (keepOpen) nameInput.current?.focus();
    else onClose();
  }

  return (
    <Sheet
      closeLabel={common('close')}
      footer={
        <>
          <button className={styles.secondaryAction} disabled={!valid} onClick={() => save(true)} type="button"><Plus size={16} /> {t('addNext')}</button>
          <button className={styles.primaryAction} disabled={!valid} onClick={() => save(false)} type="button"><UserPlus size={16} /> {t('add')}</button>
        </>
      }
      leading={<span className={styles.addIcon}><UserPlus size={20} /></span>}
      onClose={onClose}
      open={open}
      subtitle={count ? t('addedCount', {count}) : t('subtitle')}
      title={t('title')}
    >
      <div className={styles.quickAdd}>
        <label className={styles.bigField}>
          <span>{t('name')}</span>
          <span className={styles.bigInput}>
            <input autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && save(true)} placeholder={t('namePlaceholder')} ref={nameInput} value={name} />
            <MicButton onText={setName} />
          </span>
        </label>

        <div className={styles.fieldBlock}>
          <span className={styles.fieldLabel}>{workersT('role')}</span>
          <ChoiceChips choices={workerRoles.map((item) => ({value: item, label: roles(item)}))} label={workersT('role')} onChange={chooseRole} value={role} />
        </div>

        <div className={styles.fieldBlock}>
          <span className={styles.fieldLabel}>{workersT('company')}</span>
          <ChoiceChips
            choices={[...companies.map((company) => ({value: company.id, label: company.name, colorIndex: company.colorIndex})), {value: 'none', label: t('decideLater')}]}
            label={workersT('company')}
            onChange={setCompanyId}
            size="sm"
            value={companyId}
          />
        </div>

        <div className={styles.inlinePair}>
          <div className={styles.fieldBlock}>
            <span className={styles.fieldLabel}>{workersT('shift')}</span>
            <ChoiceChips choices={[{value: 'day', label: common('day')}, {value: 'night', label: common('night')}]} label={workersT('shift')} onChange={setShift} value={shift} />
          </div>
          <div className={styles.fieldBlock}>
            <span className={styles.fieldLabel}>{workersT('dailyWage')}</span>
            <div className={styles.stepper}>
              <button aria-label={t('wageDown')} onClick={() => setWage((value) => stepWage(value, -1))} type="button"><Minus size={16} /></button>
              <span><strong>{formatINR(wage, locale)}</strong><small>{t('suggested')}</small></span>
              <button aria-label={t('wageUp')} onClick={() => setWage((value) => stepWage(value, 1))} type="button"><Plus size={16} /></button>
            </div>
          </div>
        </div>

        <label className={styles.bigField}>
          <span>{t('phone')} <small>{t('optional')}</small></span>
          <span className={styles.bigInput}>
            <input inputMode="tel" onChange={(event) => setPhone(event.target.value)} placeholder="98765 43210" value={phone} />
          </span>
        </label>
        <p className={styles.hint}>{t('laterHint')}</p>
      </div>
    </Sheet>
  );
}
