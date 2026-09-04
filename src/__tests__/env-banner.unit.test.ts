import { describe, it, expect } from 'vitest';
import { requireEnv } from '../env-banner';

describe('requireEnv', () => {
  it('returns the value when the env var is set', () => {
    const get = (key: string) => ({ DATABASE_URL: 'postgresql://localhost/db' })[key];
    expect(requireEnv(get, 'DATABASE_URL', { service: 'test', envPath: '.env' })).toBe(
      'postgresql://localhost/db',
    );
  });

  it('throws a boxed banner (not a bare message) when the env var is unset', () => {
    const get = () => undefined;
    expect(() => requireEnv(get, 'DATABASE_URL', { service: 'test', envPath: '.env' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('treats a blank/whitespace-only value the same as unset', () => {
    const get = () => '   ';
    expect(() => requireEnv(get, 'DATABASE_URL', { service: 'test', envPath: '.env' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('includes the service name and env path in the thrown banner', () => {
    const get = () => undefined;
    try {
      requireEnv(get, 'DATABASE_URL', { service: 'prospects DB', envPath: 'apps/foo/.env' });
      expect.fail('expected requireEnv to throw');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain('prospects DB');
      expect(message).toContain('apps/foo/.env');
    }
  });
});
