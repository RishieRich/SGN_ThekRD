import styles from './charts.module.css';

interface RingProps {
  /** 0 to 1. */
  value: number;
  size?: number;
  stroke?: number;
  tone?: 'brass' | 'royal' | 'success' | 'warning' | 'danger' | 'light';
  colorIndex?: number;
  label?: string;
  children?: React.ReactNode;
}

export function Ring({value, size = 96, stroke = 9, tone = 'brass', colorIndex, label, children}: RingProps) {
  const bounded = Math.max(0, Math.min(1, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <span aria-label={label} className={styles.ring} role={label ? 'img' : undefined} style={{height: size, width: size}}>
      <svg aria-hidden="true" height={size} width={size}>
        <circle className={styles.ringTrack} cx={size / 2} cy={size / 2} data-tone={tone} r={radius} strokeWidth={stroke} />
        <circle
          className={styles.ringFill}
          cx={size / 2}
          cy={size / 2}
          data-color={colorIndex}
          data-tone={colorIndex ? undefined : tone}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - bounded)}
          strokeWidth={stroke}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <span className={styles.ringCenter}>{children}</span>}
    </span>
  );
}
