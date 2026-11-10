import type {Company, Worker, WorkerRole} from '@/types';
import {normaliseName, searchWorkers} from './attendance';
import {looseKey} from './names';
import type {ReminderPreset} from './reminders';
import {defaultWagePaise, type NewWorkerInput} from './workers';

/**
 * Turns a typed or spoken sentence into a proposal the user confirms. Rule based, no AI:
 * nothing here writes data, it only proposes. Works with English, Hinglish, Hindi, Marathi and Gujarati keywords.
 */

/** `open` is a question the app can't answer from its own numbers; Gemini takes it when connected. */
export type QuestionTopic = 'today' | 'month' | 'pf' | 'esic' | 'unplaced' | 'absentMost' | 'open';

export interface NameMatch {
  matched: Worker[];
  ambiguous: Array<{text: string; options: Worker[]}>;
  unmatched: string[];
}

export type Command =
  | ({kind: 'absent' | 'present'} & NameMatch)
  | {kind: 'remind'; text: string; preset: ReminderPreset}
  | {kind: 'addWorker'; input: NewWorkerInput}
  | {kind: 'question'; topic: QuestionTopic}
  | {kind: 'openWorker'; worker: Worker}
  | {kind: 'unknown'; suggestions: Worker[]};

const edge = '[\\p{L}\\p{M}\\p{N}]';
function words(alternatives: string, flags = 'iu') {
  return new RegExp(`(?<!${edge})(?:${alternatives})(?!${edge})`, flags);
}
function wordsGlobal(alternatives: string) {
  return words(alternatives, 'giu');
}

const absentWords =
  'absent|absentees?|not come|not came|did not come|didn\'t come|nahi aaya|nahi aaye|nahi aayi|nahin aaya|nahin aaye|nahi aya|nahi aye|gair ?hazir|gair ?haazir|chutti|chhutti|on leave|leave|' +
  // Speech-to-text often splits "गैरहाज़िर" and drops the nukta: allow a space or hyphen, nukta optional.
  'ग\\u093C?ैर[ -]?हा(?:ज\\u093C?|\\u095B)िर|ग\\u093C?ैर[ -]?हजर|ગેર[ -]?હાજર|नहीं आया|नहीं आए|नहीं आई|नहीं आये|नही आया|नही आए|छुट्टी|छुट्टी पर|आले नाही|आला नाही|सुट्टी|' +
  'ગેરહાજર|આવ્યા નથી|આવ્યો નથી|રજા';
const presentWords = 'present|came|aaya|aaye|aa gaya|aa gaye|hazir|haazir|हाज़िर|हाजिर|हजर|आया|आए|आ गया|आ गए|आले|हाजर|હાજર|આવ્યા|આવ્યો';
const remindWords = 'remind|reminder|yaad|याद|आठवण|યાદ';
const addWords = 'add|new worker|naya|nayi|jodo|joddo|नया|नई|जोड़ो|जोडो|जोड़ें|जोड़|नवीन|जोडा|ઉમેરો|ઉમેર|નવો|નવા';
const questionWords = 'how many|how much|kitne|kitna|kitni|kaun|who|which|कितने|कितना|कितनी|किती|कोण|कौन|કેટલા|કેટલું|કોણ|total|count';

const ABSENT = words(absentWords);
const PRESENT = words(presentWords);
const REMIND = words(remindWords);
const ADD = words(addWords);
const QUESTION = words(questionWords);
const PF = words('pf|पीएफ|पी एफ|પીએફ');
const ESIC = words('esic|ईएसआईसी|ઈએસઆઈસી');
const UNPLACED = words('unplaced|bina company|without company|no company|बिना कंपनी|कंपनी नहीं|કંપની વગર');
const TODAY_QUESTION = words('today|aaj|aaye|aaya|kitne log|आज|आए|आजे|आले|આજે|આજ|આવ્યા');
const MONTH = words('month|mahina|mahine|महीने|महीना|महिना|महिन्यात|મહિને|મહિનો');
const MOST = words('most|sabse|sabse zyada|सबसे|सर्वात|સૌથી');

const TOMORROW = words('tomorrow|kal|कल|उद्या|કાલે');
const EVENING = words('evening|tonight|shaam|sham|शाम|संध्याकाळी|सायंकाळी|સાંજે');
const MONDAY = words('monday|somvar|सोमवार|सोमवारी|સોમવારે');
const HOUR = words('hour|ghante|ghanta|घंटे|घंटा|तास|કલાક');

const fillers = wordsGlobal(
  'today|aaj|आज|आजे|આજે|is|are|was|were|hai|hain|tha|the|mark|kar|karo|kardo|kar do|please|plz|ko|bhi|also|sir|ji|' +
  'है|हैं|था|थे|को|भी|करो|कर दो|आहे|आहेत|છે'
);

const roleWords: Array<[WorkerRole, RegExp]> = [
  ['fitter', words('fitter|फिटर|ફિટર')],
  ['welder', words('welder|वेल्डर|વેલ્ડર')],
  ['supervisor', words('supervisor|सुपरवाइज़र|सुपरवाइजर|पर्यवेक्षक|સુપરવાઇઝર')],
  ['helper', words('helper|हेल्पर|મદદનીશ|હેલ્પર')]
];
const NIGHT = words('night|raat|रात|रात्र|રાત');

