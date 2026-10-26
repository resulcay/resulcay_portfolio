import { expect, test, type Page } from '@playwright/test';
import { watchConsole } from './console';

const SIZES = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

const overflowsX = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

for (const size of SIZES) {
  test(`story mode at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    const problems = watchConsole(page);
    const requested: string[] = [];
    page.on('request', (request) => requested.push(request.url()));

    await page.goto('/story');
    expect(await overflowsX(page)).toBe(false);
    // Only the tiny title-screen script runs before Start.
    const scripts = requested.filter((url) => url.endsWith('.js')).map((url) => new URL(url).pathname.split('/').pop());
    expect(scripts.filter((name) => !/^(StoryView\.astro_astro_type_script|preload-helper)/.test(name ?? ''))).toEqual([]);

    await page.getByRole('button', { name: 'Start story' }).click();
    const scene = page.locator('[data-canvas]');
    await expect(scene).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
    await expect(scene).toHaveAttribute('data-quality', /^(high|medium|low)$/);
    // Let a few seconds of frames run so animation and quality code get exercised.
    await expect(scene).toHaveAttribute('data-calls', /^\d+$/, { timeout: 20_000 });
    expect(await overflowsX(page)).toBe(false);

    if (size.width === 1440) await page.screenshot({ path: 'test-results/story-1440.png' });

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-stage]')).toBeHidden();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start story' })).toBeFocused();

    expect(problems).toEqual([]);
  });
}

test('reports scene cost at each quality level', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const problems = watchConsole(page);
  for (const quality of ['high', 'medium', 'low']) {
    await page.goto(`/story?quality=${quality}`);
    await page.getByRole('button', { name: 'Start story' }).click();
    const scene = page.locator('[data-canvas]');
    await expect(scene).toHaveAttribute('data-calls', /^\d+$/, { timeout: 60_000 });
    const calls = Number(await scene.getAttribute('data-calls'));
    const triangles = Number(await scene.getAttribute('data-triangles'));
    console.log(`${await scene.getAttribute('data-quality')}: ${calls} draw calls, ${triangles} triangles`);
    expect(calls).toBeLessThan(150);
  }
  expect(problems).toEqual([]);
});
