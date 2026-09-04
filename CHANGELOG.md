# @idevconn/nestjs-resilience

## 0.2.1

### Patch Changes

- adc43c1: Fix `exports` map to serve separate `.d.ts`/`.d.cts` type declarations per import/require condition — CommonJS consumers (e.g. ts-loader/webpack builds targeting `module: commonjs`) previously hit TS1479 because the single shared `types` entry pointed at the ESM declaration file.

## 0.2.0

### Minor Changes

- cf90ba0: Initial release: env-banner, hmac, transport, strategy-fallback, and bootstrap-microservice helpers for NestJS microservices that must never crash on missing config.
