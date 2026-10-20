'use client';

import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileUp, ShieldCheck } from 'lucide-react';
import Papa from 'papaparse';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Kpi, Panel, ProgressBar } from '@/components/explore/ui-bits';
import { rowsToRecords } from '@/lib/survey/csv';
import { toIso } from '@/lib/survey/dates';
import { assessQuality, ISSUE_LABELS, type QualityReport } from '@/lib/survey/quality';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 100_000;

interface Result {
  fileName: string;
  rows: number;
  report: QualityReport;
  fileIssues: string[];
}

/** Runs the same quality checks as the main survey on a CSV the visitor picks. The file never leaves the browser. */
export function ValidateTab() {
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handle = (file: File | undefined) => {
    setError(null);
    setResult(null);
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) return setError('Please choose a .csv file.');
    if (file.size > MAX_BYTES) return setError('That file is larger than 10 MB.');
    setBusy(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (parsed) => {
        setBusy(false);
        if (parsed.data.length > MAX_ROWS) return setError(`Files are limited to ${MAX_ROWS.toLocaleString('en-IN')} rows.`);
        if (parsed.data.length === 0) return setError('The file has no data rows.');
        const { records, fileIssues } = rowsToRecords(parsed.data, parsed.meta.fields ?? []);
        setResult({
          fileName: file.name,
          rows: parsed.data.length,
          fileIssues,
          report: assessQuality(records, toIso(new Date())),
        });
      },
      error: () => {
        setBusy(false);
        setError('That file could not be read as CSV.');
      },
    });
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Check a survey file"
        description="Drop in a CSV in the standard layout and get the same completeness, range, duplicate and date checks used on the main survey."
        action={
          <Button asChild variant="outline" size="sm">
            <a href="/templates/survey-template.csv" download>
              <Download aria-hidden="true" />
              Template
            </a>
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 px-6 py-10 text-center">
          <FileUp className="h-8 w-8 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            <ShieldCheck className="mr-1 inline h-4 w-4" aria-hidden="true" />
            Checked in your browser. Nothing is uploaded.
          </p>
          <input ref={input} id="survey-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => handle(e.target.files?.[0])} />
          <Button type="button" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? 'Checking…' : 'Choose CSV file'}
          </Button>
          <label htmlFor="survey-file" className="sr-only">
            Survey CSV file
          </label>
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {busy ? 'Checking file' : result ? `Checked ${result.rows} rows` : ''}
        </p>
        {error ? (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </Panel>

      {result ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi title="Rows read" value={result.rows.toLocaleString('en-IN')} hint={result.fileName} icon={<FileUp className="h-5 w-5" />} />
            <Kpi title="Usable rows" value={result.report.total.toLocaleString('en-IN')} hint={`${(result.rows - result.report.total).toLocaleString('en-IN')} skipped`} icon={<CheckCircle2 className="h-5 w-5" />} />
            <Kpi title="Clean-record rate" value={`${result.report.cleanRate}%`} icon={<ShieldCheck className="h-5 w-5" />} />
            <Kpi title="Issues found" value={result.report.issueCount.toLocaleString('en-IN')} icon={<AlertCircle className="h-5 w-5" />} />
          </div>

          {result.fileIssues.length ? (
            <Panel title="Rows that could not be read" description={`Showing ${Math.min(10, result.fileIssues.length)} of ${result.fileIssues.length}.`}>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {result.fileIssues.slice(0, 10).map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Completeness">
              <ul className="space-y-3">
                {result.report.completeness.map((c) => (
                  <li key={c.field} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-3 text-sm">
                    <span>{c.label}</span>
                    <ProgressBar value={c.pct} label={`${c.label} completeness`} />
                    <span className="tabular text-right text-muted-foreground">{c.pct}%</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Issues by type">
              <ul className="space-y-2 text-sm">
                {(Object.keys(result.report.byType) as (keyof typeof ISSUE_LABELS)[]).map((t) => (
                  <li key={t} className="flex items-center justify-between gap-3">
                    <span>{ISSUE_LABELS[t]}</span>
                    <Badge variant={result.report.byType[t] ? 'warning' : 'success'}>{result.report.byType[t].toLocaleString('en-IN')}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          {result.report.issues.length ? (
            <Panel title="First issues found" description={`Showing ${Math.min(25, result.report.issues.length)} of ${result.report.issues.length.toLocaleString('en-IN')}.`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.report.issues.slice(0, 25).map((i, idx) => (
                    <TableRow key={`${i.recordId}-${i.field}-${idx}`}>
                      <TableCell className="font-mono text-xs">{i.recordId}</TableCell>
                      <TableCell className="text-sm">{ISSUE_LABELS[i.type]}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          ) : (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              No problems found in the rows that could be read.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
