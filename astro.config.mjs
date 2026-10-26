// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://resulcay.com',
  output: 'server',
  trailingSlash: 'never',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  session: false,
  // React only powers Story mode, which loads after the visitor presses Start.
  integrations: [react({ include: ['**/src/story/**'] })],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'tr'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  security: {
    csp: {
      // Cloudflare Web Analytics injects its beacon script at the edge.
      scriptDirective: { resources: ["'self'", 'https://static.cloudflareinsights.com'] },
    },
  },
});
