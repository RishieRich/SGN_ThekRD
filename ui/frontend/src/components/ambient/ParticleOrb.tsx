'use client';

import {useReducedMotion} from 'motion/react';
import {useEffect, useRef} from 'react';
import styles from './ambient.module.css';

export type OrbState = 'idle' | 'listening' | 'thinking';

interface Particle {
  x: number;
  y: number;
  z: number;
  warm: boolean;
  phase: number;
}

function sphere(count: number): Particle[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({length: count}, (_, index) => {
    const y = 1 - (index / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * index;
    return {x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius, warm: index % 13 === 0, phase: (index * 0.37) % (Math.PI * 2)};
  });
}

/**
 * The assistant's presence: a rotating sphere of dots (after the ARQ site's particle orb), in violet with
 * a few orange sparks. It breathes when idle, ripples while listening and swirls while working things out.
 */
export function ParticleOrb({size = 120, state = 'idle', className}: {size?: number; state?: OrbState; className?: string}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    element.width = size * dpr;
    element.height = size * dpr;
    const particles = sphere(size >= 90 ? 460 : 200);
    const center = (size * dpr) / 2;
    const base = center * 0.72;
    let angle = 0;
    let energy = 0;
    let frame = 0;
    let running = true;
    let visible = true;

    const draw = (time: number) => {
      const mode = stateRef.current;
      const target = mode === 'listening' ? 1 : mode === 'thinking' ? 0.6 : 0;
      energy += (target - energy) * 0.06;
      angle += 0.004 + energy * 0.018;
      const t = time / 1000;
      context.clearRect(0, 0, element.width, element.height);
      const breathe = 1 + Math.sin(t * 1.4) * 0.025;
      const tilt = 0.38;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      for (const particle of particles) {
        const ripple = 1 + energy * 0.09 * Math.sin(t * 7 + particle.y * 5 + particle.phase);
        const radius = base * breathe * ripple;
        let x = particle.x * cosA - particle.z * sinA;
        let z = particle.x * sinA + particle.z * cosA;
        let y = particle.y;
        // Thinking: pull the sphere into a flattened swirl, like the site's galaxy morph.
        if (mode === 'thinking') {
          y *= 1 - energy * 0.55;
          x *= 1 + energy * 0.12;
        }
        const yTilt = y * cosT - z * sinT;
        z = y * sinT + z * cosT;
        y = yTilt;
        const depth = (z + 1) / 2;
        const perspective = 1 / (1.9 - z * 0.45);
        const px = center + x * radius * perspective * 1.6;
        const py = center + y * radius * perspective * 1.6;
        const alpha = 0.18 + depth * 0.78;
        const dot = (0.55 + depth * 1.35) * dpr * Math.max(0.7, size / 140);
        context.fillStyle = particle.warm ? `rgba(238, 139, 24, ${alpha})` : `rgba(${88 + depth * 40}, ${74 + depth * 30}, ${226 + depth * 20}, ${alpha})`;
        context.beginPath();
        context.arc(px, py, dot, 0, Math.PI * 2);
        context.fill();
      }
      if (running && visible && !reduceMotion) frame = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      const nowVisible = entry.isIntersecting;
      if (nowVisible && !visible && running && !reduceMotion) frame = requestAnimationFrame(draw);
      visible = nowVisible;
    });
    observer.observe(element);
    frame = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduceMotion, size]);

  return (
    <span className={`${styles.orb} ${className ?? ''}`} data-state={state} style={{width: size, height: size}}>
      <canvas aria-hidden="true" ref={canvas} style={{width: size, height: size}} />
    </span>
  );
}
