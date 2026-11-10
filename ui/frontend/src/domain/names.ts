/**
 * Name matching across scripts. Browser dictation in Hindi, Marathi or Gujarati returns names in
 * Devanagari or Gujarati script, while worker names are stored in Latin letters. These helpers turn
 * both into the same rough Latin "sound" so "मनोज कुमार" finds "Manoj Kumar".
 */

const vowels: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऍ': 'e', 'ऑ': 'o'
};

const consonants: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'ळ': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h', 'क़': 'k', 'ख़': 'kh', 'ग़': 'g', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f', 'य़': 'y'
};

const signs: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'ॅ': 'e', 'े': 'e', 'ै': 'ai', 'ॉ': 'o', 'ो': 'o', 'ौ': 'au'
};

const virama = '्';
const nukta = '़';
const nasal = new Set(['ं', 'ँ']);

/** Gujarati shares Devanagari's code layout, offset by 0x180. */
function gujaratiToDevanagari(text: string) {
  return text.replace(/[઀-૿]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x180));
}

/** Approximate Devanagari/Gujarati → Latin. Good enough to match names, not for display. */
export function transliterate(text: string) {
  const source = gujaratiToDevanagari(text);
  if (!/[ऀ-ॿ]/.test(source)) return text;
  const chars = Array.from(source);
  let out = '';
  for (let index = 0; index < chars.length; index += 1) {
    let char = chars[index];
    if (chars[index + 1] === nukta) {
      char += nukta;
      index += 1;
    }
    if (consonants[char] !== undefined) {
      out += consonants[char];
      const next = chars[index + 1];
      if (next === virama) {
        index += 1;
      } else if (next && signs[next] !== undefined) {
        out += signs[next];
        index += 1;
      } else {
        // Inherent vowel: dropped at the end of a word unless the consonant closes a conjunct (नरेन्द्र → narendra).
        const endOfWord = !next || !/[ऀ-ॿ]/.test(next) || /[।॥]/.test(next);
        const closesConjunct = chars[index - 1] === virama;
        if (!endOfWord || closesConjunct) out += 'a';
      }
    } else if (vowels[char] !== undefined) {
      out += vowels[char];
    } else if (nasal.has(char)) {
      out += 'n';
    } else if (char === 'ः') {
      out += 'h';
    } else if (/[०-९]/.test(char)) {
      out += String(char.charCodeAt(0) - 0x966);
    } else if (/[ऀ-ॿ]/.test(char)) {
      // Other signs (danda, avagraha): treat as a separator.
      out += ' ';
    } else {
      out += char;
    }
  }
  return out;
}

/** Folds spelling variants: Kumaar/Kumar, Bhaavesh/Bhavesh, Deepak/Dipak, Laxmi/Lakshmi stays close. */
export function soundAlike(latin: string) {
  return latin
    .toLocaleLowerCase()
    .replace(/aa+/g, 'a')
    // Shaikh/Shekh (शेख), Chauhan/Chohan (चोहान): spoken and written forms swap these freely.
    .replace(/ai/g, 'e')
    .replace(/au/g, 'o')
    .replace(/ee+|ii+/g, 'i')
    .replace(/oo+|uu+/g, 'u')
    .replace(/ph/g, 'f')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ksh')
    .replace(/([bcdfgjklmnprstvy])\1+/g, '$1');
}

/**
 * A looser key that ignores the short "a" between two consonants. Spoken Hindi drops it by word
 * structure (इमरान is "Imran", हळपती is "Halpati", अमरनाथ is "Amarnath"), which no simple
 * left-to-right rule gets right, so matching treats both spellings as the same name.
 */
export function looseKey(key: string) {
  return key.replace(/(?<=[b-df-hj-np-tv-z])a(?=[b-df-hj-np-tv-z])/g, '');
}

/** The comparable form of any name: any script → Latin sound, honorifics and punctuation removed. */
export function nameKey(value: string) {
  return soundAlike(transliterate(value))
    .replace(/\b(bhe|ben|bhen|shri|ji|mr|mrs|sir|madam)\b/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
