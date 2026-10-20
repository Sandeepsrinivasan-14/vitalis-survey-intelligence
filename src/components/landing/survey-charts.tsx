'use client';

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { HwcDistrictData, HwcGenderCounts } from '@/data/mock-data';

export const genderChartConfig = {
  female: { label: 'Female', color: 'hsl(var(--chart-1))' },
  male: { label: 'Male', color: 'hsl(var(--chart-2))' },
  transgender: { label: 'Transgender', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;

/** Overall gender split as a donut with the total in the centre. */
export function GenderDonut({ counts }: { counts: HwcGenderCounts }) {
  const data = (Object.keys(genderChartConfig) as (keyof HwcGenderCounts)[]).map((key) => ({
    key,
    name: genderChartConfig[key].label,
    value: counts[key],
    fill: genderChartConfig[key].color,
  }));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="relative">
      <ChartContainer
        config={genderChartConfig}
        className="mx-auto aspect-square max-h-[260px] w-full"
        role="img"
        aria-label={`Gender distribution of ${total} respondents: ${data.map((d) => `${d.name} ${d.value}`).join(', ')}`}
      >
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
          <Pie data={data} dataKey="value" nameKey="key" innerRadius="62%" outerRadius="92%" paddingAngle={3} cornerRadius={6} stroke="none">
            {data.map((d) => (
              <Cell key={d.key} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="tabular text-3xl font-semibold">{total.toLocaleString('en-IN')}</span>
        <span className="text-xs text-muted-foreground">respondents</span>
      </div>
    </div>
  );
}

/** Stacked horizontal bars: gender mix for each district of one state. */
export function DistrictGenderBars({ districts, state }: { districts: HwcDistrictData[]; state: string }) {
  return (
    <ChartContainer
      config={genderChartConfig}
      className="h-[240px] w-full"
      role="img"
      aria-label={`Gender distribution by district in ${state}`}
    >
      <BarChart data={districts} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 0 }} barSize={22}>
        <CartesianGrid horizontal={false} strokeDasharray="3 6" />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={72} />
        <ChartTooltip cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="female" stackId="g" fill="var(--color-female)" radius={[6, 0, 0, 6]} />
        <Bar dataKey="male" stackId="g" fill="var(--color-male)" />
        <Bar dataKey="transgender" stackId="g" fill="var(--color-transgender)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
