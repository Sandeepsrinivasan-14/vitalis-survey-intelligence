// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { middleware } from './middleware';
import { SESSION_COOKIE, signSession } from '@/lib/auth/token';
import type { Role } from '@/lib/auth/roles';

beforeAll(() => {
  vi.stubEnv('AUTH_SECRET', 'middleware-test-secret-0123456789-abcdefghij');
});
afterAll(() => {
  vi.unstubAllEnvs();
});

async function request(path: string, role?: Role, rawCookie?: string) {
  const headers = new Headers();
  if (role) headers.set('cookie', `${SESSION_COOKIE}=${await signSession({ email: 'u@example.org', role })}`);
  if (rawCookie) headers.set('cookie', `${SESSION_COOKIE}=${rawCookie}`);
  return middleware(new NextRequest(`http://localhost:9002${path}`, { headers }));
}

describe('middleware role guards', () => {
  it('sends anonymous visitors to the login page, remembering where they were going', async () => {
    const res = await request('/state/dashboard');
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe('/state/dashboard');
  });

  it('treats a forged or garbage cookie as signed out', async () => {
    const res = await request('/admin/dashboard', undefined, 'forged.token.value');
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });

  it('lets a role open its own dashboard and disables caching', async () => {
    const res = await request('/facility/dashboard', 'facility');
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('redirects to the role home when opening a dashboard above its level', async () => {
    const res = await request('/state/dashboard', 'district');
    expect(new URL(res.headers.get('location')!).pathname).toBe('/district/dashboard');
  });

  it('lets officers look down the hierarchy', async () => {
    const res = await request('/facility/dashboard', 'state');
    expect(res.headers.get('location')).toBeNull();
  });

  it('keeps the IT role out of clinical dashboards and everyone else out of IT', async () => {
    expect(new URL((await request('/state/dashboard', 'admin')).headers.get('location')!).pathname).toBe('/admin/dashboard');
    expect(new URL((await request('/admin/dashboard', 'state')).headers.get('location')!).pathname).toBe('/state/dashboard');
  });

  it('ignores public paths', async () => {
    const res = await request('/');
    expect(res.headers.get('location')).toBeNull();
  });
});
