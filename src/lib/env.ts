import { env } from 'cloudflare:workers';

// Reads the Worker's settings once and says plainly which features are set up.
// Secrets are optional here so the site still renders (from the seed data)
// before Firebase, Turnstile or R2 are configured.

const raw = env as unknown as Record<string, unknown>;
const str = (name: string): string | undefined => {
  const value = raw[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
};

export interface FirebaseSettings {
  projectId: string;
  apiKey: string;
  clientEmail: string;
  privateKey: string;
}

export interface Settings {
  firebase: FirebaseSettings | undefined;
  adminUid: string | undefined;
  sessionSecret: string | undefined;
  turnstile: { siteKey: string; secretKey: string } | undefined;
  media: R2Bucket | undefined;
  /** Local development only: password for the stand-in admin login. */
  devAdminPassword: string | undefined;
}

function read(): Settings {
  const projectId = str('FIREBASE_PROJECT_ID');
  const apiKey = str('FIREBASE_API_KEY');
  const clientEmail = str('FIREBASE_CLIENT_EMAIL');
  const privateKey = str('FIREBASE_PRIVATE_KEY');
  const siteKey = str('TURNSTILE_SITE_KEY');
  const secretKey = str('TURNSTILE_SECRET_KEY');
  const media = raw['MEDIA'];
  return {
    firebase: projectId && apiKey && clientEmail && privateKey ? { projectId, apiKey, clientEmail, privateKey } : undefined,
    adminUid: str('ADMIN_UID'),
    sessionSecret: str('SESSION_SECRET'),
    turnstile: siteKey && secretKey ? { siteKey, secretKey } : undefined,
    media: media && typeof media === 'object' && 'put' in media ? (media as R2Bucket) : undefined,
    devAdminPassword: import.meta.env.DEV ? str('DEV_ADMIN_PASSWORD') : undefined,
  };
}

export const settings: Settings = read();
