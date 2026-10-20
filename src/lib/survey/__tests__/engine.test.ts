import { describe, expect, it } from 'vitest';
import { buildAlerts } from '../alerts';
import { analysisSet } from '../analysis-set';
import { collectorStats } from '../collectors';
import { CSV_COLUMNS, recordsToCsv, rowsToRecords } from '../csv';
import { diffDays, isValidIsoDate, workingDays } from '../dates';
import { applyFilters, filtersToQuery, parseFilters } from '../filters';
import { buildSurvey, DIGIT_PREFERENCE_COLLECTOR, LOW_VARIANCE_COLLECTOR } from '../generate';
import { buildBurnUp, buildForecast, districtProgress, facilitiesNeedingAttention, statusFor } from '../progress';
import { assessQuality } from '../quality';
import { bpCategoryCounts, classifyBp, hypertensionPrevalence, pearson, saltBpRelation, summarize } from '../stats';

const survey = buildSurvey();
const clean = analysisSet(survey.records, survey.asOf);

describe('generator', () => {
  it('is deterministic for a given seed', () => {
    expect(buildSurvey(1).records.slice(0, 5)).toEqual(buildSurvey(1).records.slice(0, 5));
    expect(buildSurvey(1).records.length).toBe(buildSurvey(1).records.length);
  });
  it('uses fictional places only and has no direct identifiers', () => {
    expect(survey.states).toEqual(['Northvale', 'Sunreach', 'Eastmere']);
    expect(Object.keys(survey.records[0])).not.toContain('name');
  });
  it('produces a realistically sized survey', () => {
    expect(survey.records.length).toBeGreaterThan(2000);
    expect(survey.facilities).toHaveLength(72);
  });
});

describe('dates', () => {
  it('validates ISO dates strictly', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('28-02-2026')).toBe(false);
  });
  it('skips Sundays in the working calendar', () => {
    expect(workingDays('2026-03-02', '2026-03-08')).toHaveLength(6);
    expect(diffDays('2026-03-01', '2026-03-31')).toBe(30);
  });
});

describe('clinical statistics', () => {
  it('classifies blood pressure at the category boundaries', () => {
    expect(classifyBp(119, 79)).toBe('normal');
    expect(classifyBp(125, 70)).toBe('elevated');
    expect(classifyBp(130, 70)).toBe('stage1');
    expect(classifyBp(120, 85)).toBe('stage1');
    expect(classifyBp(140, 70)).toBe('stage2');
    expect(classifyBp(150, 95)).toBe('stage2');
    expect(classifyBp(185, 100)).toBe('crisis');
  });
  it('computes Pearson correlation', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
  });
  it('finds the built-in salt and blood pressure relationship', () => {
    const rel = saltBpRelation(clean);
    expect(rel.r).toBeGreaterThan(0.1);
    expect(rel.r).toBeLessThan(0.6); // realistic: individual noise dominates
    const [lowest, , , , highest] = rel.bands;
    expect(highest.systolic!).toBeGreaterThan(lowest.systolic!);
  });
  it('ignores implausible readings when computing prevalence', () => {
    const base = clean[0];
    const rows = [
      { ...base, systolic: 150, diastolic: 95 },
      { ...base, systolic: 110, diastolic: 70 },
      { ...base, systolic: 400, diastolic: 70 }, // implausible, excluded
      { ...base, systolic: null, diastolic: null }, // missing, excluded
    ];
    expect(hypertensionPrevalence(rows)).toEqual({ n: 2, cases: 1, rate: 50 });
    expect(bpCategoryCounts(rows).reduce((s, c) => s + c.count, 0)).toBe(2);
  });
  it('summarises the analysis set', () => {
    const s = summarize(clean);
    expect(s.total).toBe(clean.length);
    expect(s.facilities).toBeLessThanOrEqual(72);
    expect(s.genders.female + s.genders.male + s.genders.transgender).toBe(s.total);
  });
});

describe('analysis set and filters', () => {
  it('drops duplicate ids and future-dated records', () => {
    const ids = new Set(clean.map((r) => r.id));
    expect(ids.size).toBe(clean.length);
    expect(clean.every((r) => r.date <= survey.asOf)).toBe(true);
    expect(clean.length).toBeLessThan(survey.records.length);
  });
  it('drops invalid filter values and keeps valid ones', () => {
    const f = parseFilters({ state: 'Atlantis', gender: 'female', from: '2026-05-01', to: '2026-04-01' }, survey);
    expect(f.state).toBeUndefined();
    expect(f.gender).toBe('female');
    expect(f.from).toBe('2026-04-01'); // swapped so from <= to
    expect(f.to).toBe('2026-05-01');
  });
  it('rejects a district that does not belong to the chosen state', () => {
    expect(parseFilters({ state: 'Northvale', district: 'Emberly' }, survey).district).toBeUndefined();
    expect(parseFilters({ state: 'Sunreach', district: 'Emberly' }, survey).district).toBe('Emberly');
  });
  it('applies filters and round-trips through a query string', () => {
    const f = { state: 'Sunreach', gender: 'male' as const };
    const rows = applyFilters(clean, f);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.state === 'Sunreach' && r.gender === 'male')).toBe(true);
    expect(filtersToQuery(f, { tab: 'quality' })).toBe('tab=quality&state=Sunreach&gender=male');
  });
});

