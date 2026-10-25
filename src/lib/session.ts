import { base64url } from '@/infrastructure/firebase/service-account';

// The admin session is a small signed cookie: who and until when, with an
// HMAC so it can't be forged or extended. No session table is needed.

export const SESSION_COOKIE = '__Host-rc_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

const encoder = new TextEncoder();

interface SessionClaims {
  sub: string;
  exp: number;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function fromBase64url(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function createSessionToken(
  secret: string,
  uid: string,
  now = Math.floor(Date.now() / 1000),
): Promise<string> {
  const payload = base64url(JSON.stringify({ sub: uid, exp: now + SESSION_TTL_SECONDS } satisfies SessionClaims));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload));
  return `${payload}.${base64url(signature)}`;
}

/** The user id in a valid, unexpired token, or undefined. */
export async function verifySessionToken(
  secret: string,
  token: string,
  now = Math.floor(Date.now() / 1000),
): Promise<string | undefined> {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return undefined;
  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      fromBase64url(signature),
      encoder.encode(payload),
    );
    if (!valid) return undefined;
    const claims = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as Partial<SessionClaims>;
    if (typeof claims.sub !== 'string' || typeof claims.exp !== 'number' || claims.exp <= now) return undefined;
    return claims.sub;
  } catch {
    return undefined;
  }
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

export const clearedSessionCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
