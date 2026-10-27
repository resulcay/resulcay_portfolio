import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGate, settleWithin } from '@/scripts/ready';

afterEach(() => vi.useRealTimers());

describe('settleWithin', () => {
  it('resolves when the work settles, even if it fails', async () => {
    await expect(settleWithin(Promise.resolve(1), 1000)).resolves.toBe('done');
    await expect(settleWithin(Promise.reject(new Error('x')), 1000)).resolves.toBe('done');
  });

  it('gives up after the timeout', async () => {
    vi.useFakeTimers();
    const result = settleWithin(new Promise(() => undefined), 3000);
    await vi.advanceTimersByTimeAsync(2999);
    let settled = false;
    void result.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('timeout');
  });
});

describe('createGate', () => {
  it('waits for loads tracked while it is already waiting', async () => {
    vi.useFakeTimers();
    const gate = createGate();
    let finishLate!: () => void;
    gate.track(new Promise<void>((resolve) => setTimeout(resolve, 100)).then(() => gate.track(new Promise<void>((r) => (finishLate = r)))));
    const result = gate.settled(12_000);
    await vi.advanceTimersByTimeAsync(500);
    let settled = false;
    void result.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    finishLate();
    await expect(result).resolves.toBe('done');
  });
});

describe('the loading script', () => {
  it('is allowed by its hash in the CSP', async () => {
    const { readFileSync } = await import('node:fs');
    const { createHash } = await import('node:crypto');
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
    const script = /<script is:inline>(.*?)<\/script>/.exec(layout)![1]!;
    const hash = `sha256-${createHash('sha256').update(script).digest('base64')}`;
    expect(readFileSync('astro.config.mjs', 'utf8')).toContain(hash);
  });
});
