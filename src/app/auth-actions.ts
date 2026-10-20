"use server";

import { headers } from 'next/headers';
import { z } from 'zod';
import { ActionError, runAction, type ActionResult } from '@/lib/action-result';
import { createRateLimiter } from '@/lib/rate-limit';
import { ROLE_HOME, safeNextPath } from '@/lib/auth/roles';
import { createSession, destroySession } from '@/lib/auth/session';
import { isAuthConfigured } from '@/lib/auth/token';
import { authenticate } from '@/lib/auth/users';

const loginLimiter = (globalThis as unknown as { __loginLimiter?: ReturnType<typeof createRateLimiter> });
loginLimiter.__loginLimiter ??= createRateLimiter({ limit: 8, windowMs: 5 * 60_000 });

const LoginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email.').max(200),
  password: z.string().min(1, 'Enter your password.').max(200),
  next: z.string().max(300).nullish(),
});

/** Verifies credentials, sets the session cookie, and returns where to go next. */
export async function login(input: { email: string; password: string; next?: string | null }): Promise<ActionResult<{ redirectTo: string }>> {
  return runAction(async () => {
    if (!isAuthConfigured()) {
      console.error('Sign-in attempted but AUTH_SECRET is missing or shorter than 32 characters.');
      throw new ActionError('Sign-in is not configured on this server. Please contact the administrator.');
    }

    const parsed = LoginSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? 'Invalid input.');
    const { email, password, next } = parsed.data;

    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const attempt = loginLimiter.__loginLimiter!.check(`${ip}:${email.toLowerCase()}`);
    if (!attempt.ok) {
      throw new ActionError(`Too many sign-in attempts. Try again in ${Math.ceil(attempt.retryAfterMs / 60_000)} min.`);
    }

    const user = authenticate(email, password);
    if (!user) throw new ActionError('Invalid email or password.');

    await createSession({ email: user.email, role: user.role });
    return { redirectTo: safeNextPath(next, user.role) ?? ROLE_HOME[user.role] };
  });
}

export async function logout(): Promise<void> {
  await destroySession();
}
