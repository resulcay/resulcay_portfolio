import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { AnimationMixer, Mesh, type AnimationClip, type Group, type MeshStandardMaterial } from 'three';
import { GateContext, type Vec3 } from './kit';

interface Loaded {
  scene: Group;
  animations: AnimationClip[];
}

// Each model is used once in the room; a second Start reuses the loaded scene.
const loads = new Map<string, Promise<Loaded>>();
function load(url: string): Promise<Loaded> {
  let loading = loads.get(url);
  if (!loading) {
    loading = import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => new GLTFLoader().loadAsync(url));
    loads.set(url, loading);
  }
  return loading;
}

interface ModelProps {
  url: string;
  position?: Vec3;
  rotationY?: number;
  scale?: number;
  /** A clip to loop, by name. */
  clip?: string;
  /** Reduced motion: no clips, no pulse. */
  still?: boolean;
  /** One colour for an untextured model. */
  color?: string;
  /** A gentle beat, like a speaker playing. */
  pulse?: boolean;
  children?: ReactNode;
}

/**
 * A downloaded model (already in metres, its base at y = 0), loaded behind the
 * room's load gate so it never pops in after the reveal.
 */
export function Model({ url, position, rotationY = 0, scale = 1, clip, still = false, color, pulse = false, children }: ModelProps) {
  const gate = useContext(GateContext);
  const [model, setModel] = useState<Loaded>();
  useEffect(() => {
    let live = true;
    const loading = load(url);
    gate?.track(loading);
    loading.then(
      (m) => {
        if (!live) return;
        m.scene.traverse((o) => {
          if (!(o instanceof Mesh)) return;
          o.castShadow = o.receiveShadow = true;
          const material = o.material as MeshStandardMaterial;
          // The room has no environment map, so metal would read as black.
          material.metalness = Math.min(material.metalness, 0.2);
          if (color) material.color.set(color);
        });
        setModel(m);
      },
      (error: unknown) => console.warn('A room model failed to load', url, error),
    );
    return () => {
      live = false;
    };
  }, [url, gate, color]);

  const mixer = useMemo(() => (model && clip ? new AnimationMixer(model.scene) : undefined), [model, clip]);
  useEffect(() => {
    const animation = model?.animations.find((a) => a.name === clip);
    if (!mixer || !animation) return;
    const action = mixer.clipAction(animation).play();
    mixer.update(0);
    return () => void action.stop();
  }, [mixer, model, clip]);

  const beat = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    if (!still) mixer?.update(delta);
    const k = pulse && !still ? 1 + 0.02 * Math.max(0, Math.sin(clock.elapsedTime * 9)) : 1;
    beat.current?.scale.setScalar(scale * k);
  });

  return (
    <group position={position ?? [0, 0, 0]} rotation-y={rotationY}>
      <group ref={beat} scale={scale}>
        {model && <primitive object={model.scene} />}
      </group>
      {children}
    </group>
  );
}
