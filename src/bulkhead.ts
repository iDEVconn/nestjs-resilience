export class BulkheadRejectedError extends Error {
  constructor() {
    super('Bulkhead queue is full — call rejected immediately');
    this.name = 'BulkheadRejectedError';
  }
}

export interface BulkheadOpts {
  maxConcurrent: number;
  maxQueue?: number;
}

interface QueueEntry {
  run: () => void;
}

/** Caps concurrent `fn()` calls at `maxConcurrent`, queuing the rest (bounded by `maxQueue`). */
export class Bulkhead {
  private inFlight = 0;
  private readonly queue: QueueEntry[] = [];

  constructor(private readonly opts: BulkheadOpts) {}

  execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.inFlight >= this.opts.maxConcurrent) {
      if (this.opts.maxQueue !== undefined && this.queue.length >= this.opts.maxQueue) {
        return Promise.reject(new BulkheadRejectedError());
      }
      return new Promise<T>((resolve, reject) => {
        this.queue.push({ run: () => this.start(fn, resolve, reject) });
      });
    }
    return new Promise<T>((resolve, reject) => {
      this.start(fn, resolve, reject);
    });
  }

  private start<T>(
    fn: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (err: unknown) => void,
  ): void {
    this.inFlight += 1;
    fn().then(resolve, reject).finally(() => {
      this.inFlight -= 1;
      const next = this.queue.shift();
      next?.run();
    });
  }
}
