# @idevconn/nestjs-resilience

## 0.3.0

### Minor Changes

- bf51eb2: Add `Bulkhead` — caps concurrent calls at `maxConcurrent`, queues the rest, `BulkheadRejectedError` immediately when `maxQueue` overflows instead of waiting forever. Fourth and last of the standalone resilience primitives.
- bf51eb2: Add `CircuitBreaker` / `CircuitBreakerRegistry` — closed/open/half-open state machine, one instance per downstream key via the registry, `CircuitOpenError` on fail-fast, `onStateChange` hook for observability. Third of 4 resilience primitives.
- bf51eb2: Add `resilientSend` — thin NestJS wrapper around `ClientProxy.send()` composed with `composeResilience`. Closes the gap found in the iCore audit: gateway→microservice RPC calls had no timeout/retry/circuit-breaker of their own, only bootstrap-time broker retry. Adds `rxjs` as a peer/dev dependency (only file in the package importing `@nestjs/microservices`/`rxjs`).
- bf51eb2: Add `composeResilience` — wires timeout/retry/circuit-breaker/bulkhead together in a fixed, documented order (bulkhead → circuit breaker → retry → timeout), so a retry series counts as one circuit-breaker outcome and each individual attempt (not the whole series) is timeout-bounded.
- bf51eb2: Add `withRetry` — exponential backoff retry primitive with ±20% jitter (to avoid synchronized retry storms across instances), an `isRetryable` predicate for excluding non-transient errors, and `onRetry` hook. Rejects with the last real error on exhaustion, not a generic wrapper.
- bf51eb2: Add `withTimeout` — framework-agnostic timeout primitive for wrapping a single async call. Races `fn()` against a `ms` timer and rejects with `TimeoutError` (carrying `timeoutMs`) if it fires first, with an optional `onTimeout` hook. First piece of the resilience toolkit for actual RPC calls (timeout/retry/circuit-breaker/bulkhead), not just bootstrap retry.

## 0.2.1

### Patch Changes

- adc43c1: Fix `exports` map to serve separate `.d.ts`/`.d.cts` type declarations per import/require condition — CommonJS consumers (e.g. ts-loader/webpack builds targeting `module: commonjs`) previously hit TS1479 because the single shared `types` entry pointed at the ESM declaration file.

## 0.2.0

### Minor Changes

- cf90ba0: Initial release: env-banner, hmac, transport, strategy-fallback, and bootstrap-microservice helpers for NestJS microservices that must never crash on missing config.
