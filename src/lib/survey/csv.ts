import { isValidIsoDate } from './dates';
import { GENDERS, type Gender, type SurveyRecord } from './types';

export const CSV_COLUMNS = [
  'unique_id',
  'state',
  'district',
  'facility_code',
  'collector_id',
  'date',
  'gender',
  'age',
  'systolic',
  'diastolic',
  'salt_g',
  'bmi',
  'smoker',
] as const;

export const REQUIRED_COLUMNS = ['unique_id', 'date', 'gender'] as const;

/** Guards against spreadsheet formula injection when a cell starts with =, +, - or @. */
function cell(value: string | number | boolean | null): string {
  if (value === null) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function recordsToCsv(records: SurveyRecord[]): string {
  const lines = records.map((r) =>
    [r.id, r.state, r.district, r.facilityCode, r.collectorId, r.date, r.gender, r.age, r.systolic, r.diastolic, r.saltGrams, r.bmi, r.smoker === null ? null : r.smoker ? 'yes' : 'no']
      .map(cell)
      .join(','),
  );
  return [CSV_COLUMNS.join(','), ...lines].join('\n') + '\n';
}

export interface ParsedFile {
  records: SurveyRecord[];
  fileIssues: string[];
}

function num(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Maps parsed CSV rows (header → value) onto survey records, collecting file-level problems. */
export function rowsToRecords(rows: Record<string, string>[], columns: string[]): ParsedFile {
  const fileIssues: string[] = [];
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  if (missing.length) {
    return { records: [], fileIssues: [`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`] };
  }
  const records: SurveyRecord[] = [];
  rows.forEach((row, i) => {
    const line = i + 2; // header is line 1
    const date = (row.date ?? '').trim();
    const gender = (row.gender ?? '').trim().toLowerCase();
    if (!isValidIsoDate(date)) {
      fileIssues.push(`Line ${line}: date "${date}" is not a valid yyyy-mm-dd date; row skipped`);
      return;
    }
    if (!(GENDERS as readonly string[]).includes(gender)) {
      fileIssues.push(`Line ${line}: gender "${gender}" must be female, male or transgender; row skipped`);
      return;
    }
    const smoker = (row.smoker ?? '').trim().toLowerCase();
    records.push({
      id: (row.unique_id ?? '').trim() || `row-${line}`,
      state: (row.state ?? '').trim() || 'Unknown',
      district: (row.district ?? '').trim() || 'Unknown',
      facilityCode: (row.facility_code ?? '').trim() || 'Unknown',
      collectorId: num(row.collector_id) ?? 0,
      date,
      gender: gender as Gender,
      age: num(row.age),
      systolic: num(row.systolic),
      diastolic: num(row.diastolic),
      saltGrams: num(row.salt_g),
      bmi: num(row.bmi),
      smoker: smoker === 'yes' || smoker === 'true' || smoker === '1' ? true : smoker === 'no' || smoker === 'false' || smoker === '0' ? false : null,
    });
  });
  return { records, fileIssues };
}
