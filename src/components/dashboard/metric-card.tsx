import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, CircleDashed, Eye, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status = 'good' | 'neutral' | 'bad' | 'data_unavailable';

interface MetricCardProps {
  title: string;
  value?: string | number; // Value can be undefined if data is unavailable
  unit?: string;
  icon?: LucideIcon;
  description?: string;
  previousValue?: number;
  target?: number;
  status?: Status;
  trend?: 'up' | 'down' | 'stable';
  lastUpdated?: string;
  actionableNotes?: string;
  trendData?: { label: string; value: number }[];
}

// Status is conveyed by icon + label + colour, never colour alone.
const STATUS_META: Record<
  Status,
  { label: string; icon: LucideIcon; variant: 'success' | 'info' | 'destructive' | 'muted'; accent: string; text: string }
> = {
  good: { label: 'On track', icon: CheckCircle2, variant: 'success', accent: 'bg-success', text: 'text-success' },
  neutral: { label: 'Monitor', icon: Eye, variant: 'info', accent: 'bg-info', text: 'text-info' },
  bad: { label: 'Needs attention', icon: AlertTriangle, variant: 'destructive', accent: 'bg-destructive', text: 'text-destructive' },
  data_unavailable: { label: 'No data', icon: CircleDashed, variant: 'muted', accent: 'bg-muted-foreground/40', text: 'text-muted-foreground' },
};

export function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  description,
  previousValue,
  target,
  status,
  trend,
  lastUpdated,
  actionableNotes,
  trendData,
}: MetricCardProps) {
  let change: number | null = null;
  if (value !== undefined && previousValue !== undefined && typeof value === 'number') {
    if (previousValue === 0) {
      change = value > 0 ? 100 : 0;
    } else {
      change = parseFloat((((value - previousValue) / previousValue) * 100).toFixed(1));
    }
  }
  const changeText = change !== null ? `${change >= 0 ? '+' : ''}${change}% vs prev.` : null;

  const meta = status ? STATUS_META[status] : undefined;
  const displayValue = value !== undefined ? value : 'N/A';
  const progress =
    typeof value === 'number' && target !== undefined && target > 0
      ? Math.max(0, Math.min(100, (value / target) * 100))
      : null;

  return (
    <Card
      className={cn(
        'relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        status === 'data_unavailable' && 'opacity-80',
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-1', meta?.accent ?? 'bg-brand-gradient')} aria-hidden="true" />
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base font-semibold leading-snug">{title}</CardTitle>
          {description && <CardDescription className="pt-1 text-xs">{description}</CardDescription>}
        </div>
        {Icon && <Icon className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </CardHeader>
      <CardContent className="flex flex-grow flex-col justify-between">
        <div>
          <div className="tabular break-words text-3xl font-semibold tracking-tight">
            {displayValue}
            {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {changeText && (
              <p className={cn('text-xs font-medium', change !== null && change < 0 ? 'text-warning' : 'text-success')}>
                {changeText}
              </p>
            )}
            {trend && trend !== 'stable' && (
              <span className="flex items-center text-xs text-muted-foreground">
                {trend === 'up' ? (
                  <TrendingUp className="mr-1 h-3 w-3" aria-hidden="true" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" aria-hidden="true" />
                )}
                {trend}
              </span>
            )}
            {trend === 'stable' && (
              <span className="flex items-center text-xs text-muted-foreground">
                <Minus className="mr-1 h-3 w-3" aria-hidden="true" />
                stable
              </span>
            )}
          </div>

          {trendData && trendData.length >= 2 && <Sparkline points={trendData} className={meta?.text ?? 'text-primary'} />}

          {progress !== null && (
            <div className="mt-3" aria-hidden="true">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', meta?.accent ?? 'bg-primary')} style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {target !== undefined && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Target: {target}
              {unit && !/^[%°]/.test(unit) ? ` ${unit}` : unit}
            </p>
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          {meta && (
            <Badge variant={meta.variant} className="gap-1">
              <meta.icon className="h-3 w-3" aria-hidden="true" />
              {meta.label}
            </Badge>
          )}
          {actionableNotes && (
            <p className="border-t border-dashed pt-1.5 text-xs text-foreground/80">
              <span className="font-medium">Notes:</span> {actionableNotes}
            </p>
          )}
          {lastUpdated && <p className="text-xs italic text-muted-foreground">Last updated: {lastUpdated}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/** Dependency-free trend area; accessible via an aria-label summary. */
function Sparkline({ points, className }: { points: { label: string; value: number }[]; className?: string }) {
  const gradientId = useId();
  const w = 140;
  const h = 40;
  const pad = 3;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - pad - ((v - min) / span) * (h - pad * 2),
  }));
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  const first = points[0];
  const last = points[points.length - 1];
  const end = coords[coords.length - 1];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('mt-3 h-10 w-full max-w-[160px] overflow-visible', className)}
      role="img"
      aria-label={`Trend from ${first.value} (${first.label}) to ${last.value} (${last.label})`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={end.x} cy={end.y} r="3" fill="currentColor" />
    </svg>
  );
}
