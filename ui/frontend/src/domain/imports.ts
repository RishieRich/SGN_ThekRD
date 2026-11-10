import type {Company, Worker, WorkerRole} from '@/types';
import {findCompany, matchNames, type NameMatch} from './commands';
import {normaliseName} from './attendance';
import {defaultWagePaise, type NewWorkerInput} from './workers';

/**
 * Turns spreadsheet rows into proposals: either today's attendance or a worker list.
 * Headers are recognised in English, Hindi, Marathi and Gujarati; a single unnamed column is read as names.
 */

export type ImportKind = 'attendance' | 'workers';
type Column = 'name' | 'role' | 'company' | 'shift' | 'wage' | 'phone' | 'status';

const headerWords: Record<Column, RegExp> = {
  name: /name|naam|नाम|નામ|worker|kamgar|kaamgar|कामगार|કામદાર|employee/i,
  role: /role|trade|designation|post|kaam|काम|ભૂમિકા|કામ/i,
  company: /company|client|site|factory|कंपनी|કંપની|unit/i,
  shift: /shift|pali|पाली|पाळी|પાળી/i,
  wage: /wage|rate|salary|pagar|पगार|मजदूरी|મજૂરી|પગાર|daily|₹|rs/i,
  phone: /phone|mobile|contact|फ़ोन|फोन|મોબાઇલ|ફોન/i,
  status: /status|attendance|hajri|hazri|हाज़िरी|हाजिरी|हजेरी|હાજરી|present|absent|p\/a|a\/p/i
};

export interface SheetColumns {
  headerRow: number;
  columns: Partial<Record<Column, number>>;
}

export function detectColumns(rows: string[][]): SheetColumns {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 5); rowIndex += 1) {
    const columns: Partial<Record<Column, number>> = {};
    rows[rowIndex].forEach((cell, columnIndex) => {
      if (!cell || cell.length > 40) return;
      for (const column of Object.keys(headerWords) as Column[]) {
        if (columns[column] === undefined && headerWords[column].test(cell)) {
          columns[column] = columnIndex;
          break;
        }
      }
    });
    if (columns.name !== undefined) return {headerRow: rowIndex, columns};
  }
  return {headerRow: -1, columns: {name: 0}};
}

/**
 * What the sheet is, from its own columns first: a status column means today's Hajri; role, wage or
 * phone means new workers. Only a sheet that could be either (names, maybe companies) takes the hint
 * from where it was opened.
 */
export function guessKind(columns: SheetColumns, hint?: ImportKind): ImportKind {
  const {role, company, wage, phone, status} = columns.columns;
  if (status !== undefined) return 'attendance';
  if ([role, wage, phone].some((value) => value !== undefined)) return 'workers';
  return hint ?? (company !== undefined ? 'workers' : 'attendance');
}

function dataRows(rows: string[][], columns: SheetColumns) {
  return rows.slice(columns.headerRow + 1).filter((row) => (row[columns.columns.name ?? 0] ?? '').trim().length >= 2);
}

const absentValue = /^(a|ab|abs|absent|x|0|no|n|leave|l|off|chutti|गैरहाज़िर|गैरहाजिर|गैरहजर|अनुपस्थित|ગેરહાજર|रजा|રજા)$/i;
const presentValue = /^(p|pr|present|yes|y|1|✓|✔|हाज़िर|हाजिर|हजर|उपस्थित|હાજર)$/i;

export type NamesMeaning = 'absent' | 'present';

export interface AttendanceImport extends NameMatch {
  /** True when the sheet has a P/A column; then the sheet decides who is absent. */
  hasStatus: boolean;
  /** Worker ids the import will mark absent. */
  absentIds: string[];
  /** Rows whose status could not be read. */
  unclear: string[];
  rowCount: number;
}

/**
 * With a status column, the sheet decides who is absent. Without one, the names are either the
 * absentees (default) or the people present, in which case everyone else placed today is absent.
 */
