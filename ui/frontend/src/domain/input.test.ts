import {describe, expect, it} from 'vitest';
import {companies, workers} from '@/data/sample-data';
import {parseCsv, readXlsx} from '@/lib/spreadsheet';
import {searchWorkers} from './attendance';
import {matchNames, parseCommand} from './commands';
import {attendanceFromSheet, detectColumns, guessKind, resolveAttendanceAbsentIds, workersFromSheet, workersTemplate} from './imports';
import {looseKey, nameKey, transliterate} from './names';
import en from '../../messages/en.json';
import gu from '../../messages/gu.json';
import hi from '../../messages/hi.json';
import mr from '../../messages/mr.json';

const byName = (name: string) => workers.find((worker) => worker.name === name)!;

describe('names across scripts', () => {
  it('reads Devanagari and Gujarati names as Latin sounds', () => {
    expect(nameKey('मनोज कुमार')).toBe('manoj kumar');
    expect(nameKey('नरेन्द्र')).toBe('narendra');
    expect(nameKey('રમેશ')).toBe('ramesh');
    expect(nameKey('लक्ष्मी')).toBe(nameKey('Laxmi'));
    expect(nameKey('Kumaar Bhai')).toBe('kumar');
    expect(transliterate('Manoj')).toBe('Manoj');
    expect(looseKey(nameKey('इमरान शेख'))).toBe(looseKey(nameKey('Imran Shaikh')));
    expect(looseKey(nameKey('हळपती'))).toBe(looseKey(nameKey('Halpati')));
    expect(looseKey(nameKey('अमरनाथ'))).toBe(looseKey(nameKey('Amarnath')));
    expect(nameKey('चौहान')).toBe(nameKey('Chohan'));
  });

  it('finds workers from a spoken Hindi name', () => {
    expect(searchWorkers(workers, 'मनोज कुमार').map((worker) => worker.name)).toContain('Manoj Kumar');
  });
});

describe('typed and spoken commands', () => {
  it('marks absentees from English, Hinglish and Hindi sentences', () => {
    for (const sentence of ['Manoj Kumar and Suresh Yadav absent', 'Manoj Kumar, Suresh Yadav nahi aaye', 'मनोज कुमार और सुरेश यादव नहीं आए']) {
      const command = parseCommand(sentence, workers, companies);
      expect(command.kind).toBe('absent');
      if (command.kind === 'absent') expect(command.matched.map((worker) => worker.name).sort()).toEqual(['Manoj Kumar', 'Suresh Yadav']);
    }
  });

  it('splits names said without commas', () => {
    const result = matchNames(workers, 'Manoj Kumar Suresh Yadav absent');
    expect(result.matched.map((worker) => worker.name).sort()).toEqual(['Manoj Kumar', 'Suresh Yadav']);
  });

  it('understands reminders with a time', () => {
    const command = parseCommand('Remind me tomorrow to call Om Packaging about the cheque', workers, companies);
    expect(command).toEqual({kind: 'remind', text: 'Call Om Packaging about the cheque', preset: 'tomorrowMorning'});
    expect(parseCommand('shaam ko yaad dilana PF form lena', workers, companies)).toMatchObject({kind: 'remind', preset: 'thisEvening'});
  });

  it('proposes a new worker with role, company, wage and phone', () => {
    const command = parseCommand('Add Ravi Patel fitter at Shree 650 per day 98765 43210', workers, companies);
    expect(command).toEqual({
      kind: 'addWorker',
      input: {name: 'Ravi Patel', phone: '9876543210', role: 'fitter', companyId: 'shree-polymers', shift: 'day', dailyWagePaise: 65_000}
    });
    const night = parseCommand('naya kamgar Imran welder Sarigam raat', workers, companies);
    expect(night).toMatchObject({kind: 'addWorker', input: {name: 'Imran', role: 'welder', companyId: 'sarigam-chemicals', shift: 'night'}});
  });

  it('answers simple questions and opens a profile for a single name', () => {
    expect(parseCommand('How many man-days this month?', workers, companies)).toEqual({kind: 'question', topic: 'month'});
    expect(parseCommand('PF kitne pending hai', workers, companies)).toEqual({kind: 'question', topic: 'pf'});
    expect(parseCommand('aaj kitne log aaye', workers, companies)).toEqual({kind: 'question', topic: 'today'});
    expect(parseCommand('Which company pays the highest rate per day?', workers, companies)).toEqual({kind: 'question', topic: 'open'});
    expect(parseCommand('how many are absent today?', workers, companies)).toEqual({kind: 'question', topic: 'today'});
    expect(parseCommand('Manoj Kumar', workers, companies)).toMatchObject({kind: 'openWorker', worker: {name: 'Manoj Kumar'}});
    expect(parseCommand('qwerty zzz', workers, companies).kind).toBe('unknown');
  });
});

