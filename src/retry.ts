export interface RetryOpts {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  isRetryable?: (err: unknown) => boolean;
  onRetry?: (attempt: number, err: unknown) => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff with ±20% jitter, applied before the maxDelayMs cap so
 * the cap is a real ceiling (jitter can only ever pull a delay down toward
 * it, never push it past). Jitter spreads out retry storms across instances
 * that failed at the same moment.
 */
function nextDelayMs(attempt: number, opts: RetryOpts): number {
  const exponential = opts.baseDelayMs * 2 ** (attempt - 1);
  const jittered = exponential * (0.8 + Math.random() * 0.4);
  return opts.maxDelayMs === undefined ? jittered : Math.min(jittered, opts.maxDelayMs);
}

/**
 * Retries `fn` with exponential backoff until it succeeds or maxAttempts is
 * exhausted, in which case it rejects with the last real error (not a
 * generic "retries exhausted" wrapper).
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOpts): Promise<T> {
  const isRetryable = opts.isRetryable ?? (() => true);

  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= opts.maxAttempts || !isRetryable(err)) {
        throw err;
      }
      opts.onRetry?.(attempt, err);
      await delay(nextDelayMs(attempt, opts));
    }
  }
}
