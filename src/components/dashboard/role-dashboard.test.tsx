import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleDashboard } from './role-dashboard';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/app/actions', () => ({
  getAITrendAnalysis: vi.fn(),
}));

describe('RoleDashboard', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it.each([
    ['facility', /facility manager dashboard/i],
    ['district', /district officer dashboard/i],
    ['state', /state admin dashboard/i],
    ['admin', /website manager dashboard/i],
  ] as const)('renders the %s dashboard with an empty state', (role, title) => {
    render(<RoleDashboard role={role} />);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(/no data loaded yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /role selection/i })).toHaveAttribute('href', '/roles');
    expect(screen.getByRole('link', { name: /csv template/i })).toHaveAttribute('href', `/templates/${role}-template.csv`);
  });

  it('loads sample data into a summary, tabs and metric cards, and can clear it', async () => {
    const user = userEvent.setup();
    render(<RoleDashboard role="facility" />);

    await user.click(screen.getByRole('button', { name: /load sample data/i }));

    expect(screen.getByText(/displaying data from/i)).toHaveTextContent('Sample dataset');
    expect(screen.getByRole('tab', { name: /maternal & child health/i })).toBeInTheDocument();
    // Shown both in the target bars and as a metric card.
    expect(screen.getAllByText('DPT3 Immunization Coverage').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Status overview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate full dashboard analysis/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByText(/no data loaded yet/i)).toBeInTheDocument();
  });

  it('maps an uploaded CSV into indicators using the role vocabulary', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<RoleDashboard role="district" />);

    const csv = 'category,indicator name,value,unit,target,facility_id\nImmunization,DPT3 coverage,78,%,90,PHC-1\n';
    await user.upload(screen.getByLabelText(/upload district data/i), new File([csv], 'district.csv', { type: 'text/csv' }));

    expect((await screen.findAllByText('DPT3 coverage (PHC-1)')).length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: 'Immunization' })).toBeInTheDocument();
  });

  it('explains when a file has no recognisable columns', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<RoleDashboard role="facility" />);

    await user.upload(screen.getByLabelText(/upload facility metrics/i), new File(['foo,bar\n1,2\n'], 'odd.csv', { type: 'text/csv' }));

    await waitFor(() => expect(screen.getByText(/no displayable data in odd\.csv/i)).toBeInTheDocument());
  });
});
