---
"@idevconn/nestjs-resilience": minor
---

Add `Bulkhead` — caps concurrent calls at `maxConcurrent`, queues the rest, `BulkheadRejectedError` immediately when `maxQueue` overflows instead of waiting forever. Fourth and last of the standalone resilience primitives.
