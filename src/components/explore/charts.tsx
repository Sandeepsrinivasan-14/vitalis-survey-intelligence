'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { genderChartConfig } from '@/components/landing/survey-charts';
import type { BurnUpPoint } from '@/lib/survey/progress';

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const grid = <CartesianGrid vertical={false} strokeDasharray="3 6" />;
const cursor = { fill: 'hsl(var(--muted) / 0.5)' };

/** Age bands stacked by gender. */
export function AgePyramid({ data }: { data: { label: string; female: number; male: number; transgender: number }[] }) {
  return (
    <ChartContainer config={genderChartConfig} className="h-[260px] w-full" role="img" aria-label="Respondents by age band and gender">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }} barSize={30}>
        {grid}
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip cursor={cursor} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="female" stackId="g" fill="var(--color-female)" />
        <Bar dataKey="male" stackId="g" fill="var(--color-male)" />
        <Bar dataKey="transgender" stackId="g" fill="var(--color-transgender)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

const burnConfig = {
  planned: { label: 'Planned', color: 'hsl(var(--muted-foreground))' },
  actual: { label: 'Collected', color: 'hsl(var(--chart-1))' },
  projected: { label: 'Projected at current pace', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;

/** Planned vs actual cumulative enrolment, continued as a projection after the snapshot date. */
export function BurnUpChart({ points, asOf }: { points: BurnUpPoint[]; asOf: string }) {
  return (
    <ChartContainer config={burnConfig} className="h-[320px] w-full" role="img" aria-label="Cumulative enrolment against plan, with projection">
      <LineChart data={points} margin={{ left: 0, right: 12, top: 8 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} minTickGap={36} />
        <YAxis tickLine={false} axisLine={false} width={48} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => shortDate(String(v))} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <ReferenceLine x={asOf} stroke="hsl(var(--border))" strokeDasharray="4 4" label={{ value: 'Snapshot', position: 'insideTopLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
        <Line dataKey="planned" stroke="var(--color-planned)" strokeDasharray="6 5" strokeWidth={2} dot={false} />
        <Line dataKey="actual" stroke="var(--color-actual)" strokeWidth={3} dot={false} connectNulls={false} />
        <Line dataKey="projected" stroke="var(--color-projected)" strokeWidth={2.5} strokeDasharray="2 5" strokeLinecap="round" dot={false} connectNulls={false} />
      </LineChart>
    </ChartContainer>
  );
}

const BP_COLORS: Record<string, string> = {
  normal: 'hsl(var(--chart-1))',
  elevated: 'hsl(var(--chart-4))',
  stage1: 'hsl(var(--chart-3))',
  stage2: 'hsl(var(--chart-5))',
  crisis: 'hsl(var(--destructive))',
};

const shareConfig = { share: { label: 'Share of respondents (%)', color: 'hsl(var(--chart-1))' } } satisfies ChartConfig;

export function BpCategoryBars({ data }: { data: { category: string; label: string; count: number; share: number }[] }) {
  return (
    <ChartContainer config={shareConfig} className="h-[260px] w-full" role="img" aria-label="Share of respondents in each blood pressure category">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }} barSize={44}>
        {grid}
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} unit="%" />
        <ChartTooltip cursor={cursor} content={<ChartTooltipContent />} />
        <Bar dataKey="share" radius={[8, 8, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.category} fill={BP_COLORS[d.category]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function SaltHistogram({ data }: { data: { label: string; count: number; share: number }[] }) {
  return (
    <ChartContainer config={shareConfig} className="h-[260px] w-full" role="img" aria-label="Distribution of daily salt intake">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }} barSize={44}>
        {grid}
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} unit="%" />
        <ChartTooltip cursor={cursor} content={<ChartTooltipContent />} />
        <Bar dataKey="share" radius={[8, 8, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={d.label} fill={i === 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-3))'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

const bpLineConfig = {
  systolic: { label: 'Systolic (mmHg)', color: 'hsl(var(--chart-5))' },
  diastolic: { label: 'Diastolic (mmHg)', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

/** Mean blood pressure in each salt-intake band: the dose–response view. */
export function SaltBpLine({ data }: { data: { label: string; systolic: number | null; diastolic: number | null }[] }) {
  return (
    <ChartContainer config={bpLineConfig} className="h-[260px] w-full" role="img" aria-label="Mean blood pressure by daily salt intake band">
      <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
        {grid}
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} domain={['dataMin - 6', 'dataMax + 6']} tickFormatter={(v: number) => String(Math.round(v))} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="systolic" stroke="var(--color-systolic)" strokeWidth={3} dot={{ r: 4 }} />
        <Line dataKey="diastolic" stroke="var(--color-diastolic)" strokeWidth={3} dot={{ r: 4 }} />
      </LineChart>
    </ChartContainer>
  );
}

const digitConfig = { digitZeroShare: { label: 'Systolic readings ending in 0 (%)', color: 'hsl(var(--chart-2))' } } satisfies ChartConfig;

/** Honest measurement ends in 0 about one time in ten; much more than that suggests rounding. */
export function DigitPreferenceBars({ data }: { data: { label: string; digitZeroShare: number; flagged: boolean }[] }) {
  return (
    <ChartContainer config={digitConfig} className="h-[260px] w-full" role="img" aria-label="Share of systolic readings ending in zero, per collector">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }} barSize={28}>
        {grid}
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickFormatter={(v: string) => v.replace('Collector ', 'C')} />
        <YAxis tickLine={false} axisLine={false} width={40} unit="%" domain={[0, 100]} />
        <ChartTooltip cursor={cursor} content={<ChartTooltipContent />} />
        <ReferenceLine y={10} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Expected ≈10%', position: 'insideTopLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
        <Bar dataKey="digitZeroShare" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.flagged ? 'hsl(var(--destructive))' : 'hsl(var(--chart-2))'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

const issueConfig = { count: { label: 'Issues', color: 'hsl(var(--chart-3))' } } satisfies ChartConfig;

export function IssueBars({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ChartContainer config={issueConfig} className="h-[240px] w-full" role="img" aria-label="Number of data-quality issues by type">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4 }} barSize={22}>
        <CartesianGrid horizontal={false} strokeDasharray="3 6" />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={170} />
        <ChartTooltip cursor={cursor} content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
