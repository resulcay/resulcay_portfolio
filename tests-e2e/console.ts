import type { Page } from '@playwright/test';

/**
 * Collects console errors and warnings and uncaught page errors, so a test
 * can insist on none. Debug and info messages pass by type: in dev that's
 * Vite's "[vite] connecting/connected" and React's DevTools hint.
 */
export function watchConsole(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}
