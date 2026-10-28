import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { MathUtils, PerspectiveCamera, Vector3, type PointLight } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { StoryData } from '@/application/story';
import { GateContext, Hotspot, InteractionContext, KitProvider } from './scene/kit';
import { createGate, type Gate } from '@/scripts/ready';
import { Shell, StringLights, Window } from './scene/Shell';
import { Furniture, Posters, SEAT, SEAT_TURN } from './scene/Furniture';
import { Corkboard, Journal, Laptop, LightSwitch, Phone, RecordPlayer } from './scene/Props';
import { Polaroids } from './scene/Polaroids';
import { Character } from './scene/Character';
import { Butterfly } from './scene/Butterfly';
import { Post } from './scene/Post';
import { PHASES, type Phase } from './scene/time';
import { createQualityGovernor, DPR, type Quality } from './scene/quality';
import type { StoryObject } from './lines';

const BACKGROUND = '#2a2140';
const CAMERA: [number, number, number] = [3.7, 2.45, 3.9];
const TARGET: [number, number, number] = [-0.1, 1.0, -0.6];

export interface Stats {
  calls: number;
  triangles: number;
  fps: number;
}

interface StageProps {
  data: StoryData;
  phase: Phase;
  initialQuality: Quality;
  /** A quality pinned from the URL; the governor then stays out of the way. */
  pinned: boolean;
  still: boolean;
  hovered: string | null;
  /** The object the camera should move to, or null for the room view. */
  focus: StoryObject | null;
  /** Where the butterfly suggests looking next. */
  guide: StoryObject | null;
  /** Ticks once per rewind; `rewinding` is true while one plays. */
  rewind: number;
  rewinding: boolean;
  /** The record player's vinyl turns while music plays. */
  spinning: boolean;
  /** The fairy lights, from the switch above the nightstand. */
  bulbs: boolean;
  /** The painterly post pass; `?post=off` turns it off to compare. */
  post: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onArrive: (object: StoryObject) => void;
  onReady: () => void;
  onQuality: (quality: Quality) => void;
  onStats: (stats: Stats) => void;
}

export function Stage(props: StageProps) {
  const { data, phase, still, hovered, guide, onHover, onSelect, onQuality } = props;
  const [quality, setQuality] = useState(props.initialQuality);
  useEffect(() => {
    onQuality(quality);
  }, [quality, onQuality]);
  const interaction = useMemo(() => ({ hovered, hover: onHover, select: onSelect }), [hovered, onHover, onSelect]);
  const gate = useMemo(createGate, []);

  return (
    <Canvas
      shadows="percentage"
      dpr={DPR[quality]}
      camera={{ position: CAMERA, fov: 40, near: 0.1, far: 30 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => onHover(null)}
    >
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 9, 18]} />
      <Lights phase={phase} quality={quality} bulbs={props.bulbs} />
      <GateContext.Provider value={gate}>
        <InteractionContext.Provider value={interaction}>
          <KitProvider phase={phase}>
            <Shell />
            <Window />
            <StringLights on={props.bulbs} />
            <Furniture still={still} />
            <Posters />
            <Laptop />
            <Journal />
            <Phone />
            <LightSwitch on={props.bulbs} />
            <RecordPlayer spinning={props.spinning} still={still} />
            <Corkboard certifications={data.profile.certifications} />
            <Polaroids projects={data.projects} />
            <Character still={still} position={SEAT} rotationY={SEAT_TURN} highlighted={hovered === 'resul'} />
            <group position={SEAT} rotation-y={SEAT_TURN}>
              <Hotspot id="resul" at={[0, 0.85, -0.05]} size={[0.7, 1.4, 0.6]} anchor={[0.3, 1.45, -0.9]} highlight={false} />
            </group>
          </KitProvider>
          <Butterfly still={still} target={guide} onTap={() => guide && onHover(guide)} />
        </InteractionContext.Provider>
      </GateContext.Provider>
      {props.post && (quality !== 'low' || props.rewinding) && (
        <Post paint={quality === 'high' ? 2 : quality === 'medium' ? 1 : 0} rewind={props.rewind} still={still} />
      )}
      <Director focus={props.focus} still={still} hovered={hovered} onArrive={props.onArrive} />
      <QualityWatch quality={quality} pinned={props.pinned} onChange={setQuality} onStats={props.onStats} />
      <PauseWhenHidden />
      <Reveal gate={gate} onReady={props.onReady} />
    </Canvas>
  );
}

