'use client';

import {useReducedMotion} from 'motion/react';
import {useId} from 'react';
import styles from './brand.module.css';

interface LogoMarkProps {
  /** Mark only, no product name. */
  compact?: boolean;
  /** Draw the letters and orbit in on first paint (login). */
  intro?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * The ARQ ONE AI Labs mark, redrawn as SVG for light surfaces: ink letters, the orange triangle in the A,
 * the ringed dot in the Q, and an orbit that passes behind the letters with a travelling glint.
 */
export function LogoMark({compact = false, intro = false, size = 'md'}: LogoMarkProps) {
  const reduceMotion = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const animate = !reduceMotion;
  const orbitPath = 'M130,34 A64,15 0 1,1 2,34 A64,15 0 1,1 130,34';

  return (
    <span aria-label="ARQ Thekedar" className={styles.logoWrap} data-size={size} role="img">
      <svg className={styles.mark} data-intro={intro && animate ? 'true' : undefined} viewBox="-4 4 140 58">
        <defs>
          <linearGradient id={`${id}-orbit`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#ee8b18" stopOpacity="0.35" />
            <stop offset="0.55" stopColor="#ee8b18" />
            <stop offset="1" stopColor="#ffb054" />
          </linearGradient>
          <radialGradient id={`${id}-glint`}>
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.35" stopColor="#ffd08a" />
            <stop offset="1" stopColor="#ee8b18" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-ember`} cx="0.5" cy="0.9" r="0.7">
            <stop offset="0" stopColor="#ffb054" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ee8b18" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className={styles.letters}>
          <path className={styles.stroke} d="M6,50 L24,15 L42,50" pathLength={100} />
          <path className={styles.stroke} d="M54,14 V50 M54,18 H67 a9,9 0 0 1 0,18 H58 M64,36 L78,50" pathLength={100} />
          <circle className={styles.stroke} cx="102" cy="32" pathLength={100} r="14" />
          <path className={styles.stroke} d="M107,38 L122,52" pathLength={100} />
        </g>

        <ellipse className={styles.ember} cx="24" cy="46" fill={`url(#${id}-ember)`} rx="11" ry="7" />
        <path className={styles.triangle} d="M18,50 L24,39 L30,50 Z" />
        <circle className={styles.qRing} cx="102" cy="32" r="6.6" />
        <circle className={styles.qDot} cx="102" cy="32" r="3.3" />

        <path
          className={styles.orbit}
          d={orbitPath}
          pathLength={100}
          stroke={`url(#${id}-orbit)`}
          transform="rotate(-11 66 34)"
        />
        {animate && (
          <g transform="rotate(-11 66 34)">
            <circle fill={`url(#${id}-glint)`} r="5.5">
              <animateMotion dur="7s" path={orbitPath} repeatCount="indefinite" />
              <animate
                attributeName="opacity"
                dur="7s"
                keyTimes="0;0.07;0.09;0.27;0.29;0.54;0.56;0.7;0.72;1"
                repeatCount="indefinite"
                values="1;1;0;0;1;1;0;0;1;1"
              />
            </circle>
          </g>
        )}
      </svg>
      {!compact && (
        <span className={styles.logoWords}>
          <span className={styles.logoProduct}>Thekedar</span>
          <span className={styles.logoMaker}>One AI Labs</span>
        </span>
      )}
    </span>
  );
}
