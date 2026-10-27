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
  // No @astrojs/react: Story mode's React code is imported on demand by a plain
  // script, and Vite compiles its JSX from tsconfig. The integration's Fast
  // Refresh needs a preamble that only island pages get, so Start broke in dev.
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
      // The hash is BaseLayout's one-line loading script (tests/ready.test.ts keeps them in step).
      scriptDirective: { resources: ["'self'", 'https://static.cloudflareinsights.com'], hashes: ['sha256-kj+jvIqBtImlr3Nb2wta1Di1Sp7kc9vJi3O0jz6RJL8='] },
    },
  },
});
