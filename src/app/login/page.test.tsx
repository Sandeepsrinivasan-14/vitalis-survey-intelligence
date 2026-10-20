import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

const pushMock = vi.fn();
const refreshMock = vi.fn();
const toastMock = vi.fn();
const loginMock = vi.fn();
let params: Record<string, string | null> = { role: 'facility/dashboard', next: null };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => ({ get: (key: string) => params[key] ?? null }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/app/auth-actions', () => ({
  login: (input: unknown) => loginMock(input),
}));

async function submit(email: string, password: string) {
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
  await user.click(screen.getByRole('button', { name: /^(login|sign in)$/i }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    toastMock.mockClear();
    loginMock.mockReset();
    params = { role: 'facility/dashboard', next: null };
  });

  it('shows the role being logged into', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { level: 1, name: /facility manager/i })).toBeInTheDocument();
  });

  it('labels the Website Manager role for the admin path', () => {
    params = { role: 'admin/dashboard', next: null };
    render(<LoginPage />);
    expect(screen.getByRole('heading', { level: 1, name: /website manager/i })).toBeInTheDocument();
  });

  it('sends credentials to the server action and follows its redirect', async () => {
    loginMock.mockResolvedValue({ ok: true, data: { redirectTo: '/facility/dashboard' } });
    await submit('officer@example.org', 'correct horse');

    expect(loginMock).toHaveBeenCalledWith({ email: 'officer@example.org', password: 'correct horse', next: null });
    expect(await screen.findByRole('button', { name: /^(login|sign in)$/i })).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith('/facility/dashboard');
    expect(refreshMock).toHaveBeenCalled();
  });

  it('forwards the requested next path', async () => {
    params = { role: 'state/dashboard', next: '/state/dashboard' };
    loginMock.mockResolvedValue({ ok: true, data: { redirectTo: '/state/dashboard' } });
    await submit('officer@example.org', 'pw');
    expect(loginMock).toHaveBeenCalledWith(expect.objectContaining({ next: '/state/dashboard' }));
  });

  it('shows the server error and does not navigate when sign-in fails', async () => {
    loginMock.mockResolvedValue({ ok: false, error: 'Invalid email or password.' });
    await submit('officer@example.org', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('reports a network failure without navigating', async () => {
    loginMock.mockRejectedValue(new Error('offline'));
    await submit('officer@example.org', 'pw');
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
