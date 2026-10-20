import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/explore/ui-bits';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { filtersToQuery } from '@/lib/survey/filters';
import type { SurveyRecord } from '@/lib/survey/types';
import type { ExploreView } from '@/lib/survey/view';

const PAGE_SIZE = 25;
const SORTS = { date: 'Date', age: 'Age', systolic: 'Systolic', saltGrams: 'Salt (g)' } as const;
type SortKey = keyof typeof SORTS;

export interface RecordsParams {
  q?: string;
  sort?: string;
  dir?: string;
  page?: string;
}

function compare(a: SurveyRecord, b: SurveyRecord, key: SortKey): number {
  const x = a[key];
  const y = b[key];
  if (x === y) return a.id.localeCompare(b.id);
  if (x === null) return 1; // blanks always last
  if (y === null) return -1;
  return x < y ? -1 : 1;
}

export function RecordsTab({ view, params }: { view: ExploreView; params: RecordsParams }) {
  const q = (params.q ?? '').trim().slice(0, 60);
  const sort: SortKey = params.sort && params.sort in SORTS ? (params.sort as SortKey) : 'date';
  const dir = params.dir === 'asc' ? 'asc' : 'desc';

  const needle = q.toLowerCase();
  const matches = needle
    ? view.clean.filter((r) => [r.id, r.district, r.state, r.facilityCode].some((v) => v.toLowerCase().includes(needle)))
    : view.clean;
  const sorted = [...matches].sort((a, b) => (dir === 'asc' ? compare(a, b, sort) : -compare(a, b, sort)));
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1));
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const href = (extra: Record<string, string | undefined>) =>
    `/explore?${filtersToQuery(view.filters, { tab: 'records', q: q || undefined, sort, dir, ...extra })}`;

  return (
    <Panel title="Respondent records" description={`${matches.length.toLocaleString('en-IN')} de-duplicated records. Respondents are identified by an ID only; there are no names.`}>
      <form action="/explore" method="get" role="search" aria-label="Search records" className="no-print mb-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="tab" value="records" />
        {Object.entries(view.filters).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        <label htmlFor="records-q" className="sr-only">
          Search by ID, district or facility
        </label>
        <input
          id="records-q"
          name="q"
          defaultValue={q}
          maxLength={60}
          placeholder="Search ID, district or facility"
          className="h-10 min-w-[14rem] flex-1 rounded-lg border border-input bg-background/70 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="sm">
          <Search aria-hidden="true" />
          Search
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            {(Object.keys(SORTS) as SortKey[]).map((key) => {
              const active = sort === key;
              return (
                <TableHead key={key} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <Link href={href({ sort: key, dir: active && dir === 'desc' ? 'asc' : 'desc', page: '1' })} className="inline-flex items-center gap-1 hover:underline">
                    {SORTS[key]}
                    {active ? dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  </Link>
                </TableHead>
              );
            })}
            <TableHead>District</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead className="text-right">BP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                No records match.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell className="tabular">{r.date}</TableCell>
                <TableCell className="tabular">{r.age ?? '–'}</TableCell>
                <TableCell className="tabular">{r.systolic ?? '–'}</TableCell>
                <TableCell className="tabular">{r.saltGrams ?? '–'}</TableCell>
                <TableCell>{r.district}</TableCell>
                <TableCell className="capitalize">{r.gender}</TableCell>
                <TableCell className="tabular text-right">{r.systolic !== null && r.diastolic !== null ? `${r.systolic}/${r.diastolic}` : '–'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <nav aria-label="Pagination" className="no-print mt-4 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          Page {page} of {pages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href({ page: String(page - 1) })} rel="prev">Previous</Link>
            </Button>
          ) : null}
          {page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href({ page: String(page + 1) })} rel="next">Next</Link>
            </Button>
          ) : null}
        </div>
      </nav>
    </Panel>
  );
}