describe('fieldwork progress', () => {
  it('flags the deliberately lagging district as behind', () => {
    const rows = districtProgress(clean, survey);
    expect(rows[0].district).toBe('Fairhaven'); // built with the slowest pace
    expect(rows[0].status).toBe('behind');
    expect(rows.some((r) => r.status === 'behind')).toBe(true);
    expect(rows.some((r) => r.status === 'on-track')).toBe(true);
  });
  it('maps pace to status', () => {
    expect(statusFor(80, 80)).toBe('on-track');
    expect(statusFor(70, 80)).toBe('at-risk');
    expect(statusFor(40, 80)).toBe('behind');
  });
  it('projects a completion forecast and a burn-up chart', () => {
    const target = survey.facilities.reduce((s, f) => s + f.target, 0);
    const forecast = buildForecast(clean, target, survey);
    expect(forecast.collected).toBe(clean.length);
    expect(forecast.projectedFinal).toBeGreaterThan(forecast.collected);
    const points = buildBurnUp(clean, target, survey, forecast);
    expect(points.at(-1)!.planned).toBe(target);
    expect(points.find((p) => p.date === survey.asOf)!.actual).toBe(clean.length);
    expect(points.at(-1)!.actual).toBeNull();
  });
  it('lists facilities with no records', () => {
    const empty = clean.filter((r) => r.facilityCode !== survey.facilities[0].code);
    const rows = facilitiesNeedingAttention(empty, survey, {}, 5);
    expect(rows[0].reason).toBe('no-records');
    expect(rows[0].facility.code).toBe(survey.facilities[0].code);
  });
});

describe('data quality', () => {
  const report = assessQuality(survey.records, survey.asOf);
  it('finds every kind of injected problem', () => {
    expect(report.byType['duplicate-id']).toBeGreaterThan(0);
    expect(report.byType['missing-value']).toBeGreaterThan(0);
    expect(report.byType['out-of-range']).toBeGreaterThan(0);
    expect(report.byType['future-date']).toBeGreaterThan(0);
    expect(report.cleanRate).toBeGreaterThan(70);
    expect(report.cleanRate).toBeLessThan(100);
  });
  it('reports completeness per field', () => {
    expect(report.completeness.find((c) => c.field === 'age')!.pct).toBeGreaterThan(99);
  });
  it('is perfectly clean on a clean record', () => {
    const one = { ...clean[0], age: 40, systolic: 120, diastolic: 80, saltGrams: 8, bmi: 24, smoker: false };
    expect(assessQuality([one], survey.asOf).issueCount).toBe(0);
  });
  it('catches a systolic reading at or below the diastolic', () => {
    const bad = { ...clean[0], systolic: 80, diastolic: 90 };
    expect(assessQuality([bad], survey.asOf).byType['bp-inconsistent']).toBe(1);
  });
});

describe('collector integrity signals', () => {
  const rows = collectorStats(clean, survey.collectors);
  it('flags the collector who rounds blood pressure', () => {
    expect(rows.find((r) => r.collectorId === DIGIT_PREFERENCE_COLLECTOR)!.flags).toContain('digit-preference');
  });
  it('flags the collector whose salt answers do not vary', () => {
    expect(rows.find((r) => r.collectorId === LOW_VARIANCE_COLLECTOR)!.flags).toContain('low-variance');
  });
  it('leaves most collectors unflagged', () => {
    expect(rows.filter((r) => r.flags.length === 0).length).toBeGreaterThanOrEqual(5);
  });
});

describe('alerts', () => {
  const alerts = buildAlerts(survey.records, clean, survey);
  it('orders critical alerts first', () => {
    expect(alerts.length).toBeGreaterThan(3);
    expect(alerts[0].severity).toBe('critical');
    const order = ['critical', 'warning', 'info'];
    const idx = alerts.map((a) => order.indexOf(a.severity));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
  it('raises collector and duplicate alerts', () => {
    expect(alerts.some((a) => a.id === `collector-${DIGIT_PREFERENCE_COLLECTOR}`)).toBe(true);
    expect(alerts.some((a) => a.id === 'duplicates')).toBe(true);
  });
});

describe('csv', () => {
  it('exports the documented columns', () => {
    const csv = recordsToCsv(clean.slice(0, 3));
    expect(csv.split('\n')[0]).toBe(CSV_COLUMNS.join(','));
    expect(csv.trim().split('\n')).toHaveLength(4);
  });
  it('neutralises spreadsheet formulas in exported cells', () => {
    const csv = recordsToCsv([{ ...clean[0], district: '=HYPERLINK("x")' }]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
  it('parses an uploaded file and reports row problems', () => {
    const { records, fileIssues } = rowsToRecords(
      [
        { unique_id: 'A1', date: '2026-05-01', gender: 'Female', age: '40', systolic: '120', diastolic: '80', salt_g: '7', smoker: 'no' },
        { unique_id: 'A2', date: '01/05/2026', gender: 'male' },
        { unique_id: 'A3', date: '2026-05-02', gender: 'robot' },
      ],
      ['unique_id', 'date', 'gender', 'age', 'systolic', 'diastolic', 'salt_g', 'smoker'],
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ id: 'A1', gender: 'female', age: 40, smoker: false });
    expect(fileIssues).toHaveLength(2);
  });
  it('rejects a file missing required columns', () => {
    const { records, fileIssues } = rowsToRecords([], ['age']);
    expect(records).toHaveLength(0);
    expect(fileIssues[0]).toContain('unique_id');
  });
});
