export class TimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export interface TimeoutOpts {
  onTimeout?: () => void;
}

/**
 * Races `fn()` against a `ms` timer. `fn` runs regardless of the outcome —
 * this only stops waiting for it, it does not cancel it (no signal to cancel
 * with, since `fn` takes none).
 */
export function withTimeout<T>(fn: () => Promise<T>, ms: number, opts?: TimeoutOpts): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      opts?.onTimeout?.();
      reject(new TimeoutError(ms));
    }, ms);

    fn().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