describe('spreadsheet import', () => {
  it('reads quoted CSV', () => {
    expect(parseCsv('Name,Note\n"Patel, Ravi","He said ""hi"""\r\nAjay,\n')).toEqual([
      ['Name', 'Note'],
      ['Patel, Ravi', 'He said "hi"'],
      ['Ajay', '']
    ]);
    expect(parseCsv('Name;Status\nManoj;A')).toEqual([['Name', 'Status'], ['Manoj', 'A']]);
  });

  it('reads a P/A column, a list of absentees, or a list of people present', () => {
    const manoj = byName('Manoj Kumar');
    const suresh = byName('Suresh Yadav');
    const withStatus = attendanceFromSheet([['Name', 'Status (P/A)'], ['Manoj Kumar', 'A'], ['Suresh Yadav', 'P']], workers);
    expect(withStatus.hasStatus).toBe(true);
    expect(withStatus.absentIds).toEqual([manoj.id]);

    const absentList = attendanceFromSheet([['Manoj Kumar'], ['Suresh Yadav']], workers);
    expect(absentList.absentIds.sort()).toEqual([manoj.id, suresh.id].sort());

    const presentList = attendanceFromSheet([['Manoj Kumar']], workers, 'present');
    expect(presentList.absentIds).toContain(suresh.id);
    expect(presentList.absentIds).not.toContain(manoj.id);
  });

  it('keeps the status of an ambiguous attendance row when a worker is picked', () => {
    const rameshPatil = byName('Ramesh Patil');
    const rameshPatel = byName('Ramesh Patel');
    const statusSheet = attendanceFromSheet([['Name', 'Status'], ['Ramesh', 'P']], workers);
    expect(statusSheet.ambiguousRows[0]).toMatchObject({text: 'Ramesh', meaning: 'present'});
    expect(resolveAttendanceAbsentIds(statusSheet, {0: rameshPatil.id})).not.toContain(rameshPatil.id);

    const absentSheet = attendanceFromSheet([['Name', 'Status'], ['Ramesh', 'A']], workers);
    expect(absentSheet.ambiguousRows[0]).toMatchObject({text: 'Ramesh', meaning: 'absent'});
    expect(resolveAttendanceAbsentIds(absentSheet, {0: rameshPatel.id})).toContain(rameshPatel.id);

    const presentList = attendanceFromSheet([['Ramesh']], workers, 'present');
    expect(resolveAttendanceAbsentIds(presentList, {0: rameshPatil.id})).not.toContain(rameshPatil.id);
  });

  it('reads a worker list and flags people already added', () => {
    const rows = [...workersTemplate, ['Manoj Kumar', 'Helper', 'Shree', 'Day', '480', '']];
    expect(guessKind(detectColumns(rows))).toBe('workers');
    expect(guessKind(detectColumns([['Name', 'Company', 'Status'], ['Manoj Kumar', 'Shree', 'A']]))).toBe('attendance');
    const parsed = workersFromSheet(rows, workers, companies);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({duplicate: false, input: {name: 'Kunal Mehta', role: 'fitter', companyId: 'shree-polymers', dailyWagePaise: 65_000, phone: '9876543210'}});
    expect(parsed[1].input).toMatchObject({companyId: 'om-packaging', shift: 'night'});
    expect(parsed[2].duplicate).toBe(true);
  });

  it('reads the first sheet of a compressed .xlsx file', async () => {
    const files: Record<string, string> = {
      'xl/workbook.xml': '<workbook><sheets><sheet name="Hajri" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/sharedStrings.xml': '<sst><si><t>Name</t></si><si><r><t>Status</t></r><r><t xml:space="preserve"> (P/A)</t></r></si><si><t>Manoj Kumar</t></si><si><t>A</t></si></sst>',
      'xl/worksheets/sheet1.xml':
        '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
        '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c><c r="D2"><v>650</v></c></row>' +
        '<row r="3"><c r="A3" t="inlineStr"><is><t>Ravi &amp; Co</t></is></c></row></sheetData></worksheet>'
    };
    const rows = await readXlsx(await buildZip(files));
    expect(rows).toEqual([['Name', 'Status (P/A)'], ['Manoj Kumar', 'A', '', '650'], ['Ravi & Co']]);
  });
});

