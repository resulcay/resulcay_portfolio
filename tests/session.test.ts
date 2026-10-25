import { describe, expect, it } from 'vitest';
import { SESSION_TTL_SECONDS, createSessionToken, readCookie, verifySessionToken } from '@/lib/session';

const secret = 'test-secret-that-is-long-enough';

describe('admin session token', () => {
  it('round-trips the user id', async () => {
    const token = await createSessionToken(secret, 'uid-1');
    expect(await verifySessionToken(secret, token)).toBe('uid-1');
  });

  it('refuses a token signed with another secret', async () => {
    const token = await createSessionToken('another-secret', 'uid-1');
    expect(await verifySessionToken(secret, token)).toBeUndefined();
  });

  it('refuses a token whose payload was changed', async () => {
    const token = await createSessionToken(secret, 'uid-1');
    const [, signature] = token.split('.');
    const forged = `${btoa(JSON.stringify({ sub: 'uid-2', exp: 9e9 })).replace(/=+$/, '')}.${signature}`;
    expect(await verifySessionToken(secret, forged)).toBeUndefined();
  });

  it('expires', async () => {
    const now = 1_000_000;
    const token = await createSessionToken(secret, 'uid-1', now);
    expect(await verifySessionToken(secret, token, now + SESSION_TTL_SECONDS - 1)).toBe('uid-1');
    expect(await verifySessionToken(secret, token, now + SESSION_TTL_SECONDS)).toBeUndefined();
  });

  it('ignores garbage', async () => {
    for (const junk of ['', 'a', 'a.b', 'a.b.c', '!!!.???']) {
      expect(await verifySessionToken(secret, junk)).toBeUndefined();
    }
  });

  it('reads one cookie out of a header', () => {
    expect(readCookie('a=1; __Host-rc_session=x.y; b=2', '__Host-rc_session')).toBe('x.y');
    expect(readCookie(null, 'a')).toBeUndefined();
  });
});
