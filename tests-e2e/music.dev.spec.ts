import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { watchConsole } from './console';

/** The local stand-in admin password, from the environment or .dev.vars. */
function devPassword(): string | undefined {
  if (process.env['DEV_ADMIN_PASSWORD']) return process.env['DEV_ADMIN_PASSWORD'];
  try {
    return /^DEV_ADMIN_PASSWORD=(.*)$/m.exec(readFileSync('.dev.vars', 'utf8'))?.[1]?.trim();
  } catch {
    return undefined;
  }
}

/**
 * About 1.5 s of silent MP3: MPEG-1 Layer III frames (128 kbps, 44.1 kHz) whose
 * side info and data are all zero, which decoders play as silence.
 */
function silentMp3(): Buffer {
  const frame = Buffer.alloc(417);
  frame.set([0xff, 0xfb, 0x90, 0x64]);
  return Buffer.concat(Array.from({ length: 60 }, () => frame));
}

test('the admin adds a music track and data.json lists it', async ({ page, baseURL }) => {
  const password = devPassword();
  test.skip(!password, 'Needs DEV_ADMIN_PASSWORD in .dev.vars');
  const problems = watchConsole(page);
  const origin = { Origin: baseURL! };

  // In dev with Turnstile's test keys, any token passes.
  const login = await page.request.post('/api/rewind', { data: { email: 'dev@example.com', password, token: 'dev' }, headers: origin });
  expect(login.ok()).toBe(true);

  await page.goto('/admin/music');
  // Whatever was there before, so the test can put it back.
  const before = JSON.parse((await page.locator('[data-music-form]').getAttribute('data-tracks')) ?? '[]') as unknown[];
  let key: string | null = null;
  try {
    await page.locator('[data-music-upload]').setInputFiles({ name: 'test-tone.mp3', mimeType: 'audio/mpeg', buffer: silentMp3() });
    await expect(page.locator('[data-upload-status]')).toContainText('is uploaded');
    const row = page.locator('[data-music-list] li').last();
    key = await row.getAttribute('data-key');
    await row.getByLabel('Artist').fill('Test Artist');
    await row.getByLabel('Licence (e.g. CC BY 4.0)').fill('CC0 1.0');
    await row.getByLabel('Source URL (https)').fill('https://example.org/test-tone');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('[data-save-status]')).toContainText('Saved');

    const data = (await (await page.request.get('/story/data.json')).json()) as { music: { title: string; url: string; license: string }[] };
    expect(data.music).toContainEqual(expect.objectContaining({ title: 'test-tone', url: `/media/${key}`, license: 'CC0 1.0' }));

    // Byte ranges, which audio elements rely on, come back well formed.
    const part = await page.request.get(`/media/${key}`, { headers: { Range: 'bytes=0-99' } });
    expect(part.status()).toBe(206);
    expect(part.headers()['content-range']).toBe(`bytes 0-99/${silentMp3().length}`);
    expect((await part.body()).length).toBe(100);

    // And it plays: music starts after the visitor is known, and stays playing.
    await page.addInitScript(() => localStorage.setItem('story-visitor', 'explorer'));
    await page.goto('/story');
    await page.getByRole('button', { name: 'Start story' }).click();
    await expect(page.locator('[data-canvas]')).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
    await page.getByRole('button', { name: 'Record player' }).focus();
    await page.keyboard.press('Enter');
    const player = page.getByRole('dialog', { name: 'Music' });
    await expect(player).toContainText('test-tone');
    await expect(player.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2500);
    await expect(player.getByRole('button', { name: 'Pause' })).toBeVisible();
    await page.goto('/admin/music');
  } finally {
    await page.request.put('/api/admin/site/music', { data: before, headers: origin });
    if (key) await page.request.delete(`/api/admin/media?key=${encodeURIComponent(key)}`, { headers: origin });
  }
  expect(problems).toEqual([]);
});
