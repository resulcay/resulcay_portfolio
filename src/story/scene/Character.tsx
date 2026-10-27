import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { buildCharacter } from './character/build';
import { loadModly, type ModlyCharacter } from './character/modly';
import type { Vec3 } from './kit';

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;
const PUSH_SECONDS = 1.6;

export interface CharacterStats {
  triangles: number;
  outlineTriangles: number;
  drawCalls: number;
}

interface CharacterProps {
  /** The figure built in code (seated), or Modly's scan from a glTF (standing); a failed load falls back to the first. */
  variant?: 'procedural' | 'modly';
  still?: boolean;
  position?: Vec3;
  rotationY?: number;
  /** Warms the ink outline while he's looked at. */
  highlighted?: boolean;
  /** Holds a pose, for the review page. */
  pose?: 'glasses';
  onStats?: (stats: CharacterStats) => void;
}

export function Character({ variant = 'procedural', ...props }: CharacterProps) {
  return variant === 'modly' ? <Modly {...props} /> : <Procedural {...props} />;
}

const MODEL_URL = '/models/resul.glb';

function Modly(props: Omit<CharacterProps, 'variant'>) {
  const [built, setBuilt] = useState<ModlyCharacter | 'failed'>();
  useEffect(() => {
    let live = true;
    let loaded: ModlyCharacter | undefined;
    loadModly(MODEL_URL).then(
      (character) => {
        loaded = character;
        if (live) setBuilt(character);
        else character.dispose();
      },
      (error: unknown) => {
        console.warn('Character model failed, using the procedural one', error);
        if (live) setBuilt('failed');
      },
    );
    return () => {
      live = false;
      loaded?.dispose();
    };
  }, []);
  if (built === 'failed') return <Procedural {...props} />;
  return built ? <ModlyFigure built={built} {...props} /> : null;
}

/** Looking at the laptop, he glances up at the window now and then. */
const GLANCE_YAW = 0.65;
const DOWN_PITCH = 0.35;

function ModlyFigure({ built, still = false, position, rotationY = 0, highlighted = false, onStats }: Omit<CharacterProps, 'variant'> & { built: ModlyCharacter }) {
  useEffect(() => {
    onStats?.({ triangles: built.triangles, outlineTriangles: built.outlineTriangles, drawCalls: built.drawCalls });
  }, [built, onStats]);
  useEffect(() => {
    built.outline.color.set(highlighted ? '#e8a657' : '#2a1d22');
  }, [built, highlighted]);

  useFrame(({ clock: { elapsedTime: t } }) => {
    const [, , spine, chest, neck, head, arm] = built.bones;
    const glancing = !still && t % 12 > 8.5;
    const yaw = glancing ? GLANCE_YAW : 0;
    const pitch = glancing ? 0.05 : DOWN_PITCH;
    const ease = still ? 1 : 0.05;
    head!.rotation.y += (yaw * 0.7 - head!.rotation.y) * ease;
    neck!.rotation.y += (yaw * 0.3 - neck!.rotation.y) * ease;
    head!.rotation.x += (pitch * 0.6 - head!.rotation.x) * ease;
    neck!.rotation.x += (pitch * 0.4 - neck!.rotation.x) * ease;
    if (still) return;
    // Breathing, and the hanging arm swaying with it.
    chest!.rotation.x = Math.sin(t * 1.7) * 0.012;
    spine!.rotation.z = Math.sin(t * 0.5) * 0.008;
    head!.rotation.z = Math.sin(t * 0.6) * 0.02;
    arm!.rotation.x = Math.sin(t * 0.9) * 0.045;
    arm!.rotation.z = -0.02 + Math.sin(t * 0.7) * 0.012;
  });

  return <primitive object={built.group} position={position ?? [0, 0, 0]} rotation-y={rotationY} />;
}

const bell = (x: number) => (x > 0 && x < 1 ? Math.sin(Math.PI * x) : 0);

function Procedural({ still = false, position, rotationY = 0, highlighted = false, pose, onStats }: Omit<CharacterProps, 'variant'>) {
  const built = useMemo(buildCharacter, []);
  useEffect(() => () => built.dispose(), [built]);
  useEffect(() => {
    onStats?.({ triangles: built.triangles, outlineTriangles: built.outlineTriangles, drawCalls: built.drawCalls });
  }, [built, onStats]);
  useEffect(() => {
    built.outline.color.set(highlighted ? '#e8a657' : '#2a1d22');
  }, [built, highlighted]);

  const bone = (name: string) => built.bones.get(name)!;
  const glassesRest = useMemo(() => built.bones.get('glasses')!.position.y, [built]);
  const clock = useRef({ blinkAt: 2.5, blinkStart: -1, pushAt: 9, pushStart: -10 });

  useFrame(({ clock: { elapsedTime: t } }) => {
    const c = clock.current;
    if (t > c.pushAt) {
      c.pushStart = t;
      c.pushAt = t + 20 + Math.random() * 10;
    }
    if (t > c.blinkAt) {
      c.blinkStart = t;
      c.blinkAt = t + 3 + Math.random() * 3;
    }
    const push = pose === 'glasses' ? 1 : still ? 0 : bell((t - c.pushStart) / PUSH_SECONDS);

    // Right index finger up to the bridge of the glasses, and back to the keys.
    // The angles were solved offline so the finger lands on the bridge.
    bone('shoulder1').rotation.set(0.8 * push, 0.4 * push, 0.3 * push);
    bone('elbow1').rotation.set(1.2 * push, 0, 0);
    bone('wrist1').rotation.set(-0.3 * push, 0, 0);
    bone('glasses').position.y = glassesRest + (0.004 * Math.max(0, push - 0.6)) / 0.4;
    if (push > 0) {
      // A pointing hand: index straight, the others curled in.
      FINGERS.forEach((finger) => {
        const curl = finger === 'index' ? 0.3 : finger === 'thumb' ? -0.6 : -1.3;
        bone(`${finger}1a`).rotation.x = curl * push;
        bone(`${finger}1b`).rotation.x = (finger === 'index' ? 0.6 : -1.1) * push;
      });
    }

    if (still) return;
    bone('spine').rotation.x = Math.sin(t * 1.7) * 0.012;
    const glancing = t % 10 > 7 && push === 0;
    const head = bone('head').rotation;
    head.y += ((glancing ? 0.4 : 0) - head.y) * 0.05;
    head.x += ((glancing ? 0.05 : -0.12) - head.x) * 0.05;
    head.z = Math.sin(t * 0.6) * 0.025;

    const blink = -0.42 * bell((t - c.blinkStart) / 0.16);
    bone('lid-1').rotation.x = blink;
    bone('lid1').rotation.x = blink;

    // Typing: each finger taps on its own rhythm; it slows while he looks away.
    const typing = glancing ? 0.15 : 1;
    for (const s of [-1, 1]) {
      if (s === 1 && push > 0) continue;
      FINGERS.forEach((finger, i) => {
        const tap = Math.max(0, Math.sin(t * (11 + i * 1.7) + i * 2.3 + s)) * typing;
        bone(`${finger}${s}a`).rotation.x = 0.22 * tap;
        bone(`${finger}${s}b`).rotation.x = -0.12 * tap;
      });
    }
  });

  return <primitive object={built.group} position={position ?? [0, 0, 0]} rotation-y={rotationY} />;
}
