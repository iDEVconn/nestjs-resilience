# nestjs-resilience

Never-crash-on-missing-config helpers for NestJS microservices.

Extracted from a project-wide pattern: a microservice with a strategy
provider (auth, db, mail, storage, ...) selected at runtime by env vars
should never crash the whole app because a `.env` is incomplete — in dev it
should log a loud, boxed warning and fall back to an in-memory fake; in prod
it should fail fast with the same clear banner instead of a bare stack trace.

## What's in here

- **`env-banner`** — `missingEnv`, `formatEnvBanner`, `requireEnv`,
  `formatGatewayBanner`: build the boxed banner and read env vars that must
  fail loudly when missing.
- **`hmac`** — `signHmac` / `verifyHmac`: deterministic HMAC-SHA256 over a
  JSON payload, for signing inter-service requests.
- **`transport`** — `buildTransport` / `buildTransportMS`: resolve a NestJS
  `ClientOptions`/`MicroserviceOptions` from `${PREFIX}_TRANSPORT` and its
  related env vars (tcp / redis / nats / mqtt / rmq / kafka), each transport
  configured for infinite reconnect after a broker drop.
- **`strategy-fallback`** — `buildStrategyWithFallback`: build a concrete
  strategy or fall back to a fake, honoring the dev-warns / prod-throws rule.
- **`bootstrap-microservice`** — `bootstrapMicroservice`: boots a
  microservice and retries `listen()` when a broker (redis/nats) isn't up
  yet on boot, instead of crashing — NestJS's `ServerRedis`/`ServerNats`
  reject the *initial* connect regardless of the transport's own retry
  options.

## Install

```bash
npm install nestjs-resilience
```

`@nestjs/common` and `@nestjs/microservices` are peer dependencies (v10 or
v11).

## Usage

```ts
import {
  buildTransport,
  bootstrapMicroservice,
  buildStrategyWithFallback,
  signHmac,
  verifyHmac,
} from 'nestjs-resilience';

// main.ts
await bootstrapMicroservice(
  'AUTH',
  () => NestFactory.createMicroservice(AppModule, { ...buildTransport('AUTH') }),
  logger,
);

// app.module.ts strategy factory
const authStrategy = buildStrategyWithFallback({
  service: 'auth MS',
  provider: process.env.AUTH_PROVIDER,
  requiredEnv: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  cfg: configService,
  envPath: 'apps/microservices/auth/.env',
  build: () => new SupabaseAuthStrategy(),
  fake: () => new FakeAuthStrategy(),
});
```

## Development

```bash
npm install
npm test
npm run build
```
