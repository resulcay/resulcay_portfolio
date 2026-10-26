import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, PlaneGeometry, Shape, SphereGeometry, type Group } from 'three';
import { Merged, useKit, type Part, type Vec3 } from './kit';
import { SEAT, SEAT_TURN } from './Furniture';

const SKIN = '#d9a580';
const HAIR = '#3a281e';
const SAGE = '#8ea889';
const TROUSERS = '#2e3240';
const SHOE = '#f1ede6';
const SOLE = '#2a2a2a';
const METAL = '#26262b';

// Built facing -z with the origin on the floor under the seat. Proportions
// are a little elongated (small head, long limbs) for a stylized look.

const NECK_TOP = 0.6;
const SHOULDER: Vec3 = [0.19, 0.5, 0];
const UPPER_ARM = 0.31;
const ARM_PITCH = 0.5;
const LEAN = -0.08;
// Points the forearm forward (horizontal) through the arm and torso tilt.
const FOREARM_PITCH = Math.PI / 2 - (ARM_PITCH + LEAN) - 0.08;

function glassRing(): ExtrudeGeometry {
  const rect = (w: number, h: number, r: number) => {
    const s = new Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  };
  const outer = rect(0.054, 0.038, 0.012);
  outer.holes.push(rect(0.045, 0.029, 0.009));
  return new ExtrudeGeometry(outer, { depth: 0.004, bevelEnabled: false, curveSegments: 4 });
}

function headParts(): Part[] {
  const sides = [-1, 1] as const;
  return [
    { geo: new SphereGeometry(0.105, 24, 18), color: SKIN, at: [0, 0.12, 0], scale: [0.92, 1.15, 1] },
    { geo: new ConeGeometry(0.016, 0.04, 8), color: SKIN, at: [0, 0.105, -0.112], rot: [-Math.PI / 2, 0, 0] },
    { geo: new BoxGeometry(0.03, 0.004, 0.006), color: '#a8645a', at: [0, 0.072, -0.103] },
    // Short hair: a cap tilted back so the hairline clears the brows, plus volume on top. Clean-shaven.
    { geo: new SphereGeometry(0.112, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), color: HAIR, at: [0, 0.13, 0.004], rot: [0.35, 0, 0], scale: [0.95, 1.12, 1.05] },
    { geo: new SphereGeometry(0.09, 16, 10), color: HAIR, at: [0, 0.245, -0.01], scale: [1, 0.5, 1.15] },
    { geo: new SphereGeometry(0.105, 16, 10), color: HAIR, at: [0, 0.12, 0.03], scale: [0.95, 0.85, 0.8] },
    ...sides.flatMap((s): Part[] => [
      { geo: new SphereGeometry(0.025, 8, 6), color: SKIN, at: [s * 0.097, 0.115, 0.01], scale: [0.5, 1, 0.8] },
      { geo: new SphereGeometry(0.011, 8, 6), color: '#2b1d16', at: [s * 0.036, 0.132, -0.097] },
      { geo: new BoxGeometry(0.035, 0.007, 0.01), color: HAIR, at: [s * 0.037, 0.158, -0.1] },
      // Thin dark round-rectangle glasses: rims and temples.
      { geo: glassRing(), color: METAL, at: [s * 0.039, 0.132, -0.12] },
      { geo: new BoxGeometry(0.004, 0.004, 0.132), color: METAL, at: [s * 0.083, 0.136, -0.054], rot: [0, s * 0.252, 0] },
    ]),
    { geo: new BoxGeometry(0.022, 0.004, 0.004), color: METAL, at: [0, 0.138, -0.117] },
  ];
}

