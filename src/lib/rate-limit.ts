/**
 * Minimal in-memory sliding-window rate limiter. It protects the Gemini key on
 * a public deployment. State is per server instance, which is enough for a
 * single-instance demo; use a shared store (Redis, Firestore) to scale out.
 */

export type RateLimitResult = { ok: boolean; retryAfterMs: number };

export type RateLimiter = {
  check: (key: string) => RateLimitResult;
};

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const { limit, windowMs } = options;
  const now = options.now ?? Date.now;
  const hits = new Map<string, number[]>();

  return {
    check(key: string): RateLimitResult {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((ts) => t - ts < windowMs);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterMs: windowMs - (t - recent[0]) };
      }

      recent.push(t);
      hits.set(key, recent);

      // Opportunistic cleanup so the map cannot grow without bound.
      if (hits.size > 5000) {
        for (const [k, v] of hits) {
          if (v.every((ts) => t - ts >= windowMs)) hits.delete(k);
        }
      }
      return { ok: true, retryAfterMs: 0 };
    },
  };
}

const globalForLimiter = globalThis as unknown as { __aiLimiter?: RateLimiter };

/** Shared limiter for AI-backed server actions (survives dev hot reloads). */
export function getAiRateLimiter(): RateLimiter {
  if (!globalForLimiter.__aiLimiter) {
    const perMinute = Number(process.env.AI_RATE_LIMIT_PER_MIN ?? 12);
    globalForLimiter.__aiLimiter = createRateLimiter({
      limit: Number.isFinite(perMinute) && perMinute > 0 ? perMinute : 12,
      windowMs: 60_000,
    });
  }
  return globalForLimiter.__aiLimiter;
}