/** Minimal ZIP writer (deflate) used only to produce a test workbook. */
async function buildZip(files: Record<string, string>) {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const stream = new Blob([encoder.encode(content)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const data = new Uint8Array(await new Response(stream).arrayBuffer());
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(8, 8, true);
    localView.setUint32(18, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(10, 8, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, centrals.length, true);
  endView.setUint16(10, centrals.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  const total = new Uint8Array(offset + centralSize + 22);
  let pointer = 0;
  for (const part of [...locals, ...centrals, end]) {
    total.set(part, pointer);
    pointer += part.length;
  }
  return total.buffer;
}

describe('sheet kind and company codes', () => {
  it('lets the sheet decide its kind and uses the opening page only as a tie-break', () => {
    const hajriSheet = detectColumns([['Name', 'Company', 'Status'], ['Kiran Dhodia', 'SC', 'A']]);
    expect(guessKind(hajriSheet, 'workers')).toBe('attendance');
    const workerSheet = detectColumns([['Name', 'Role', 'Wage'], ['Kunal Mehta', 'Fitter', '650']]);
    expect(guessKind(workerSheet, 'attendance')).toBe('workers');
    const namesOnly = detectColumns([['Name', 'Company'], ['Kunal Mehta', 'Shree Polymers']]);
    expect(guessKind(namesOnly, 'attendance')).toBe('attendance');
    expect(guessKind(namesOnly, 'workers')).toBe('workers');
  });

  it('keeps an unknown full name in a sheet as one name', () => {
    const result = attendanceFromSheet([['Name', 'Status'], ['Kiran Dhodia', 'A'], ['Pintu Sharma', 'A']], workers);
    expect(result.unmatched).toEqual(['Pintu Sharma']);
    expect(result.absentIds).toEqual([byName('Kiran Dhodia').id]);
  });

  it('keeps only the person in a spoken new-worker name', () => {
    const add = parseCommand('Add new welder Kunal Mehta at Vapi Fab night 9876543210 ₹650', workers, companies);
    expect(add).toMatchObject({kind: 'addWorker', input: {name: 'Kunal Mehta', role: 'welder', companyId: 'vapi-fab-works', shift: 'night', dailyWagePaise: 65000}});
    const short = parseCommand('add helper Farhan Shaikh VF', workers, companies);
    expect(short).toMatchObject({kind: 'addWorker', input: {name: 'Farhan Shaikh', companyId: 'vapi-fab-works'}});
  });

  it('reads short company codes in a worker sheet', () => {
    const rows = workersFromSheet([['Name', 'Role', 'Company'], ['Kunal Mehta', 'Fitter', 'SC'], ['Farhan Shaikh', 'Welder', 'vf']], workers, companies);
    expect(rows.map((row) => row.input.companyId)).toEqual(['sarigam-chemicals', 'vapi-fab-works']);
    expect(rows.every((row) => row.unknownCompany === null)).toBe(true);
  });
});

describe('reminder timing', () => {
  it('keeps tomorrow evening on tomorrow', () => {
    expect(parseCommand('kal shaam Om Packaging ko phone karna yaad dilana', workers, companies)).toMatchObject({kind: 'remind', preset: 'tomorrowMorning'});
    expect(parseCommand('remind me this evening to collect the cheque', workers, companies)).toMatchObject({kind: 'remind', preset: 'thisEvening'});
  });
});

describe('spoken text from Sarvam', () => {
  it('reads absences the way Sarvam writes them down', () => {
    const heard = parseCommand('आज सुरेश यादव और इमरान शेख गैर हाजिर हैं।', workers, companies);
    expect(heard.kind).toBe('absent');
    if (heard.kind === 'absent') expect(heard.matched.map((worker) => worker.name).sort()).toEqual(['Imran Shaikh', 'Suresh Yadav']);
  });
});

describe('open questions for the AI', () => {
  it('sends the Ask page sample question to the AI in every language', () => {
    for (const messages of [en, hi, mr, gu]) {
      expect(parseCommand(messages.ask.sampleQuestion, workers, companies)).toEqual({kind: 'question', topic: 'open'});
    }
  });
});

describe('assistant example chips', () => {
  // Every example the assistant suggests must do what it promises, in every language.
  it.each([['en', en], ['hi', hi], ['mr', mr], ['gu', gu]] as const)('%s examples parse', (_, messages) => {
    const examples = messages.assistant;
    const absent = parseCommand(examples.example1, workers, companies);
    expect(absent.kind).toBe('absent');
    if (absent.kind === 'absent') {
      const names = [...absent.matched, ...absent.ambiguous.flatMap((item) => item.options)].map((worker) => worker.name);
      expect(names).toEqual(expect.arrayContaining(['Suresh Yadav', 'Imran Shaikh']));
      expect(absent.unmatched).toEqual([]);
    }
    expect(parseCommand(examples.example2, workers, companies).kind).toBe('remind');
    const question = parseCommand(examples.example3, workers, companies);
    expect(question).toMatchObject({kind: 'question', topic: 'pf'});
    const add = parseCommand(examples.example4, workers, companies);
    expect(add.kind).toBe('addWorker');
    if (add.kind === 'addWorker') {
      expect(add.input.role).toBe('welder');
      expect(add.input.dailyWagePaise).toBe(65000);
      expect(add.input.phone?.replace(/[^0-9]/g, '')).toBe('9876543210');
    }
  });
});
