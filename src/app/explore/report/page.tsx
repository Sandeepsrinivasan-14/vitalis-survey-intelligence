import type { Metadata } from 'next';
import { PrintButton } from '@/components/explore/print-button';
import { SeverityBadge, StatusBadge } from '@/components/explore/ui-bits';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildAlerts } from '@/lib/survey/alerts';
import { buildBriefing } from '@/lib/survey/briefing';
import { formatDate } from '@/lib/survey/dates';
import { districtProgress } from '@/lib/survey/progress';
import { loadView } from '@/lib/survey/view';

export const metadata: Metadata = { title: 'Executive brief', robots: { index: false } };

type Params = Record<string, string | string[] | undefined>;

export default async function ReportPage({ searchParams }: { searchParams: Promise<Params> }) {
  const view = loadView(await searchParams);
  const { dataset, filters, scope, scopeClean, raw, clean } = view;
  const briefing = buildBriefing(view);
  const districts = districtProgress(scopeClean, dataset, scope);
  const alerts = buildAlerts(raw, clean, dataset, scope).slice(0, 6);
  const scopeLabel = filters.district ?? filters.state ?? 'All states';

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Vitalis executive brief</p>
            <h1 className="text-3xl font-semibold">{scopeLabel}</h1>
            <p className="text-muted-foreground">As of {formatDate(dataset.asOf)} · demonstration data</p>
          </div>
          <PrintButton />
        </div>
        <p className="text-lg">{briefing.headline}</p>
      </header>

      <section aria-labelledby="key-points">
        <h2 id="key-points" className="mb-3 text-xl font-semibold">
          Key points
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          {briefing.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="districts">
        <h2 id="districts" className="mb-3 text-xl font-semibold">
          District progress
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>District</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Of target</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {districts.map((d) => (
              <TableRow key={d.district}>
                <TableCell className="font-medium">{d.district}</TableCell>
                <TableCell className="tabular text-right">{d.collected.toLocaleString('en-IN')}</TableCell>
                <TableCell className="tabular text-right">{d.pct}%</TableCell>
                <TableCell className="tabular text-right">{d.expectedPct}%</TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section aria-labelledby="alerts">
        <h2 id="alerts" className="mb-3 text-xl font-semibold">
          Top alerts
        </h2>
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-start gap-3">
              <SeverityBadge severity={a.severity} />
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-muted-foreground">{a.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
        Generated from fixed rules on synthetic data. Collector signals are prompts for review, not findings of fault.
      </footer>
    </article>
  );
}
