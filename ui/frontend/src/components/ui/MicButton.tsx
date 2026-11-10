'use client';

import {LoaderCircle, Mic, MicOff} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useDictation} from '@/lib/dictation';
import {useApp} from '@/providers/AppProvider';
import styles from './controls.module.css';

/** Speak instead of typing. Renders nothing if the browser cannot listen. */
export function MicButton({onText, compact = false}: {onText: (text: string) => void; compact?: boolean}) {
  const {locale, ai} = useApp();
  const common = useTranslations('common');
  const dictation = useDictation(locale, onText, {server: ai.sarvam});
  if (!dictation.supported) return null;
  return (
    <button
      aria-label={dictation.listening ? common('stopListening') : common('speak')}
      aria-pressed={dictation.listening}
      className={compact ? styles.micCompact : styles.mic}
      data-listening={dictation.listening ? 'true' : undefined}
      disabled={dictation.transcribing}
      onClick={dictation.toggle}
      type="button"
    >
      {dictation.transcribing ? <LoaderCircle className={styles.spin} size={17} /> : dictation.listening ? <MicOff size={17} /> : <Mic size={17} />}
    </button>
  );
}
