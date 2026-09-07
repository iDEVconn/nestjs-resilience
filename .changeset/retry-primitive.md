---
"@idevconn/nestjs-resilience": minor
---

Add `withRetry` — exponential backoff retry primitive with ±20% jitter (to avoid synchronized retry storms across instances), an `isRetryable` predicate for excluding non-transient errors, and `onRetry` hook. Rejects with the last real error on exhaustion, not a generic wrapper.
