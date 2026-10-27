import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { solveElbow } from '@/story/scene/character/resul';
import { typingWrist } from '@/story/scene/Character';
import { DESK, DESK_TOP, LAPTOP_Z, SEAT, SEAT_TURN } from '@/story/scene/Furniture';
import { around } from '@/story/scene/kit';

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

describe('typing hands', () => {
  const toRoom = around(SEAT, SEAT_TURN);
  // The laptop's base: 34 x 1.8 x 24 cm, centred on it.
  const LAPTOP_DECK = DESK_TOP + 0.018;

  it('stay over the desk top and above the laptop deck for a whole cycle', () => {
    for (const x of [1, -1]) {
      for (const glance of [0, 0.5, 1]) {
        for (let time = 0; time < 10; time += 0.01) {
          const wrist = typingWrist(x, time, glance);
          // The wrist and, 10 cm further on, the fingertips.
          for (const reach of [0, 0.1]) {
            const [px, py, pz] = toRoom([wrist[0], wrist[1], wrist[2] - reach]);
            expect(Math.abs(px - DESK.x)).toBeLessThan(DESK.width / 2 - 0.03);
            expect(Math.abs(pz - DESK.z)).toBeLessThan(DESK.depth / 2 - 0.03);
            expect(py).toBeGreaterThan(LAPTOP_DECK + 0.01);
          }
          // Over the laptop's base, not past its front edge.
          expect(Math.abs(wrist[0])).toBeLessThan(0.16);
          expect(Math.abs(wrist[2] - LAPTOP_Z)).toBeLessThan(0.12);
        }
      }
    }
  });
});
