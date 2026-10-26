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

    // First visit: who's visiting? A recruiter gets shortcut chips.
    const choice = page.getByRole('dialog', { name: "Who's visiting?" });
    await expect(choice).toBeVisible();
    if (size.width === 390) await page.screenshot({ path: 'test-results/choice-390.png' });
    await choice.getByRole('button', { name: 'Recruiter' }).click();
    await expect(page.locator('.story-thought')).toHaveText('Resul will remember that.');
    await expect(page.getByRole('link', { name: 'CV', exact: true })).toHaveAttribute('href', '/resul-cay-cv.pdf');
    await page.getByRole('button', { name: 'Experience', exact: true }).click();
    const fromChip = page.getByRole('dialog', { name: 'Experience' });
    await expect(fromChip).toBeVisible();
    await fromChip.getByRole('button', { name: 'Close' }).click();
    // Closing plays the rewind.
    await expect(scene).toHaveAttribute('data-rewinding', 'true');
    if (size.width === 1440) await page.screenshot({ path: 'test-results/rewind-1440.png' });
    await expect(scene).not.toHaveAttribute('data-rewinding');
    await expect(fromChip).toBeHidden();

    if (size.width === 1440) await page.screenshot({ path: 'test-results/story-1440.png' });

    // Keyboard path: focus the laptop, read the thought, open it, close it.
    const laptop = page.getByRole('button', { name: 'Laptop' });
    await laptop.focus();
    await expect(page.locator('.story-thought')).toHaveText('My work history, minus the coffee.');
    await page.keyboard.press('Enter');
    const experience = page.getByRole('dialog', { name: 'Experience' });
    await expect(experience).toBeVisible();
    await expect(experience).toContainText('creWin');
    await experience.getByRole('button', { name: 'Close' }).click();
    await expect(experience).toBeHidden();
    await expect(laptop).toBeFocused();

    // The photo wall: pick a project, then check the way back to the journal.
    await page.getByRole('button', { name: 'Photo wall' }).focus();
    await page.keyboard.press('Enter');
    const projects = page.getByRole('dialog', { name: 'Projects' });
    await projects.getByRole('button', { name: /MacYap/ }).click();
    const caseStudy = page.getByRole('dialog', { name: 'MacYap' });
    await expect(caseStudy.getByRole('link', { name: 'Read on the journal' })).toHaveAttribute('href', '/projects/macyap');
    expect(page.url()).toContain('#project/macyap');
    if (size.width === 390 || size.width === 1440) await page.screenshot({ path: `test-results/panel-${size.width}.png` });
    // Esc steps back through history: case study, then the grid, then the room.
    await page.keyboard.press('Escape');
    await expect(projects).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(projects).toBeHidden();
    await expect(page.locator('[data-stage]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-stage]')).toBeHidden();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start story' })).toBeFocused();

    // A reload remembers the answer.
    await page.reload();
    await page.getByRole('button', { name: 'Start story' }).click();
    await expect(scene).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
    await expect(page.getByRole('link', { name: 'CV', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog', { name: "Who's visiting?" })).toHaveCount(0);

    expect(problems).toEqual([]);
  });
}

// These skip the first-visit question.
const returning = (page: Page) => page.addInitScript(() => localStorage.setItem('story-visitor', 'explorer'));

test('a deep link opens its panel, and Back closes it', async ({ page }) => {
  await returning(page);
  const problems = watchConsole(page);
  await page.goto('/');
  await page.goto('/tr/story#laptop');
  const experience = page.getByRole('dialog', { name: 'Deneyim' });
  await expect(experience).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Kapat' }).click();
  await expect(experience).toBeHidden();
  expect(new URL(page.url()).hash).toBe('');

  await page.getByRole('button', { name: 'Günlük' }).focus();
  await page.keyboard.press('Enter');
  const about = page.getByRole('dialog', { name: 'Hakkımda' });
  await expect(about).toContainText('Tamamlanmadı');
  await page.goBack();
  await expect(about).toBeHidden();
  await expect(page.locator('[data-stage]')).toBeVisible();
  expect(problems).toEqual([]);
});

test('pages with a Turnstile form allow it in the CSP', async ({ page, request }) => {
  for (const path of ['/', '/tr', '/story']) {
    const csp = (await request.get(path)).headers()['content-security-policy'] ?? '';
    expect(csp, path).toMatch(/script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
    expect(csp, path).toMatch(/frame-src [^;]*https:\/\/challenges\.cloudflare\.com/);
  }

  // The home contact form loads Turnstile when it's first used; a stub stands in for Cloudflare.
  const problems = watchConsole(page);
  let loaded = false;
  await page.route('https://challenges.cloudflare.com/**', (route) => {
    loaded = true;
    return route.fulfill({ contentType: 'text/javascript', body: 'window.turnstile = { render: () => "w", reset() {}, remove() {} };' });
  });
  await page.goto('/');
  await page.getByLabel('Your name').focus();
  // Autofill sends keydown events without a key; nothing may trip over that.
  await page.evaluate(() => dispatchEvent(new Event('keydown')));
  await expect.poll(() => loaded).toBe(true);
  await page.waitForTimeout(300);
  expect(problems).toEqual([]);
});

test('the record player and sound controls', async ({ page }) => {
  await returning(page);
  const problems = watchConsole(page);
  await page.goto('/story');
  await page.getByRole('button', { name: 'Start story' }).click();
  await expect(page.locator('[data-canvas]')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('story-volumes') ?? '{}') as Record<string, unknown>);
  // Autofill sends keydown events without a key; the story's shortcuts must ignore them.
  await page.evaluate(() => dispatchEvent(new Event('keydown')));

  await page.getByRole('button', { name: 'Record player' }).focus();
  await page.keyboard.press('Enter');
  const music = page.getByRole('dialog', { name: 'Music' });
  await expect(music).toContainText('No records on the shelf yet');
  const effects = music.getByRole('slider', { name: 'Effects' });
  await expect(effects).toHaveValue('0.7');
  await effects.fill('0.25');
  await music.getByRole('slider', { name: 'Room sounds' }).fill('0.1');
  expect(await stored()).toMatchObject({ effects: 0.25, ambience: 0.1, muted: false });
  await music.getByRole('button', { name: 'Close' }).click();
  await expect(music).toBeHidden();

  const mute = page.getByRole('button', { name: 'Sound off' });
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  expect(await stored()).toMatchObject({ muted: true });
  await page.keyboard.press('m');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  expect(await stored()).toMatchObject({ muted: false });
  expect(problems).toEqual([]);
});

test('reports scene cost at each quality level', async ({ page }) => {
  await returning(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const problems = watchConsole(page);
  for (const query of ['quality=high', 'quality=high&post=off', 'quality=medium', 'quality=low']) {
    await page.goto(`/story?${query}`);
    await page.getByRole('button', { name: 'Start story' }).click();
    const scene = page.locator('[data-canvas]');
    await expect(scene).toHaveAttribute('data-calls', /^\d+$/, { timeout: 60_000 });
    // Wait for a later window, so the fps isn't the warm-up one.
    await page.waitForTimeout(4500);
    const calls = Number(await scene.getAttribute('data-calls'));
    const triangles = Number(await scene.getAttribute('data-triangles'));
    console.log(`${query}: ${calls} draw calls, ${triangles} triangles, ${await scene.getAttribute('data-fps')} fps`);
    expect(calls).toBeLessThan(150);
  }
  expect(problems).toEqual([]);
});
