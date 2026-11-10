'use client';

import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {Locale} from '@/types';
import {intlLocale} from './format';

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{transcript: string}> & {isFinal?: boolean}>;
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

function canRecord() {
  return typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

const subscribeToBrowserSupport = () => () => {};
const getBrowserSupport = () => (recognitionConstructor() !== null ? 'browser' : '') + (canRecord() ? '+record' : '');
const getServerSupport = () => '';

/** Stop after this much quiet once someone has spoken, or if nobody speaks at all, or at the hard limit. */
const quietMs = 1600;
const nobodyMs = 8000;
const limitMs = 30_000;

/**
 * Dictation. With Sarvam connected (`server: true`) the mic records and Sarvam writes it down in the
 * person's language; otherwise the browser's own speech recognition is used. The final text goes to `onText`.
 */
export function useDictation(
  locale: Locale,
  onText: (text: string) => void,
  options: {onInterim?: (text: string) => void; server?: boolean} = {}
) {
  const support = useSyncExternalStore(subscribeToBrowserSupport, getBrowserSupport, getServerSupport);
  const useServer = Boolean(options.server) && support.includes('record');
  const supported = useServer || support.startsWith('browser');
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [failed, setFailed] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const callback = useRef(onText);
  const interim = useRef(options.onInterim);

  useEffect(() => {
    callback.current = onText;
    interim.current = options.onInterim;
  }, [onText, options.onInterim]);

  useEffect(() => {
    return () => {
      recognition.current?.stop();
      if (recorder.current?.state === 'recording') recorder.current.stop();
    };
  }, []);

  const stop = useCallback(() => {
    recognition.current?.stop();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    setListening(false);
  }, []);

  const startServer = useCallback(async () => {
    setFailed(false);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({audio: {channelCount: 1, echoCancellation: true, noiseSuppression: true}});
    } catch {
      setFailed(true);
      return;
    }
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((type) => MediaRecorder.isTypeSupported(type));
    const instance = new MediaRecorder(stream, mimeType ? {mimeType} : undefined);
    const chunks: Blob[] = [];
    instance.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };

    // Simple voice-activity check so it stops by itself after the person finishes speaking.
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const startedAt = performance.now();
    let heard = false;
    let lastSound = startedAt;
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const value of samples) peak = Math.max(peak, Math.abs(value - 128));
      const now = performance.now();
      if (peak > 10) {
        heard = true;
        lastSound = now;
      }
      const done = (heard && now - lastSound > quietMs) || (!heard && now - startedAt > nobodyMs) || now - startedAt > limitMs;
      if (done && instance.state === 'recording') instance.stop();
    }, 120);

    instance.onstop = async () => {
      window.clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
      setListening(false);
      if (!heard || !chunks.length) return;
      setTranscribing(true);
      try {
        const form = new FormData();
        form.append('audio', new Blob(chunks, {type: instance.mimeType || 'audio/webm'}));
        form.append('locale', locale);
        const response = await fetch('/api/voice/stt', {method: 'POST', body: form});
        if (!response.ok) throw new Error(`stt ${response.status}`);
        const {text} = (await response.json()) as {text?: string};
        if (text?.trim()) callback.current(text.trim());
        else setFailed(true);
      } catch {
        setFailed(true);
      } finally {
        setTranscribing(false);
      }
    };

    recorder.current = instance;
    instance.start(250);
    setListening(true);
  }, [locale]);

  const startBrowser = useCallback(() => {
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    setFailed(false);
    recognition.current?.stop();
    const instance = new Constructor();
    instance.lang = intlLocale[locale];
    instance.interimResults = Boolean(interim.current);
    instance.continuous = false;
    instance.onresult = (event) => {
      const results = Array.from(event.results);
      const text = results
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (!text) return;
      // Live captions while speaking; the final sentence goes to onText.
      if (results.every((result) => result.isFinal !== false)) callback.current(text);
      else interim.current?.(text);
    };
    instance.onend = () => setListening(false);
    instance.onerror = () => setListening(false);
    recognition.current = instance;
    setListening(true);
    instance.start();
  }, [locale]);

  const start = useCallback(() => {
    if (useServer) void startServer();
    else startBrowser();
  }, [startBrowser, startServer, useServer]);

  return {supported, listening, transcribing, failed, engine: useServer ? ('sarvam' as const) : ('browser' as const), start, stop, toggle: listening ? stop : start};
}
