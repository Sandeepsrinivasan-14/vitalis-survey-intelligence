import { DigitPreferenceBars, IssueBars } from '@/components/explore/charts';
import { Kpi, Panel, ProgressBar } from '@/components/explore/ui-bits';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collectorStats, FLAG_LABELS } from '@/lib/survey/collectors';
import { assessQuality, ISSUE_LABELS, type IssueType } from '@/lib/survey/quality';
import type { ExploreView } from '@/lib/survey/view';
import { AlertTriangle, CopyX, FileCheck2, ListChecks } from 'lucide-react';

export function QualityTab({ view }: { view: ExploreView }) {
  const { dataset, raw, scopeClean } = view;
  const report = assessQuality(raw, dataset.asOf);
  const issueRows = (Object.keys(report.byType) as IssueType[]).map((t) => ({ label: ISSUE_LABELS[t], count: report.byType[t] }));
  const collectors = collectorStats(scopeClean, dataset.collectors);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi title="Submitted records" value={report.total.toLocaleString('en-IN')} icon={<ListChecks className="h-5 w-5" />} />
        <Kpi title="Clean-record rate" value={`${report.cleanRate}%`} hint="Pass every check" icon={<FileCheck2 className="h-5 w-5" />} />
        <Kpi title="Flagged records" value={report.flaggedRecords.toLocaleString('en-IN')} hint={`${report.issueCount.toLocaleString('en-IN')} issues`} icon={<AlertTriangle className="h-5 w-5" />} />
        <Kpi title="Duplicate IDs" value={report.byType['duplicate-id'].toLocaleString('en-IN')} hint="Excluded from all figures" icon={<CopyX className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="What is going wrong" description="Issues found, by type.">
          <IssueBars data={issueRows} />
        </Panel>
        <Panel title="Completeness" description="Share of submitted records with each field filled in.">
          <ul className="space-y-3">
            {report.completeness.map((c) => (
              <li key={c.field} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-3 text-sm">
                <span>{c.label}</span>
                <ProgressBar value={c.pct} label={`${c.label} completeness`} />
                <span className="tabular text-right text-muted-foreground">{c.pct}%</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        title="Collector integrity signals"
        description="Honest blood-pressure readings end in 0 about one time in ten. Much more than that, or answers that barely vary, are prompts for a supervisor spot-check, not proof."
      >
        <DigitPreferenceBars data={collectors.map((c) => ({ label: c.label, digitZeroShare: c.digitZeroShare, flagged: c.flags.includes('digit-preference') }))} />
        <ul className="mt-3 flex flex-wrap gap-2">
          {collectors
            .filter((c) => c.flags.length)
            .map((c) => (
              <li key={c.collectorId}>
                <Badge variant="warning">
                  {c.label}: {c.flags.map((f) => FLAG_LABELS[f]).join(', ')}
                </Badge>
              </li>
            ))}
        </ul>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Clean-record rate by district" description="Lowest first.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>District</TableHead>
                <TableHead className="text-right">Submitted</TableHead>
                <TableHead className="text-right">Flagged</TableHead>
                <TableHead className="text-right">Clean</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.byDistrict.map((d) => (
                <TableRow key={d.district}>
                  <TableCell className="font-medium">{d.district}</TableCell>
                  <TableCell className="tabular text-right">{d.total.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="tabular text-right">{d.flagged.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="tabular text-right">{d.cleanRate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel title="Sample of flagged records" description={`First 12 of ${report.issueCount.toLocaleString('en-IN')} issues.`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.issues.slice(0, 12).map((i, idx) => (
                <TableRow key={`${i.recordId}-${i.field}-${idx}`}>
                  <TableCell className="font-mono text-xs">{i.recordId}</TableCell>
                  <TableCell className="text-sm">{ISSUE_LABELS[i.type]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </div>
  );
}
