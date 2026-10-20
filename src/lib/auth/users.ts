import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { isRole, type Role } from './roles';

/**
 * User store. Accounts come exclusively from the AUTH_USERS environment
 * variable: a JSON array of { email, role, passwordHash }. There are no
 * built-in or demo accounts. Create hashes with
 * `npm run hash-password -- "<password>"`, or generate a complete local
 * configuration with `npm run setup:env`.
 *
 * Hash format: `scrypt:<salt hex>:<hash hex>`. The ':' delimiter (rather than
 * '$') keeps the value intact when it is loaded from a .env file, where '$'
 * triggers variable expansion.
 */

export type User = { email: string; role: Role; passwordHash: string };

const KEY_LENGTH = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  if (expected.length === 0) return false;
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function parseConfiguredUsers(raw: string | undefined): User[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((u): User[] => {
      if (
        u && typeof u === 'object' &&
        typeof u.email === 'string' && isRole(u.role) && typeof u.passwordHash === 'string'
      ) {
        return [{ email: u.email.trim().toLowerCase(), role: u.role, passwordHash: u.passwordHash }];
      }
      return [];
    });
  } catch {
    return [];
  }
}

export function listUsers(): User[] {
  return parseConfiguredUsers(process.env.AUTH_USERS);
}

// Burn the same CPU for unknown emails so response time does not reveal them.
let dummyHash: string | null = null;

export function authenticate(email: string, password: string): User | null {
  const normalized = email.trim().toLowerCase();
  const user = listUsers().find((u) => u.email === normalized);
  dummyHash ??= hashPassword('not-a-real-password');
  const ok = verifyPassword(password, user?.passwordHash ?? dummyHash);
  return user && ok ? user : null;
}
