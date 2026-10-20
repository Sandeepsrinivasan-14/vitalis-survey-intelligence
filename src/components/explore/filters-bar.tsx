'use client';

import { useTransition } from 'react';
import { Download, FileText, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FiltersBarProps {
  states: string[];
  districts: { name: string; state: string }[];
  exportHref: string;
  reportHref: string;
  active: boolean;
}

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-background/70 px-3 text-sm shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

export function FiltersBar({ states, districts, exportHref, reportHref, active }: FiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const state = params.get('state') ?? '';
  const district = params.get('district') ?? '';
  const visibleDistricts = districts.filter((d) => !state || d.state === state);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const field = (id: string, label: string, control: React.ReactNode) => (
    <div className="min-w-[9rem] flex-1">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {control}
    </div>
  );

  return (
    <form
      role="search"
      aria-label="Filter survey data"
      onSubmit={(e) => e.preventDefault()}
      className={cn('glass no-print flex flex-wrap items-end gap-3 rounded-2xl p-4', pending && 'opacity-80')}
      aria-busy={pending}
    >
      {field(
        'f-state',
        'State',
        <select id="f-state" className={selectClass} value={state} onChange={(e) => update({ state: e.target.value, district: '' })}>
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>,
      )}
      {field(
        'f-district',
        'District',
        <select id="f-district" className={selectClass} value={district} onChange={(e) => update({ district: e.target.value })}>
          <option value="">All districts</option>
          {visibleDistricts.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>,
      )}
      {field(
        'f-gender',
        'Gender',
        <select id="f-gender" className={selectClass} value={params.get('gender') ?? ''} onChange={(e) => update({ gender: e.target.value })}>
          <option value="">All</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="transgender">Transgender</option>
        </select>,
      )}
      {field(
        'f-from',
        'From',
        <input id="f-from" type="date" className={selectClass} value={params.get('from') ?? ''} onChange={(e) => update({ from: e.target.value })} />,
      )}
      {field(
        'f-to',
        'To',
        <input id="f-to" type="date" className={selectClass} value={params.get('to') ?? ''} onChange={(e) => update({ to: e.target.value })} />,
      )}

      <div className="flex flex-wrap items-center gap-2">
        {active ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => update({ state: '', district: '', gender: '', from: '', to: '' })}>
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <a href={exportHref} download>
            <Download aria-hidden="true" />
            CSV
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={reportHref}>
            <FileText aria-hidden="true" />
            Brief
          </Link>
        </Button>
      </div>
    </form>
  );
}
