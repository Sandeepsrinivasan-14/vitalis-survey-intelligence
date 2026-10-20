import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';
import { hwcPhcMockData, hwcSummaryMockData } from '@/data/mock-data';

// Smoke test: the public landing page renders its main sections without crashing.
describe('HomePage (smoke)', () => {
  it('renders the hero with a single h1 and calls to action', () => {
    render(<HomePage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /open my dashboard/i })).toHaveAttribute('href', '/roles');
    expect(screen.getByRole('link', { name: /explore survey data/i })).toHaveAttribute('href', '/explore');
  });

  it('describes the decorative 3D visual for assistive technology', () => {
    render(<HomePage />);
    expect(screen.getByRole('img', { name: /3d network globe/i })).toBeInTheDocument();
  });

  it('renders the key survey indicators with their values', () => {
    render(<HomePage />);
    expect(screen.getByText('Total Valid Records')).toBeInTheDocument();
    expect(screen.getAllByText(hwcSummaryMockData.totalValidRecords.toLocaleString('en-IN')).length).toBeGreaterThan(0);
    expect(screen.getByText('Data Collectors')).toBeInTheDocument();
  });

  it('renders district-wise gender distribution grouped by state', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'Northvale' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sunreach' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Eastmere' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /gender distribution by district in northvale/i })).toBeInTheDocument();
  });

  it('defaults the PHC table to the first district and totals the patients', () => {
    render(<HomePage />);
    const table = screen.getByRole('table');
    const rows = hwcPhcMockData.filter((p) => p.state === 'Northvale' && p.districtName === 'Ashgrove');
    // header + one row per PHC
    expect(within(table).getAllByRole('row')).toHaveLength(rows.length + 1);
    const total = rows.reduce((sum, p) => sum + p.patientCount, 0);
    expect(screen.getByText(/total patients in view/i)).toHaveTextContent(total.toLocaleString('en-IN'));
  });

  it('exposes accessible names for the filter selects', () => {
    render(<HomePage />);
    expect(screen.getByRole('combobox', { name: 'State' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'District' })).toBeInTheDocument();
  });
});
