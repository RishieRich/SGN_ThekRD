'use client';

import {ArrowUp, FileSpreadsheet, Keyboard, LoaderCircle, Mic, MicOff} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useTranslations} from 'next-intl';
import {useEffect, useRef, useState} from 'react';
import {ParticleOrb, type OrbState} from '@/components/ambient/ParticleOrb';
import {SuggestionList} from '@/components/suggestions/SuggestionList';
import {Sheet} from '@/components/ui/Sheet';
import {companies} from '@/data/sample-data';
import {greetingName} from '@/data/users';
import {parseCommand, type Command} from '@/domain/commands';
import {useDictation} from '@/lib/dictation';
import {useApp, type InputMode} from '@/providers/AppProvider';
import {ExcelImport} from './ExcelImport';
import {Proposal} from './Proposal';
import styles from './assistant.module.css';

const modeIcons = {type: Keyboard, speak: Mic, excel: FileSpreadsheet} as const;

/**
 * ARQ Sahayak: one place to tell the app what happened, by typing, speaking or dropping an Excel sheet.
 * Everything becomes a proposal card; nothing is saved until the person confirms.
 */
export function AssistantPanel() {
  const t = useTranslations('assistant');
  const common = useTranslations('common');
  const roles = useTranslations('login');
  const {assistant, closeAssistant, workers, user} = useApp();
  const [mode, setMode] = useState<InputMode>('type');
  const [command, setCommand] = useState<{text: string; result: Command; key: number} | null>(null);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [seenNonce, setSeenNonce] = useState(0);

  // A new open request (from the Home bar, Hajri, Workers or the phone button): adjust state while rendering.
  if (assistant.open && assistant.nonce !== seenNonce) {
    setSeenNonce(assistant.nonce);
    setMode(assistant.mode);
    const text = assistant.text.trim();
    setCommand(text ? {text, result: parseCommand(text, workers, companies), key: assistant.nonce} : null);
  }

  function run(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setThinking(true);
    setCommand({text: clean, result: parseCommand(clean, workers, companies), key: Date.now()});
    window.setTimeout(() => setThinking(false), 650);
  }

  const orbState: OrbState = listening ? 'listening' : thinking ? 'thinking' : 'idle';
  const firstName = greetingName(user, roles(user.role));

  return (
    <Sheet
      closeLabel={common('close')}
      leading={<ParticleOrb size={46} state={orbState} />}
      onClose={closeAssistant}
      open={assistant.open}
      subtitle={t('subtitle')}
      title={t('title')}
    >
      <div className={styles.panel}>
        {/* The big orb greets; once there is a proposal or a sheet, the header orb is enough and the card stays in view. */}
        {!command && mode !== 'excel' && (
          <div className={styles.orbHero}>
            <ParticleOrb size={132} state={orbState} />
            <p className={styles.greeting}>{t('greeting', {name: firstName})}</p>
          </div>
        )}

        <div aria-label={t('modesLabel')} className={styles.modeTabs} role="tablist">
          {(['type', 'speak', 'excel'] as const).map((item) => {
            const Icon = modeIcons[item];
            return (
              <button aria-selected={mode === item} key={item} onClick={() => setMode(item)} role="tab" type="button">
                <Icon size={16} /> {t(`mode.${item}`)}
              </button>
            );
          })}
          <span className={styles.modeThumb} data-mode={mode} />
        </div>

        <AnimatePresence initial={false} mode="wait">
          <motion.div animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -6}} initial={{opacity: 0, y: 8}} key={mode} transition={{duration: 0.2}}>
            {mode === 'type' && <TypeBox autoFocusKey={assistant.nonce} onSubmit={run} />}
            {mode === 'speak' && <SpeakBox autoStart={assistant.mode === 'speak'} onListening={setListening} onText={run} startKey={assistant.nonce} />}
            {mode === 'excel' && <ExcelImport initialKind={assistant.excelKind} onDone={closeAssistant} />}
          </motion.div>
        </AnimatePresence>

        {mode !== 'excel' && (
          <AnimatePresence mode="popLayout">
            {command ? (
              <motion.div animate={{opacity: 1, scale: 1}} exit={{opacity: 0, scale: 0.98}} initial={{opacity: 0, scale: 0.97}} key={command.key}>
                <Proposal command={command.result} heard={command.text} onDone={() => setCommand(null)} onTry={run} />
              </motion.div>
            ) : (
              <motion.div animate={{opacity: 1}} initial={{opacity: 0}} key="examples">
                <Examples onPick={run} />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {mode !== 'excel' && !command && (
          <section aria-label={t('needsAttention')} className={styles.attention}>
            <SuggestionList limit={3} />
          </section>
        )}
      </div>
    </Sheet>
  );
}

function TypeBox({onSubmit, autoFocusKey}: {onSubmit: (text: string) => void; autoFocusKey: number}) {
  const t = useTranslations('assistant');
  const [text, setText] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => input.current?.focus(), 250);
    return () => window.clearTimeout(timer);
  }, [autoFocusKey]);

  function submit() {
    if (!text.trim()) return;
    onSubmit(text);
    setText('');
  }

  return (
    <div className={styles.typeBox}>
      <textarea
        aria-label={t('typeLabel')}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder={t('typePlaceholder')}
        ref={input}
        rows={3}
        value={text}
      />
      <button aria-label={t('send')} className={styles.sendButton} disabled={!text.trim()} onClick={submit} type="button">
        <ArrowUp size={18} />
      </button>
    </div>
  );
}

