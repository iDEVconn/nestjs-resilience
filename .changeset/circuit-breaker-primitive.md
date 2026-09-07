---
"@idevconn/nestjs-resilience": minor
---

Add `CircuitBreaker` / `CircuitBreakerRegistry` — closed/open/half-open state machine, one instance per downstream key via the registry, `CircuitOpenError` on fail-fast, `onStateChange` hook for observability. Third of 4 resilience primitives.
