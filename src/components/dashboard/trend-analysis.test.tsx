import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceCategory } from '@/data/mock-data';
import { TrendAnalysis } from './trend-analysis';

const getAITrendAnalysisMock = vi.fn();

vi.mock('@/app/actions', () => ({
  getAITrendAnalysis: (...args: unknown[]) => getAITrendAnalysisMock(...args),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const data: ServiceCategory[] = [
  { id: 'c1', name: 'Cat', indicators: [{ id: 'i1', name: 'Ind', value: 1, unit: '%' }] },
];

describe('TrendAnalysis', () => {
  beforeEach(() => {
    getAITrendAnalysisMock.mockReset();
  });

  it('tells the user data is required when none is loaded and disables the button', () => {
    render(<TrendAnalysis metricsData={null} />);
    expect(screen.getByText('Data Required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate full dashboard analysis/i })).toBeDisabled();
  });

  it('shows the AI summary after a successful analysis', async () => {
    getAITrendAnalysisMock.mockResolvedValue({
      ok: true,
      data: {
        mode: 'live',
        analysis: {
          summary: 'Coverage is improving.',
          categorySpecificInsights: [{ categoryId: 'c1', categoryName: 'Cat', insight: 'Doing fine' }],
        },
      },
    });
    const user = userEvent.setup();
    render(<TrendAnalysis metricsData={data} sourceFileName="data.csv" />);

    await user.click(screen.getByRole('button', { name: /generate full dashboard analysis/i }));

    expect(await screen.findByText('Coverage is improving.')).toBeInTheDocument();
    expect(getAITrendAnalysisMock).toHaveBeenCalledWith(data, 'data.csv');
  });

  it('labels rule-based output as demo mode', async () => {
    getAITrendAnalysisMock.mockResolvedValue({ ok: true, data: { mode: 'demo', analysis: { summary: 'Rule based.' } } });
    const user = userEvent.setup();
    render(<TrendAnalysis metricsData={data} />);

    await user.click(screen.getByRole('button', { name: /generate full dashboard analysis/i }));

    expect(await screen.findByText('Demo mode')).toBeInTheDocument();
  });

  it('shows an error alert when the analysis fails', async () => {
    getAITrendAnalysisMock.mockResolvedValue({ ok: false, error: 'API key missing' });
    const user = userEvent.setup();
    render(<TrendAnalysis metricsData={data} />);

    await user.click(screen.getByRole('button', { name: /generate full dashboard analysis/i }));

    expect(await screen.findByText('API key missing')).toBeInTheDocument();
    expect(screen.getByText('Error Generating Analysis')).toBeInTheDocument();
  });
});
