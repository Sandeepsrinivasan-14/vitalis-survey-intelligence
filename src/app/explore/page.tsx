import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FlaskConical } from 'lucide-react';
import { FiltersBar } from '@/components/explore/filters-bar';
import { isTab, TabsNav, type TabId } from '@/components/explore/tabs-nav';
import { CoverageTab } from '@/components/explore/tabs/coverage';
import { ClinicalTab } from '@/components/explore/tabs/clinical';
import { FieldworkTab } from '@/components/explore/tabs/fieldwork';
import { OverviewTab } from '@/components/explore/tabs/overview';
import { QualityTab } from '@/components/explore/tabs/quality';
import { RecordsTab } from '@/components/explore/tabs/records';
import { ValidateTab } from '@/components/explore/validate-tab';
import { formatDate } from '@/lib/survey/dates';
import { filtersToQuery, hasActiveFilters } from '@/lib/survey/filters';
import { loadView } from '@/lib/survey/view';

export const metadata: Metadata = {
  title: 'Explore the survey',
  description: 'Interactive survey explorer: fieldwork progress, data quality, blood pressure and salt intake, with filters and CSV export.',
};

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const view = loadView(params);
  const requested = first(params.tab);
  const tab: TabId = isTab(requested) ? requested : 'overview';
  const query = filtersToQuery(view.filters);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">Explore the survey</h1>
        <p className="text-muted-foreground">
          Snapshot as of {formatDate(view.dataset.asOf)}. Fieldwork runs {formatDate(view.dataset.start)} to {formatDate(view.dataset.end)}.
        </p>
        <p className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
          <FlaskConical className="h-4 w-4 text-primary" aria-hidden="true" />
          Demonstration data: every place, facility and respondent here is synthetic.
        </p>
      </header>

      {tab !== 'validate' ? (
        <Suspense fallback={<div className="glass h-24 rounded-2xl" aria-hidden="true" />}>
          <FiltersBar
            states={view.dataset.states}
            districts={view.dataset.districts.map((d) => ({ name: d.name, state: d.state }))}
            exportHref={`/explore/export${query ? `?${query}` : ''}`}
            reportHref={`/explore/report${query ? `?${query}` : ''}`}
            active={hasActiveFilters(view.filters)}
          />
        </Suspense>
      ) : null}

      <TabsNav active={tab} filters={view.filters} />

      <div id="panel" role="region" aria-label={tab}>
        {tab === 'overview' && <OverviewTab view={view} />}
        {tab === 'fieldwork' && <FieldworkTab view={view} />}
        {tab === 'coverage' && <CoverageTab view={view} />}
        {tab === 'quality' && <QualityTab view={view} />}
        {tab === 'clinical' && <ClinicalTab view={view} />}
        {tab === 'records' && <RecordsTab view={view} params={{ q: first(params.q), sort: first(params.sort), dir: first(params.dir), page: first(params.page) }} />}
        {tab === 'validate' && <ValidateTab />}
      </div>
    </div>
  );
}
