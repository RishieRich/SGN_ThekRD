'use client';

import {useEffect, useRef, useState} from 'react';
import type {Company} from '@/types';
import styles from './scene.module.css';

interface SiteSceneProps {
  companies: Company[];
  /** Companies whose Hajri is confirmed today: their factories light up and start working. */
  litIds: string[];
  label: string;
  variant?: 'wide' | 'compact';
}

const layout = [
  {x: 22, height: 56},
  {x: 138, height: 70},
  {x: 258, height: 50},
  {x: 392, height: 78},
  {x: 522, height: 60}
];

const ground = 140;

type FigureKind = 'leader' | 'worker' | 'carrierFront' | 'carrierBack' | 'tools';

function Figure({kind, x, delay}: {kind: FigureKind; x: number; delay: number}) {
  const carrying = kind === 'carrierFront' || kind === 'carrierBack';
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse className={styles.shadow} cx="0" cy="1" rx="7" ry="1.8" />
      <g className={styles.bob} style={{animationDelay: `${delay}s`}}>
        <g transform="translate(0 -11)">
          <line className={styles.legA} style={{animationDelay: `${delay}s`}} x1="0" x2="0" y1="0" y2="11" />
        </g>
        <g transform="translate(0 -11)">
          <line className={styles.legB} style={{animationDelay: `${delay}s`}} x1="0" x2="0" y1="0" y2="11" />
        </g>
        <rect className={kind === 'leader' ? styles.bodyLead : styles.body} height="13" rx="3.5" width="9" x="-4.5" y="-23" />
        {kind === 'leader' && <rect className={styles.vest} height="2" width="9" x="-4.5" y="-18.5" />}
        {carrying ? (
          <line className={styles.arm} x1="0" x2={kind === 'carrierFront' ? -2.5 : 2.5} y1="-21" y2="-26" />
        ) : kind === 'leader' ? (
          <line className={styles.arm} x1="0" x2="4" y1="-21" y2="-17" />
        ) : (
          <g transform="translate(0 -21)">
            <line className={styles.armSwing} style={{animationDelay: `${delay}s`}} x1="0" x2="0" y1="0" y2="9" />
          </g>
        )}
        {kind === 'tools' && (
          <g className={styles.toolbox}>
            <rect height="5" rx="1" width="7" x="2" y="-13" />
            <path d="M3.8,-13 v-1.6 h3.4 v1.6" />
          </g>
        )}
        <circle className={styles.head} cx="0" cy="-28" r="4" />
        <path className={kind === 'leader' ? styles.helmetLead : styles.helmet} d="M-4.8,-28.4 a4.8,4.8 0 0 1 9.6,0 z" />
        <rect className={kind === 'leader' ? styles.helmetLead : styles.helmet} height="1.4" rx="0.7" width="11.4" x="-5.7" y="-29" />
        {kind === 'leader' && (
          <g>
            <line className={styles.pole} x1="4" x2="4" y1="-17" y2="-48" />
            <path className={styles.flag} d="M4,-48 L19,-44 L4,-40 Z" />
          </g>
        )}
      </g>
    </g>
  );
}

/**
 * A quiet, looping picture of the work: the thekedar leads the team past the client factories.
 * Factories whose attendance is confirmed glow and smoke; the rest wait. Purely decorative, the
 * numbers live elsewhere on the page.
 */
