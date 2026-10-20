import { GENDERS, type Gender, type SurveyRecord } from './types';

/** Recommended upper limit for adult daily salt intake, in grams. */
export const SALT_LIMIT_G = 5;

export function pct(part: number, whole: number, decimals = 1): number {
  if (whole <= 0) return 0;
  const f = 10 ** decimals;
  return Math.round((part / whole) * 100 * f) / f;
}

export function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function sd(values: number[]): number | null {
  const m = mean(values);
  if (m === null || values.length < 2) return null;
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / (values.length - 1));
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = mean(xs.slice(0, n))!;
  const my = mean(ys.slice(0, n))!;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? null : num / Math.sqrt(dx * dy);
}

// --- Plausibility ranges (anything outside is treated as a data-entry error) ---------------------
export const RANGES = {
  age: { min: 18, max: 110 },
  systolic: { min: 70, max: 260 },
  diastolic: { min: 40, max: 150 },
  saltGrams: { min: 0.5, max: 40 },
  bmi: { min: 10, max: 70 },
} as const;

export function inRange(value: number | null, key: keyof typeof RANGES): value is number {
  return value !== null && Number.isFinite(value) && value >= RANGES[key].min && value <= RANGES[key].max;
}

/** A usable blood-pressure reading, or null when missing/implausible. */
export function bpOf(r: SurveyRecord): { sys: number; dia: number } | null {
  if (!inRange(r.systolic, 'systolic') || !inRange(r.diastolic, 'diastolic') || r.systolic <= r.diastolic) return null;
  return { sys: r.systolic, dia: r.diastolic };
}

export function saltOf(r: SurveyRecord): number | null {
  return inRange(r.saltGrams, 'saltGrams') ? r.saltGrams : null;
}

// --- Blood pressure ---------------------------------------------------------------------------
export type BpCategory = 'normal' | 'elevated' | 'stage1' | 'stage2' | 'crisis';

export const BP_LABELS: Record<BpCategory, string> = {
  normal: 'Normal',
  elevated: 'Elevated',
  stage1: 'Stage 1',
  stage2: 'Stage 2',
  crisis: 'Crisis',
};

export function classifyBp(sys: number, dia: number): BpCategory {
  if (sys > 180 || dia > 120) return 'crisis';
  if (sys >= 140 || dia >= 90) return 'stage2';
  if (sys >= 130 || dia >= 80) return 'stage1';
  if (sys >= 120) return 'elevated';
  return 'normal';
}

export function isHypertensive(sys: number, dia: number): boolean {
  return sys >= 140 || dia >= 90;
}

export function bpCategoryCounts(records: SurveyRecord[]): { category: BpCategory; label: string; count: number; share: number }[] {
  const counts: Record<BpCategory, number> = { normal: 0, elevated: 0, stage1: 0, stage2: 0, crisis: 0 };
  let total = 0;
  for (const r of records) {
    const bp = bpOf(r);
    if (!bp) continue;
    counts[classifyBp(bp.sys, bp.dia)]++;
    total++;
  }
  return (Object.keys(counts) as BpCategory[]).map((category) => ({
    category,
    label: BP_LABELS[category],
    count: counts[category],
    share: pct(counts[category], total),
  }));
}

export function hypertensionPrevalence(records: SurveyRecord[]): { n: number; cases: number; rate: number } {
  let n = 0;
  let cases = 0;
  for (const r of records) {
    const bp = bpOf(r);
    if (!bp) continue;
    n++;
    if (isHypertensive(bp.sys, bp.dia)) cases++;
  }
  return { n, cases, rate: pct(cases, n) };
}

// --- Salt -------------------------------------------------------------------------------------
export const SALT_BANDS = [
  { label: '< 5 g', min: 0, max: 5 },
  { label: '5–8 g', min: 5, max: 8 },
  { label: '8–11 g', min: 8, max: 11 },
  { label: '11–14 g', min: 11, max: 14 },
  { label: '14+ g', min: 14, max: Infinity },
] as const;

export function saltDistribution(records: SurveyRecord[]): { label: string; count: number; share: number }[] {
  const counts = SALT_BANDS.map(() => 0);
  let total = 0;
  for (const r of records) {
    const g = saltOf(r);
    if (g === null) continue;
    const i = SALT_BANDS.findIndex((b) => g >= b.min && g < b.max);
    counts[i]++;
    total++;
  }
  return SALT_BANDS.map((b, i) => ({ label: b.label, count: counts[i], share: pct(counts[i], total) }));
}

