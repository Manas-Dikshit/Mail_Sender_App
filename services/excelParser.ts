import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { InputRow } from '@/types';
import { detectEmailColumn, detectNameColumn } from '@/utils/emailUtils';

export class ExcelParseError extends Error {}

/**
 * Parses an uploaded .xlsx or .csv file buffer into normalized rows.
 * - Automatically detects the email column (required).
 * - Automatically detects a name column, if present, for personalization.
 * - Preserves the original row data and assigns a stable Row ID.
 * - Unknown columns are kept in `raw` but otherwise ignored.
 */
export function parseUploadedFile(buffer: Buffer, extension: '.xlsx' | '.csv'): InputRow[] {
  const records = extension === '.xlsx' ? parseXlsx(buffer) : parseCsv(buffer);

  if (records.length === 0) {
    throw new ExcelParseError('The uploaded file is empty.');
  }

  const headers = Object.keys(records[0]);
  const emailColumn = detectEmailColumn(headers);
  if (!emailColumn) {
    throw new ExcelParseError(
      'Could not find an email column. Expected a header like "Email" or "Email Address".'
    );
  }
  const nameColumn = detectNameColumn(headers);

  const rows: InputRow[] = [];
  records.forEach((record, index) => {
    const emailRaw = record[emailColumn];
    const email = typeof emailRaw === 'string' ? emailRaw.trim() : String(emailRaw ?? '').trim();
    if (!email) return; // skip fully blank rows

    const nameRaw = nameColumn ? record[nameColumn] : null;
    const name = nameRaw !== null && nameRaw !== undefined ? String(nameRaw).trim() || null : null;

    rows.push({
      rowId: index + 1,
      email,
      name,
      raw: record,
    });
  });

  if (rows.length === 0) {
    throw new ExcelParseError('No email addresses were found in the uploaded file.');
  }

  return rows;
}

function parseXlsx(buffer: Buffer): Record<string, unknown>[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    throw new ExcelParseError('The .xlsx file could not be read. It may be corrupted.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ExcelParseError('The workbook does not contain any sheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return json;
}

function parseCsv(buffer: Buffer): Record<string, unknown>[] {
  const text = buffer.toString('utf-8');
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new ExcelParseError('The .csv file could not be parsed.');
  }

  return result.data;
}
