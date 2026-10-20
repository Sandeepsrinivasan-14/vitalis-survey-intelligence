import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusDonut, TargetBars } from './dashboard-charts';
import { summarizeCategories } from '@/lib/dashboard-stats';
import { healthDashboardData } from '@/data/mock-data';

describe('StatusDonut', () => {
  it('shows the on-track share and an accessible breakdown', () => {
    const summary = summarizeCategories(healthDashboardData);
    render(<StatusDonut summary={summary} />);
    expect(screen.getByRole('img', { name: /indicator status breakdown/i })).toBeInTheDocument();
    expect(screen.getByText(`${summary.onTrackPercent}%`)).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
  });

  it('shows a dash when nothing is rated', () => {
    render(<StatusDonut summary={summarizeCategories([])} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

describe('TargetBars', () => {
  it('exposes each bar as a labelled meter with the exact numbers', () => {
    render(
      <TargetBars
        rows={[{ id: 'a', name: 'Coverage', unit: '%', value: 45, target: 60, status: 'neutral', percent: 75 }]}
      />,
    );
    const meter = screen.getByRole('meter', { name: /coverage: 75% of target/i });
    expect(meter).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('renders nothing without rows', () => {
    const { container } = render(<TargetBars rows={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
