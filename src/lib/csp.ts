import type { AstroGlobal } from 'astro';
import { turnstileSiteKey } from './auth';

const TURNSTILE = 'https://challenges.cloudflare.com';

/**
 * Lets the page load Cloudflare Turnstile and show its frame, and nothing else
 * extra, when a site key is configured. Call it in the page file before any
 * await: Astro sends the CSP header as soon as the page starts streaming, so a
 * component that adds to it after waiting for data is too late.
 */
export function allowTurnstile(astro: AstroGlobal): void {
  if (!turnstileSiteKey()) return;
  // Adding any resource replaces the default 'self', so restate it for the
  // site's own bundled scripts.
  astro.csp?.insertScriptResource("'self'");
  astro.csp?.insertScriptResource(TURNSTILE);
  astro.csp?.insertDirective(`frame-src ${TURNSTILE}`);
}
