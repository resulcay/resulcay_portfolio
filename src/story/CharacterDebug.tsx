import { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Character, type CharacterStats } from './scene/Character';

/** Camera positions and targets for reviewing the character (he faces -z). */
type Triple = [number, number, number];
const VIEWS: Record<'front' | '34' | 'side' | 'face', { position: Triple; target: Triple }> = {
  front: { position: [0, 1.2, -2.4], target: [0, 0.85, -0.12] },
  '34': { position: [1.6, 1.45, -1.9], target: [0, 0.9, -0.15] },
  side: { position: [2.4, 1.1, -0.1], target: [0, 0.85, -0.12] },
  face: { position: [0.32, 1.44, -0.72], target: [0, 1.36, -0.06] },
};

export type View = keyof typeof VIEWS;

export const isView = (value: string | null): value is View => value !== null && value in VIEWS;

/** `lift` raises the cameras and pulls them back, to frame him standing. */
function Rig({ view, lift }: { view: View; lift: number }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const [x, y, z] = VIEWS[view].position;
    const [tx, ty, tz] = VIEWS[view].target;
    const back = view === 'face' ? 1 : 1 + lift;
    camera.position.set(tx + (x - tx) * back, y + lift, tz + (z - tz) * back);
    camera.lookAt(tx, ty + lift, tz);
  }, [camera, view, lift]);
  return null;
}

/**
 * /story?debug=character: only the character, held still on a neutral
 * turntable, with camera presets for reviewing him.
 */
export function CharacterDebug({
  initialView,
  variant,
  pose,
  onReady,
  onStats,
}: {
  initialView: View;
  variant: 'procedural' | 'modly';
  pose: 'glasses' | undefined;
  onReady: () => void;
  onStats: (stats: CharacterStats) => void;
}) {
  const [view, setView] = useState<View>(initialView);
  return (
    <>
      <div className="story-debug" role="group" aria-label="Camera">
        {(Object.keys(VIEWS) as View[]).map((name) => (
          <button key={name} type="button" className="story-chip" aria-pressed={view === name} onClick={() => setView(name)}>
            {name}
          </button>
        ))}
      </div>
      <div className="story-scene">
        <Canvas shadows="percentage" camera={{ fov: 35, near: 0.05, far: 20 }} onCreated={onReady}>
          <color attach="background" args={['#cfc5b8']} />
          <hemisphereLight args={['#fff1dc', '#6b5d72', 1.2]} />
          <directionalLight position={[-2, 3, -2.5]} intensity={2.2} color="#ffe4bd" castShadow />
          <directionalLight position={[1.5, 2, 2.5]} intensity={1.6} color="#f0a85a" />
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <circleGeometry args={[1.1, 48]} />
            <meshLambertMaterial color="#b8ab9c" />
          </mesh>
          {variant === 'procedural' && (
            <mesh position={[0, 0.235, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.46, 0.47, 0.44]} />
              <meshLambertMaterial color="#e8a657" />
            </mesh>
          )}
          {/* The scan faces +z; turn him to face the cameras like the seated one. */}
          <Character variant={variant} rotationY={variant === 'modly' ? Math.PI : 0} still {...(pose ? { pose } : {})} onStats={onStats} />
          <Rig view={view} lift={variant === 'modly' ? 0.3 : 0} />
        </Canvas>
      </div>
    </>
  );
}
