---
"@idevconn/nestjs-resilience": minor
---

Add `composeResilience` — wires timeout/retry/circuit-breaker/bulkhead together in a fixed, documented order (bulkhead → circuit breaker → retry → timeout), so a retry series counts as one circuit-breaker outcome and each individual attempt (not the whole series) is timeout-bounded.
