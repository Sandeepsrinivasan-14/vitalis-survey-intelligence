/**
 * Server actions in production builds replace the message of any thrown error
 * with a generic one. Expected failures (not found, validation, rate limit,
 * AI unavailable) are therefore returned as values so users see the real
 * message. Anything unexpected is logged and reported generically.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** An error whose message is safe and useful to show to the user. */
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionError';
  }
}

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof ActionError) {
      return { ok: false, error: error.message };
    }
    console.error('Unexpected server action error:', error);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
