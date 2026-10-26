import { expect, test } from '@playwright/test';
import { watchConsole } from './console';

// Dev serves modules unbundled and adds its own client code, so Start can
// break there while the production build works.
test('story mode starts in the dev server', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/story');
  await page.getByRole('button', { name: 'Start story' }).click();
  await expect(page.locator('[data-canvas]')).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(problems).toEqual([]);
});
