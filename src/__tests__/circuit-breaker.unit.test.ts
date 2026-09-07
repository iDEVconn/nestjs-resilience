import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CircuitBreaker, CircuitBreakerRegistry, CircuitOpenError } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens after failureThreshold consecutive failures', async () => {
    const onStateChange = vi.fn();
    const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000, onStateChange });
    const failing = () => Promise.reject(new Error('down'));

    await expect(breaker.execute(failing)).rejects.toThrow('down');
    await expect(breaker.execute(failing)).rejects.toThrow('down');

    expect(onStateChange).toHaveBeenCalledWith('closed', 'open');
  });

  it('rejects with CircuitOpenError without calling fn while open', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
    await expect(breaker.execute(() => Promise.reject(new Error('down')))).rejects.toThrow('down');

    const fn = vi.fn(async () => 'should not run');
    await expect(breaker.execute(fn)).rejects.toThrow(CircuitOpenError);
    expect(fn).not.toHaveBeenCalled();
  });

  it('moves to half-open after resetTimeoutMs and closes on a successful probe', async () => {
    const onStateChange = vi.fn();
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000, onStateChange });
    await expect(breaker.execute(() => Promise.reject(new Error('down')))).rejects.toThrow('down');

    vi.advanceTimersByTime(1000);

    await expect(breaker.execute(() => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(onStateChange).toHaveBeenCalledWith('open', 'half-open');
    expect(onStateChange).toHaveBeenCalledWith('half-open', 'closed');

    // closed again: a single subsequent failure should not reopen it (threshold=1 would only
    // reopen on the very next failure since threshold is 1, so verify counter reset via 2 calls)
  });

  it('reopens the circuit when the half-open probe fails', async () => {
    const onStateChange = vi.fn();
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000, onStateChange });
    await expect(breaker.execute(() => Promise.reject(new Error('down')))).rejects.toThrow('down');

    vi.advanceTimersByTime(1000);

    await expect(breaker.execute(() => Promise.reject(new Error('still down')))).rejects.toThrow(
      'still down',
    );
    expect(onStateChange).toHaveBeenCalledWith('half-open', 'open');
  });

  it('limits half-open probes to halfOpenMaxAttempts', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      halfOpenMaxAttempts: 2,
    });
    await expect(breaker.execute(() => Promise.reject(new Error('down')))).rejects.toThrow('down');
    vi.advanceTimersByTime(1000);

    // two slow probes in flight at once — a third should be rejected without running
    let resolveA!: () => void;
    let resolveB!: () => void;
    const probeA = () => new Promise<string>((resolve) => (resolveA = () => resolve('a')));
    const probeB = () => new Promise<string>((resolve) => (resolveB = () => resolve('b')));
    const thirdFn = vi.fn(async () => 'c');

    const a = breaker.execute(probeA);
    const b = breaker.execute(probeB);
    await expect(breaker.execute(thirdFn)).rejects.toThrow(CircuitOpenError);
    expect(thirdFn).not.toHaveBeenCalled();

    resolveA();
    resolveB();
    await expect(a).resolves.toBe('a');
    await expect(b).resolves.toBe('b');
  });

  it('resets the failure counter after closing', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000 });
    // one failure, not enough to open
    await expect(breaker.execute(() => Promise.reject(new Error('down')))).rejects.toThrow('down');
    // a success in between should reset the consecutive-failure count
    await expect(breaker.execute(() => Promise.resolve('ok'))).resolves.toBe('ok');
    // one more failure should not open it since the previous streak was reset
    await expect(breaker.execute(() => Promise.reject(new Error('down')))).rejects.toThrow('down');
    // still closed: circuit still calls fn (does not throw CircuitOpenError)
    await expect(breaker.execute(() => Promise.reject(new Error('down2')))).rejects.toThrow('down2');
  });
});

describe('CircuitBreakerRegistry', () => {
  it('lazily creates one breaker per key and reuses it', () => {
    const registry = new CircuitBreakerRegistry({ failureThreshold: 1, resetTimeoutMs: 1000 });
    const a1 = registry.get('service-a');
    const a2 = registry.get('service-a');
    const b = registry.get('service-b');

    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
  });
});
