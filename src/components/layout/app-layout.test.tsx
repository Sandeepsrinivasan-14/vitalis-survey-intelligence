import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './app-layout';

const pathnameMock = vi.fn<() => string>();
const pushMock = vi.fn();
const refreshMock = vi.fn();
const logoutMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock('@/app/auth-actions', () => ({
  logout: () => logoutMock(),
}));

describe('AppLayout', () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue('/');
    pushMock.mockClear();
    refreshMock.mockClear();
    logoutMock.mockReset();
  });

  it('renders children inside the main landmark', () => {
    render(
      <AppLayout>
        <p>Hello content</p>
      </AppLayout>,
    );
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveTextContent('Hello content');
  });

  it('renders header navigation and footer landmarks', () => {
    render(<AppLayout>x</AppLayout>);
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(String(new Date().getFullYear()));
  });

  it('shows the login link to signed-out visitors on public pages', () => {
    render(<AppLayout>x</AppLayout>);
    expect(screen.getByRole('link', { name: /admin\/role login/i })).toHaveAttribute('href', '/roles');
  });

  it.each(['/login', '/roles'])('hides the login link on %s', (path) => {
    pathnameMock.mockReturnValue(path);
    render(<AppLayout>x</AppLayout>);
    expect(screen.queryByRole('link', { name: /admin\/role login/i })).not.toBeInTheDocument();
  });

  it('shows the signed-in user and signs out through the server action', async () => {
    const user = userEvent.setup();
    render(<AppLayout session={{ email: 'officer@example.org', role: 'district' }}>x</AppLayout>);

    expect(screen.queryByRole('link', { name: /admin\/role login/i })).not.toBeInTheDocument();
    expect(screen.getByText('District Officer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboards' })).toHaveAttribute('href', '/district/dashboard');

    await user.click(screen.getByRole('button', { name: /sign out/i }));
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/');
  });
});
