import { addDays, diffDays, workingDays } from './dates';
import { pct } from './stats';
import type { Facility, SurveyDataset, SurveyRecord } from './types';

export type ProgressStatus = 'on-track' | 'at-risk' | 'behind';

export interface BurnUpPoint {
  date: string;
  planned: number;
  actual: number | null;
  projected: number | null;
}

/** Share of the planned fieldwork days that have elapsed by `date` (0–1). */
export function plannedFraction(plan: string[], date: string): number {
  if (!plan.length) return 0;
  return plan.filter((d) => d <= date).length / plan.length;
}

export function statusFor(actualPct: number, expectedPct: number): ProgressStatus {
  if (expectedPct <= 0) return 'on-track';
  const ratio = actualPct / expectedPct;
  return ratio >= 0.95 ? 'on-track' : ratio >= 0.8 ? 'at-risk' : 'behind';
}

export interface Forecast {
  collected: number;
  target: number;
  pctOfTarget: number;
  expectedPct: number;
  dailyRate: number;
  remainingDays: number;
  projectedFinal: number;
  projectedPct: number;
  /** First working day the target is projected to be reached, or null if not before fieldwork ends. */
  etaDate: string | null;
  status: ProgressStatus;
}

/** Linear projection from the last `window` working days of activity. */
export function buildForecast(
  records: SurveyRecord[],
  target: number,
  dataset: Pick<SurveyDataset, 'start' | 'end' | 'asOf'>,
  window = 14,
): Forecast {
  const plan = workingDays(dataset.start, dataset.end);
  const elapsed = plan.filter((d) => d <= dataset.asOf);
  const remaining = plan.filter((d) => d > dataset.asOf);
  const collected = records.length;
  const recent = new Set(elapsed.slice(-window));
  const recentCount = records.filter((r) => recent.has(r.date)).length;
  const dailyRate = recent.size ? recentCount / recent.size : 0;
  const projectedFinal = Math.round(collected + dailyRate * remaining.length);

  let etaDate: string | null = null;
  if (collected >= target) etaDate = dataset.asOf;
  else if (dailyRate > 0) {
    const needed = Math.ceil((target - collected) / dailyRate);
    etaDate = needed <= remaining.length ? remaining[needed - 1] : null;
  }

  const pctOfTarget = pct(collected, target);
  const expectedPct = Math.round(plannedFraction(plan, dataset.asOf) * 1000) / 10;
  const projectedPct = pct(projectedFinal, target);
  return {
    collected,
    target,
    pctOfTarget,
    expectedPct,
    dailyRate: Math.round(dailyRate * 10) / 10,
    remainingDays: remaining.length,
    projectedFinal,
    projectedPct,
    etaDate,
    status: projectedPct >= 98 ? 'on-track' : projectedPct >= 85 ? 'at-risk' : 'behind',
  };
}

/** Cumulative planned vs actual enrolment, continued as a projection after the snapshot date. */
export function buildBurnUp(
  records: SurveyRecord[],
  target: number,
  dataset: Pick<SurveyDataset, 'start' | 'end' | 'asOf'>,
  forecast: Forecast,
): BurnUpPoint[] {
  const plan = workingDays(dataset.start, dataset.end);
  const perDay = new Map<string, number>();
  for (const r of records) perDay.set(r.date, (perDay.get(r.date) ?? 0) + 1);

  let running = 0;
  return plan.map((date, i) => {
    const planned = Math.round((target * (i + 1)) / plan.length);
    if (date <= dataset.asOf) {
      running += perDay.get(date) ?? 0;
      return { date, planned, actual: running, projected: date === dataset.asOf ? running : null };
    }
    const days = plan.filter((d) => d > dataset.asOf && d <= date).length;
    return { date, planned, actual: null, projected: Math.round(forecast.collected + forecast.dailyRate * days) };
  });
}

export interface DistrictProgress {
  state: string;
  district: string;
  collected: number;
  target: number;
  pct: number;
  expectedPct: number;
  gap: number;
  status: ProgressStatus;
}

export function districtProgress(
  records: SurveyRecord[],
  dataset: Pick<SurveyDataset, 'districts' | 'facilities' | 'start' | 'end' | 'asOf'>,
  scope: { state?: string; district?: string } = {},
): DistrictProgress[] {
  const plan = workingDays(dataset.start, dataset.end);
  const expected = plannedFraction(plan, dataset.asOf);
  const counts = new Map<string, number>();
  for (const r of records) counts.set(r.district, (counts.get(r.district) ?? 0) + 1);

  return dataset.districts
    .filter((d) => (!scope.state || d.state === scope.state) && (!scope.district || d.name === scope.district))
    .map((d) => {
      const target = dataset.facilities.filter((f) => f.district === d.name).reduce((s, f) => s + f.target, 0);
      const collected = counts.get(d.name) ?? 0;
      const p = pct(collected, target);
      const expectedPct = Math.round(expected * 1000) / 10;
      return {
        state: d.state,
        district: d.name,
        collected,
        target,
        pct: p,
        expectedPct,
        gap: Math.round(target * expected) - collected,
        status: statusFor(p, expectedPct),
      };
    })
    .sort((a, b) => a.pct - b.pct);
}

export interface FacilityAttention {
  facility: Facility;
  collected: number;
  lastDate: string | null;
  daysSince: number | null;
  reason: 'no-records' | 'stalled' | 'far-behind';
}

/** Facilities that need a call: nothing collected, nothing for two weeks, or under half the expected pace. */
export function facilitiesNeedingAttention(
  records: SurveyRecord[],
  dataset: Pick<SurveyDataset, 'facilities' | 'start' | 'end' | 'asOf'>,
  scope: { state?: string; district?: string } = {},
  limit = 10,
): FacilityAttention[] {
  const plan = workingDays(dataset.start, dataset.end);
  const expected = plannedFraction(plan, dataset.asOf);
  const byFacility = new Map<string, { n: number; last: string | null }>();
  for (const r of records) {
    const cur = byFacility.get(r.facilityCode) ?? { n: 0, last: null };
    cur.n++;
    if (cur.last === null || r.date > cur.last) cur.last = r.date;
    byFacility.set(r.facilityCode, cur);
  }
  const rows: FacilityAttention[] = [];
  for (const facility of dataset.facilities) {
    if (scope.state && facility.state !== scope.state) continue;
    if (scope.district && facility.district !== scope.district) continue;
    const cur = byFacility.get(facility.code) ?? { n: 0, last: null };
    const daysSince = cur.last ? diffDays(cur.last, dataset.asOf) : null;
    let reason: FacilityAttention['reason'] | null = null;
    if (cur.n === 0) reason = 'no-records';
    else if (daysSince !== null && daysSince > 14) reason = 'stalled';
    else if (cur.n < facility.target * expected * 0.5) reason = 'far-behind';
    if (reason) rows.push({ facility, collected: cur.n, lastDate: cur.last, daysSince, reason });
  }
  const weight = { 'no-records': 0, stalled: 1, 'far-behind': 2 } as const;
  return rows.sort((a, b) => weight[a.reason] - weight[b.reason] || a.collected - b.collected).slice(0, limit);
}

export { addDays };
