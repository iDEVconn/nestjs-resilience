---
"@idevconn/nestjs-resilience": minor
---

Add `withTimeout` — framework-agnostic timeout primitive for wrapping a single async call. Races `fn()` against a `ms` timer and rejects with `TimeoutError` (carrying `timeoutMs`) if it fires first, with an optional `onTimeout` hook. First piece of the resilience toolkit for actual RPC calls (timeout/retry/circuit-breaker/bulkhead), not just bootstrap retry.
