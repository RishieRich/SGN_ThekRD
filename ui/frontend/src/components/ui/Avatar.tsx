import {initials} from '@/domain/workers';
import styles from './controls.module.css';

export function Avatar({name, colorIndex, size = 'md'}: {name: string; colorIndex?: number | null; size?: 'sm' | 'md' | 'lg'}) {
  return (
    <span aria-hidden="true" className={styles.avatar} data-color={colorIndex ?? undefined} data-size={size}>
      {initials(name)}
    </span>
  );
}
