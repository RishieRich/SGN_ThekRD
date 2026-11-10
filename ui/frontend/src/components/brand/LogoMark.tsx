import styles from './brand.module.css';

export function LogoMark({compact = false}: {compact?: boolean}) {
  return (
    <span className={styles.logoWrap} aria-hidden="true">
      <span className={styles.logoMark}>
        <span className={styles.logoA}>A</span>
      </span>
      {!compact && (
        <span className={styles.logoWords}>
          <span className={styles.logoName}>ARQ</span>
          <span className={styles.logoProduct}>Thekedar</span>
        </span>
      )}
    </span>
  );
}
