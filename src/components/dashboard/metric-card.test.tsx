import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { MetricCard } from './metric-card';

describe('MetricCard', () => {
  it('renders the title, value and unit', () => {
    render(<MetricCard title="Immunization" value={78} unit="%" />);
    expect(screen.getByText('Immunization')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('shows N/A when the value is missing', () => {
    render(<MetricCard title="Missing" status="data_unavailable" />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('computes a positive change against the previous value', () => {
    render(<MetricCard title="Up" value={110} previousValue={100} />);
    expect(screen.getByText('+10% vs prev.')).toBeInTheDocument();
  });

  it('computes a negative change against the previous value', () => {
    render(<MetricCard title="Down" value={90} previousValue={100} />);
    expect(screen.getByText('-10% vs prev.')).toBeInTheDocument();
  });

  it('handles a previous value of zero without dividing by zero', () => {
    render(<MetricCard title="Zero" value={5} previousValue={0} />);
    expect(screen.getByText('+100% vs prev.')).toBeInTheDocument();
  });

  it('does not compute a change for textual values', () => {
    render(<MetricCard title="Status" value="Online" previousValue={1} />);
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.queryByText(/vs prev\./)).not.toBeInTheDocument();
  });

  it('renders trend, target, notes and last-updated details', () => {
    render(
      <MetricCard
        title="Details"
        value={50}
        unit="%"
        trend="up"
        target={90}
        actionableNotes="Increase outreach"
        lastUpdated="2024-01-01"
        description="A description"
      />,
    );
    expect(screen.getByText('up')).toBeInTheDocument();
    expect(screen.getByText('Target: 90%')).toBeInTheDocument();
    expect(screen.getByText('Increase outreach')).toBeInTheDocument();
    expect(screen.getByText('Last updated: 2024-01-01')).toBeInTheDocument();
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('renders a stable trend label', () => {
    render(<MetricCard title="Flat" value={1} trend="stable" />);
    expect(screen.getByText('stable')).toBeInTheDocument();
  });

  it('hides the decorative icon from assistive technology', () => {
    const { container } = render(<MetricCard title="Icon" value={1} icon={Activity} />);
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });
});
