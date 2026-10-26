import { defineConfig } from '@playwright/test';

// Uses the Edge already installed on the machine; no browser downloads.
// The "preview" project tests the production build, so run `npm run build`
// first. The "dev" project uses `astro dev` on its default port (reusing one
// that is already running, since Astro allows one per project) to catch
// dev-only breakage.
export default defineConfig({
  testDir: 'tests-e2e',
  timeout: 90_000,
  workers: 1,
  use: {
    channel: 'msedge',
    headless: true,
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [
    { name: 'preview', testIgnore: /dev\.spec\.ts/, use: { baseURL: 'http://localhost:4329' } },
    { name: 'dev', testMatch: /dev\.spec\.ts/, use: { baseURL: 'http://localhost:4321' } },
  ],
  webServer: [
    { command: 'npx astro preview --port 4329', url: 'http://localhost:4329/story', reuseExistingServer: true, timeout: 120_000 },
    { command: 'npx astro dev', url: 'http://localhost:4321/story', reuseExistingServer: true, timeout: 120_000 },
  ],
});
