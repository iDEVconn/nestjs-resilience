import { missingEnv, formatEnvBanner } from './env-banner';

export interface StrategyConfigReader {
  get(key: string): string | undefined;
}

export interface BuildStrategyOpts<T> {
  service: string;
  provider: string;
  requiredEnv: string[];
  cfg: StrategyConfigReader;
  envPath: string;
  build: () => T;
  fake: () => T;
}

/**
 * Build a concrete strategy, or fall back to an in-memory fake. Centralises
 * the dev-warns-and-fakes / prod-fails-fast behavior that would otherwise
 * live inline in every module's useFactory.
 */
export function buildStrategyWithFallback<T>(opts: BuildStrategyOpts<T>): T {
  const missing = missingEnv((k) => opts.cfg.get(k), opts.requiredEnv);

  const fallback = (reason?: string): T => {
    const banner = formatEnvBanner({
      service: opts.service,
      provider: opts.provider,
      missing,
      envPath: opts.envPath,
      reason,
    });
    if (process.env['NODE_ENV'] === 'production') throw new Error(banner);
    console.warn(banner);
    return opts.fake();
  };

  if (missing.length > 0) return fallback();
  try {
    return opts.build();
  } catch (err) {
    return fallback(err instanceof Error ? err.message : String(err));
  }
}
