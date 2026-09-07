export type CircuitState = 'closed' | 'open' | 'half-open';

interface LoggerLike {
  log: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string, trace?: unknown) => void;
}

export class CircuitOpenError extends Error {
  constructor() {
    super('Circuit is open — call rejected without invoking the underlying function');
    this.name = 'CircuitOpenError';
  }
}

export interface CircuitBreakerOpts {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts?: number;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  logger?: LoggerLike;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private openedAt = 0;
  private halfOpenInFlight = 0;
  private readonly halfOpenMaxAttempts: number;

  constructor(private readonly opts: CircuitBreakerOpts) {
    this.halfOpenMaxAttempts = opts.halfOpenMaxAttempts ?? 1;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt < this.opts.resetTimeoutMs) {
        throw new CircuitOpenError();
      }
      this.transition('half-open');
    }

    if (this.state === 'half-open') {
      if (this.halfOpenInFlight >= this.halfOpenMaxAttempts) {
        throw new CircuitOpenError();
      }
      this.halfOpenInFlight += 1;
      try {
        const result = await fn();
        this.halfOpenInFlight -= 1;
        this.consecutiveFailures = 0;
        this.transition('closed');
        return result;
      } catch (err) {
        this.halfOpenInFlight -= 1;
        this.openedAt = Date.now();
        this.transition('open');
        throw err;
      }
    }

    try {
      const result = await fn();
      this.consecutiveFailures = 0;
      return result;
    } catch (err) {
      this.consecutiveFailures += 1;
      if (this.consecutiveFailures >= this.opts.failureThreshold) {
        this.openedAt = Date.now();
        this.transition('open');
      }
      throw err;
    }
  }

  private transition(to: CircuitState): void {
    const from = this.state;
    if (from === to) return;
    this.state = to;
    this.opts.logger?.warn(`Circuit breaker: ${from} -> ${to}`);
    this.opts.onStateChange?.(from, to);
  }
}

/** One CircuitBreaker per key (e.g. per downstream microservice/provider), created lazily. */
export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker>();

  constructor(private readonly opts: CircuitBreakerOpts) {}

  get(key: string): CircuitBreaker {
    let breaker = this.breakers.get(key);
    if (!breaker) {
      breaker = new CircuitBreaker(this.opts);
      this.breakers.set(key, breaker);
    }
    return breaker;
  }
}
