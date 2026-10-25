import type { AstroGlobal } from 'astro';

const TURNSTILE = 'https://challenges.cloudflare.com';

/** Lets the page load Cloudflare Turnstile and show its frame, and nothing else extra. */
export function allowTurnstile(astro: AstroGlobal): void {
  // Adding any resource replaces the default 'self', so restate it for the
  // site's own bundled scripts.
  astro.csp?.insertScriptResource("'self'");
  astro.csp?.insertScriptResource(TURNSTILE);
  astro.csp?.insertDirective(`frame-src ${TURNSTILE}`);
}
