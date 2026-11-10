import styles from './charts.module.css';

/** Tiny trend line; values are ratios 0..1 so every company shares one scale. */
export function Sparkline({values, colorIndex = 1, width = 120, height = 34, label}: {values: number[]; colorIndex?: number; width?: number; height?: number; label: string}) {
  if (values.length < 2) return null;
  const minimum = Math.min(...values, 0.7);
  const range = Math.max(0.0001, 1 - minimum);
  const x = (index: number) => 3 + (index * (width - 6)) / (values.length - 1);
  const y = (value: number) => 3 + (height - 6) * (1 - (value - minimum) / range);
  const path = values.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  return (
    <svg aria-label={label} className={styles.sparkline} height={height} role="img" viewBox={`0 0 ${width} ${height}`} width={width}>
      <line className={styles.sparkBase} x1={3} x2={width - 3} y1={y(1)} y2={y(1)} />
      <path className={styles.sparkLine} d={path} data-color={colorIndex} />
      <circle className={styles.sparkDot} cx={x(values.length - 1)} cy={y(values.at(-1) ?? 1)} data-color={colorIndex} r={3.5} />
    </svg>
  );
}
