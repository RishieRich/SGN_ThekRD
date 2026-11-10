import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const locales = ['en', 'hi', 'mr', 'gu'] as const;
type Messages = Record<string, unknown>;

function flatten(value: Messages, prefix = ''): Record<string, string> {
  return Object.entries(value).reduce<Record<string, string>>((result, [key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof item === 'string') result[path] = item;
    else if (item && typeof item === 'object') Object.assign(result, flatten(item as Messages, path));
    return result;
  }, {});
}

function placeholders(value: string) {
  return [...value.matchAll(/\{([a-zA-Z0-9_]+)(?:,[^}]*)?\}/g)].map((match) => match[1]).sort();
}

const dictionaries = Object.fromEntries(
  locales.map((locale) => {
    const file = resolve(process.cwd(), 'messages', `${locale}.json`);
    return [locale, flatten(JSON.parse(readFileSync(file, 'utf8')) as Messages)];
  })
) as Record<(typeof locales)[number], Record<string, string>>;

const sourceKeys = Object.keys(dictionaries.en).sort();
const errors: string[] = [];

for (const locale of locales.slice(1)) {
  const localeKeys = Object.keys(dictionaries[locale]).sort();
  const missing = sourceKeys.filter((key) => !localeKeys.includes(key));
  const extra = localeKeys.filter((key) => !sourceKeys.includes(key));
  if (missing.length) errors.push(`${locale}: missing ${missing.join(', ')}`);
  if (extra.length) errors.push(`${locale}: extra ${extra.join(', ')}`);

  for (const key of sourceKeys) {
    if (!dictionaries[locale][key]) continue;
    const expected = placeholders(dictionaries.en[key]);
    const actual = placeholders(dictionaries[locale][key]);
    if (expected.join('|') !== actual.join('|')) {
      errors.push(`${locale}: placeholder mismatch at ${key}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`i18n check passed: ${sourceKeys.length} messages across ${locales.length} locales.`);
