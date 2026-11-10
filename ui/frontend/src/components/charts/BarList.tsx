'use client';

import styles from './charts.module.css';

export interface BarRow {
  id: string;
  label: string;
  value: number;
  colorIndex: number;
  /** Value text printed at the end of the row. */
  display: string;
  /** Secondary text shown under the label. */
  detail?: string;
  /** Tooltip / accessible description. */
  description?: string;
}

/** Horizontal bars, one per company, in the company's fixed colour. */
export function BarList({rows, ariaLabel, onSelect}: {rows: BarRow[]; ariaLabel: string; onSelect?: (id: string) => void}) {
  const maximum = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul aria-label={ariaLabel} className={styles.barList}>
      {rows.map((row, index) => {
        const width = Math.max(row.value > 0 ? 2 : 0, (row.value / maximum) * 100);
        const content = (
          <>
            <span className={styles.barLabel}>
              <i className={styles.swatch} data-color={row.colorIndex} />
              <strong>{row.label}</strong>
              <span className={styles.barValue}>{row.display}</span>
            </span>
            <span className={styles.barTrack}>
              <span className={styles.barFill} data-color={row.colorIndex} style={{width: `${width}%`, animationDelay: `${index * 60}ms`}} />
            </span>
            {row.detail && <small className={styles.barDetail}>{row.detail}</small>}
          </>
        );
        return (
          <li key={row.id} title={row.description}>
            {onSelect ? (
              <button aria-label={row.description ?? `${row.label}: ${row.display}`} className={styles.barRow} onClick={() => onSelect(row.id)} type="button">{content}</button>
            ) : (
              <div className={styles.barRow}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
