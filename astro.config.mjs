// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://resulcay.com',
  output: 'server',
  trailingSlash: 'never',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  session: false,
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'tr'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  security: {
    csp: true,
  },
});
