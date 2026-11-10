/**
 * Reads .xlsx and .csv files in the browser with no library and no upload: the file never leaves the device.
 * .xlsx is a ZIP of XML files; we read the ZIP directory, inflate with the built-in DecompressionStream,
 * and pull cell text from the first worksheet.
 */

export type SheetRows = string[][];

export class SpreadsheetError extends Error {
  constructor(public readonly reason: 'oldFormat' | 'unreadable' | 'empty' | 'tooBig') {
    super(reason);
  }
}

export const maxSpreadsheetBytes = 5 * 1024 * 1024;
const maxRows = 3000;
const maxExpandedEntryBytes = 10 * 1024 * 1024;

export async function readSpreadsheet(file: File): Promise<SheetRows> {
  if (file.size > maxSpreadsheetBytes) throw new SpreadsheetError('tooBig');
  const name = file.name.toLowerCase();
  if (name.endsWith('.xls')) throw new SpreadsheetError('oldFormat');
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const rows = isZip ? await readXlsx(buffer) : parseCsv(new TextDecoder('utf-8').decode(bytes));
  const trimmed = trimRows(rows);
  if (!trimmed.length) throw new SpreadsheetError('empty');
  return trimmed;
}

function trimRows(rows: SheetRows) {
  return rows
    .map((row) => row.map((cell) => cell.replace(/\s+/g, ' ').trim()))
    .filter((row) => row.some(Boolean))
    .slice(0, maxRows);
}

/** CSV/TSV with quotes; the delimiter is guessed from the first line. */
export function parseCsv(input: string): SheetRows {
  const text = input.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [',', ';', '\t'].map((item) => ({item, count: firstLine.split(item).length})).sort((a, b) => b.count - a.count)[0].item;
  const rows: SheetRows = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  offset: number;
}

function zipEntries(view: DataView): ZipEntry[] {
  let end = -1;
  for (let index = view.byteLength - 22; index >= Math.max(0, view.byteLength - 66_000); index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      end = index;
      break;
    }
  }
  if (end < 0) throw new SpreadsheetError('unreadable');
  const count = view.getUint16(end + 10, true);
  let pointer = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) throw new SpreadsheetError('unreadable');
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const uncompressedSize = view.getUint32(pointer + 24, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const offset = view.getUint32(pointer + 42, true);
    const name = decoder.decode(new Uint8Array(view.buffer, view.byteOffset + pointer + 46, nameLength));
    entries.push({name, method, compressedSize, uncompressedSize, offset});
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(data: Uint8Array) {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(view: DataView, entry: ZipEntry) {
  if (entry.uncompressedSize > maxExpandedEntryBytes) throw new SpreadsheetError('tooBig');
  const nameLength = view.getUint16(entry.offset + 26, true);
  const extraLength = view.getUint16(entry.offset + 28, true);
  const start = view.byteOffset + entry.offset + 30 + nameLength + extraLength;
  const data = new Uint8Array(view.buffer.slice(start, start + entry.compressedSize));
  const raw = entry.method === 0 ? data : entry.method === 8 ? await inflateRaw(data) : null;
  if (!raw) throw new SpreadsheetError('unreadable');
  return new TextDecoder('utf-8').decode(raw);
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

function textRuns(xml: string) {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join('');
}

function columnIndex(reference: string) {
  const letters = reference.replace(/\d+/g, '').toUpperCase();
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

function attribute(attributes: string, name: string) {
  return attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
}

export async function readXlsx(buffer: ArrayBuffer): Promise<SheetRows> {
  const view = new DataView(buffer);
  const entries = zipEntries(view);
  const find = (name: string) => entries.find((entry) => entry.name === name);

  let sheetPath = 'xl/worksheets/sheet1.xml';
  const workbook = find('xl/workbook.xml');
  const relations = find('xl/_rels/workbook.xml.rels');
  if (workbook && relations) {
    const firstSheet = (await readEntry(view, workbook)).match(/<sheet\b[^>]*>/)?.[0] ?? '';
    const relationId = firstSheet.match(/r:id="([^"]+)"/)?.[1];
    const relationXml = await readEntry(view, relations);
    const target = [...relationXml.matchAll(/<Relationship\b([^>]*)\/?>/g)]
      .map((match) => match[1])
      .find((attrs) => attribute(attrs, 'Id') === relationId);
    const targetPath = target ? attribute(target, 'Target') : undefined;
    if (targetPath) sheetPath = targetPath.startsWith('/') ? targetPath.slice(1) : `xl/${targetPath.replace(/^\.\//, '')}`;
  }
  const sheet = find(sheetPath) ?? entries.find((entry) => entry.name.startsWith('xl/worksheets/') && entry.name.endsWith('.xml'));
  if (!sheet) throw new SpreadsheetError('unreadable');

  const sharedEntry = find('xl/sharedStrings.xml');
  const shared = sharedEntry ? [...(await readEntry(view, sharedEntry)).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => textRuns(match[1])) : [];

  const xml = await readEntry(view, sheet);
  const rows: SheetRows = [];
  for (const rowMatch of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rowNumber = Number(attribute(rowMatch[1], 'r') ?? rows.length + 1);
    const cells: string[] = [];
    for (const cellMatch of (rowMatch[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1];
      const inner = cellMatch[2] ?? '';
      const reference = attribute(attrs, 'r');
      const type = attribute(attrs, 't');
      const rawValue = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = '';
      if (type === 's') value = shared[Number(rawValue)] ?? '';
      else if (type === 'inlineStr') value = textRuns(inner);
      else if (type === 'b') value = rawValue === '1' ? 'TRUE' : 'FALSE';
      else if (rawValue !== undefined) value = decodeXml(rawValue);
      cells[reference ? columnIndex(reference) : cells.length] = value;
    }
    rows[rowNumber - 1] = Array.from(cells, (cell) => cell ?? '');
    if (rows.length > maxRows) break;
  }
  return Array.from(rows, (row) => row ?? []);
}

/** A CSV file the person can open in Excel, fill and upload back. */
export function downloadCsv(filename: string, rows: string[][]) {
  const escape = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
  const csv = `﻿${rows.map((row) => row.map(escape).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
