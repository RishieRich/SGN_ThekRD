'use client';

import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {Locale} from '@/types';
import {intlLocale} from './format';

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{transcript: string}>>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as {SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor});
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

const subscribeToBrowserSupport = () => () => {};
const getBrowserSupport = () => recognitionConstructor() !== null;
const getServerSupport = () => false;

/**
 * Browser dictation (no AI key needed). Hidden when the browser has no speech recognition.
 * The final transcript is passed to `onText`.
 */
export function useDictation(locale: Locale, onText: (text: string) => void) {
  const supported = useSyncExternalStore(subscribeToBrowserSupport, getBrowserSupport, getServerSupport);
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const callback = useRef(onText);

  useEffect(() => {
    callback.current = onText;
  }, [onText]);

  useEffect(() => {
    return () => {
      recognition.current?.stop();
    };
  }, []);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    recognition.current?.stop();
    const instance = new Constructor();
    instance.lang = intlLocale[locale];
    instance.interimResults = false;
    instance.continuous = false;
    instance.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (text) callback.current(text);
    };
    instance.onend = () => setListening(false);
    instance.onerror = () => setListening(false);
    recognition.current = instance;
    setListening(true);
    instance.start();
  }, [locale]);

  return {supported, listening, start, stop, toggle: listening ? stop : start};
}
