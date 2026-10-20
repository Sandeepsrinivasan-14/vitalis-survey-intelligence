import { Target, Users, UserX } from 'lucide-react';
import { Panel, Kpi, ProgressBar } from '@/components/explore/ui-bits';
import { Badge } from '@/components/ui/badge';
import { COVERAGE_LABEL, COVERAGE_THRESHOLDS, buildCoverage, type CoverageFigures, type CoverageStatus } from '@/lib/survey/coverage';
import type { ExploreView } from '@/lib/survey/view';

const VARIANT: Record<CoverageStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  good: 'success',
  moderate: 'warning',
  low: 'destructive',
  'no-population': 'secondary',
};

export function CoverageBadge({ status }: { status: CoverageStatus }) {
  return <Badge variant={VARIANT[status]}>{COVERAGE_LABEL[status]}</Badge>;
}

/** Rate line with the original "cannot be determined" behaviour when there is no population. */
export function CoverageMeter({ figures, label }: { figures: CoverageFigures; label: string }) {
  if (figures.rate === null) {
    return (
      <p className="text-sm text-muted-foreground">
        {figures.recorded > 0
          ? `${figures.recorded.toLocaleString('en-IN')} patients are recorded, but no population figure exists for this selection, so the coverage rate cannot be determined.`
          : 'No population figure and no recorded patients for this selection.'}
      </p>
    );
  }
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular font-medium">{figures.rate.toFixed(1)}%</span>
      </div>
      <ProgressBar value={figures.rate} label={label} />
      {figures.overCovered ? <p className="mt-1 text-xs text-warning">More patients are recorded than the register lists: check the register or for duplicate enrolment.</p> : null}
    </div>
  );
}

export function CoverageTab({ view }: { view: ExploreView }) {
  const { dataset, scope, scopeClean } = view;
  const report = buildCoverage(scopeClean, dataset, scope);
  const { overall } = report;
  const under = report.byGender.filter((g) => g.underRepresented);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Coverage is the share of each facility&apos;s eligible adult register that has a recorded survey patient. It follows the state and district filters; gender and date filters do not apply. Register sizes are synthetic in this demonstration.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi title="Eligible population" value={overall.population.toLocaleString('en-IN')} hint="Adults on facility registers" icon={<Users className="h-5 w-5" />} />
        <Kpi title="Patients recorded" value={overall.recorded.toLocaleString('en-IN')} hint="Clean, de-duplicated records" icon={<Target className="h-5 w-5" />} />
        <Kpi title="Not yet reached" value={overall.notReached.toLocaleString('en-IN')} hint={overall.rate === null ? 'No population data' : `${(100 - overall.rate).toFixed(1)}% of the register`} icon={<UserX className="h-5 w-5" />} />
      </div>

      <Panel title="Overall coverage rate" description={`Well covered from ${COVERAGE_THRESHOLDS.good * 100}%, partly covered from ${COVERAGE_THRESHOLDS.moderate * 100}%.`} action={<CoverageBadge status={overall.status} />}>
        <CoverageMeter figures={overall} label="Coverage rate" />
      </Panel>

      <Panel
        title="Coverage by gender"
        description="A group is flagged as under-represented when its coverage is below 80% of the overall rate."
      >
        <ul className="space-y-4">
          {report.byGender.map((g) => (
            <li key={g.gender} className="grid items-center gap-2 sm:grid-cols-[10rem_1fr_14rem] sm:gap-4">
              <p className="font-medium capitalize">{g.gender}</p>
              <CoverageMeter figures={g} label={`${g.gender} coverage`} />
              <p className="tabular whitespace-nowrap text-sm text-muted-foreground sm:text-right">
                {g.recorded.toLocaleString('en-IN')} / {g.population.toLocaleString('en-IN')}
                {g.underRepresented ? <Badge variant="warning" className="ml-2">Under-represented</Badge> : null}
              </p>
            </li>
          ))}
        </ul>
        {under.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No gender group is under-represented in this view.</p> : null}
      </Panel>

      <Panel title="Coverage by district" description="Lowest first, so the places that need more outreach come first.">
        <ul className="space-y-4">
          {report.byDistrict.map((d) => (
            <li key={d.key} className="grid items-center gap-2 sm:grid-cols-[10rem_1fr_15rem] sm:gap-4">
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.parent}</p>
              </div>
              <CoverageMeter figures={d} label={`${d.name} coverage`} />
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="tabular whitespace-nowrap text-sm text-muted-foreground">
                  {d.recorded.toLocaleString('en-IN')} / {d.population.toLocaleString('en-IN')}
                </span>
                <CoverageBadge status={d.status} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Facilities with low coverage" description="Lowest coverage first. These are the best places for extra outreach.">
        {report.lowCoverage.length === 0 ? (
          <p className="text-sm text-muted-foreground">No facility in view is below the low-coverage threshold.</p>
        ) : (
          <ul className="divide-y divide-border">
            {report.lowCoverage.map((f) => (
              <li key={f.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{f.name}</span> <span className="text-muted-foreground">{f.parent}</span>
                </span>
                <span className="tabular text-muted-foreground">
                  {f.recorded} of {f.population.toLocaleString('en-IN')} · {f.rate?.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
