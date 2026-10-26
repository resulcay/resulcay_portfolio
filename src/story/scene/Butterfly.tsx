import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, type Group } from 'three';

/** The blue butterfly drifting around the room. */
export function Butterfly({ still }: { still: boolean }) {
  const body = useRef<Group>(null);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (still || !body.current || !left.current || !right.current) return;
    const t = clock.elapsedTime;
    const flap = Math.sin(t * 14) * 0.9;
    left.current.rotation.y = flap;
    right.current.rotation.y = -flap;
    body.current.position.set(-0.6 + Math.sin(t * 0.4) * 1.1, 1.7 + Math.sin(t * 1.3) * 0.2, -0.6 + Math.cos(t * 0.4) * 0.7);
    body.current.rotation.y = -t * 0.4;
  });

  return (
    <group ref={body} position={[-0.6, 1.7, -0.6]}>
      {[left, right].map((wing, i) => (
        <group key={i} ref={wing}>
          <mesh position={[i === 0 ? -0.05 : 0.05, 0, 0]} scale={[1, 1.3, 1]}>
            <circleGeometry args={[0.05, 12]} />
            <meshBasicMaterial color="#4fa3d9" side={DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
