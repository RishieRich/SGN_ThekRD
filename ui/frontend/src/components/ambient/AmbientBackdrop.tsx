import styles from './ambient.module.css';

const sparkles = [
  {top: '9%', left: '62%', delay: '0s', size: 9},
  {top: '22%', left: '88%', delay: '2.4s', size: 7},
  {top: '64%', left: '94%', delay: '4.1s', size: 8},
  {top: '78%', left: '40%', delay: '1.3s', size: 6},
  {top: '38%', left: '30%', delay: '5.2s', size: 6},
  {top: '14%', left: '18%', delay: '3.3s', size: 7}
];

/** Slow drifting lavender light behind every page, after the ARQ site's nebula, kept quiet for daily work. */
export function AmbientBackdrop() {
  return (
    <div aria-hidden="true" className={styles.backdrop}>
      <span className={styles.blobViolet} />
      <span className={styles.blobPink} />
      <span className={styles.blobWarm} />
      <span className={styles.dots} />
      {sparkles.map((sparkle) => (
        <svg className={styles.sparkle} height={sparkle.size} key={`${sparkle.top}${sparkle.left}`} style={{top: sparkle.top, left: sparkle.left, animationDelay: sparkle.delay}} viewBox="0 0 10 10" width={sparkle.size}>
          <path d="M5 0 C5.6 3.6 6.4 4.4 10 5 C6.4 5.6 5.6 6.4 5 10 C4.4 6.4 3.6 5.6 0 5 C3.6 4.4 4.4 3.6 5 0 Z" />
        </svg>
      ))}
    </div>
  );
}
