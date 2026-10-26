import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MathUtils, PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { StoryData } from '@/application/story';
import { KitProvider } from './scene/kit';
import { Shell, StringLights, Window } from './scene/Shell';
import { Furniture, Posters } from './scene/Furniture';
import { Corkboard, Journal, Laptop, Phone, RecordPlayer } from './scene/Props';
import { Polaroids } from './scene/Polaroids';
import { Character } from './scene/Character';
import { Butterfly } from './scene/Butterfly';
import { PHASES, type Phase } from './scene/time';
import { createQualityGovernor, DPR, type Quality } from './scene/quality';

const BACKGROUND = '#2a2140';
const CAMERA: [number, number, number] = [3.7, 2.45, 3.9];
const TARGET: [number, number, number] = [-0.1, 1.0, -0.6];

export interface Stats {
  calls: number;
  triangles: number;
}

interface StageProps {
  data: StoryData;
  phase: Phase;
  initialQuality: Quality;
  /** A quality pinned from the URL; the governor then stays out of the way. */
  pinned: boolean;
  still: boolean;
  onReady: () => void;
  onQuality: (quality: Quality) => void;
  onStats: (stats: Stats) => void;
}

export function Stage({ data, phase, initialQuality, pinned, still, onReady, onQuality, onStats }: StageProps) {
  const [quality, setQuality] = useState(initialQuality);
  useEffect(() => {
    onQuality(quality);
  }, [quality, onQuality]);

  return (
    <Canvas
      shadows="percentage"
      dpr={DPR[quality]}
      camera={{ position: CAMERA, fov: 40, near: 0.1, far: 30 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={onReady}
    >
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 9, 18]} />
      <Lights phase={phase} quality={quality} />
      <KitProvider phase={phase}>
        <Shell />
        <Window />
        <StringLights />
        <Furniture />
        <Posters />
        <Laptop />
        <Journal />
        <Phone />
        <RecordPlayer />
        <Corkboard certifications={data.profile.certifications} />
        <Polaroids projects={data.projects} />
        <Character variant="procedural" still={still} />
      </KitProvider>
      <Butterfly still={still} />
      <Controls />
      <QualityWatch quality={quality} pinned={pinned} onChange={setQuality} onStats={onStats} />
      <PauseWhenHidden />
    </Canvas>
  );
}

function Lights({ phase, quality }: { phase: Phase; quality: Quality }) {
  const light = PHASES[phase];
  return (
    <>
      <hemisphereLight args={[light.skyBottom, '#5b4b8a', light.ambient]} />
      {/* The sun comes in through the window, from behind the back wall. */}
      <directionalLight
        position={[1.6, 3.4, -4.5]}
        color={light.sun}
        intensity={light.sunIntensity}
        castShadow={quality === 'high'}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={14}
        shadow-bias={-0.0008}
      />
      {quality !== 'low' && <pointLight position={[0.9, 1.7, -1.5]} color={light.sun} intensity={light.windowGlow} distance={5} />}
      {quality !== 'low' && light.lightsOn && <pointLight position={[-0.8, 2.3, -0.6]} color="#ffcf8a" intensity={7} distance={7} />}
    </>
  );
}

/** A diorama camera: a gentle, clamped orbit with damping and no panning. */
function Controls() {
  const camera = useThree((s) => s.camera);
  const element = useThree((s) => s.gl.domElement);
  const controls = useMemo(() => {
    const c = new OrbitControls(camera, element);
    c.target.set(...TARGET);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.enablePan = false;
    c.minDistance = 4.5;
    c.maxDistance = 7;
    const azimuth = Math.atan2(CAMERA[0] - TARGET[0], CAMERA[2] - TARGET[2]);
    c.minAzimuthAngle = azimuth - 0.4;
    c.maxAzimuthAngle = azimuth + 0.3;
    c.minPolarAngle = 1.0;
    c.maxPolarAngle = 1.42;
    c.update();
    return c;
  }, [camera, element]);
  useEffect(() => () => controls.dispose(), [controls]);
  useFrame(() => controls.update());

  // Keep about a 60° horizontal view, so a portrait phone still sees the room.
  const aspect = useThree((s) => s.size.width / s.size.height);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const vertical = 2 * Math.atan(Math.tan(MathUtils.degToRad(30)) / aspect);
    camera.fov = MathUtils.clamp(MathUtils.radToDeg(vertical), 32, 70);
    camera.updateProjectionMatrix();
  }, [camera, aspect]);
  return null;
}

/** Averages fps over ~2 s windows and lets the governor pick the quality. */
function QualityWatch({
  quality,
  pinned,
  onChange,
  onStats,
}: {
  quality: Quality;
  pinned: boolean;
  onChange: (q: Quality) => void;
  onStats: (stats: Stats) => void;
}) {
  const governor = useMemo(() => createQualityGovernor(quality), []);
  const info = useThree((s) => s.gl.info);
  const sample = useRef({ start: 0, last: 0, frames: 0, count: 0 });
  useFrame(() => {
    const now = performance.now();
    const w = sample.current;
    // First frame, or back from a pause: start a fresh window.
    if (w.start === 0 || now - w.last > 500) {
      w.start = now;
      w.frames = 0;
    }
    w.last = now;
    w.frames++;
    if (now - w.start < 2000) return;
    const fps = (w.frames * 1000) / (now - w.start);
    w.start = now;
    w.frames = 0;
    onStats({ calls: info.render.calls, triangles: info.render.triangles });
    // The first window includes shader compiles; don't judge it.
    if (w.count++ === 0 || pinned) return;
    const next = governor.window(fps);
    if (next !== quality) onChange(next);
  });
  return null;
}

function PauseWhenHidden() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const sync = () => setFrameloop(document.hidden ? 'never' : 'always');
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [setFrameloop]);
  return null;
}
