import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { solveElbow } from '@/story/scene/character/resul';

describe('solveElbow', () => {
  const root = new Vector3(0, 1, 0);
  const down = new Vector3(0, -1, 0);

  it('keeps both limb lengths and bends towards the pole', () => {
    const target = new Vector3(0, 0.8, 0.3);
    const elbow = solveElbow(root, target, 0.2, 0.2, down);
    expect(elbow.distanceTo(root)).toBeCloseTo(0.2);
    expect(elbow.distanceTo(target)).toBeCloseTo(0.2);
    expect(elbow.y).toBeLessThan(0.9);
  });

  it('points straight at a target out of reach', () => {
    const elbow = solveElbow(root, new Vector3(0, 1, 2), 0.2, 0.2, down);
    expect(elbow.x).toBeCloseTo(0);
    expect(elbow.y).toBeCloseTo(1, 2);
    expect(elbow.z).toBeCloseTo(0.2, 2);
  });
});
