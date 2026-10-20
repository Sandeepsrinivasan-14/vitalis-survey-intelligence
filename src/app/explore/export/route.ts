import { recordsToCsv } from '@/lib/survey/csv';
import { loadView } from '@/lib/survey/view';

/** Downloads the records matching the current filters. `?set=raw` includes duplicates and flagged rows. */
export function GET(request: Request) {
  const url = new URL(request.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  const view = loadView(params);
  const rows = params.set === 'raw' ? view.raw : view.clean;
  return new Response(recordsToCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vitalis-survey-${view.dataset.asOf}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
