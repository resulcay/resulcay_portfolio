import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Group, SkinnedMesh, Vector3 as V3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildResul, solveElbow } from '@/story/scene/character/resul';
import { poseSeated, restOf } from '@/story/scene/Character';
import { DESK, DESK_TOP, LAPTOP_Z, SEAT, SEAT_TURN } from '@/story/scene/Furniture';

describe('solveElbow', () => {
  const root = new V3(0, 1, 0);
  const down = new V3(0, -1, 0);

  it('keeps both limb lengths and bends towards the pole', () => {
    const target = new V3(0, 0.8, 0.3);
    const elbow = solveElbow(root, target, 0.2, 0.2, down);
    expect(elbow.distanceTo(root)).toBeCloseTo(0.2);
    expect(elbow.distanceTo(target)).toBeCloseTo(0.2);
    expect(elbow.y).toBeLessThan(0.9);
  });

  it('points straight at a target out of reach', () => {
    const elbow = solveElbow(root, new V3(0, 1, 2), 0.2, 0.2, down);
    expect(elbow.x).toBeCloseTo(0);
    expect(elbow.y).toBeCloseTo(1, 2);
    expect(elbow.z).toBeCloseTo(0.2, 2);
  });
});

describe('seated at the desk', () => {
  it('never puts a vertex inside the desk top or the laptop, through a whole typing cycle', async () => {
    const file = readFileSync('src/story/scene/character/resul.glb');
    const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
    const model = buildResul(gltf.scene);
    const chair = new Group();
    chair.position.set(...SEAT);
    chair.rotation.y = SEAT_TURN;
    chair.add(model.group);
    const rest = restOf(model);
    const meshes: SkinnedMesh[] = [];
    model.group.traverse((o) => o instanceof SkinnedMesh && o.material !== model.outline && meshes.push(o));

    // Boxes in the chair's frame: [min, max]. The laptop is 34 x 1.8 x 24 cm; its lid leans back from the far edge.
    const desk = { min: [DESK.x - DESK.width / 2, DESK_TOP - 0.05, DESK.z - DESK.depth / 2], max: [DESK.x + DESK.width / 2, DESK_TOP, DESK.z + DESK.depth / 2] };
    const base = { min: [-0.17, DESK_TOP, LAPTOP_Z - 0.12], max: [0.17, DESK_TOP + 0.018, LAPTOP_Z + 0.12] };
    const inside = (p: number[], box: { min: number[]; max: number[] }, pad = 0.002) => p.every((v, k) => v > box.min[k]! + pad && v < box.max[k]! - pad);
    const lidTilt = -0.3;
    const lid = new V3(0, 0.018 + 0.11 * Math.cos(lidTilt), -0.12 + 0.11 * Math.sin(lidTilt));
    const inLid = (local: V3) => {
      const q = local.clone().sub(new V3(0, DESK_TOP, LAPTOP_Z)).sub(lid).applyAxisAngle(new V3(1, 0, 0), -lidTilt);
      return Math.abs(q.x) < 0.17 && Math.abs(q.y) < 0.11 && Math.abs(q.z) < 0.006;
    };

    const v = new V3();
    const clashes: string[] = [];
    let checked = 0;
    for (const glance of [0, 1]) {
      for (let time = 0; time < 6; time += 0.05) {
        poseSeated(model, rest, time, glance);
        chair.updateMatrixWorld(true);
        for (const mesh of meshes) {
          for (let i = 0; i < mesh.geometry.getAttribute('position').count; i++) {
            mesh.getVertexPosition(i, v);
            const world = mesh.localToWorld(v);
            const local = chair.worldToLocal(world.clone());
            const hit = inside(world.toArray(), desk) ? 'desk top' : inside(local.toArray(), base) ? 'laptop' : inLid(local) ? 'screen' : '';
            if (hit) clashes.push(`${mesh.name} vertex ${i} in the ${hit} at t=${time.toFixed(2)}, glance ${glance}`);
            checked++;
          }
        }
      }
    }
    expect(clashes.slice(0, 5)).toEqual([]);
    // The laptop sits wholly on the desk, its near corners at least 6 cm in from the edge.
    for (const x of [-0.17, 0.17]) {
      for (const z of [LAPTOP_Z - 0.12, LAPTOP_Z + 0.12]) {
        const corner = chair.localToWorld(new V3(x, DESK_TOP, z));
        expect(Math.abs(corner.x - DESK.x)).toBeLessThan(DESK.width / 2 - 0.06);
        expect(Math.abs(corner.z - DESK.z)).toBeLessThan(DESK.depth / 2 - 0.06);
      }
    }
    expect(checked).toBeGreaterThan(100_000);
  }, 60_000);
});
