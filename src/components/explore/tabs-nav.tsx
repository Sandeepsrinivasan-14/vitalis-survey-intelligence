import Link from 'next/link';
import { filtersToQuery, type SurveyFilters } from '@/lib/survey/filters';
import { cn } from '@/lib/utils';

export const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'fieldwork', label: 'Fieldwork' },
  { id: 'coverage', label: 'Coverage' },
  { id: 'quality', label: 'Data quality' },
  { id: 'clinical', label: 'Salt & blood pressure' },
  { id: 'records', label: 'Records' },
  { id: 'validate', label: 'Check a file' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export function isTab(value: string | undefined): value is TabId {
  return TABS.some((t) => t.id === value);
}

export function TabsNav({ active, filters }: { active: TabId; filters: SurveyFilters }) {
  return (
    <nav aria-label="Survey sections" className="no-print -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="glass inline-flex min-w-full gap-1 rounded-2xl p-1.5 sm:min-w-0">
        {TABS.map((tab) => (
          <li key={tab.id}>
            <Link
              href={`/explore?${filtersToQuery(filters, { tab: tab.id })}`}
              scroll={false}
              aria-current={tab.id === active ? 'page' : undefined}
              className={cn(
                'block whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                tab.id === active ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
