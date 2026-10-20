import type { Indicator, ServiceCategory } from '@/data/mock-data';

/**
 * Deterministic summary of a dashboard dataset. Used as the "demo mode"
 * analysis when no Gemini key is configured, and unit-testable on its own.
 */

export type TrendSummary = {
  summary: string;
  categorySpecificInsights: Array<{ categoryId: string; categoryName: string; insight: string }>;
};

function numeric(i: Indicator): number | null {
  return typeof i.value === 'number' && Number.isFinite(i.value) ? i.value : null;
}

/** Positive = ahead of target. Direction-agnostic: uses status when present. */
export function gapToTarget(i: Indicator): number | null {
  const v = numeric(i);
  if (v === null || typeof i.target !== 'number' || i.target === 0) return null;
  return ((v - i.target) / Math.abs(i.target)) * 100;
}

export function summarizeDashboard(data: ServiceCategory[], sourceName?: string | null): TrendSummary {
  const all = data.flatMap((c) => c.indicators);
  const good = all.filter((i) => i.status === 'good').length;
  const bad = all.filter((i) => i.status === 'bad').length;
  const missing = all.filter((i) => i.status === 'data_unavailable' || i.value === undefined).length;

  const concerns = all.filter((i) => i.status === 'bad');
  const worst = [...concerns]
    .sort((a, b) => Math.abs(gapToTarget(b) ?? 0) - Math.abs(gapToTarget(a) ?? 0))
    .slice(0, 3);

  const lines = [
    `Demo analysis${sourceName ? ` of ${sourceName}` : ''} (rule-based, no AI model used): ${all.length} indicators across ${data.length} categories.`,
    `${good} are on track, ${bad} need attention and ${missing} have no data.`,
  ];
  if (worst.length > 0) {
    lines.push(
      `Largest concerns: ${worst
        .map((i) => {
          const gap = gapToTarget(i);
          return `${i.name} (${i.value}${i.unit}${gap === null ? '' : `, ${Math.abs(gap).toFixed(0)}% ${gap < 0 ? 'below' : 'above'} target`})`;
        })
        .join('; ')}.`
    );
  } else if (all.length > 0) {
    lines.push('No indicators are flagged as needing attention.');
  }

  const categorySpecificInsights = data
    .map((c) => {
      const flagged = c.indicators.filter((i) => i.status === 'bad');
      if (flagged.length === 0) return null;
      return {
        categoryId: c.id,
        categoryName: c.name,
        insight: `${flagged.length} of ${c.indicators.length} indicators need attention: ${flagged.map((i) => i.name).join(', ')}.`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return { summary: lines.join(' '), categorySpecificInsights };
}
