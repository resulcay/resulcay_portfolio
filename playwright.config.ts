import { defineConfig } from '@playwright/test';

// Uses the Edge already installed on the machine; no browser downloads.
// Run `npm run build` first: the tests hit the production preview.
export default defineConfig({
  testDir: 'tests-e2e',
  timeout: 90_000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4329',
    channel: 'msedge',
    headless: true,
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'npx astro preview --port 4329',
    url: 'http://localhost:4329/story',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
