// Server-side check of a Cloudflare Turnstile token. A token is valid once,
// for one action, and only when Cloudflare says so.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(
  secret: string,
  token: string,
  options: { ip?: string | undefined; action?: string } = {},
): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (options.ip) body.set('remoteip', options.ip);
  try {
    const response = await fetch(VERIFY_URL, { method: 'POST', body });
    if (!response.ok) return false;
    const result = (await response.json()) as { success: boolean; action?: string };
    // Test keys report no action, so only compare it when Cloudflare sends one.
    if (options.action && result.action && result.action !== options.action) return false;
    return result.success === true;
  } catch {
    return false;
  }
}
