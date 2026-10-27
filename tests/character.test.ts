import { describe, expect, it } from 'vitest';
import { modlyWeights } from '@/story/scene/character/modly';

const sum = (w: number[]) => w.reduce((a, b) => a + b, 0);

describe('modlyWeights', () => {
  it('always sums to one', () => {
    for (let y = 0; y <= 1.8; y += 0.01) for (const x of [-0.3, -0.2, 0, 0.25]) expect(sum(modlyWeights(x, y).weight)).toBeCloseTo(1);
  });

  it('puts the legs on the hips and the top of the head on the head', () => {
    expect(modlyWeights(0.1, 0.4)).toEqual({ index: [1, 6, 0, 0], weight: [1, 0, 0, 0] });
    expect(modlyWeights(0, 1.7)).toEqual({ index: [5, 6, 0, 0], weight: [1, 0, 0, 0] });
  });

  it('blends between neighbouring spine bones by height', () => {
    const { index, weight } = modlyWeights(0, 1.2);
    expect(index.slice(0, 2)).toEqual([2, 3]);
    expect(weight[0]).toBeCloseTo(0.5);
    expect(weight[1]).toBeCloseTo(0.5);
  });

  it('moves only his right arm, with a soft seam', () => {
    expect(modlyWeights(-0.25, 1.0).weight[2]).toBe(1);
    expect(modlyWeights(0.25, 1.0).weight[2]).toBe(0);
    expect(modlyWeights(-0.205, 1.0).weight[2]).toBeCloseTo(0.5);
    expect(modlyWeights(-0.25, 1.6).weight.includes(1)).toBe(true);
  });
});