/** Calls `onReady` once every load is in (or 12 s have passed), the shaders are compiled and two frames are drawn. */
function Reveal({ gate, onReady }: { gate: Gate; onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let live = true;
    void gate.settled(12_000).then(() => {
      if (!live) return;
      gl.compile(scene, camera);
      requestAnimationFrame(() => requestAnimationFrame(() => live && onReady()));
    });
    return () => {
      live = false;
    };
  }, [gate, gl, scene, camera, onReady]);
  return null;
}

function Lights({ phase, quality, bulbs }: { phase: Phase; quality: Quality; bulbs: boolean }) {
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
      {quality !== 'low' && <FairyGlow on={bulbs} />}
    </>
  );
}

/** The fairy lights' warm glow over the room, fading in and out (about 300 ms) with the switch. */
function FairyGlow({ on }: { on: boolean }) {
  const light = useRef<PointLight>(null);
  useFrame((_, delta) => {
    if (light.current) light.current.intensity += ((on ? 7 : 0) - light.current.intensity) * Math.min(1, delta * 10);
  });
  return <pointLight ref={light} position={[-0.8, 2.3, -0.6]} color="#ffcf8a" intensity={on ? 7 : 0} distance={7} />;
}

/**
 * The camera: a gentle, clamped diorama orbit, and GSAP moves to an object's
 * anchor and back. Orbiting is off while an object is in focus.
 */
function Director({
  focus,
  still,
  hovered,
  onArrive,
}: {
  focus: StoryObject | null;
  still: boolean;
  hovered: string | null;
  onArrive: (object: StoryObject) => void;
}) {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
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

  // Where the visitor had orbited to before the first move, to return there.
  const home = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  const moving = useRef(false);

  useEffect(() => {
    const ease = { duration: still ? 0 : 0.9, ease: 'power2.inOut' };
    const spot = focus && scene.getObjectByName(focus);
    if (spot && spot.parent) {
      home.current ??= { position: camera.position.clone(), target: controls.target.clone() };
      const to = spot.parent.localToWorld(new Vector3(...(spot.userData['anchor'] as [number, number, number])));
      const look = spot.getWorldPosition(new Vector3());
      controls.enabled = false;
      moving.current = true;
      const move = gsap
        .timeline({ onComplete: () => onArrive(focus) })
        .to(camera.position, { x: to.x, y: to.y, z: to.z, ...ease }, 0)
        .to(controls.target, { x: look.x, y: look.y, z: look.z, ...ease }, 0);
      return () => void move.kill();
    }
    if (!home.current) return;
    const back = home.current;
    home.current = null;
    const move = gsap
      .timeline({
        onComplete: () => {
          controls.enabled = true;
          moving.current = false;
        },
      })
      .to(camera.position, { x: back.position.x, y: back.position.y, z: back.position.z, ...ease }, 0)
      .to(controls.target, { x: back.target.x, y: back.target.y, z: back.target.z, ...ease }, 0);
    return () => void move.kill();
  }, [focus, still, scene, camera, controls, onArrive]);

  useFrame(() => {
    // The orbit's clamps would fight a camera move, so steer by hand meanwhile.
    if (moving.current) camera.lookAt(controls.target);
    else controls.update();
  });

  // Keep about a 60° horizontal view, so a portrait phone still sees the room.
  const aspect = useThree((s) => s.size.width / s.size.height);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const vertical = 2 * Math.atan(Math.tan(MathUtils.degToRad(30)) / aspect);
    camera.fov = MathUtils.clamp(MathUtils.radToDeg(vertical), 32, 70);
    camera.updateProjectionMatrix();
  }, [camera, aspect]);

  useEffect(() => {
    element.style.cursor = hovered ? 'var(--cursor-link, pointer)' : '';
  }, [element, hovered]);
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
    onStats({ calls: info.render.calls, triangles: info.render.triangles, fps });
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
