import type { Indicator, IndicatorStatus, ServiceCategory } from '@/data/mock-data';

export interface DashboardSummary {
  categories: number;
  indicators: number;
  byStatus: Record<IndicatorStatus | 'unrated', number>;
  /** Indicators that have both a numeric value and a target. */
  withTarget: number;
  /** Share (0-100) of rated indicators that are "good", or null when nothing is rated. */
  onTrackPercent: number | null;
}

export function summarizeCategories(categories: ServiceCategory[]): DashboardSummary {
  const byStatus: DashboardSummary['byStatus'] = { good: 0, neutral: 0, bad: 0, data_unavailable: 0, unrated: 0 };
  let indicators = 0;
  let withTarget = 0;
  for (const category of categories) {
    for (const indicator of category.indicators) {
      indicators += 1;
      byStatus[indicator.status ?? 'unrated'] += 1;
      if (typeof indicator.value === 'number' && indicator.target !== undefined) withTarget += 1;
    }
  }
  const rated = byStatus.good + byStatus.neutral + byStatus.bad;
  return {
    categories: categories.length,
    indicators,
    byStatus,
    withTarget,
    onTrackPercent: rated > 0 ? Math.round((byStatus.good / rated) * 100) : null,
  };
}

export interface TargetProgress {
  id: string;
  name: string;
  unit: string;
  value: number;
  target: number;
  status?: IndicatorStatus;
  /** value / target as a percentage, capped at 100 for the bar. */
  percent: number;
}

/** Indicators that can be drawn as "progress towards target". */
export function targetProgress(indicators: Indicator[]): TargetProgress[] {
  return indicators.flatMap((i) =>
    typeof i.value === 'number' && i.target !== undefined && i.target > 0
      ? [
          {
            id: i.id,
            name: i.name,
            unit: i.unit,
            value: i.value,
            target: i.target,
            status: i.status,
            percent: Math.max(0, Math.min(100, Math.round((i.value / i.target) * 100))),
          },
        ]
      : [],
  );
}

export interface TrendIndexSeries {
  /** One row per time label: { label, [indicatorId]: indexValue }. */
  rows: Array<Record<string, number | string>>;
  series: Array<{ id: string; name: string }>;
}

/**
 * Rebases every indicator that has a history so its first point is 100. That
 * puts metrics with different units (%, minutes, ratios) on one comparable
 * "change since start" chart.
 */
export function trendIndex(indicators: Indicator[]): TrendIndexSeries {
  const usable = indicators.filter(
    (i) => i.trendData && i.trendData.length >= 2 && i.trendData[0].value !== 0,
  );
  const labels: string[] = [];
  for (const i of usable) for (const p of i.trendData!) if (!labels.includes(p.label)) labels.push(p.label);

  const rows = labels.map((label) => {
    const row: Record<string, number | string> = { label };
    for (const i of usable) {
      const base = i.trendData![0].value;
      const point = i.trendData!.find((p) => p.label === label);
      if (point) row[i.id] = Math.round((point.value / base) * 1000) / 10;
    }
    return row;
  });
  return { rows, series: usable.map((i) => ({ id: i.id, name: i.name })) };
}
