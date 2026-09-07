import type { Bulkhead } from './bulkhead';
import type { CircuitBreaker } from './circuit-breaker';
import { withRetry, type RetryOpts } from './retry';
import { withTimeout, type TimeoutOpts } from './timeout';

export interface ComposeTimeoutOpts extends TimeoutOpts {
  ms: number;
}

export interface ComposeResilienceOpts {
  timeout?: ComposeTimeoutOpts;
  retry?: RetryOpts;
  circuitBreaker?: CircuitBreaker;
  bulkhead?: Bulkhead;
}

/**
 * Applies the primitives in a fixed, deliberate order — outermost to
 * innermost:
 *
 *   bulkhead -> circuit breaker -> retry -> timeout
 *
 *  1. bulkhead caps overall concurrency first, so a downstream outage
 *     doesn't let unbounded retries pile up concurrent work.
 *  2. circuit breaker wraps the *entire* retry series as a single
 *     execute() call, so it fails fast on an already-open circuit without
 *     spending a retry budget, and only counts one success/failure per
 *     logical call (not one per attempt).
 *  3. retry sits inside the breaker so each attempt it makes is a fresh
 *     invocation of the innermost step.
 *  4. timeout is applied to each individual retry attempt, not to the
 *     retry series as a whole — a slow attempt should be abandoned and
 *     retried, not let it eat the whole operation's time budget.
 */
export function composeResilience<T>(fn: () => Promise<T>, opts: ComposeResilienceOpts): Promise<T> {
  const attempt = (): Promise<T> => (opts.timeout ? withTimeout(fn, opts.timeout.ms, opts.timeout) : fn());

  const withRetries = (): Promise<T> => (opts.retry ? withRetry(attempt, opts.retry) : attempt());

  const withCircuitBreaker = (): Promise<T> =>
    opts.circuitBreaker ? opts.circuitBreaker.execute(withRetries) : withRetries();

  return opts.bulkhead ? opts.bulkhead.execute(withCircuitBreaker) : withCircuitBreaker();
}
