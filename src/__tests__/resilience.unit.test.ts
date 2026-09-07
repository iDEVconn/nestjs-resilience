import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Bulkhead, BulkheadRejectedError } from '../bulkhead';
import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker';
import { composeResilience } from '../resilience';
import { TimeoutError } from '../timeout';

describe('composeResilience', () => {
  it('resolves when fn succeeds with no options applied', async () => {
    const result = await composeResilience(() => Promise.resolve('ok'), {});
    expect(result).toBe('ok');
  });

  it('retries on failure, applying timeout per attempt (not the whole retry series)', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('transient');
      return 'ok';
    });

    const result = await composeResilience(fn, {
      retry: { maxAttempts: 5, baseDelayMs: 0 },
      timeout: { ms: 1000 },
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('times out a single slow attempt and still retries the next attempt', async () => {
    vi.useFakeTimers();
    try {
      let attempts = 0;
      const fn = vi.fn(() => {
        attempts += 1;
        if (attempts === 1) {
          return new Promise<string>((resolve) => setTimeout(() => resolve('too late'), 100));
        }
        return Promise.resolve('ok');
      });

      const promise = composeResilience(fn, {
        retry: { maxAttempts: 3, baseDelayMs: 0 },
        timeout: { ms: 10 },
      });

      await vi.runAllTimersAsync();
      await expect(promise).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not call fn when the circuit breaker is open, skipping retry entirely', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60_000 });
    await expect(
      composeResilience(() => Promise.reject(new Error('down')), { circuitBreaker: breaker }),
    ).rejects.toThrow('down');

    const fn = vi.fn(async () => 'should not run');
    await expect(composeResilience(fn, { circuitBreaker: breaker, retry: { maxAttempts: 5, baseDelayMs: 0 } })).rejects.toThrow(
      CircuitOpenError,
    );
    expect(fn).not.toHaveBeenCalled();
  });

  it('counts the whole retry series as a single circuit-breaker outcome', async () => {
    const onStateChange = vi.fn();
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60_000, onStateChange });
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('transient');
      return 'ok';
    });

    const result = await composeResilience(fn, {
      circuitBreaker: breaker,
      retry: { maxAttempts: 5, baseDelayMs: 0 },
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    // the retries happened *inside* one breaker.execute call, so the breaker never saw a failure
    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('rejects immediately via the bulkhead queue limit, without calling fn', async () => {
    const bulkhead = new Bulkhead({ maxConcurrent: 1, maxQueue: 0 });
    const gate = new Promise<void>(() => undefined);
    void composeResilience(() => gate, { bulkhead });

    const fn = vi.fn(async () => 'should not run');
    await expect(composeResilience(fn, { bulkhead })).rejects.toThrow(BulkheadRejectedError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('rejects with TimeoutError when no retry is configured and the single attempt is slow', async () => {
    vi.useFakeTimers();
    try {
      const fn = () => new Promise<string>((resolve) => setTimeout(() => resolve('too late'), 100));
      const promise = composeResilience(fn, { timeout: { ms: 10 } });
      const assertion = expect(promise).rejects.toThrow(TimeoutError);
      await vi.advanceTimersByTimeAsync(10);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
