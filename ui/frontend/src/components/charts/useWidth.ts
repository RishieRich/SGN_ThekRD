'use client';

import {useEffect, useRef, useState} from 'react';

/** Measures an element's width so SVG charts draw in real pixels (crisp text, no stretching). */
export function useWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.getBoundingClientRect().width || fallback);
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fallback]);

  return {ref, width};
}

export function niceMax(value: number) {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const normalised = value / magnitude;
  const step = steps.find((candidate) => candidate >= normalised) ?? 10;
  return step * magnitude;
}
