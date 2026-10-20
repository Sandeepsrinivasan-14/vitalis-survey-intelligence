import { buildAlerts } from './alerts';
import { collectorStats } from './collectors';
import { formatDate } from './dates';
import { buildForecast, districtProgress } from './progress';
import { assessQuality } from './quality';
import { SALT_LIMIT_G, summarize } from './stats';
import type { ExploreView } from './view';

export interface Briefing {
  headline: string;
  points: string[];
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** A plain-language situation report built from fixed rules, so it is repeatable and needs no AI service. */
export function buildBriefing(view: ExploreView): Briefing {
  const { dataset, scopeClean, scopeTarget, scope, clean, raw } = view;
  const forecast = buildForecast(scopeClean, scopeTarget, dataset);
  const districts = districtProgress(scopeClean, dataset, scope);
  const quality = assessQuality(raw, dataset.asOf);
  const summary = summarize(clean);
  const collectors = collectorStats(view.scopeClean, dataset.collectors).filter((c) => c.flags.length);
  const alerts = buildAlerts(raw, clean, dataset, scope);

  const points: string[] = [];

  if (forecast.etaDate && forecast.collected >= forecast.target) {
    points.push('The enrolment target has already been met.');
  } else if (forecast.etaDate) {
    points.push(
      `At the current pace of ${forecast.dailyRate} respondents per working day, the target should be reached around ${formatDate(forecast.etaDate)}.`,
    );
  } else {
    points.push(
      `At the current pace of ${forecast.dailyRate} respondents per working day, fieldwork is projected to finish at ${forecast.projectedPct}% of target (${forecast.projectedFinal.toLocaleString('en-IN')} respondents), short by ${(forecast.target - forecast.projectedFinal).toLocaleString('en-IN')}.`,
    );
  }

  const behind = districts.filter((d) => d.status === 'behind').map((d) => d.district);
  const atRisk = districts.filter((d) => d.status === 'at-risk').map((d) => d.district);
  if (behind.length) points.push(`Behind schedule: ${list(behind)}.${atRisk.length ? ` Slipping: ${list(atRisk)}.` : ''}`);
  else if (atRisk.length) points.push(`Slipping: ${list(atRisk)}.`);
  else points.push('Every district in view is on track.');

  points.push(
    `${quality.cleanRate}% of submitted records pass every quality check; ${quality.byType['duplicate-id'].toLocaleString('en-IN')} duplicate IDs and ${quality.byType['future-date'].toLocaleString('en-IN')} future-dated rows were left out of all figures.`,
  );

  if (collectors.length) {
    points.push(`Spot-check recommended for ${list(collectors.map((c) => c.label))} (unusual data patterns, not proof of error).`);
  }

  if (summary.hypertension.n > 0) {
    points.push(
      `Among ${summary.hypertension.n.toLocaleString('en-IN')} respondents with a valid reading, ${summary.hypertension.rate}% have blood pressure of 140/90 mmHg or higher. Mean salt intake is ${summary.salt.mean?.toFixed(1) ?? '–'} g/day, and ${summary.salt.aboveLimit}% exceed the ${SALT_LIMIT_G} g/day limit.`,
    );
  }

  const critical = alerts.filter((a) => a.severity === 'critical').length;
  return {
    headline: `${forecast.collected.toLocaleString('en-IN')} respondents enrolled: ${forecast.pctOfTarget}% of the ${forecast.target.toLocaleString('en-IN')} target, against ${forecast.expectedPct}% expected by ${formatDate(dataset.asOf)}. ${critical ? `${critical} critical alert${critical > 1 ? 's' : ''} need attention.` : 'No critical alerts.'}`,
    points,
  };
}