const addFillers = wordsGlobal(
  `${addWords}|new|worker|kamgar|kaamgar|कामगार|કામદાર|at|in|to|for|as|a|an|the|ko|me|mein|में|को|मध्ये|માં|shift|pali|पाली|पाळी|પાળી|day|din|दिन|` +
  'rs|rupees?|रुपये|रुपए|per|roj|daily|wage|rate|pagar|पगार|પગાર|phone|mobile|number|company|kampani|कंपनी|કંપની|night|raat|रात|रात्र|રાત|' +
  'fitter|फिटर|ફિટર|welder|वेल्डर|વેલ્ડર|supervisor|सुपरवाइज़र|सुपरवाइजर|पर्यवेक्षक|સુપરવાઇઝર|helper|हेल्पर|મદદનીશ|હેલ્પર'
);

/** Words that identify a company in a sentence: the full name and its first word ("Shree", "Om", "Vapi"). */
export function companyKeywords(company: Company) {
  const first = company.name.split(/\s+/)[0];
  // Sheets and quick notes often use the short code (SP, VF); it only matches as a whole word.
  return [company.name, first, company.shortName].filter((item) => item && item.length >= 2).map((item) => item.toLocaleLowerCase());
}

export function findCompany(text: string, companies: Company[]) {
  const lower = text.toLocaleLowerCase();
  return companies.find((company) => companyKeywords(company).some((keyword) => words(escapeRegExp(keyword)).test(lower))) ?? null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "Vapi", "Vapi Fab" and "Vapi Fab Works" all name the same company; the short code does too. */
function companyPattern(company: Company) {
  const parts = company.name.toLocaleLowerCase().split(/\s+/).map(escapeRegExp);
  const leading = parts[0] + parts.slice(1).reduceRight((tail, part) => `(?:\\s+${part}${tail})?`, '');
  return [leading, escapeRegExp(company.shortName.toLocaleLowerCase())].join('|');
}

function uniqueWorkers(list: Worker[]) {
  const seen = new Set<string>();
  return list.filter((worker) => (seen.has(worker.id) ? false : (seen.add(worker.id), true)));
}

/**
 * Finds workers named in free text: "Manoj Kumar, Ravi and Suresh", "मनोज और रवि", or "Manoj Ravi absent".
 * A name matching several workers comes back as ambiguous so the person picks.
 */
export function matchNames(workers: Worker[], text: string, options: {oneNamePerLine?: boolean} = {}): NameMatch {
  const cleaned = text
    .replace(wordsGlobal(absentWords), ',')
    .replace(wordsGlobal(presentWords), ',')
    .replace(wordsGlobal('and|aur|और|आणि|અને'), ',')
    .replace(/[&+|]/g, ',')
    .replace(fillers, ' ');
  const pieces = cleaned
    .split(/[,;\n।]+/)
    .map((piece) => piece.trim())
    .filter((piece) => normaliseName(piece).length >= 2);

  const matched: Worker[] = [];
  const ambiguous: NameMatch['ambiguous'] = [];
  const unmatched: string[] = [];

  const resolve = (piece: string) => {
    const options = searchWorkers(workers, piece, 6);
    const exact = options.filter((worker) => looseKey(normaliseName(worker.name)) === looseKey(normaliseName(piece)));
    if (exact.length === 1) return {kind: 'one' as const, worker: exact[0]};
    if (options.length === 1) return {kind: 'one' as const, worker: options[0]};
    if (options.length > 1) return {kind: 'many' as const, options};
    return {kind: 'none' as const};
  };

  for (const piece of pieces) {
    const result = resolve(piece);
    if (result.kind === 'one') {
      matched.push(result.worker);
      continue;
    }
    const parts = piece.split(/\s+/).filter(Boolean);
    // A sheet cell holds one person: "Pintu Sharma" not found stays one name, not two misses.
    if (result.kind === 'many' || parts.length < 2 || options.oneNamePerLine) {
      if (result.kind === 'many') ambiguous.push({text: piece, options: result.options});
      else unmatched.push(piece);
      continue;
    }
    // Several names said without commas: try two words at a time, then one.
    for (let index = 0; index < parts.length; ) {
      const pair = parts[index + 1] ? resolve(`${parts[index]} ${parts[index + 1]}`) : null;
      if (pair?.kind === 'one') {
        matched.push(pair.worker);
        index += 2;
        continue;
      }
      const single = resolve(parts[index]);
      if (single.kind === 'one') matched.push(single.worker);
      else if (single.kind === 'many') ambiguous.push({text: parts[index], options: single.options});
      else if (normaliseName(parts[index]).length >= 3) unmatched.push(parts[index]);
      index += 1;
    }
  }

  const unique = uniqueWorkers(matched);
  const matchedIds = new Set(unique.map((worker) => worker.id));
  return {
    matched: unique,
    ambiguous: ambiguous.filter((item) => !item.options.some((option) => matchedIds.has(option.id))),
    unmatched
  };
}

function reminderPreset(text: string): ReminderPreset {
  if (HOUR.test(text)) return 'oneHour';
  if (MONDAY.test(text)) return 'nextMonday';
  // "kal shaam" is tomorrow evening: the nearest preset is tomorrow morning, not this evening.
  if (TOMORROW.test(text)) return 'tomorrowMorning';
  if (EVENING.test(text)) return 'thisEvening';
  return 'tomorrowMorning';
}

function reminderText(text: string) {
  const cleaned = text
    .replace(/^\s*(please\s+)?(remind\s+me(\s+(to|about)(?=\s))?|set\s+(a\s+)?reminder(\s+(to|for)(?=\s))?|reminder\s*:?|yaad\s+dila(na|o|do)?\s*(ki)?|मुझे\s+याद\s+दिला(ना|ओ|एं)?|याद\s+दिला(ना|ओ|एं)?|मला\s+आठवण\s+(करा|कर)|મને\s+યાદ\s+અપાવો)\s*/iu, '')
    .replace(wordsGlobal('tomorrow morning|tomorrow|kal subah|kal|subah|morning|this evening|evening|tonight|shaam ko|shaam|next monday|monday|in an hour|in 1 hour|in one hour|1 ghante (mein|me)|ek ghante (mein|me)|कल सुबह|कल|सुबह|शाम को|शाम|सोमवार को|सोमवार|एक घंटे में|उद्या सकाळी|उद्या|संध्याकाळी|કાલે સવારે|કાલે|સાંજે'), ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(to|about|that|ki|ke)\s+/i, '');
  const tidy = cleaned || text.trim();
  return tidy.charAt(0).toLocaleUpperCase() + tidy.slice(1);
}

function titleCase(value: string) {
  return value
    .split(' ')
    .map((part) => (/^[a-z]/i.test(part) ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(' ');
}

export function parseNewWorker(text: string, companies: Company[]): NewWorkerInput {
  const role = roleWords.find(([, pattern]) => pattern.test(text))?.[0] ?? 'helper';
  const company = findCompany(text, companies);
  const phoneMatch = text.match(/(?:\+?91[\s-]?)?([6-9]\d{4}[\s-]?\d{5})(?!\d)/);
  const phone = phoneMatch ? phoneMatch[1].replace(/\D/g, '') : '';
  const withoutPhone = phoneMatch ? text.replace(phoneMatch[0], ' ') : text;
  const wageMatch = withoutPhone.match(/(?:₹|rs\.?|rupees?)\s*(\d{2,5})|(?<!\d)(\d{3,4})(?!\d)/i);
  const rupees = wageMatch ? Number(wageMatch[1] ?? wageMatch[2]) : NaN;
  const dailyWagePaise = rupees >= 100 && rupees <= 5000 ? rupees * 100 : defaultWagePaise(role);

  let name = withoutPhone.replace(/₹/g, ' ').replace(/\d+/g, ' ');
  if (company) name = name.replace(words(companyPattern(company), 'giu'), ' ');
  name = name.replace(addFillers, ' ').replace(/[^\p{L}\p{M} ]/gu, ' ').replace(/\s+/g, ' ').trim();

  return {
    name: titleCase(name),
    phone,
    role,
    companyId: company?.id ?? null,
    shift: NIGHT.test(text) ? 'night' : 'day',
    dailyWagePaise
  };
}

function questionTopic(text: string): QuestionTopic {
  if (PF.test(text)) return 'pf';
  if (ESIC.test(text)) return 'esic';
  if (UNPLACED.test(text)) return 'unplaced';
  if (ABSENT.test(text) && MOST.test(text)) return 'absentMost';
  if (MONTH.test(text)) return 'month';
  if (TODAY_QUESTION.test(text) || ABSENT.test(text) || PRESENT.test(text)) return 'today';
  return 'open';
}

export function parseCommand(raw: string, workers: Worker[], companies: Company[]): Command {
  const text = raw.trim();
  if (!text) return {kind: 'unknown', suggestions: []};

  if (REMIND.test(text)) return {kind: 'remind', text: reminderText(text), preset: reminderPreset(text)};
  if (QUESTION.test(text) || /[?？]\s*$/.test(text)) return {kind: 'question', topic: questionTopic(text)};
  if (ADD.test(text) && !ABSENT.test(text)) {
    const input = parseNewWorker(text, companies);
    if (input.name.length >= 2) return {kind: 'addWorker', input};
  }

  const names = matchNames(workers, text);
  const found = names.matched.length + names.ambiguous.length;
  if (ABSENT.test(text) && found) return {kind: 'absent', ...names};
  if (PRESENT.test(text) && found) return {kind: 'present', ...names};
  if (found) {
    if (names.matched.length === 1 && !names.ambiguous.length && !names.unmatched.length) return {kind: 'openWorker', worker: names.matched[0]};
    return {kind: 'absent', ...names};
  }
  return {kind: 'unknown', suggestions: searchWorkers(workers, text, 3)};
}
