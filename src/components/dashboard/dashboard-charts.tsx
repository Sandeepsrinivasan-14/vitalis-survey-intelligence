'use client';

import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { DashboardSummary, TargetProgress, TrendIndexSeries } from '@/lib/dashboard-stats';
import { cn } from '@/lib/utils';

export const STATUS_CHART_META = {
  good: { label: 'On track', color: 'hsl(var(--success))' },
  neutral: { label: 'Monitor', color: 'hsl(var(--info))' },
  bad: { label: 'Needs attention', color: 'hsl(var(--destructive))' },
  data_unavailable: { label: 'No data', color: 'hsl(var(--muted-foreground) / 0.5)' },
} as const;

type StatusKey = keyof typeof STATUS_CHART_META;

const statusConfig: ChartConfig = Object.fromEntries(
  Object.entries(STATUS_CHART_META).map(([key, meta]) => [key, { label: meta.label, color: meta.color }]),
);

/** Donut of indicator statuses with the on-track share in the middle. */
export function StatusDonut({ summary }: { summary: DashboardSummary }) {
  const keys = Object.keys(STATUS_CHART_META) as StatusKey[];
  const data = keys
    .map((key) => ({ key, name: STATUS_CHART_META[key].label, value: summary.byStatus[key], fill: STATUS_CHART_META[key].color }))
    .filter((d) => d.value > 0);
  const description = keys.map((k) => `${STATUS_CHART_META[k].label}: ${summary.byStatus[k]}`).join(', ');

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative" role="img" aria-label={`Indicator status breakdown. ${description}`}>
        <ChartContainer config={statusConfig} className="aspect-square h-[190px] w-[190px]" aria-hidden="true">
          <PieChart accessibilityLayer={false}>
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie rootTabIndex={-1} data={data} dataKey="value" nameKey="key" innerRadius="64%" outerRadius="94%" paddingAngle={data.length > 1 ? 3 : 0} cornerRadius={6} stroke="none">
              {data.map((d) => (
                <Cell key={d.key} fill={d.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span className="tabular text-3xl font-semibold">
            {summary.onTrackPercent === null ? '-' : `${summary.onTrackPercent}%`}
          </span>
          <span className="text-xs text-muted-foreground">on track</span>
        </div>
      </div>
      <ul className="w-full space-y-2.5 text-sm sm:w-auto sm:min-w-[170px]">
        {keys.map((key) => (
          <li key={key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_CHART_META[key].color }} aria-hidden="true" />
              {STATUS_CHART_META[key].label}
            </span>
            <span className="tabular font-semibold">{summary.byStatus[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_BAR: Record<StatusKey | 'none', string> = {
  good: 'bg-success',
  neutral: 'bg-info',
  bad: 'bg-destructive',
  data_unavailable: 'bg-muted-foreground/50',
  none: 'bg-primary',
};

/** Horizontal progress-to-target bars. Text carries the exact numbers; colour mirrors the status. */
export function TargetBars({ rows }: { rows: TargetProgress[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium" title={row.name}>
              {row.name}
            </span>
            <span className="tabular shrink-0 text-muted-foreground">
              <span className="font-semibold text-foreground">{row.value}</span> / {row.target} {row.unit}
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-label={`${row.name}: ${row.percent}% of target`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={row.percent}
          >
            <div
              className={cn('h-full rounded-full transition-[width] duration-700 ease-out', STATUS_BAR[row.status ?? 'none'])}
              style={{ width: `${row.percent}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const SERIES_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

/** Multi-line chart of "change since start" (first point = 100) for indicators with a history. */
export function TrendIndexChart({ data }: { data: TrendIndexSeries }) {
  if (data.series.length === 0) return null;
  const config: ChartConfig = Object.fromEntries(
    data.series.map((s, i) => [s.id, { label: s.name, color: `hsl(${SERIES_COLORS[i % SERIES_COLORS.length]})` }]),
  );
  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[260px] w-full"
      role="img"
      aria-label={`Trend index chart for ${data.series.map((s) => s.name).join(', ')}. First period equals 100.`}
    >
      <LineChart data={data.rows} margin={{ left: -8, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={44} domain={['auto', 'auto']} />
        <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {data.series.map((s) => (
          <Line
            key={s.id}
            type="monotone"
            dataKey={s.id}
            stroke={`var(--color-${s.id})`}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
