import type {Locale} from '@/types';

const languageCodes: Record<Locale, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  gu: 'gu-IN'
};

/** Set once by the app: true when the Sarvam key is configured, so Listen uses natural Indian voices. */
let serverVoice = false;
export function configureVoice(options: {server: boolean}) {
  serverVoice = options.server;
}

let playing: HTMLAudioElement | null = null;
const clips = new Map<string, string>();
const maxCharacters = 1500;

function browserSpeak(text: string, locale: Locale) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = languageCodes[locale];
  const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang.toLowerCase().startsWith(locale));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  playing?.pause();
  playing = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

/**
 * Reads a sentence aloud: Sarvam's voice when connected (cached per sentence), the browser's voice otherwise
 * or if Sarvam fails. Tapping Listen again restarts from the beginning.
 */
export function speak(text: string, locale: Locale) {
  stopSpeaking();
  const clean = text.trim().slice(0, maxCharacters);
  if (!clean) return false;
  if (!serverVoice) return browserSpeak(clean, locale);

  void (async () => {
    try {
      const key = `${locale}|${clean}`;
      let url = clips.get(key);
      if (!url) {
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({text: clean, locale})
        });
        if (!response.ok) throw new Error(`tts ${response.status}`);
        url = URL.createObjectURL(await response.blob());
        clips.set(key, url);
      }
      const audio = new Audio(url);
      playing = audio;
      await audio.play();
    } catch {
      browserSpeak(clean, locale);
    }
  })();
  return true;
}