export function saltSummary(records: SurveyRecord[]): { n: number; mean: number | null; aboveLimit: number } {
  const values = records.map(saltOf).filter((v): v is number => v !== null);
  return { n: values.length, mean: mean(values), aboveLimit: pct(values.filter((v) => v > SALT_LIMIT_G).length, values.length) };
}

/** Mean blood pressure within each salt band, plus the overall correlation (Pearson r) with systolic BP. */
export function saltBpRelation(records: SurveyRecord[]) {
  const sums = SALT_BANDS.map(() => ({ n: 0, sys: 0, dia: 0 }));
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of records) {
    const g = saltOf(r);
    const bp = bpOf(r);
    if (g === null || !bp) continue;
    const i = SALT_BANDS.findIndex((b) => g >= b.min && g < b.max);
    sums[i].n++;
    sums[i].sys += bp.sys;
    sums[i].dia += bp.dia;
    xs.push(g);
    ys.push(bp.sys);
  }
  return {
    r: pearson(xs, ys),
    n: xs.length,
    bands: SALT_BANDS.map((b, i) => ({
      label: b.label,
      n: sums[i].n,
      systolic: sums[i].n >= 5 ? Math.round((sums[i].sys / sums[i].n) * 10) / 10 : null,
      diastolic: sums[i].n >= 5 ? Math.round((sums[i].dia / sums[i].n) * 10) / 10 : null,
    })),
  };
}

// --- Demographics -------------------------------------------------------------------------------
export const AGE_BANDS = [
  { label: '18–29', min: 18, max: 29 },
  { label: '30–39', min: 30, max: 39 },
  { label: '40–49', min: 40, max: 49 },
  { label: '50–59', min: 50, max: 59 },
  { label: '60–69', min: 60, max: 69 },
  { label: '70+', min: 70, max: 200 },
] as const;

export type GenderCounts = Record<Gender, number>;

export function genderCounts(records: SurveyRecord[]): GenderCounts {
  const c: GenderCounts = { female: 0, male: 0, transgender: 0 };
  for (const r of records) c[r.gender]++;
  return c;
}

export function ageBands(records: SurveyRecord[]): ({ label: string } & GenderCounts)[] {
  const rows = AGE_BANDS.map((b) => ({ label: b.label, female: 0, male: 0, transgender: 0 }));
  for (const r of records) {
    if (!inRange(r.age, 'age')) continue;
    const i = AGE_BANDS.findIndex((b) => r.age! >= b.min && r.age! <= b.max);
    if (i >= 0) rows[i][r.gender]++;
  }
  return rows;
}

// --- Roll-ups -------------------------------------------------------------------------------------
export interface Summary {
  total: number;
  facilities: number;
  collectors: number;
  lastDate: string | null;
  meanAge: number | null;
  genders: GenderCounts;
  hypertension: { n: number; cases: number; rate: number };
  salt: { n: number; mean: number | null; aboveLimit: number };
  smokerRate: number;
}

export function summarize(records: SurveyRecord[]): Summary {
  const ages = records.map((r) => r.age).filter((a): a is number => inRange(a, 'age'));
  const smokerKnown = records.filter((r) => r.smoker !== null);
  return {
    total: records.length,
    facilities: new Set(records.map((r) => r.facilityCode)).size,
    collectors: new Set(records.map((r) => r.collectorId)).size,
    lastDate: records.reduce<string | null>((acc, r) => (acc === null || r.date > acc ? r.date : acc), null),
    meanAge: mean(ages),
    genders: genderCounts(records),
    hypertension: hypertensionPrevalence(records),
    salt: saltSummary(records),
    smokerRate: pct(smokerKnown.filter((r) => r.smoker).length, smokerKnown.length),
  };
}

export interface DistrictClinicalRow {
  state: string;
  district: string;
  n: number;
  hypertensionRate: number;
  meanSalt: number | null;
  saltAboveLimit: number;
}

export function districtClinical(records: SurveyRecord[]): DistrictClinicalRow[] {
  const groups = new Map<string, SurveyRecord[]>();
  for (const r of records) {
    const key = `${r.state}|${r.district}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }
  return Array.from(groups.entries())
    .map(([key, rows]) => {
      const [state, district] = key.split('|');
      const salt = saltSummary(rows);
      return {
        state,
        district,
        n: rows.length,
        hypertensionRate: hypertensionPrevalence(rows).rate,
        meanSalt: salt.mean === null ? null : Math.round(salt.mean * 10) / 10,
        saltAboveLimit: salt.aboveLimit,
      };
    })
    .sort((a, b) => b.hypertensionRate - a.hypertensionRate);
}

export { GENDERS };
