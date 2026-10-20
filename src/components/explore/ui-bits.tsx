import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ProgressStatus } from '@/lib/survey/progress';
import type { AlertSeverity } from '@/lib/survey/alerts';
import { cn } from '@/lib/utils';

export function Kpi({ title, value, hint, icon }: { title: string; value: ReactNode; hint?: ReactNode; icon: ReactNode }) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-start justify-between gap-3 p-5 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground" aria-hidden="true">
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}

const STATUS: Record<ProgressStatus, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  'on-track': { label: 'On track', variant: 'success' },
  'at-risk': { label: 'At risk', variant: 'warning' },
  behind: { label: 'Behind', variant: 'destructive' },
};

export function StatusBadge({ status }: { status: ProgressStatus }) {
  const s = STATUS[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const SEVERITY: Record<AlertSeverity, { label: string; variant: 'destructive' | 'warning' | 'info' }> = {
  critical: { label: 'Critical', variant: 'destructive' },
  warning: { label: 'Warning', variant: 'warning' },
  info: { label: 'Info', variant: 'info' },
};

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const s = SEVERITY[severity];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

/** Progress bar with a tick showing where the plan says progress should be today. */
export function ProgressBar({ value, expected, label }: { value: number; expected?: number; label: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className={cn('h-full rounded-full bg-brand-gradient')} style={{ width: `${v}%` }} />
      {expected !== undefined ? (
        <span
          aria-hidden="true"
          className="absolute top-0 h-full w-0.5 bg-foreground/70"
          style={{ left: `${Math.min(100, Math.max(0, expected))}%` }}
          title={`Expected by now: ${expected}%`}
        />
      ) : null}
    </div>
  );
}

export function Panel({ title, description, children, className, action }: { title: string; description?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn('glass min-w-0 rounded-2xl p-5 sm:p-6', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
