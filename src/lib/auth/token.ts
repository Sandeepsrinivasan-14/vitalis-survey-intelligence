import { SignJWT, jwtVerify } from 'jose';
import { isRole, type Role } from './roles';

/** Edge-safe session token helpers (used by both middleware and server code). */

export const SESSION_COOKIE = 'vitalis_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

const MIN_SECRET_LENGTH = 32;

export type SessionClaims = { email: string; role: Role };

/** True when AUTH_SECRET is present and long enough to sign sessions. */
export function isAuthConfigured(): boolean {
  return (process.env.AUTH_SECRET?.length ?? 0) >= MIN_SECRET_LENGTH;
}

export function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`AUTH_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters. Run \`npm run setup:env\` for local development.`);
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

/** Returns the claims for a valid, unexpired token; null for anything else. */
export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string' || !isRole(payload.role)) return null;
    return { email: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
