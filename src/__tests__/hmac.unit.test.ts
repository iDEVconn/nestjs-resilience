import { describe, it, expect } from 'vitest';
import { signHmac, verifyHmac } from '../hmac';

describe('hmac', () => {
  it('verifyHmac() accepts a signature produced by signHmac() for the same payload and secret', () => {
    const payload = { id: 1, userId: 'u1' };
    const sig = signHmac(payload, 'secret');
    expect(verifyHmac(payload, sig, 'secret')).toBe(true);
  });

  it('verifyHmac() rejects a signature produced with a different secret', () => {
    const payload = { id: 1, userId: 'u1' };
    const sig = signHmac(payload, 'secret-a');
    expect(verifyHmac(payload, sig, 'secret-b')).toBe(false);
  });

  it('verifyHmac() rejects when the payload was tampered with after signing', () => {
    const sig = signHmac({ id: 1, userId: 'u1' }, 'secret');
    expect(verifyHmac({ id: 1, userId: 'attacker' }, sig, 'secret')).toBe(false);
  });

  it('verifyHmac() rejects a malformed (wrong-length) signature instead of throwing', () => {
    expect(verifyHmac({ id: 1 }, 'not-a-real-signature', 'secret')).toBe(false);
  });

  it('signHmac() is deterministic for the same payload and secret', () => {
    const payload = { id: 1, userId: 'u1' };
    expect(signHmac(payload, 'secret')).toBe(signHmac(payload, 'secret'));
  });
});