export function attendanceFromSheet(rows: string[][], workers: Worker[], meaning: NamesMeaning = 'absent'): AttendanceImport {
  const columns = detectColumns(rows);
  const data = dataRows(rows, columns);
  const nameColumn = columns.columns.name ?? 0;
  const statusColumn = columns.columns.status;
  const hasStatus = statusColumn !== undefined && statusColumn !== nameColumn;
  const unclear: string[] = [];

  const absentNames: string[] = [];
  const presentNames: string[] = [];
  for (const row of data) {
    const name = row[nameColumn];
    if (!hasStatus) {
      (meaning === 'absent' ? absentNames : presentNames).push(name);
      continue;
    }
    const status = (row[statusColumn] ?? '').trim();
    if (absentValue.test(status)) absentNames.push(name);
    else if (presentValue.test(status) || status === '') presentNames.push(name);
    else unclear.push(name);
  }

  const listed = hasStatus ? [...absentNames, ...presentNames] : meaning === 'absent' ? absentNames : presentNames;
  const match = matchNames(workers, listed.join('\n'), {oneNamePerLine: true});
  const absentKeys = new Set(absentNames.map(normaliseName));
  const placed = workers.filter((worker) => worker.status === 'active' && worker.companyId);

  let absentIds: string[];
  if (hasStatus) absentIds = match.matched.filter((worker) => absentKeys.has(normaliseName(worker.name)) || absentNames.some((name) => sameName(name, worker))).map((worker) => worker.id);
  else if (meaning === 'absent') absentIds = match.matched.map((worker) => worker.id);
  else {
    const presentIds = new Set(match.matched.map((worker) => worker.id));
    absentIds = placed.filter((worker) => !presentIds.has(worker.id)).map((worker) => worker.id);
  }

  return {...match, hasStatus, absentIds, unclear, rowCount: data.length};
}

function sameName(text: string, worker: Worker) {
  const key = normaliseName(text);
  const name = normaliseName(worker.name);
  return key.length >= 2 && (name === key || name.startsWith(`${key} `) || key.startsWith(`${name} `));
}

const roleValues: Array<[WorkerRole, RegExp]> = [
  ['fitter', /fitter|फिटर|ફિટર/i],
  ['welder', /welder|वेल्डर|વેલ્ડર/i],
  ['supervisor', /supervisor|सुपरवाइज़र|सुपरवाइजर|पर्यवेक्षक|સુપરવાઇઝર|mukadam|मुकादम/i],
  ['helper', /helper|हेल्पर|મદદનીશ|હેલ્પર|labour|labor|मज़दूर|मजदूर/i]
];

export interface WorkerImportRow {
  input: NewWorkerInput;
  /** Same name already in the list; skipped unless the person ticks it. */
  duplicate: boolean;
  /** Company text present but not recognised. */
  unknownCompany: string | null;
  /** Role text present but not recognised (defaults to helper). */
  unknownRole: string | null;
}

export function workersFromSheet(rows: string[][], existing: Worker[], companies: Company[]): WorkerImportRow[] {
  const columns = detectColumns(rows);
  const {name, role, company, shift, wage, phone} = columns.columns;
  const existingKeys = new Set(existing.map((worker) => normaliseName(worker.name)));
  const seen = new Set<string>();

  return dataRows(rows, columns).map((row) => {
    const cell = (index: number | undefined) => (index === undefined ? '' : (row[index] ?? '').trim());
    const roleText = cell(role);
    const parsedRole = roleValues.find(([, pattern]) => pattern.test(roleText))?.[0];
    const finalRole = parsedRole ?? 'helper';
    const companyText = cell(company);
    const matchedCompany = companyText ? findCompany(companyText, companies) : null;
    const wageNumber = Number(cell(wage).replace(/[^\d.]/g, ''));
    const dailyWagePaise = wageNumber >= 100 && wageNumber <= 5000 ? Math.round(wageNumber * 100) : defaultWagePaise(finalRole);
    const phoneDigits = cell(phone).replace(/\D/g, '').slice(-10);
    const workerName = cell(name ?? 0).replace(/\s+/g, ' ');
    const key = normaliseName(workerName);
    const duplicate = existingKeys.has(key) || seen.has(key);
    seen.add(key);
    return {
      input: {
        name: workerName,
        phone: phoneDigits.length === 10 ? phoneDigits : '',
        role: finalRole,
        companyId: matchedCompany?.id ?? null,
        shift: /^(n$|night|raat|rat$|रात|રાત)/i.test(cell(shift)) ? 'night' : 'day',
        dailyWagePaise
      },
      duplicate,
      unknownCompany: companyText && !matchedCompany ? companyText : null,
      unknownRole: roleText && !parsedRole ? roleText : null
    };
  });
}

export const attendanceTemplate = [
  ['Name', 'Status (P/A)'],
  ['Manoj Kumar', 'A'],
  ['Suresh Yadav', 'P']
];

export const workersTemplate = [
  ['Name', 'Role', 'Company', 'Shift', 'Daily wage', 'Phone'],
  ['Kunal Mehta', 'Fitter', 'Shree Polymers', 'Day', '650', '9876543210'],
  ['Farhan Shaikh', 'Helper', 'Om Packaging', 'Night', '500', '']
];
