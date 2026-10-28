import { describe, expect, it } from 'vitest';
import { strand } from '@/story/scene/Shell';

describe('the fairy-light strand', () => {
  it('stays off the back wall (z = -2) and the left wall (x = -2.5), bulbs included', () => {
    const curve = strand();
    const bulb = 0.028;
    for (let i = 0; i <= 2000; i++) {
      const p = curve.getPoint(i / 2000);
      expect(p.z - bulb, `z at ${i}`).toBeGreaterThan(-2);
      expect(p.x - bulb, `x at ${i}`).toBeGreaterThan(-2.5);
    }
  });
});