function SpeakBox({onText, onListening, autoStart, startKey}: {onText: (text: string) => void; onListening: (value: boolean) => void; autoStart: boolean; startKey: number}) {
  const t = useTranslations('assistant');
  const {locale, ai} = useApp();
  const [live, setLive] = useState('');
  const dictation = useDictation(
    locale,
    (text) => {
      setLive('');
      onText(text);
    },
    {onInterim: setLive, server: ai.sarvam}
  );
  const {start, supported, listening, transcribing, failed, engine} = dictation;

  useEffect(() => {
    onListening(listening || transcribing);
    return () => onListening(false);
  }, [listening, onListening, transcribing]);

  useEffect(() => {
    if (autoStart && supported) start();
    // Start once per open request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey]);

  if (!supported) return <p className={styles.notice}>{t('voiceUnsupported')}</p>;

  return (
    <div className={styles.speakBox}>
      <button aria-pressed={listening} className={styles.bigMic} data-listening={listening ? 'true' : undefined} disabled={transcribing} onClick={dictation.toggle} type="button">
        <span className={styles.micRings} aria-hidden="true"><i /><i /><i /></span>
        {transcribing ? <LoaderCircle className={styles.spin} size={30} /> : listening ? <MicOff size={30} /> : <Mic size={30} />}
      </button>
      <strong className={styles.speakState}>{listening ? t('listening') : transcribing ? t('transcribing') : t('tapToSpeak')}</strong>
      <p className={styles.liveText} aria-live="polite">
        {live || (failed ? t('voiceFailed') : listening && engine === 'sarvam' ? t('speakAutoStop') : t('speakHint'))}
      </p>
      <small className={styles.privacy}>{engine === 'sarvam' ? t('voicePrivacySarvam') : t('voicePrivacy')}</small>
    </div>
  );
}

function Examples({onPick}: {onPick: (text: string) => void}) {
  const t = useTranslations('assistant');
  const examples = ['example1', 'example2', 'example3', 'example4'] as const;
  return (
    <div className={styles.examples}>
      <span>{t('examplesTitle')}</span>
      <div>
        {examples.map((key) => (
          <button key={key} onClick={() => onPick(t(key))} type="button">{t(key)}</button>
        ))}
      </div>
    </div>
  );
}
