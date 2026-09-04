---
"@idevconn/nestjs-resilience": patch
---

Fix `exports` map to serve separate `.d.ts`/`.d.cts` type declarations per import/require condition — CommonJS consumers (e.g. ts-loader/webpack builds targeting `module: commonjs`) previously hit TS1479 because the single shared `types` entry pointed at the ESM declaration file.
