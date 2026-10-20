import { BurnUpChart } from '@/components/explore/charts';
import { Panel, ProgressBar, StatusBadge } from '@/components/explore/ui-bits';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { collectorStats, FLAG_LABELS } from '@/lib/survey/collectors';
import { formatDate } from '@/lib/survey/dates';
import { buildBurnUp, buildForecast, districtProgress, facilitiesNeedingAttention } from '@/lib/survey/progress';
import type { ExploreView } from '@/lib/survey/view';

const REASONS = { 'no-records': 'No records yet', stalled: 'No records for 2+ weeks', 'far-behind': 'Under half the expected pace' } as const;

export function FieldworkTab({ view }: { view: ExploreView }) {
  const { dataset, scope, scopeClean, scopeTarget } = view;
  const forecast = buildForecast(scopeClean, scopeTarget, dataset);
  const points = buildBurnUp(scopeClean, scopeTarget, dataset, forecast);
  const districts = districtProgress(scopeClean, dataset, scope);
  const attention = facilitiesNeedingAttention(scopeClean, dataset, scope);
  const collectors = collectorStats(scopeClean, dataset.collectors);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Fieldwork views follow the state and district filters; gender and date filters do not apply to enrolment.</p>
      <Panel
        title="Enrolment against plan"
        description={`Cumulative respondents versus the plan, with a projection to ${formatDate(dataset.end)} at the last two weeks' pace.`}
        action={<StatusBadge status={forecast.status} />}
      >
        <BurnUpChart points={points} asOf={dataset.asOf} />
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Collected</dt>
            <dd className="tabular text-lg font-semibold">{forecast.collected.toLocaleString('en-IN')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Recent pace</dt>
            <dd className="tabular text-lg font-semibold">{forecast.dailyRate}/day</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Projected final</dt>
            <dd className="tabular text-lg font-semibold">
              {forecast.projectedFinal.toLocaleString('en-IN')} ({forecast.projectedPct}%)
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Target reached</dt>
            <dd className="text-lg font-semibold">{forecast.etaDate ? formatDate(forecast.etaDate) : 'Not before end'}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title="District progress" description="The tick on each bar marks where the plan says progress should be today.">
        <ul className="space-y-4">
          {districts.map((d) => (
            <li key={d.district} className="grid items-center gap-2 sm:grid-cols-[10rem_1fr_13rem] sm:gap-4">
              <div>
                <p className="font-medium">{d.district}</p>
                <p className="text-xs text-muted-foreground">{d.state}</p>
              </div>
              <ProgressBar value={d.pct} expected={d.expectedPct} label={`${d.district} progress`} />
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="tabular whitespace-nowrap text-sm text-muted-foreground">
                  {d.collected.toLocaleString('en-IN')} / {d.target.toLocaleString('en-IN')}
                </span>
                <StatusBadge status={d.status} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Facilities to call" description="No data, gone quiet, or far below pace.">
          {attention.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every facility in view is reporting at a healthy pace.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead>Why</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attention.map((a) => (
                  <TableRow key={a.facility.code}>
                    <TableCell>
                      <span className="font-medium">{a.facility.name}</span>
                      <span className="block text-xs text-muted-foreground">{a.facility.code}</span>
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {a.collected} / {a.facility.target}
                    </TableCell>
                    <TableCell className="text-sm">{REASONS[a.reason]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        <Panel title="Collector leaderboard" description="Output and pace per data collector.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collector</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="text-right">Per day</TableHead>
                <TableHead>Signals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collectors.map((c) => (
                <TableRow key={c.collectorId}>
                  <TableCell className="font-medium">{c.label}</TableCell>
                  <TableCell className="tabular text-right">{c.records.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="tabular text-right">{c.perDay}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.flags.length ? c.flags.map((f) => <Badge key={f} variant="warning">{FLAG_LABELS[f]}</Badge>) : <span className="text-sm text-muted-foreground">None</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </div>
  );
}
