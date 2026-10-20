import { describe, expect, it } from 'vitest';
import { buildBriefing } from '../briefing';
import { loadView } from '../view';

describe('loadView', () => {
  it('applies filters to raw and clean records and scopes the target', () => {
    const all = loadView({});
    const one = loadView({ state: 'Sunreach' });
    expect(one.clean.every((r) => r.state === 'Sunreach')).toBe(true);
    expect(one.scopeTarget).toBe(4 * 6 * 55);
    expect(all.scopeTarget).toBe(12 * 6 * 55);
    expect(all.raw.length).toBeGreaterThan(all.clean.length);
  });
  it('ignores gender for fieldwork scope but not for clinical figures', () => {
    const v = loadView({ gender: 'female' });
    expect(v.clean.every((r) => r.gender === 'female')).toBe(true);
    expect(v.scopeClean.length).toBeGreaterThan(v.clean.length);
  });
});

describe('buildBriefing', () => {
  it('writes a repeatable situation report', () => {
    const view = loadView({});
    const a = buildBriefing(view);
    expect(a).toEqual(buildBriefing(view));
    expect(a.headline).toMatch(/respondents enrolled/);
    expect(a.points.some((p) => p.includes('Fairhaven'))).toBe(true);
    expect(a.points.some((p) => /duplicate IDs/.test(p))).toBe(true);
    expect(a.points.some((p) => /Spot-check/.test(p))).toBe(true);
  });
  it('speaks only about the chosen scope', () => {
    const text = buildBriefing(loadView({ state: 'Northvale' })).points.join(' ');
    expect(text).not.toContain('Fairhaven'); // a Sunreach district
  });
});
