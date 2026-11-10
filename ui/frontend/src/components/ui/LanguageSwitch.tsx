'use client';

import {Check, ChevronDown, Languages} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import type {Locale} from '@/types';
import styles from './ui.module.css';

const choices: Array<{locale: Locale; short: string; full: string}> = [
  {locale: 'en', short: 'EN', full: 'English'},
  {locale: 'hi', short: 'हिं', full: 'हिन्दी'},
  {locale: 'mr', short: 'मरा', full: 'मराठी'},
  {locale: 'gu', short: 'ગુજ', full: 'ગુજરાતી'}
];

/** Four languages side by side on wider screens; one compact button with a small menu on phones. */
export function LanguageSwitch({locale, onChange, label}: {locale: Locale; onChange: (locale: Locale) => void; label: string}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const active = choices.find((choice) => choice.locale === locale) ?? choices[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div className={styles.languageWrap} ref={wrap}>
      <div className={styles.languageSwitch} aria-label={label} role="group">
        <Languages size={16} strokeWidth={1.8} aria-hidden="true" />
        {choices.map((choice) => (
          <button
            aria-label={choice.full}
            aria-pressed={locale === choice.locale}
            className={locale === choice.locale ? styles.languageActive : styles.languageButton}
            key={choice.locale}
            onClick={() => onChange(choice.locale)}
            type="button"
          >
            {choice.short}
          </button>
        ))}
      </div>

      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${label}: ${active.full}`}
        className={styles.languageCompact}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Languages size={15} strokeWidth={1.9} aria-hidden="true" />
        <span>{active.short}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div aria-label={label} className={styles.languageMenu} role="menu">
          {choices.map((choice) => (
            <button
              aria-checked={locale === choice.locale}
              key={choice.locale}
              onClick={() => {
                onChange(choice.locale);
                setOpen(false);
              }}
              role="menuitemradio"
              type="button"
            >
              <span>{choice.full}</span>
              {locale === choice.locale && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
