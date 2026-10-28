import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import type { StoryObject } from '../lines';
import { Model } from './Model';
import butterflyUrl from './models/butterfly.glb?url';

interface Flight {
  from: Vector3;
  via: Vector3;
  to: Vector3;
  start: number;
  duration: number;
}

/** Where it waits: in open air above the rug, clear of the walls and furniture. */
const REST = new Vector3(0.2, 1.6, 0.2);

/**
 * Where the butterfly may fly: the room kept 0.45 m (0.3 m plus its wingspan)
 * clear of the back and left walls, the floor and the bed and desk tops.
 */
export const FLIGHT_BOUNDS = { min: new Vector3(-2.05, 1.0, -1.55), max: new Vector3(2.2, 2.3, 1.8) };
const keepInRoom = (p: Vector3) => p.clamp(FLIGHT_BOUNDS.min, FLIGHT_BOUNDS.max);

/**
 * The arc to a target: from where it is, up and over, to hover above the target.
 * All three points lie in the bounds, so the whole curve does too.
 */
export function planFlight(from: Vector3, target: Vector3, still: boolean): Pick<Flight, 'from' | 'via' | 'to'> {
  const start = keepInRoom(from.clone());
  const to = keepInRoom(target.clone().add(new Vector3(0, 0.32, 0.15)));
  const via = start.clone().lerp(to, 0.5);
  if (!still) via.y += 0.6;
  return { from: start, via: keepInRoom(via), to };
}

/** A point along the arc at `e` (0 to 1): a quadratic Bézier. */
export function along({ from, via, to }: Pick<Flight, 'from' | 'via' | 'to'>, e: number): Vector3 {
  return from.clone().lerp(via, e).lerp(via.clone().lerp(to, e), e);
}

/**
 * The blue butterfly. With a target it flies an arc there and hovers above
 * it; tapping it shows the target's thought. With reduced motion it
 * moves in straight lines and its wings stay still.
 */
export function Butterfly({ still, target, onTap }: { still: boolean; target: StoryObject | null; onTap: () => void }) {
  const scene = useThree((s) => s.scene);
  const clock = useThree((s) => s.clock);
  const body = useRef<Group>(null);
  const flight = useRef<Flight | null>(null);
  const home = useRef(REST.clone());

  useEffect(() => {
    const spot = target && scene.getObjectByName(target);
    if (!spot || !body.current) return;
    const path = planFlight(body.current.position, spot.getWorldPosition(new Vector3()), still);
    flight.current = { ...path, start: clock.elapsedTime, duration: still ? 1.5 : 2.4 };
  }, [target, scene, clock, still]);

  useFrame(({ clock: { elapsedTime: t } }) => {
    if (!body.current) return;
    const f = flight.current;
    let arrived = true;
    if (f) {
      const k = Math.min(1, (t - f.start) / f.duration);
      arrived = k >= 1;
      const e = k * k * (3 - 2 * k);
      const p = along(f, e);
      if (!arrived) body.current.rotation.y = Math.atan2(f.to.x - f.from.x, f.to.z - f.from.z);
      home.current.copy(arrived ? f.to : p);
    }
    const bob = still ? 0 : 1;
    body.current.position.set(
      home.current.x + Math.sin(t * 1.5) * 0.05 * bob * (arrived ? 1 : 0),
      home.current.y + Math.sin(t * 2.1) * 0.04 * bob,
      home.current.z,
    );
    keepInRoom(body.current.position);
    if (arrived && !still) body.current.rotation.y += 0.004;
  });

  return (
    <group ref={body} position={REST}>
      {/* Drawn a little larger than life (about 14 cm), so it reads from across the room. */}
      <Model url={butterflyUrl} position={[0, -0.03, 0]} scale={1.6} clip="Flying" still={still} />
      {/* An invisible, generous target for taps. */}
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
