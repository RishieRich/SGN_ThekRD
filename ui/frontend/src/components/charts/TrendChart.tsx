'use client';

import {useId, useState} from 'react';
import styles from './charts.module.css';
import {niceMax, useWidth} from './useWidth';

export interface TrendPoint {
  key: string;
  /** Short axis label, e.g. "3 Nov". */
  label: string;
  /** Full label for the tooltip, e.g. "Mon, 3 Nov". */
  longLabel: string;
  value: number;
  reference?: number;
  /** Drawn hollow: not yet confirmed. */
  draft?: boolean;
}

interface TrendChartProps {
  points: TrendPoint[];
  ariaLabel: string;
  seriesLabel: string;
  referenceLabel?: string;
  draftLabel?: string;
  formatValue: (value: number) => string;
  tooltipExtra?: (point: TrendPoint) => string | null;
  height?: number;
}

const padding = {top: 14, right: 14, bottom: 26, left: 34};

export function TrendChart({points, ariaLabel, seriesLabel, referenceLabel, draftLabel, formatValue, tooltipExtra, height = 210}: TrendChartProps) {
  const {ref, width} = useWidth<HTMLDivElement>(600);
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();
  if (points.length === 0) return null;

  const innerWidth = Math.max(10, width - padding.left - padding.right);
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = niceMax(Math.max(...points.map((point) => Math.max(point.value, point.reference ?? 0))));
  const x = (index: number) => padding.left + (points.length === 1 ? innerWidth / 2 : (index * innerWidth) / (points.length - 1));
  const y = (value: number) => padding.top + innerHeight - (value / maxValue) * innerHeight;
  const ticks = [0, maxValue / 2, maxValue];

  const confirmed = points.map((point, index) => ({point, index})).filter((item) => !item.point.draft);
  const linePath = confirmed.map(({point, index}, order) => `${order === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
  const areaPath = confirmed.length
    ? `${linePath} L${x(confirmed.at(-1)!.index).toFixed(1)},${y(0)} L${x(confirmed[0].index).toFixed(1)},${y(0)} Z`
    : '';
  const referencePath = points.every((point) => point.reference !== undefined)
    ? points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(point.reference ?? 0).toFixed(1)}`).join(' ')
    : '';
  const draftIndex = points.findIndex((point) => point.draft);
  const lastConfirmed = confirmed.at(-1);
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerWidth / 64))));

  function onPointer(event: React.PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const relative = event.clientX - box.left;
    const index = Math.round((relative / box.width) * (points.length - 1));
    setActive(Math.max(0, Math.min(points.length - 1, index)));
  }

  const activePoint = active === null ? null : points[active];
  const tooltipLeft = active === null ? 0 : Math.min(Math.max(x(active), 80), width - 80);

  return (
    <div className={styles.trend} ref={ref}>
      <div className={styles.legend} aria-hidden="true">
        <span><i className={styles.keyLine} /> {seriesLabel}</span>
        {referencePath && referenceLabel && <span><i className={styles.keyReference} /> {referenceLabel}</span>}
        {draftIndex >= 0 && draftLabel && <span><i className={styles.keyDraft} /> {draftLabel}</span>}
      </div>
      <svg aria-label={ariaLabel} className={styles.trendSvg} height={height} role="img" width={width}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--royal-700)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--royal-700)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className={styles.grid} x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} />
            <text className={styles.axisText} textAnchor="end" x={padding.left - 8} y={y(tick) + 4}>{formatValue(tick)}</text>
          </g>
        ))}
        {points.map((point, index) =>
          index % labelEvery === 0 || index === points.length - 1 ? (
            <text className={styles.axisText} key={point.key} textAnchor={index === points.length - 1 ? 'end' : 'middle'} x={x(index)} y={height - 6}>
              {point.label}
            </text>
          ) : null
        )}
        {referencePath && <path className={styles.reference} d={referencePath} />}
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {linePath && <path className={styles.line} d={linePath} />}
        {lastConfirmed && (
          <circle className={styles.endDot} cx={x(lastConfirmed.index)} cy={y(lastConfirmed.point.value)} r={4.5} />
        )}
        {draftIndex >= 0 && (
          <circle className={styles.draftDot} cx={x(draftIndex)} cy={y(points[draftIndex].value)} r={5} />
        )}
        {active !== null && activePoint && (
          <g pointerEvents="none">
            <line className={styles.crosshair} x1={x(active)} x2={x(active)} y1={padding.top} y2={padding.top + innerHeight} />
            <circle className={activePoint.draft ? styles.draftDot : styles.endDot} cx={x(active)} cy={y(activePoint.value)} r={5.5} />
          </g>
        )}
        <rect
          fill="transparent"
          height={innerHeight + padding.top}
          onPointerLeave={() => setActive(null)}
          onPointerMove={onPointer}
          width={innerWidth + 20}
          x={padding.left - 10}
          y={0}
        />
      </svg>
      {activePoint && (
        <div className={styles.tooltip} style={{left: tooltipLeft}}>
          <small>{activePoint.longLabel}{activePoint.draft && draftLabel ? ` · ${draftLabel}` : ''}</small>
          <strong>{formatValue(activePoint.value)} <span>{seriesLabel}</span></strong>
          {tooltipExtra?.(activePoint) && <span>{tooltipExtra(activePoint)}</span>}
        </div>
      )}
      <table className={styles.srOnly}>
        <caption>{ariaLabel}</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}><th scope="row">{point.longLabel}</th><td>{formatValue(point.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
