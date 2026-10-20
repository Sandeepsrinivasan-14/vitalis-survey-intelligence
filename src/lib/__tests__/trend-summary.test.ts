import { describe, expect, it } from 'vitest';
import { gapToTarget, summarizeDashboard } from '../trend-summary';
import type { ServiceCategory } from '@/data/mock-data';

const data: ServiceCategory[] = [
  {
    id: 'a', name: 'Alpha',
    indicators: [
      { id: '1', name: 'Coverage', value: 60, unit: '%', target: 90, status: 'bad' },
      { id: '2', name: 'Screening', value: 95, unit: '%', target: 90, status: 'good' },
      { id: '3', name: 'Missing', unit: '%', status: 'data_unavailable' },
    ],
  },
  { id: 'b', name: 'Beta', indicators: [{ id: '4', name: 'Fine', value: 5, unit: 'd', status: 'good' }] },
];

describe('trend summary', () => {
  it('computes the gap to target', () => {
    expect(gapToTarget(data[0].indicators[0])).toBeCloseTo(-33.3, 0);
    expect(gapToTarget(data[1].indicators[0])).toBeNull();
    expect(gapToTarget({ id: 'x', name: 'x', value: 'text', unit: '', target: 5 })).toBeNull();
  });

  it('summarises counts and flags concerns', () => {
    const r = summarizeDashboard(data, 'file.csv');
    expect(r.summary).toContain('4 indicators across 2 categories');
    expect(r.summary).toContain('2 are on track, 1 need attention and 1 have no data');
    expect(r.summary).toContain('Coverage (60%, 33% below target)');
    expect(r.categorySpecificInsights).toHaveLength(1);
    expect(r.categorySpecificInsights[0].categoryName).toBe('Alpha');
  });

  it('handles empty data', () => {
    expect(summarizeDashboard([]).summary).toContain('0 indicators');
  });
});
