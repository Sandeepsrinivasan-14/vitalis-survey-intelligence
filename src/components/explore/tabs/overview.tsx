import { Activity, Building2, Droplets, HeartPulse, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { GenderDonut } from '@/components/landing/survey-charts';
import { AgePyramid } from '@/components/explore/charts';
import { Kpi, Panel, SeverityBadge } from '@/components/explore/ui-bits';
import { buildAlerts } from '@/lib/survey/alerts';
import { formatDate } from '@/lib/survey/dates';
import { filtersToQuery } from '@/lib/survey/filters';
import { buildForecast } from '@/lib/survey/progress';
import { assessQuality } from '@/lib/survey/quality';
import { ageBands, SALT_LIMIT_G, summarize } from '@/lib/survey/stats';
import type { ExploreView } from '@/lib/survey/view';

export function OverviewTab({ view }: { view: ExploreView }) {
  const { dataset, clean, raw, filters, scope, scopeClean, scopeTarget } = view;
  const summary = summarize(clean);
  const forecast = buildForecast(scopeClean, scopeTarget, dataset);
  const quality = assessQuality(raw, dataset.asOf);
  const alerts = buildAlerts(raw, clean, dataset, scope);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi title="Respondents" value={summary.total.toLocaleString('en-IN')} hint={summary.lastDate ? `Latest ${formatDate(summary.lastDate)}` : undefined} icon={<Users className="h-5 w-5" />} />
        <Kpi title="Target progress" value={`${forecast.pctOfTarget}%`} hint={`${forecast.expectedPct}% expected by now`} icon={<Activity className="h-5 w-5" />} />
        <Kpi title="Facilities reporting" value={summary.facilities} hint={`${summary.collectors} collectors`} icon={<Building2 className="h-5 w-5" />} />
        <Kpi title="Hypertension" value={`${summary.hypertension.rate}%`} hint="≥ 140/90 mmHg" icon={<HeartPulse className="h-5 w-5" />} />
        <Kpi title="Mean salt intake" value={summary.salt.mean === null ? '–' : `${summary.salt.mean.toFixed(1)} g`} hint={`${summary.salt.aboveLimit}% above ${SALT_LIMIT_G} g/day`} icon={<Droplets className="h-5 w-5" />} />
        <Kpi title="Clean-record rate" value={`${quality.cleanRate}%`} hint={`${quality.flaggedRecords.toLocaleString('en-IN')} flagged`} icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Who we are reaching" description="Gender split of respondents in view.">
          <GenderDonut counts={summary.genders} />
        </Panel>
        <Panel title="Age profile" description="Respondents by age band and gender.">
          <AgePyramid data={ageBands(clean)} />
        </Panel>
      </div>

      <Panel title="Needs attention" description="Rules-based alerts from fieldwork, data quality and clinical signals.">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing needs attention for this view.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {alerts.slice(0, 8).map((a) => (
              <li key={a.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
                <div className="shrink-0 sm:w-20">
                  <SeverityBadge severity={a.severity} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.detail}</p>
                </div>
                <Link href={`/explore?${filtersToQuery(filters, { tab: a.tab })}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
