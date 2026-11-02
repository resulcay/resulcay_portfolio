import { describe, expect, it } from 'vitest';
import { ART, BRUSH, BRUSH_WIDTH, brushLength, cover } from '../src/scripts/diorama-reveal';

describe('diorama brush', () => {
  it('measures the stroke along its rows', () => {
    expect(brushLength([[0, 0], [3, 4], [3, 10]])).toBe(11);
    expect(brushLength()).toBeGreaterThan(ART.width * 8);
  });

  it('covers the whole art once fully drawn', () => {
    // Every point of the art lies within half a brush width of some row of the stroke.
    const half = BRUSH_WIDTH / 2;
    const near = (px: number, py: number) =>
      BRUSH.slice(1).some(([x2, y2], i) => {
        const [x1, y1] = BRUSH[i]!;
        const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2)));
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1))) <= half;
      });
    for (let x = 0; x <= ART.width; x += 40) for (let y = 0; y <= ART.height; y += 30) expect(near(x, y), `${x},${y}`).toBe(true);
  });
});

describe('diorama fit', () => {
  it('covers a landscape box, cropping top and bottom', () => {
    const fit = cover(1600, 900);
    expect(fit.scale).toBeCloseTo(1600 / 1440);
    expect(fit.x).toBe(0);
    expect(fit.y).toBeLessThan(0);
  });

  it('covers a portrait phone box, cropping the sides', () => {
    const fit = cover(390, 700);
    expect(fit.scale).toBeCloseTo(700 / 900);
    expect(fit.y).toBe(0);
    expect(fit.x).toBeLessThan(0);
    expect(ART.width * fit.scale + 2 * fit.x).toBeCloseTo(390);
  });
});
