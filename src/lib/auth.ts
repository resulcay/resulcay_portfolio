import { verifyPassword } from '@/infrastructure/firebase/identity';
import { verifyTurnstile } from '@/infrastructure/turnstile';
import { settings } from './env';
import { SESSION_COOKIE, createSessionToken, readCookie, verifySessionToken } from './session';

/** The one admin is whoever Firebase signs in with the configured user id. */
const DEV_ADMIN_UID = 'local-dev-admin';

function adminUid(): string | undefined {
  if (settings.firebase) return settings.adminUid;
  return settings.devAdminPassword ? DEV_ADMIN_UID : undefined;
}

export async function hasAdminSession(request: Request): Promise<boolean> {
  const uid = adminUid();
  const token = readCookie(request.headers.get('Cookie'), SESSION_COOKIE);
  if (!uid || !settings.sessionSecret || !token) return false;
  return (await verifySessionToken(settings.sessionSecret, token)) === uid;
}

export function turnstileSiteKey(): string | undefined {
  return settings.turnstile?.siteKey;
}

/** Cloudflare's documented test secret that always passes. */
const TEST_PASS_SECRET = '1x0000000000000000000000000000000AA';

export async function checkHuman(token: string, ip: string | undefined, action: string): Promise<boolean> {
  if (!settings.turnstile) return false;
  // Local development with the test keys works offline. Production builds
  // drop this line entirely.
  if (import.meta.env.DEV && settings.turnstile.secretKey === TEST_PASS_SECRET) return token.length > 0;
  return verifyTurnstile(settings.turnstile.secretKey, token, { ip, action });
}

/** A session token for the admin, or undefined for anyone else. */
export async function signIn(email: string, password: string): Promise<string | undefined> {
  const uid = adminUid();
  if (!uid || !settings.sessionSecret) return undefined;

  let signedIn: string | undefined;
  if (settings.firebase) {
    signedIn = (await verifyPassword(settings.firebase.apiKey, email, password))?.uid;
  } else if (settings.devAdminPassword && password === settings.devAdminPassword) {
    signedIn = DEV_ADMIN_UID;
  }
  return signedIn === uid ? createSessionToken(settings.sessionSecret, uid) : undefined;
}
