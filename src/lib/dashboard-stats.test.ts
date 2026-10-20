import { describe, expect, it } from 'vitest';
import { summarizeCategories, targetProgress, trendIndex } from './dashboard-stats';
import { healthDashboardData } from '@/data/mock-data';

describe('summarizeCategories', () => {
  it('counts indicators by status and computes the on-track share', () => {
    const summary = summarizeCategories([
      {
        id: 'c',
        name: 'C',
        indicators: [
          { id: '1', name: 'a', unit: '', value: 1, target: 2, status: 'good' },
          { id: '2', name: 'b', unit: '', value: 1, status: 'bad' },
          { id: '3', name: 'c', unit: '', status: 'data_unavailable' },
          { id: '4', name: 'd', unit: '', value: 5 },
        ],
      },
    ]);
    expect(summary).toMatchObject({
      categories: 1,
      indicators: 4,
      withTarget: 1,
      onTrackPercent: 50,
      byStatus: { good: 1, bad: 1, neutral: 0, data_unavailable: 1, unrated: 1 },
    });
  });

  it('returns null for the on-track share when nothing is rated', () => {
    expect(summarizeCategories([]).onTrackPercent).toBeNull();
  });

  it('works on the sample dataset', () => {
    const summary = summarizeCategories(healthDashboardData);
    expect(summary.indicators).toBe(healthDashboardData.flatMap((c) => c.indicators).length);
    expect(summary.onTrackPercent).not.toBeNull();
  });
});

describe('targetProgress', () => {
  it('only includes numeric values with a positive target and caps the bar at 100', () => {
    const rows = targetProgress([
      { id: 'a', name: 'A', unit: '%', value: 45, target: 60 },
      { id: 'b', name: 'B', unit: '%', value: 120, target: 100 },
      { id: 'c', name: 'C', unit: '', value: 'Online', target: 1 },
      { id: 'd', name: 'D', unit: '', value: 5 },
      { id: 'e', name: 'E', unit: '', value: 5, target: 0 },
    ]);
    expect(rows.map((r) => [r.id, r.percent])).toEqual([
      ['a', 75],
      ['b', 100],
    ]);
  });
});

describe('trendIndex', () => {
  it('rebases each series so the first point is 100', () => {
    const { rows, series } = trendIndex([
      {
        id: 'x',
        name: 'X',
        unit: '%',
        trendData: [
          { label: 'Q1', value: 50 },
          { label: 'Q2', value: 75 },
        ],
      },
      { id: 'y', name: 'Y', unit: '', trendData: [{ label: 'Q1', value: 1 }] },
    ]);
    expect(series).toEqual([{ id: 'x', name: 'X' }]);
    expect(rows).toEqual([
      { label: 'Q1', x: 100 },
      { label: 'Q2', x: 150 },
    ]);
  });
});
