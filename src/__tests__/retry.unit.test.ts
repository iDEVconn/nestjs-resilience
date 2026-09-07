import { describe, expect, it, vi } from 'vitest';
import { withRetry } from '../retry';

describe('withRetry', () => {
  it('succeeds after N failed attempts', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error(`fail ${attempts}`);
      return 'ok';
    });

    const result = await withRetry(fn, { maxAttempts: 5, baseDelayMs: 0 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('rejects with the last real error once attempts are exhausted', async () => {
    const fn = vi.fn(async () => {
      throw new Error('boom');
    });

    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 0 })).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('stops immediately when isRetryable returns false', async () => {
    const fn = vi.fn(async () => {
      throw new Error('not transient');
    });

    await expect(
      withRetry(fn, { maxAttempts: 5, baseDelayMs: 0, isRetryable: () => false }),
    ).rejects.toThrow('not transient');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry with the attempt number and the error before each retry', async () => {
    const onRetry = vi.fn();
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error(`fail ${attempts}`);
      return 'ok';
    });

    await withRetry(fn, { maxAttempts: 5, baseDelayMs: 0, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, new Error('fail 1'));
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, new Error('fail 2'));
  });

  it('backs off exponentially, capped at maxDelayMs', async () => {
    vi.useFakeTimers();
    try {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      vi.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
        delays.push(ms ?? 0);
        return originalSetTimeout(fn, 0);
      }) as unknown as typeof setTimeout);

      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts += 1;
        if (attempts < 4) throw new Error('fail');
        return 'ok';
      });

      const result = withRetry(fn, { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 300 });
      await vi.runAllTimersAsync();
      await result;

      // attempt1->2: base*2^0=100, attempt2->3: base*2^1=200, attempt3->4: base*2^2=400 capped to 300
      expect(delays).toHaveLength(3);
      expect(delays[0]).toBeGreaterThanOrEqual(80);
      expect(delays[0]).toBeLessThanOrEqual(120);
      expect(delays[1]).toBeGreaterThanOrEqual(160);
      expect(delays[1]).toBeLessThanOrEqual(240);
      // 400 * jitter(0.8-1.2) is always > 300, so the cap always wins here
      expect(delays[2]).toBe(300);
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });
});
