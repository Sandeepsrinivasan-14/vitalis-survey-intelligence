import { describe, expect, it } from 'vitest';
import { buildCoverage, coverageOf, coverageStatus, facilityPopulation, totalOf } from '../coverage';
import { loadView } from '../view';

describe('coverage maths', () => {
  it('computes rate, remaining population and status', () => {
    const c = coverageOf(200, 30);
    expect(c.rate).toBe(15);
    expect(c.notReached).toBe(170);
    expect(c.status).toBe('moderate');
  });
  it('cannot determine a rate without a population, like the original dashboard', () => {
    const c = coverageOf(0, 12);
    expect(c.rate).toBeNull();
    expect(c.status).toBe('no-population');
    expect(coverageOf(0, 0).rate).toBeNull();
  });
  it('flags more patients than population instead of hiding it', () => {
    const c = coverageOf(50, 60);
    expect(c.overCovered).toBe(true);
    expect(c.notReached).toBe(0);
  });
  it('uses the status thresholds at their boundaries', () => {
    expect(coverageStatus(100, 20)).toBe('good');
    expect(coverageStatus(100, 12)).toBe('moderate');
    expect(coverageStatus(100, 11)).toBe('low');
  });
  it('builds a deterministic population that always includes every gender', () => {
    const f = { code: 'NV-ASH-01', target: 55 };
    expect(facilityPopulation(f)).toEqual(facilityPopulation(f));
    const p = facilityPopulation(f);
    expect(p.female).toBeGreaterThan(0);
    expect(p.male).toBeGreaterThan(0);
    expect(p.transgender).toBeGreaterThanOrEqual(1);
    expect(totalOf(p)).toBeGreaterThan(55);
  });
});

describe('buildCoverage', () => {
  const all = loadView({});
  const report = buildCoverage(all.scopeClean, all.dataset, all.scope);

  it('adds up across districts, facilities and genders', () => {
    const sum = (xs: { recorded: number; population: number }[], k: 'recorded' | 'population') => xs.reduce((s, x) => s + x[k], 0);
    expect(report.byFacility).toHaveLength(72);
    expect(report.byDistrict).toHaveLength(12);
    for (const k of ['recorded', 'population'] as const) {
      expect(sum(report.byFacility, k)).toBe(report.overall[k]);
      expect(sum(report.byDistrict, k)).toBe(report.overall[k]);
      expect(sum(report.byGender, k)).toBe(report.overall[k]);
    }
    expect(report.overall.recorded).toBe(all.scopeClean.length);
  });
  it('sorts the weakest first and surfaces the slowest district', () => {
    expect(report.byDistrict[0].name).toBe('Fairhaven');
    const rates = report.byFacility.map((f) => f.rate ?? 0);
    expect([...rates].sort((a, b) => a - b)).toEqual(rates);
    expect(report.lowCoverage.every((f) => f.status === 'low')).toBe(true);
  });
  it('narrows with scope', () => {
    const v = loadView({ district: 'Fairhaven' });
    const r = buildCoverage(v.scopeClean, v.dataset, v.scope);
    expect(r.byDistrict).toHaveLength(1);
    expect(r.byFacility).toHaveLength(6);
    expect(r.overall.recorded).toBe(v.scopeClean.length);
  });
  it('flags a group whose coverage is far below the overall rate', () => {
    const skewed = all.scopeClean.filter((r) => r.gender !== 'female' || r.id.charCodeAt(r.id.length - 1) % 3 === 0);
    const r = buildCoverage(skewed, all.dataset, all.scope);
    expect(r.byGender.find((g) => g.gender === 'female')!.underRepresented).toBe(true);
    expect(report.byGender.some((g) => g.underRepresented)).toBe(false);
  });
});
