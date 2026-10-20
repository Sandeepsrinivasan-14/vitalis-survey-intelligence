import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession, type SessionClaims } from './token';

/** Server-only helpers for reading and writing the session cookie. */

export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function createSession(claims: SessionClaims): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(claims), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
