import styles from './charts.module.css';

export interface Segment {
  id: string;
  label: string;
  value: number;
  colorIndex: number;
}

/** One whole split into parts (e.g. workers per company), with a legend naming each part. */
export function SegmentBar({segments, ariaLabel, onSelect, activeId}: {segments: Segment[]; ariaLabel: string; onSelect?: (id: string) => void; activeId?: string | null}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  return (
    <div className={styles.segmentWrap}>
      <div aria-label={ariaLabel} className={styles.segmentBar} role="img">
        {segments.filter((segment) => segment.value > 0).map((segment) => (
          <span
            className={styles.segment}
            data-color={segment.colorIndex}
            data-dim={activeId && activeId !== segment.id ? 'true' : undefined}
            key={segment.id}
            style={{flexGrow: segment.value}}
            title={`${segment.label}: ${segment.value} (${Math.round((segment.value * 100) / total)}%)`}
          />
        ))}
      </div>
      <div className={styles.segmentLegend}>
        {segments.map((segment) => {
          const content = (
            <>
              <i className={styles.swatch} data-color={segment.colorIndex} />
              <span>{segment.label}</span>
              <strong>{segment.value}</strong>
            </>
          );
          return onSelect ? (
            <button aria-pressed={activeId === segment.id} key={segment.id} onClick={() => onSelect(segment.id)} type="button">{content}</button>
          ) : (
            <span key={segment.id}>{content}</span>
          );
        })}
      </div>
    </div>
  );
}
