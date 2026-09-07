import { describe, expect, it, vi } from 'vitest';
import { Bulkhead, BulkheadRejectedError } from '../bulkhead';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('Bulkhead', () => {
  it('runs up to maxConcurrent calls in parallel, queuing the rest', async () => {
    const bulkhead = new Bulkhead({ maxConcurrent: 2 });
    const started = vi.fn();
    const gates = [deferred<void>(), deferred<void>(), deferred<void>()];

    const run = (i: number) =>
      bulkhead.execute(async () => {
        started(i);
        await gates[i]!.promise;
        return i;
      });

    const p0 = run(0);
    const p1 = run(1);
    const p2 = run(2);

    // let microtasks flush
    await Promise.resolve();
    await Promise.resolve();

    expect(started).toHaveBeenCalledTimes(2);
    expect(started).toHaveBeenCalledWith(0);
    expect(started).toHaveBeenCalledWith(1);
    expect(started).not.toHaveBeenCalledWith(2);

    gates[0]!.resolve();
    await p0;
    await Promise.resolve();
    await Promise.resolve();

    expect(started).toHaveBeenCalledWith(2);

    gates[1]!.resolve();
    gates[2]!.resolve();
    await expect(p1).resolves.toBe(1);
    await expect(p2).resolves.toBe(2);
  });

  it('rejects immediately with BulkheadRejectedError when the queue is full', async () => {
    const bulkhead = new Bulkhead({ maxConcurrent: 1, maxQueue: 1 });
    const gate = deferred<void>();

    const running = bulkhead.execute(() => gate.promise);
    const queued = bulkhead.execute(() => Promise.resolve('queued'));
    const overflow = vi.fn(async () => 'overflow');

    await expect(bulkhead.execute(overflow)).rejects.toThrow(BulkheadRejectedError);
    expect(overflow).not.toHaveBeenCalled();

    gate.resolve();
    await running;
    await expect(queued).resolves.toBe('queued');
  });

  it('allows unlimited queueing when maxQueue is not set', async () => {
    const bulkhead = new Bulkhead({ maxConcurrent: 1 });
    const gate = deferred<void>();

    const running = bulkhead.execute(() => gate.promise);
    const queuedCalls = Array.from({ length: 20 }, (_, i) =>
      bulkhead.execute(async () => i),
    );

    gate.resolve();
    await running;
    const results = await Promise.all(queuedCalls);
    expect(results).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });
});
