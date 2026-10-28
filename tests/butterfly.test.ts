import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { along, FLIGHT_BOUNDS, planFlight } from '@/story/scene/Butterfly';

const inside = (p: Vector3) => p.x >= FLIGHT_BOUNDS.min.x - 1e-9 && p.x <= FLIGHT_BOUNDS.max.x + 1e-9 && p.y >= FLIGHT_BOUNDS.min.y - 1e-9 && p.y <= FLIGHT_BOUNDS.max.y + 1e-9 && p.z >= FLIGHT_BOUNDS.min.z - 1e-9 && p.z <= FLIGHT_BOUNDS.max.z + 1e-9;

describe('the guide butterfly', () => {
  // Targets by the walls and in the corners: the corkboard, the window, the polaroids, the dresser, the floor.
  const targets = [new Vector3(0.1, 1.6, -2.0), new Vector3(0.9, 1.65, -2.0), new Vector3(-2.5, 1.9, -1.0), new Vector3(-2.24, 0.85, 1.2), new Vector3(-2.5, 0, -2), new Vector3(3, 3, 3)];

  it('stays clear of the walls through every flight', () => {
    for (const from of [new Vector3(0.2, 1.6, 0.2), new Vector3(-2.5, 0.2, -2.1)]) {
      for (const target of targets) {
        for (const still of [false, true]) {
          const path = planFlight(from, target, still);
          for (let e = 0; e <= 1; e += 0.05) expect(inside(along(path, e)), `${target.toArray()} at ${e}`).toBe(true);
        }
      }
    }
  });

  it('keeps 0.45 m from the back and left walls', () => {
    expect(FLIGHT_BOUNDS.min.z).toBeGreaterThanOrEqual(-2 + 0.45);
    expect(FLIGHT_BOUNDS.min.x).toBeGreaterThanOrEqual(-2.5 + 0.45);
  });
});
