import { inRange, pct } from './stats';
import type { SurveyRecord } from './types';

export type IssueType = 'duplicate-id' | 'missing-value' | 'out-of-range' | 'future-date' | 'bp-inconsistent';

export const ISSUE_LABELS: Record<IssueType, string> = {
  'duplicate-id': 'Duplicate respondent ID',
  'missing-value': 'Missing value',
  'out-of-range': 'Implausible value',
  'future-date': 'Date after snapshot',
  'bp-inconsistent': 'Systolic not above diastolic',
};

export interface QualityIssue {
  type: IssueType;
  recordId: string;
  field: string;
  detail: string;
  district: string;
  collectorId: number;
}

const FIELDS = [
  { key: 'age', label: 'Age' },
  { key: 'systolic', label: 'Systolic BP' },
  { key: 'diastolic', label: 'Diastolic BP' },
  { key: 'saltGrams', label: 'Salt intake' },
  { key: 'bmi', label: 'BMI' },
  { key: 'smoker', label: 'Smoking status' },
] as const;

export interface QualityReport {
  total: number;
  flaggedRecords: number;
  cleanRate: number;
  issueCount: number;
  byType: Record<IssueType, number>;
  completeness: { field: string; label: string; pct: number }[];
  issues: QualityIssue[];
  byDistrict: { district: string; total: number; flagged: number; cleanRate: number }[];
}

/** Runs every record-level check on the raw (not de-duplicated) records. */
export function assessQuality(raw: SurveyRecord[], asOf: string): QualityReport {
  const issues: QualityIssue[] = [];
  const flagged = new Set<number>();
  const seen = new Set<string>();
  const add = (index: number, r: SurveyRecord, type: IssueType, field: string, detail: string) => {
    issues.push({ type, recordId: r.id, field, detail, district: r.district, collectorId: r.collectorId });
    flagged.add(index);
  };

  raw.forEach((r, i) => {
    if (seen.has(r.id)) add(i, r, 'duplicate-id', 'id', 'This respondent ID appears more than once');
    seen.add(r.id);
    if (r.date > asOf) add(i, r, 'future-date', 'date', `Dated ${r.date}, after ${asOf}`);

    for (const f of FIELDS) {
      if (r[f.key] === null) add(i, r, 'missing-value', f.key, `${f.label} is blank`);
    }
    if (r.age !== null && !inRange(r.age, 'age')) add(i, r, 'out-of-range', 'age', `Age ${r.age}`);
    if (r.systolic !== null && !inRange(r.systolic, 'systolic')) add(i, r, 'out-of-range', 'systolic', `Systolic ${r.systolic} mmHg`);
    if (r.diastolic !== null && !inRange(r.diastolic, 'diastolic')) add(i, r, 'out-of-range', 'diastolic', `Diastolic ${r.diastolic} mmHg`);
    if (r.saltGrams !== null && !inRange(r.saltGrams, 'saltGrams')) add(i, r, 'out-of-range', 'saltGrams', `Salt ${r.saltGrams} g/day`);
    if (r.bmi !== null && !inRange(r.bmi, 'bmi')) add(i, r, 'out-of-range', 'bmi', `BMI ${r.bmi}`);
    if (r.systolic !== null && r.diastolic !== null && inRange(r.systolic, 'systolic') && inRange(r.diastolic, 'diastolic') && r.systolic <= r.diastolic) {
      add(i, r, 'bp-inconsistent', 'systolic', `${r.systolic}/${r.diastolic} mmHg`);
    }
  });

  const byType: Record<IssueType, number> = { 'duplicate-id': 0, 'missing-value': 0, 'out-of-range': 0, 'future-date': 0, 'bp-inconsistent': 0 };
  for (const issue of issues) byType[issue.type]++;

  const districts = new Map<string, { total: number; flagged: number }>();
  raw.forEach((r, i) => {
    const cur = districts.get(r.district) ?? { total: 0, flagged: 0 };
    cur.total++;
    if (flagged.has(i)) cur.flagged++;
    districts.set(r.district, cur);
  });

  return {
    total: raw.length,
    flaggedRecords: flagged.size,
    cleanRate: pct(raw.length - flagged.size, raw.length),
    issueCount: issues.length,
    byType,
    completeness: FIELDS.map((f) => ({
      field: f.key,
      label: f.label,
      pct: pct(raw.filter((r) => r[f.key] !== null).length, raw.length),
    })),
    issues,
    byDistrict: Array.from(districts.entries())
      .map(([district, v]) => ({ district, ...v, cleanRate: pct(v.total - v.flagged, v.total) }))
      .sort((a, b) => a.cleanRate - b.cleanRate),
  };
}
