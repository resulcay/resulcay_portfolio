// Signs in to Google as the Firebase service account, so the Worker can use
// Firestore with security rules that refuse every browser request.

export interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/datastore';

const encoder = new TextEncoder();

export function base64url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof input === 'string' ? encoder.encode(input) : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem: string): ArrayBuffer {
  // Secrets pasted from the JSON key file often keep "\n" as two characters.
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) der[i] = binary.charCodeAt(i);
  return der.buffer;
}

export async function signJwt(account: ServiceAccount, now = Math.floor(Date.now() / 1000)): Promise<string> {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({ iss: account.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(account.privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(`${header}.${claims}`));
  return `${header}.${claims}.${base64url(signature)}`;
}

let cached: { token: string; expiresAt: number; email: string } | undefined;

export async function getAccessToken(account: ServiceAccount): Promise<string> {
  if (cached && cached.email === account.clientEmail && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await signJwt(account),
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed with ${response.status}`);
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000, email: account.clientEmail };
  return data.access_token;
}
