import { collectorStats, FLAG_LABELS } from './collectors';
import { districtProgress, facilitiesNeedingAttention } from './progress';
import { assessQuality } from './quality';
import { districtClinical } from './stats';
import type { SurveyDataset, SurveyRecord } from './types';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface SurveyAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  tab: 'fieldwork' | 'quality' | 'clinical';
}

const ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * Rule-based alerts: deterministic, explainable and cheap, so they work offline
 * with no AI service. `raw` is the unfiltered-by-quality set, `clean` the analysis set.
 */
export function buildAlerts(
  raw: SurveyRecord[],
  clean: SurveyRecord[],
  dataset: SurveyDataset,
  scope: { state?: string; district?: string } = {},
): SurveyAlert[] {
  const alerts: SurveyAlert[] = [];

  for (const d of districtProgress(clean, dataset, scope)) {
    if (d.status === 'behind') {
      alerts.push({
        id: `behind-${d.district}`,
        severity: 'critical',
        title: `${d.district} is well behind schedule`,
        detail: `${d.pct}% of target collected against ${d.expectedPct}% expected, a gap of about ${Math.max(d.gap, 0).toLocaleString('en-IN')} respondents.`,
        tab: 'fieldwork',
      });
    } else if (d.status === 'at-risk') {
      alerts.push({
        id: `risk-${d.district}`,
        severity: 'warning',
        title: `${d.district} is slipping`,
        detail: `${d.pct}% collected against ${d.expectedPct}% expected.`,
        tab: 'fieldwork',
      });
    }
  }

  const stalled = facilitiesNeedingAttention(clean, dataset, scope, 100).filter((f) => f.reason !== 'far-behind');
  if (stalled.length) {
    alerts.push({
      id: 'stalled-facilities',
      severity: 'warning',
      title: `${stalled.length} facilit${stalled.length === 1 ? 'y has' : 'ies have'} gone quiet`,
      detail: 'No records for two weeks or more, or none at all. Check staffing and connectivity.',
      tab: 'fieldwork',
    });
  }

  const quality = assessQuality(raw, dataset.asOf);
  const dupShare = (quality.byType['duplicate-id'] / Math.max(quality.total, 1)) * 100;
  if (dupShare >= 1) {
    alerts.push({
      id: 'duplicates',
      severity: dupShare >= 3 ? 'critical' : 'warning',
      title: `${quality.byType['duplicate-id']} duplicate respondent IDs`,
      detail: `${dupShare.toFixed(1)}% of submitted records repeat an existing ID. They are excluded from every figure on this site.`,
      tab: 'quality',
    });
  }
  if (quality.cleanRate < 90) {
    alerts.push({
      id: 'clean-rate',
      severity: 'warning',
      title: `Only ${quality.cleanRate}% of records pass every check`,
      detail: 'Review the data-quality tab for the most common problems and the districts affected.',
      tab: 'quality',
    });
  }

  for (const c of collectorStats(clean, dataset.collectors)) {
    if (!c.flags.length) continue;
    alerts.push({
      id: `collector-${c.collectorId}`,
      severity: c.flags.some((f) => f !== 'high-throughput') ? 'critical' : 'info',
      title: `${c.label}: ${c.flags.map((f) => FLAG_LABELS[f].toLowerCase()).join(', ')}`,
      detail: 'A pattern worth a supervisory spot-check. It is a prompt for review, not proof of a problem.',
      tab: 'quality',
    });
  }

  const hot = districtClinical(clean).filter((d) => d.n >= 100);
  if (hot.length) {
    const worst = hot[0];
    alerts.push({
      id: 'hypertension-hotspot',
      severity: 'info',
      title: `Highest hypertension rate: ${worst.district} (${worst.hypertensionRate}%)`,
      detail: `Based on ${worst.n.toLocaleString('en-IN')} respondents. Mean salt intake there is ${worst.meanSalt ?? '–'} g/day.`,
      tab: 'clinical',
    });
  }

  return alerts.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
