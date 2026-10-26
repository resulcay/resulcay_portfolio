import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DoubleSide, Vector3, type Group, type Mesh } from 'three';
import type { StoryObject } from '../lines';

interface Flight {
  from: Vector3;
  via: Vector3;
  to: Vector3;
  start: number;
  duration: number;
}

const REST = new Vector3(-0.6, 1.7, -0.6);

/**
 * The blue butterfly. With a target it flies an arc there and hovers with a
 * soft glow; tapping it shows the target's thought. With reduced motion it
 * moves in straight lines and doesn't flap.
 */
export function Butterfly({ still, target, onTap }: { still: boolean; target: StoryObject | null; onTap: () => void }) {
  const scene = useThree((s) => s.scene);
  const clock = useThree((s) => s.clock);
  const body = useRef<Group>(null);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const halo = useRef<Mesh>(null);
  const flight = useRef<Flight | null>(null);
  const home = useRef(REST.clone());

  useEffect(() => {
    const spot = target && scene.getObjectByName(target);
    if (!spot || !body.current) return;
    const from = body.current.position.clone();
    const to = spot.getWorldPosition(new Vector3()).add(new Vector3(0, 0.32, 0.15));
    const via = from.clone().lerp(to, 0.5);
    if (!still) via.y += 0.6;
    flight.current = { from, via, to, start: clock.elapsedTime, duration: still ? 1.5 : 2.4 };
  }, [target, scene, clock, still]);

  useFrame(({ clock: { elapsedTime: t } }) => {
    if (!body.current || !left.current || !right.current || !halo.current) return;
    const f = flight.current;
    let arrived = true;
    if (f) {
      const k = Math.min(1, (t - f.start) / f.duration);
      arrived = k >= 1;
      const e = k * k * (3 - 2 * k);
      // A quadratic Bézier from where it was, over the arc, to the target.
      const a = f.from.clone().lerp(f.via, e);
      const b = f.via.clone().lerp(f.to, e);
      const p = a.lerp(b, e);
      if (!arrived) body.current.rotation.y = Math.atan2(f.to.x - f.from.x, f.to.z - f.from.z);
      home.current.copy(arrived ? f.to : p);
    }
    const bob = still ? 0 : 1;
    body.current.position.set(
      home.current.x + Math.sin(t * 1.5) * 0.05 * bob * (arrived ? 1 : 0),
      home.current.y + Math.sin(t * 2.1) * 0.04 * bob,
      home.current.z,
    );
    if (arrived && !still) body.current.rotation.y += 0.004;
    const flap = still ? 0.5 : Math.sin(t * 14) * 0.9;
    left.current.rotation.y = flap;
    right.current.rotation.y = -flap;
    halo.current.visible = arrived && target !== null;
  });

  return (
    <group ref={body} position={REST}>
      {[left, right].map((wing, i) => (
        <group key={i} ref={wing}>
          <mesh position={[i === 0 ? -0.05 : 0.05, 0, 0]} scale={[1, 1.3, 1]}>
            <circleGeometry args={[0.05, 12]} />
            <meshBasicMaterial color="#4fa3d9" side={DoubleSide} />
          </mesh>
        </group>
      ))}
      <mesh ref={halo} visible={false}>
        <sphereGeometry args={[0.11, 16, 12]} />
        <meshBasicMaterial color="#bfe3ff" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onTap();
        }}
      >
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}
