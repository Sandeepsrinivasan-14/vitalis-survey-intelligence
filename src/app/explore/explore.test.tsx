import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExplorePage from './page';
import ReportPage from './report/page';
import { GET } from './export/route';

// The client router reads the same URL the server page was given, so mirror it.
let currentParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  usePathname: () => '/explore',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => currentParams,
}));

type P = Record<string, string | string[] | undefined>;
const renderPage = async (params: P = {}) => {
  currentParams = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])));
  return render(await ExplorePage({ searchParams: Promise.resolve(params) }));
};

describe('Explore page', () => {
  it('opens on the overview with one h1, the synthetic-data notice and the section nav', async () => {
    await renderPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText(/every place, facility and respondent here is synthetic/i)).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: /survey sections/i });
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getAllByRole('link')).toHaveLength(7);
    expect(screen.getByRole('heading', { name: /needs attention/i })).toBeInTheDocument();
  });

  it('falls back to the overview for an unknown tab', async () => {
    await renderPage({ tab: 'nonsense' });
    expect(screen.getByRole('heading', { name: /who we are reaching/i })).toBeInTheDocument();
  });

  it('shows patient coverage by district, gender and facility', async () => {
    await renderPage({ tab: 'coverage' });
    expect(screen.getByRole('heading', { name: /overall coverage rate/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Coverage rate' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Fairhaven coverage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /coverage by gender/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /facilities with low coverage/i })).toBeInTheDocument();
  });

  it('shows fieldwork progress, a forecast and the collector leaderboard', async () => {
    await renderPage({ tab: 'fieldwork' });
    expect(screen.getByRole('heading', { name: /enrolment against plan/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /district progress/i })).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar').length).toBe(12);
    expect(screen.getByRole('heading', { name: /collector leaderboard/i })).toBeInTheDocument();
    expect(screen.getAllByText('Rounds BP readings').length).toBeGreaterThan(0);
  });

  it('shows data-quality findings', async () => {
    await renderPage({ tab: 'quality' });
    expect(screen.getByRole('heading', { name: /what is going wrong/i })).toBeInTheDocument();
    expect(screen.getByText('Duplicate IDs')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /collector integrity signals/i })).toBeInTheDocument();
  });

  it('shows the salt and blood pressure analysis with an honest caveat', async () => {
    await renderPage({ tab: 'clinical' });
    expect(screen.getByRole('heading', { name: /does more salt mean higher blood pressure/i })).toBeInTheDocument();
    expect(screen.getByText(/not proof that salt alone causes/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /district hotspots/i })).toBeInTheDocument();
  });

  it('applies filters from the URL', async () => {
    await renderPage({ tab: 'records', state: 'Eastmere' });
    const table = screen.getByRole('table');
    const districts = within(table).getAllByRole('row').slice(1).map((r) => r.textContent ?? '');
    expect(districts.length).toBeGreaterThan(0);
    expect(districts.every((t) => !/Northvale|Sunreach/.test(t))).toBe(true);
    expect(screen.getByLabelText('State')).toHaveValue('Eastmere');
  });

  it('paginates and searches records, and never shows names', async () => {
    await renderPage({ tab: 'records', q: 'Larkspur', page: '2' });
    expect(screen.getByText(/page 2 of/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Previous' })).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByRole('columnheader', { name: /^name$/i })).not.toBeInTheDocument();
  });

  it('hides the data filters on the file-check tab', async () => {
    await renderPage({ tab: 'validate' });
    expect(screen.queryByRole('search', { name: /filter survey data/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /template/i })).toHaveAttribute('href', '/templates/survey-template.csv');
  });
});

describe('Executive brief', () => {
  it('renders a printable situation report for the chosen scope', async () => {
    render(await ReportPage({ searchParams: Promise.resolve({ state: 'Sunreach' }) }));
    expect(screen.getByRole('heading', { level: 1, name: 'Sunreach' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /key points/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
    expect(screen.getByText('Fairhaven')).toBeInTheDocument();
  });
});

describe('CSV export', () => {
  it('downloads the filtered records as CSV', async () => {
    const res = GET(new Request('http://localhost/explore/export?state=Eastmere&gender=female'));
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment; filename="vitalis-survey-2026-06-30\.csv"/);
    const lines = (await res.text()).trim().split('\n');
    expect(lines[0]).toMatch(/^unique_id,state,district/);
    expect(lines.length).toBeGreaterThan(100);
    expect(lines.slice(1).every((l) => l.includes(',Eastmere,') && l.includes(',female,'))).toBe(true);
  });

  it('includes duplicates and flagged rows only when asked for the raw set', async () => {
    const clean = (await GET(new Request('http://localhost/explore/export')).text()).trim().split('\n').length;
    const raw = (await GET(new Request('http://localhost/explore/export?set=raw')).text()).trim().split('\n').length;
    expect(raw).toBeGreaterThan(clean);
  });
});

describe('CSV export rate limit', () => {
  it('answers 429 with Retry-After once a client downloads too often', async () => {
    const mk = () => new Request('http://localhost/explore/export', { headers: { 'x-forwarded-for': '203.0.113.9' } });
    let last = GET(mk());
    for (let i = 0; i < 25 && last.status === 200; i += 1) last = GET(mk());
    expect(last.status).toBe(429);
    expect(Number(last.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(GET(new Request('http://localhost/explore/export', { headers: { 'x-forwarded-for': '198.51.100.4' } })).status).toBe(200);
  });
});
