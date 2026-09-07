import type { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { composeResilience, type ComposeResilienceOpts } from './resilience';

/**
 * Thin NestJS-specific wrapper — the one place in this package that imports
 * `@nestjs/microservices`. Everything else (timeout/retry/circuit-breaker/
 * bulkhead/composeResilience) is framework-agnostic.
 *
 * Wraps `client.send(pattern, data)` in `composeResilience`, closing the gap
 * where a gateway→microservice RPC call has no timeout/retry/circuit-breaker
 * of its own — only the microservice's own `bootstrapMicroservice` retry
 * covers broker connectivity at boot, not individual request/response calls.
 */
export function resilientSend<T>(
  client: ClientProxy,
  pattern: string,
  data: unknown,
  opts: ComposeResilienceOpts,
): Promise<T> {
  return composeResilience(() => firstValueFrom(client.send<T>(pattern, data)), opts);
}
