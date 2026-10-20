// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '@/lib/auth/users';

const createSessionMock = vi.fn();
const destroySessionMock = vi.fn();
let forwardedFor = '203.0.113.7';

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': forwardedFor }),
}));
vi.mock('@/lib/auth/session', () => ({
  createSession: (claims: unknown) => createSessionMock(claims),
  destroySession: () => destroySessionMock(),
}));

import { login, logout } from './auth-actions';

describe('login server action', () => {
  beforeEach(() => {
    createSessionMock.mockReset();
    destroySessionMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('AUTH_SECRET', 'action-test-secret-0123456789-abcdefghijklmnop');
    vi.stubEnv(
      'AUTH_USERS',
      JSON.stringify([{ email: 'dist@example.org', role: 'district', passwordHash: hashPassword('right-password') }]),
    );
    forwardedFor = `198.51.100.${Math.floor(Math.random() * 250)}`;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates a session and returns the role home on valid credentials', async () => {
    const result = await login({ email: 'dist@example.org', password: 'right-password' });
    expect(result).toEqual({ ok: true, data: { redirectTo: '/district/dashboard' } });
    expect(createSessionMock).toHaveBeenCalledWith({ email: 'dist@example.org', role: 'district' });
  });

  it('honours a permitted next path but never an open redirect', async () => {
    const ok = await login({ email: 'dist@example.org', password: 'right-password', next: '/facility/dashboard' });
    expect(ok).toEqual({ ok: true, data: { redirectTo: '/facility/dashboard' } });
    const evil = await login({ email: 'dist@example.org', password: 'right-password', next: '//evil.example' });
    expect(evil).toEqual({ ok: true, data: { redirectTo: '/district/dashboard' } });
  });

  it('rejects wrong passwords and unknown emails with the same message', async () => {
    const wrong = await login({ email: 'dist@example.org', password: 'nope' });
    const unknown = await login({ email: 'ghost@example.org', password: 'right-password' });
    expect(wrong).toEqual({ ok: false, error: 'Invalid email or password.' });
    expect(unknown).toEqual(wrong);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('validates input', async () => {
    const result = await login({ email: '', password: '' });
    expect(result.ok).toBe(false);
  });

  it('rate-limits repeated failed attempts from the same client', async () => {
    forwardedFor = '192.0.2.99';
    let last: Awaited<ReturnType<typeof login>> | undefined;
    for (let i = 0; i < 9; i++) last = await login({ email: 'dist@example.org', password: 'bad' });
    expect(last).toEqual({ ok: false, error: expect.stringMatching(/too many sign-in attempts/i) });
  });

  it('fails closed with a clear message when the server is not configured', async () => {
    vi.stubEnv('AUTH_SECRET', '');
    const result = await login({ email: 'dist@example.org', password: 'right-password' });
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/not configured/i) });
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('logout destroys the session', async () => {
    await logout();
    expect(destroySessionMock).toHaveBeenCalledTimes(1);
  });
});
