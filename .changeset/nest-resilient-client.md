---
"@idevconn/nestjs-resilience": minor
---

Add `resilientSend` — thin NestJS wrapper around `ClientProxy.send()` composed with `composeResilience`. Closes the gap found in the iCore audit: gateway→microservice RPC calls had no timeout/retry/circuit-breaker of their own, only bootstrap-time broker retry. Adds `rxjs` as a peer/dev dependency (only file in the package importing `@nestjs/microservices`/`rxjs`).
