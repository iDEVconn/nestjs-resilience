import type { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker';
import { resilientSend } from '../nest-resilient-client';

function fakeClient(send: ClientProxy['send']): ClientProxy {
  return { send } as unknown as ClientProxy;
}

describe('resilientSend', () => {
  it('resolves with the emitted value on success', async () => {
    const client = fakeClient(() => of('pong') as never);

    const result = await resilientSend(client, 'ping', {}, {});

    expect(result).toBe('pong');
  });

  it('retries a failing send and resolves once it succeeds', async () => {
    let attempts = 0;
    const client = fakeClient((() => {
      attempts += 1;
      return attempts < 3 ? throwError(() => new Error('unavailable')) : of('pong');
    }) as ClientProxy['send']);

    const result = await resilientSend(client, 'ping', {}, { retry: { maxAttempts: 5, baseDelayMs: 0 } });

    expect(result).toBe('pong');
    expect(attempts).toBe(3);
  });

  it('fails fast with CircuitOpenError when the breaker is open, without calling send', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60_000 });
    const send = vi.fn(() => throwError(() => new Error('down')) as never);
    const client = fakeClient(send as ClientProxy['send']);

    await expect(resilientSend(client, 'ping', {}, { circuitBreaker: breaker })).rejects.toThrow('down');
    await expect(resilientSend(client, 'ping', {}, { circuitBreaker: breaker })).rejects.toThrow(
      CircuitOpenError,
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
});
