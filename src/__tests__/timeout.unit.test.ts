import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeoutError, withTimeout } from '../timeout';

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the value when fn finishes before the timeout', async () => {
    const fn = () => new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 10));

    const result = withTimeout(fn, 50);
    await vi.advanceTimersByTimeAsync(10);

    await expect(result).resolves.toBe('ok');
  });

  it('rejects with TimeoutError when fn is slower than the timeout', async () => {
    const fn = () => new Promise<string>((resolve) => setTimeout(() => resolve('too late'), 100));

    const result = withTimeout(fn, 50);
    const assertion = expect(result).rejects.toThrow(TimeoutError);
    await vi.advanceTimersByTimeAsync(50);

    await assertion;
  });

  it('sets timeoutMs on the thrown TimeoutError', async () => {
    const fn = () => new Promise<string>((resolve) => setTimeout(() => resolve('too late'), 100));

    const result = withTimeout(fn, 50);
    const assertion = result.catch((err: unknown) => {
      expect(err).toBeInstanceOf(TimeoutError);
      expect((err as TimeoutError).timeoutMs).toBe(50);
    });
    await vi.advanceTimersByTimeAsync(50);

    await assertion;
  });

  it('calls onTimeout when the timeout fires', async () => {
    const fn = () => new Promise<string>((resolve) => setTimeout(() => resolve('too late'), 100));
    const onTimeout = vi.fn();

    const result = withTimeout(fn, 50, { onTimeout });
    const assertion = expect(result).rejects.toThrow(TimeoutError);
    await vi.advanceTimersByTimeAsync(50);
    await assertion;

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not call onTimeout when fn finishes in time', async () => {
    const fn = () => new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 10));
    const onTimeout = vi.fn();

    const result = withTimeout(fn, 50, { onTimeout });
    await vi.advanceTimersByTimeAsync(10);
    await result;

    expect(onTimeout).not.toHaveBeenCalled();
  });
});
