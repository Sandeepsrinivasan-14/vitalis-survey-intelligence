import { AlertTriangle, FileCheck2, HeartPulse, LineChart, Printer, Search } from 'lucide-react';
import Link from 'next/link';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal';

const FEATURES = [
  {
    title: 'Fieldwork forecast',
    body: 'Cumulative enrolment against plan, a projected finish date from the last two weeks of pace, and a status for every district.',
    href: '/explore?tab=fieldwork',
    icon: LineChart,
  },
  {
    title: 'Data-quality centre',
    body: 'Duplicates, gaps, impossible values and future dates, found automatically and counted by district.',
    href: '/explore?tab=quality',
    icon: FileCheck2,
  },
  {
    title: 'Collector integrity signals',
    body: 'Spots blood-pressure rounding and suspiciously uniform answers so supervisors know where to spot-check.',
    href: '/explore?tab=quality',
    icon: AlertTriangle,
  },
  {
    title: 'Salt and blood pressure',
    body: 'Hypertension categories, salt-intake bands, a dose–response view and district hotspots.',
    href: '/explore?tab=clinical',
    icon: HeartPulse,
  },
  {
    title: 'Check any CSV',
    body: 'Drop in a survey file and get the same checks in seconds. It is processed in your browser and never uploaded.',
    href: '/explore?tab=validate',
    icon: Search,
  },
  {
    title: 'Executive brief',
    body: 'A one-page situation report written from the numbers, ready to print or save as a PDF.',
    href: '/explore/report',
    icon: Printer,
  },
] as const;

export function FeatureGrid() {
  return (
    <section aria-labelledby="features-title" className="space-y-6">
      <Reveal>
        <h2 id="features-title" className="text-2xl font-semibold sm:text-3xl">
          Built for the questions survey teams actually ask
        </h2>
        <p className="mt-1 max-w-2xl text-muted-foreground">Are we on schedule? Can we trust the data? What is it telling us? Each answer is one click away.</p>
      </Reveal>
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ title, body, href, icon: Icon }) => (
          <StaggerItem key={title}>
            <Link href={href} className="glass group block h-full rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform group-hover:scale-110" aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
