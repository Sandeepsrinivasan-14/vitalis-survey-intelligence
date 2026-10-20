import { describe, expect, it } from 'vitest';
import {
  createSeededRandom,
  hwcDistrictMockData,
  hwcPhcMockData,
  hwcSummaryMockData,
  healthDashboardData,
} from './mock-data';

describe('createSeededRandom', () => {
  it('is deterministic for a given seed', () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces values in [0, 1)', () => {
    const rand = createSeededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('HWC mock data', () => {
  it('has one record per facility and matches the summary', () => {
    expect(hwcPhcMockData).toHaveLength(hwcSummaryMockData.numPhcs);
    expect(hwcDistrictMockData).toHaveLength(hwcSummaryMockData.numDistricts);
  });

  it('has unique PHC record ids', () => {
    const ids = new Set(hwcPhcMockData.map((p) => p.id));
    expect(ids.size).toBe(hwcPhcMockData.length);
  });

  it('uses only fictional states', () => {
    const states = new Set(hwcDistrictMockData.map((d) => d.state));
    expect([...states].sort()).toEqual(['Eastmere', 'Northvale', 'Sunreach']);
  });

  it('adds facility counts up to the total valid records', () => {
    const total = hwcPhcMockData.reduce((sum, p) => sum + p.patientCount, 0);
    expect(total).toBe(hwcSummaryMockData.totalValidRecords);
  });

  it('has a gender distribution that sums to the total valid records', () => {
    const { male, female, transgender } = hwcSummaryMockData.genderDistribution;
    expect(male + female + transgender).toBe(hwcSummaryMockData.totalValidRecords);
  });
});

describe('health dashboard data', () => {
  it('has categories with indicators', () => {
    expect(healthDashboardData.length).toBeGreaterThan(0);
    for (const category of healthDashboardData) {
      expect(category.indicators.length).toBeGreaterThan(0);
    }
  });
});