export function SiteScene({companies, litIds, label, variant = 'wide'}: SiteSceneProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const viewBox = variant === 'compact' ? '0 26 372 158' : '0 0 640 184';

  return (
    <div className={styles.scene} data-paused={paused ? 'true' : undefined} data-variant={variant} ref={wrapper}>
      <svg aria-label={label} preserveAspectRatio="xMidYMax meet" role="img" viewBox={viewBox}>
        <title>{label}</title>
        <defs>
          <radialGradient id="scene-sun">
            <stop offset="0" stopColor="#ffb862" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffb862" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="scene-ground" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#e9e5ff" />
            <stop offset="1" stopColor="#f6f4ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <circle cx="560" cy="38" fill="url(#scene-sun)" r="70" />
        <g className={styles.cloudSlow}>
          <ellipse className={styles.cloud} cx="120" cy="34" rx="26" ry="7" />
          <ellipse className={styles.cloud} cx="138" cy="29" rx="14" ry="7" />
        </g>
        <g className={styles.cloudFast}>
          <ellipse className={styles.cloud} cx="420" cy="20" rx="20" ry="5.5" />
          <ellipse className={styles.cloud} cx="432" cy="16" rx="10" ry="5" />
        </g>

        {layout.map((spot, index) => {
          const company = companies[index];
          if (!company) return null;
          const lit = litIds.includes(company.id);
          const top = ground - spot.height;
          const rows = spot.height >= 64 ? [top + 30, top + 46] : [top + 30];
          return (
            <g className={styles.factory} data-color={company.colorIndex} data-lit={lit ? 'true' : undefined} key={company.id}>
              <rect className={styles.chimney} height="26" width="9" x={spot.x + 66} y={top - 12} />
              {lit && [0, 1.2, 2.4].map((delay) => (
                <circle className={styles.puff} cx={spot.x + 70.5} cy={top - 15} key={delay} r="4" style={{animationDelay: `${delay + index * 0.4}s`}} />
              ))}
              <path className={styles.roof} d={`M${spot.x},${top + 18} L${spot.x},${top + 6} L${spot.x + 21},${top + 18} L${spot.x + 21},${top + 6} L${spot.x + 42},${top + 18} L${spot.x + 42},${top + 6} L${spot.x + 63},${top + 18} L${spot.x + 63},${top + 6} L${spot.x + 84},${top + 18} Z`} />
              <rect className={styles.wall} height={spot.height - 18} rx="2" width="84" x={spot.x} y={top + 18} />
              <rect className={styles.stripe} height="3.5" width="84" x={spot.x} y={top + 18} />
              {rows.map((y) => [8, 26, 44, 62].map((offset, windowIndex) => (
                <rect className={styles.window} height="8" key={`${y}-${offset}`} rx="1.2" style={{animationDelay: `${(windowIndex + index) * 0.7}s`}} width="12" x={spot.x + offset} y={y} />
              )))}
              <rect className={styles.door} height="15" rx="1.5" width="15" x={spot.x + 34.5} y={ground - 15} />
            </g>
          );
        })}

        <g className={styles.crane}>
          <path className={styles.mast} d="M360,140 V34 M368,140 V34 M360,134 L368,124 L360,114 L368,104 L360,94 L368,84 L360,74 L368,64 L360,54 L368,44 L360,34" />
          <line className={styles.jib} x1="334" x2="440" y1="36" y2="36" />
          <rect className={styles.counterweight} height="7" rx="1" width="11" x="332" y="37" />
          <rect className={styles.cab} height="8" rx="1.5" width="10" x="359" y="38" />
          <g className={styles.trolley}>
            <rect className={styles.trolleyBox} height="3" width="8" x="424" y="35" />
            <rect className={styles.cable} height="30" width="1" x="427.5" y="38" />
            <g className={styles.load}>
              <rect className={styles.crate} height="9" rx="1" width="14" x="421" y="68" />
              <path className={styles.crateLines} d="M421,72.5 H435 M428,68 V77" />
            </g>
          </g>
        </g>

        <rect fill="url(#scene-ground)" height="44" width="700" x="-30" y={ground} />
        <line className={styles.horizon} x1="-30" x2="680" y1={ground} y2={ground} />
        <line className={styles.lane} x1="-30" x2="680" y1="177" y2="177" />

        <g transform="translate(0 170)">
          <g className={styles.team}>
            <Figure delay={0} kind="leader" x={0} />
            <Figure delay={0.18} kind="worker" x={-27} />
            <rect className={styles.beam} height="3.4" rx="1" width="50" x="-92" y="-27.5" />
            <Figure delay={0.35} kind="carrierFront" x={-52} />
            <Figure delay={0.05} kind="carrierBack" x={-84} />
            <Figure delay={0.25} kind="tools" x={-112} />
          </g>
        </g>
      </svg>
    </div>
  );
}
