// Env helpers for services that must never crash on missing config —
// report which vars are missing with a boxed banner instead of a bare stack trace.

/**
 * Returns the keys whose value is missing or blank.
 * @param get   accessor (e.g. ConfigService.get bound to the service config)
 * @param keys  env var names required for the selected provider
 */
export function missingEnv(get: (key: string) => string | undefined, keys: string[]): string[] {
  return keys.filter((k) => !get(k)?.trim());
}

/**
 * Builds an eye-catching boxed banner listing the env vars a service
 * needs but is missing, so it stands out in dev-server log noise.
 */
export function formatEnvBanner(opts: {
  service: string;
  provider: string | undefined;
  missing: string[];
  envPath: string;
  reason?: string;
  /** Override the first line. Defaults to the in-memory-fake warning. */
  headline?: string;
}): string {
  const { service, provider, missing, envPath, reason, headline } = opts;
  const lines: string[] = [];
  lines.push(headline ?? `⚠  ${service} — running with an IN-MEMORY FAKE (requests will fail)`);
  lines.push('');
  if (!provider) {
    lines.push(`Provider env var is not set.`);
  } else if (missing.length > 0) {
    lines.push(`"${provider}" needs these env vars, currently missing:`);
    for (const k of missing) lines.push(`  • ${k}`);
  } else if (reason) {
    // Vars are present but invalid (e.g. placeholder URL the SDK rejected).
    lines.push(`"${provider}" failed to initialise:`);
    lines.push(`  ${reason}`);
  }
  lines.push('');
  lines.push(`Set real values in:  ${envPath}`);

  const width = Math.max(...lines.map((l) => l.length), 50);
  const top = `╔═${'═'.repeat(width)}═╗`;
  const bot = `╚═${'═'.repeat(width)}═╝`;
  const body = lines.map((l) => `║ ${l.padEnd(width)} ║`).join('\n');
  return `\n${top}\n${body}\n${bot}`;
}

/**
 * Reads a required env var (e.g. DATABASE_URL) that has no fallback/fake —
 * unlike the strategy-swap providers, throws a boxed formatEnvBanner error in
 * every environment (dev included) instead of a bare one-line Error, so a
 * missing var is immediately legible in the startup log rather than buried
 * in a stack trace.
 */
export function requireEnv(
  get: (key: string) => string | undefined,
  key: string,
  opts: { service: string; envPath: string },
): string {
  const value = get(key);
  if (value?.trim()) return value;
  throw new Error(
    formatEnvBanner({
      service: opts.service,
      provider: key,
      missing: [key],
      envPath: opts.envPath,
      headline: `⚠  ${opts.service} — missing required env var, cannot start`,
    }),
  );
}

/**
 * Returns a boxed startup info banner listing every downstream service a
 * gateway will connect to, reading the current transport env vars.
 */
export function formatGatewayBanner(opts: {
  port: number;
  origin: string;
  services: Array<{ name: string; prefix: string }>;
}): string {
  const { port, origin, services } = opts;
  const lines: string[] = [];
  lines.push(`Gateway listening on  ${origin}:${port}/api`);
  lines.push(`Swagger UI            ${origin}:${port}/api/docs`);
  lines.push('');
  lines.push('Microservice transports:');
  for (const { name, prefix } of services) {
    const kind = (process.env[`${prefix}_TRANSPORT`] ?? 'tcp').toLowerCase();
    let target: string;
    if (kind === 'tcp') {
      const host = process.env[`${prefix}_HOST`] ?? '127.0.0.1';
      const port_ = process.env[`${prefix}_PORT`] ?? '?';
      target = `tcp  ${host}:${port_}`;
    } else if (kind === 'redis') {
      target = `redis  ${process.env[`${prefix}_REDIS_URL`] ?? '(REDIS_URL not set)'}`;
    } else if (kind === 'nats') {
      target = `nats  ${process.env[`${prefix}_NATS_URL`] ?? '(NATS_URL not set)'}`;
    } else {
      target = kind;
    }
    lines.push(`  ${name.padEnd(10)} →  ${target}`);
  }

  const width = Math.max(...lines.map((l) => l.length), 50);
  const top = `╔═${'═'.repeat(width)}═╗`;
  const bot = `╚═${'═'.repeat(width)}═╝`;
  const body = lines.map((l) => `║ ${l.padEnd(width)} ║`).join('\n');
  return `\n${top}\n${body}\n${bot}`;
}