function legParts(): Part[] {
  return [
    { geo: new BoxGeometry(0.32, 0.15, 0.26), color: TROUSERS, at: [0, 0.56, 0.05] },
    ...([-1, 1] as const).flatMap((s): Part[] => [
      { geo: new CapsuleGeometry(0.068, 0.3, 4, 12), color: TROUSERS, at: [s * 0.095, 0.53, -0.13], rot: [-Math.PI / 2, 0, 0] },
      { geo: new CapsuleGeometry(0.058, 0.36, 4, 12), color: TROUSERS, at: [s * 0.095, 0.3, -0.37] },
      { geo: new BoxGeometry(0.1, 0.07, 0.25), color: SHOE, at: [s * 0.095, 0.045, -0.42] },
      { geo: new BoxGeometry(0.104, 0.02, 0.255), color: SOLE, at: [s * 0.095, 0.01, -0.42] },
    ]),
  ];
}

interface CharacterProps {
  /** Only the procedural figure exists today; a glTF variant can slot in here later. */
  variant?: 'procedural';
  still?: boolean;
}

export function Character({ variant = 'procedural', still = false }: CharacterProps) {
  return variant === 'procedural' ? <Procedural still={still} /> : null;
}

function Procedural({ still }: { still: boolean }) {
  const { base, lens } = useKit();
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const arms = [
    { side: -1, forearm: useRef<Group>(null) },
    { side: 1, forearm: useRef<Group>(null) },
  ];

  useFrame(({ clock }) => {
    if (still || !torso.current || !head.current) return;
    const t = clock.elapsedTime;
    torso.current.scale.y = 1 + Math.sin(t * 1.7) * 0.012;
    // Every 10 s, a 3 s glance out of the window on his left.
    const glancing = t % 10 > 7;
    const h = head.current.rotation;
    h.y += ((glancing ? 0.4 : 0) - h.y) * 0.05;
    h.x += ((glancing ? 0.12 : -0.15) - h.x) * 0.05;
    const typing = glancing ? 0.2 : 1;
    arms.forEach(({ forearm }, i) => {
      if (forearm.current) forearm.current.rotation.x = FOREARM_PITCH + Math.sin(t * 16 + i * 2.1) * 0.035 * typing;
    });
  });

  return (
    <group position={SEAT} rotation-y={SEAT_TURN}>
      <Merged material={base} parts={legParts} />
      <group ref={torso} position={[0, 0.6, 0.05]} rotation-x={LEAN}>
        <Merged
          material={base}
          parts={() => [
            { geo: new CapsuleGeometry(0.14, 0.34, 6, 16), color: SAGE, at: [0, 0.31, 0], scale: [1.15, 1, 0.72] },
            { geo: new CylinderGeometry(0.042, 0.048, 0.08, 12), color: SKIN, at: [0, 0.6, 0] },
          ]}
        />
        <group ref={head} position={[0, NECK_TOP, 0]} rotation-x={-0.15}>
          <Merged material={base} parts={headParts} />
          <Merged
            material={lens}
            shadows={false}
            parts={() =>
              ([-1, 1] as const).map((s): Part => ({ geo: new PlaneGeometry(0.046, 0.03), color: '#ffffff', at: [s * 0.039, 0.132, -0.117], rot: [0, Math.PI, 0] }))
            }
          />
        </group>
        {arms.map(({ side, forearm }) => (
          <group key={side} position={[side * SHOULDER[0], SHOULDER[1], SHOULDER[2]]} rotation-x={ARM_PITCH}>
            <Merged material={base} parts={() => [{ geo: new CapsuleGeometry(0.046, 0.22, 4, 12), color: SAGE, at: [0, -0.155, 0] }]} />
            <group ref={forearm} position={[0, -UPPER_ARM, 0]} rotation-x={FOREARM_PITCH}>
              <Merged
                material={base}
                parts={() => [
                  { geo: new CapsuleGeometry(0.04, 0.2, 4, 12), color: SAGE, at: [0, -0.14, 0] },
                  { geo: new BoxGeometry(0.065, 0.085, 0.028), color: SKIN, at: [0, -0.31, 0] },
                ]}
              />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
