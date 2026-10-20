// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { canAccess, roleForPath, safeNextPath } from '../auth/roles';
import { isAuthConfigured, signSession, verifySession } from '../auth/token';
import { authenticate, hashPassword, parseConfiguredUsers, verifyPassword } from '../auth/users';

beforeAll(() => {
  vi.stubEnv('AUTH_SECRET', 'test-secret-that-is-definitely-longer-than-32-chars');
});
afterAll(() => {
  vi.unstubAllEnvs();
});

describe('role access', () => {
  it('maps paths to roles', () => {
    expect(roleForPath('/state/dashboard')).toBe('state');
    expect(roleForPath('/')).toBeNull();
    expect(roleForPath('/login')).toBeNull();
  });

  it('lets officers look down the hierarchy but not up', () => {
    expect(canAccess('state', 'district')).toBe(true);
    expect(canAccess('district', 'facility')).toBe(true);
    expect(canAccess('facility', 'district')).toBe(false);
    expect(canAccess('district', 'state')).toBe(false);
  });

  it('keeps the IT role to its own page', () => {
    expect(canAccess('admin', 'admin')).toBe(true);
    expect(canAccess('admin', 'state')).toBe(false);
    expect(canAccess('state', 'admin')).toBe(false);
  });

  it('only follows safe, permitted next paths', () => {
    expect(safeNextPath('/district/dashboard', 'state')).toBe('/district/dashboard');
    expect(safeNextPath('/state/dashboard', 'facility')).toBe('/facility/dashboard');
    expect(safeNextPath('//evil.com', 'state')).toBe('/state/dashboard');
    expect(safeNextPath('https://evil.com', 'state')).toBe('/state/dashboard');
    expect(safeNextPath(null, 'admin')).toBe('/admin/dashboard');
  });
});

describe('session tokens', () => {
  it('round-trips valid claims', async () => {
    const token = await signSession({ email: 'a@b.c', role: 'district' });
    expect(await verifySession(token)).toEqual({ email: 'a@b.c', role: 'district' });
  });

  it('rejects tampered, missing and garbage tokens', async () => {
    const token = await signSession({ email: 'a@b.c', role: 'facility' });
    const [h, , s] = token.split('.');
    const forged = `${h}.${Buffer.from(JSON.stringify({ sub: 'a@b.c', role: 'admin' })).toString('base64url')}.${s}`;
    expect(await verifySession(forged)).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession('not-a-token')).toBeNull();
  });
});

describe('configuration', () => {
  it('requires an AUTH_SECRET of at least 32 characters', async () => {
    vi.stubEnv('AUTH_SECRET', 'too-short');
    expect(isAuthConfigured()).toBe(false);
    await expect(signSession({ email: 'a@b.c', role: 'state' })).rejects.toThrow(/AUTH_SECRET/);
    expect(await verifySession('anything')).toBeNull();
    vi.stubEnv('AUTH_SECRET', 'x'.repeat(40));
    expect(isAuthConfigured()).toBe(true);
  });
});

describe('passwords and users', () => {
  it('hashes with a random salt and verifies', () => {
    const a = hashPassword('secret');
    expect(a).not.toBe(hashPassword('secret'));
    expect(verifyPassword('secret', a)).toBe(true);
    expect(verifyPassword('wrong', a)).toBe(false);
    expect(verifyPassword('secret', 'garbage')).toBe(false);
  });

  it('has no built-in accounts: nothing authenticates without AUTH_USERS', () => {
    vi.stubEnv('AUTH_USERS', '');
    expect(authenticate('state@example.com', 'passsa')).toBeNull();
    expect(authenticate('facility@example.com', 'passfm')).toBeNull();
  });

  it('authenticates only accounts configured through AUTH_USERS', () => {
    vi.stubEnv(
      'AUTH_USERS',
      JSON.stringify([{ email: 'Boss@X.org', role: 'state', passwordHash: hashPassword('s3cret pass') }]),
    );
    expect(authenticate(' boss@x.org ', 's3cret pass')?.role).toBe('state');
    expect(authenticate('boss@x.org', 'nope')).toBeNull();
    expect(authenticate('nobody@x.org', 's3cret pass')).toBeNull();
  });

  it('parses configured users and ignores malformed entries', () => {
    const users = parseConfiguredUsers(
      JSON.stringify([
        { email: ' Boss@X.org ', role: 'state', passwordHash: 'scrypt:aa:bb' },
        { email: 'bad@x.org', role: 'superuser', passwordHash: 'x' },
        'junk',
      ])
    );
    expect(users).toEqual([{ email: 'boss@x.org', role: 'state', passwordHash: 'scrypt:aa:bb' }]);
    expect(parseConfiguredUsers('not json')).toEqual([]);
    expect(parseConfiguredUsers(undefined)).toEqual([]);
  });
});
