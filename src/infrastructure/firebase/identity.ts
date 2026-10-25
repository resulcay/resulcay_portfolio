// Checks an email and password with Firebase Authentication. The Worker makes
// this call itself, so the browser never loads the Firebase SDK.

const SIGN_IN_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';

export async function verifyPassword(
  apiKey: string,
  email: string,
  password: string,
): Promise<{ uid: string } | undefined> {
  const response = await fetch(`${SIGN_IN_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: false }),
  });
  if (!response.ok) return undefined;
  const data = (await response.json()) as { localId?: string };
  return data.localId ? { uid: data.localId } : undefined;
}
