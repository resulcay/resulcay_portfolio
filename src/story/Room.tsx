import { useRef } from 'react';
import { Canvas, useFrame, type RootState } from '@react-three/fiber';
import { DoubleSide, type Group } from 'three';

// Site palette, so the room and the journal feel like one place.
const GOLDEN = '#e8a657';
const VIOLET = '#5b4b8a';
const TEAL = '#2f6f73';
const BUTTERFLY = '#4fa3d9';

interface RoomProps {
  /** One empty frame on the wall per public project; later milestones fill them. */
  frames: number;
  reducedMotion: boolean;
  onReady: () => void;
}

export function Room({ frames, reducedMotion, onReady }: RoomProps) {
  // Unmounting the Canvas disposes the renderer and releases the WebGL context.
  const created = (state: RootState) => {
    state.camera.lookAt(0, 1.3, -3);
    onReady();
  };

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.6, 3.4], fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={created}
    >
      <color attach="background" args={['#2a2140']} />
      <fog attach="fog" args={['#3a2c4f', 7, 16]} />
      <hemisphereLight args={['#f6d3a0', VIOLET, 0.9]} />
      <directionalLight position={[1.5, 3, -3]} color={GOLDEN} intensity={2.4} />
      <pointLight position={[1.2, 2.2, -3.4]} color="#ffcf8a" intensity={8} distance={7} />

      {/* Floor and three walls of a small room, open towards the camera. */}
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#6b4a3a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2, -4]}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#c9a98a" roughness={1} />
      </mesh>
      <mesh position={[-4, 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#b8977a" roughness={1} />
      </mesh>
      <mesh position={[4, 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#b8977a" roughness={1} />
      </mesh>

      {/* The window: a warm glow on the back wall. */}
      <mesh position={[1.2, 2.2, -3.98]}>
        <planeGeometry args={[1.8, 1.2]} />
        <meshBasicMaterial color="#ffd59a" />
      </mesh>

      {/* A desk under the window. */}
      <mesh position={[1.2, 0.75, -3.4]}>
        <boxGeometry args={[1.8, 0.08, 0.8]} />
        <meshStandardMaterial color={TEAL} roughness={0.7} />
      </mesh>

      {Array.from({ length: frames }, (_, i) => (
        <mesh key={i} position={[-3.98, 1.4 + (i % 2) * 0.75, -2.6 + Math.floor(i / 2) * 0.7]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[0.5, 0.6]} />
          <meshStandardMaterial color="#fbf6ee" roughness={0.8} />
        </mesh>
      ))}

      <Butterfly still={reducedMotion} />
    </Canvas>
  );
}

function Butterfly({ still }: { still: boolean }) {
  const body = useRef<Group>(null);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (still || !body.current || !left.current || !right.current) return;
    const t = clock.elapsedTime;
    const flap = Math.sin(t * 14) * 0.9;
    left.current.rotation.y = flap;
    right.current.rotation.y = -flap;
    body.current.position.set(Math.sin(t * 0.5) * 1.2, 1.5 + Math.sin(t * 1.3) * 0.25, -1.5 + Math.cos(t * 0.5) * 0.8);
    body.current.rotation.y = -t * 0.5;
  });

  return (
    <group ref={body} position={[0, 1.5, -1.5]}>
      {[left, right].map((wing, i) => (
        <group key={i} ref={wing}>
          <mesh position={[i === 0 ? -0.07 : 0.07, 0, 0]} scale={[1, 1.3, 1]}>
            <circleGeometry args={[0.07, 16]} />
            <meshBasicMaterial color={BUTTERFLY} side={DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
