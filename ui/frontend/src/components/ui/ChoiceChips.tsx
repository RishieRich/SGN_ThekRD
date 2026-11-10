'use client';

import {Check} from 'lucide-react';
import styles from './controls.module.css';

export interface Choice<T extends string> {
  value: T;
  label: string;
  colorIndex?: number;
  icon?: React.ReactNode;
}

/** One-tap choice instead of a dropdown. */
export function ChoiceChips<T extends string>({
  choices,
  value,
  onChange,
  label,
  disabled = false,
  size = 'md'
}: {
  choices: Array<Choice<T>>;
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div aria-label={label} className={styles.choiceChips} data-size={size} role="radiogroup">
      {choices.map((choice) => {
        const selected = choice.value === value;
        return (
          <button
            aria-checked={selected}
            className={styles.choice}
            data-color={choice.colorIndex}
            disabled={disabled}
            key={choice.value}
            onClick={() => onChange(choice.value)}
            role="radio"
            type="button"
          >
            {choice.colorIndex ? <i className={styles.choiceDot} data-color={choice.colorIndex} /> : choice.icon}
            <span>{choice.label}</span>
            {selected && <Check className={styles.choiceCheck} size={14} />}
          </button>
        );
      })}
    </div>
  );
}
