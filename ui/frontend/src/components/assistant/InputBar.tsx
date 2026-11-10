'use client';

import {ArrowUp, FileSpreadsheet, Mic, Sparkles} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useState} from 'react';
import type {ImportKind} from '@/domain/imports';
import {useApp} from '@/providers/AppProvider';
import styles from './assistant.module.css';

/** The three ways in, always side by side: type a line, speak it, or drop an Excel sheet. */
export function InputBar({placeholder, excelKind, tone = 'light'}: {placeholder?: string; excelKind?: ImportKind; tone?: 'light' | 'glass'}) {
  const t = useTranslations('assistant');
  const {openAssistant} = useApp();
  const [text, setText] = useState('');

  return (
    <form
      className={styles.bar}
      data-tone={tone}
      onSubmit={(event) => {
        event.preventDefault();
        openAssistant('type', {text});
        setText('');
      }}
    >
      <Sparkles aria-hidden="true" className={styles.barSpark} size={18} />
      <input aria-label={t('typeLabel')} onChange={(event) => setText(event.target.value)} placeholder={placeholder ?? t('barPlaceholder')} value={text} />
      <button className={styles.barMode} onClick={() => openAssistant('speak')} title={t('mode.speak')} type="button">
        <Mic size={17} /><span>{t('mode.speak')}</span>
      </button>
      <button className={styles.barMode} onClick={() => openAssistant('excel', {excelKind})} title={t('mode.excel')} type="button">
        <FileSpreadsheet size={17} /><span>{t('mode.excel')}</span>
      </button>
      <button aria-label={t('send')} className={styles.barSend} type="submit">
        <ArrowUp size={18} />
      </button>
    </form>
  );
}
