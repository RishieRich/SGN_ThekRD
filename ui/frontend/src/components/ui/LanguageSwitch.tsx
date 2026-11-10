'use client';

import {Languages} from 'lucide-react';
import type {Locale} from '@/types';
import styles from './ui.module.css';

const choices: Array<{locale: Locale; short: string; full: string}> = [
  {locale: 'en', short: 'EN', full: 'English'},
  {locale: 'hi', short: 'हिं', full: 'हिन्दी'},
  {locale: 'mr', short: 'मरा', full: 'मराठी'},
  {locale: 'gu', short: 'ગુજ', full: 'ગુજરાતી'}
];

export function LanguageSwitch({locale, onChange, label}: {locale: Locale; onChange: (locale: Locale) => void; label: string}) {
  return (
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
  );
}
