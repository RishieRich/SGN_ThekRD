'use client';

import {useReducedMotion} from 'motion/react';
import {useEffect} from 'react';
import styles from './petals.module.css';

const colours = ['var(--brass-500)', 'var(--royal-600)', 'var(--saffron-400)', 'var(--brass-300)'];

/** Marigold petals for a confirmed day. Skipped entirely with reduced motion. */
export function Petals({active}: {active: boolean}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (active && !reduceMotion && 'vibrate' in navigator) navigator.vibrate?.(30);
  }, [active, reduceMotion]);

  if (!active || reduceMotion) return null;
  return (
    <div aria-hidden="true" className={styles.petals}>
      {Array.from({length: 28}, (_, index) => (
        <span
          key={index}
          style={{
            background: colours[index % colours.length],
            left: `${(index * 37) % 100}%`,
            animationDelay: `${(index % 7) * 70}ms`,
            animationDuration: `${1100 + (index % 5) * 120}ms`,
            transform: `rotate(${index * 29}deg)`
          }}
        />
      ))}
    </div>
  );
}
