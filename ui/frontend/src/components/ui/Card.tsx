import type {HTMLAttributes} from 'react';
import styles from './ui.module.css';

export function Card({className = '', ...props}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.card} ${className}`} {...props} />;
}

export function Pill({tone = 'neutral', children}: {tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'royal'; children: React.ReactNode}) {
  return <span className={`${styles.pill} ${styles[`pill_${tone}`]}`}>{children}</span>;
}

export function ProgressBar({value, colorIndex = 1}: {value: number; colorIndex?: number}) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return (
    <span className={styles.progressTrack} aria-hidden="true">
      <span className={styles.progressFill} data-color={colorIndex} style={{width: `${boundedValue}%`}} />
    </span>
  );
}
