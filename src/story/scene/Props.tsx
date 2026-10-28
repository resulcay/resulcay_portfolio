import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, CanvasTexture, CircleGeometry, CylinderGeometry, SphereGeometry, SpriteMaterial, TorusGeometry, type Sprite } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { around, Hotspot, Merged, mergeParts, useDisposable, useKit, type Part, type Vec3 } from './kit';
import { hull, inkOutline } from './character/resul';
import { wrapText } from './atlas';
import { DESK_TOP, LAPTOP_Z, MATTRESS_TOP, NIGHTSTAND_TOP, SEAT, SEAT_TURN } from './Furniture';
import { Model } from './Model';
import journalUrl from './models/journal.glb?url';
import phoneUrl from './models/phone.glb?url';
import radioUrl from './models/radio.glb?url';

const rounded = (w: number, h: number, d: number, r = 0.008) => new RoundedBoxGeometry(w, h, d, 2, r);

// Each story object sits in its own <group>, so its parts use local
// coordinates; the Hotspot carries its id and the camera anchor.

/** On the desk, in front of the character, angled like the chair. */
const LAPTOP: Vec3 = around(SEAT, SEAT_TURN)([0, DESK_TOP, LAPTOP_Z]);
const LID_TILT = -0.3;

export function Laptop() {
  const { atlas, base, glow } = useKit();
  const lidCenter: Vec3 = [0, 0.018 + 0.11 * Math.cos(LID_TILT), -0.12 + 0.11 * Math.sin(LID_TILT)];
  // The screen sits just in front of the lid, along the lid's normal.
  const screenAt: Vec3 = [0, lidCenter[1] - 0.007 * Math.sin(LID_TILT), lidCenter[2] + 0.007 * Math.cos(LID_TILT)];
  return (
    <group position={LAPTOP} scale={[1.5, 1.5, 1.5]} rotation-y={SEAT_TURN}>
      <Merged
        material={base}
        parts={() => [
          { geo: rounded(0.34, 0.018, 0.24), color: '#c9ccd2', at: [0, 0.009, 0] },
          { geo: new BoxGeometry(0.3, 0.002, 0.12), color: '#3a3d44', at: [0, 0.019, -0.03] },
          { geo: rounded(0.34, 0.22, 0.012), color: '#c9ccd2', at: lidCenter, rot: [LID_TILT, 0, 0] },
        ]}
      />
      <Merged
        material={glow}
        shadows={false}
        parts={() => {
          const cell = atlas.alloc()!;
          atlas.paint(cell, 300, 190, (ctx) => {
            ctx.fillStyle = '#1e1b24';
            ctx.fillRect(0, 0, 300, 190);
            ctx.fillStyle = '#4a4350';
            for (let x = 30; x < 300; x += 54) ctx.fillRect(x, 14, 1, 168);
            const bars: [string, number, number][] = [
              ['#e8a657', 20, 120],
              ['#4fa3d9', 70, 110],
              ['#2f6f73', 40, 160],
              ['#5b4b8a', 130, 140],
              ['#e8a657', 170, 110],
              ['#4fa3d9', 200, 80],
            ];
            bars.forEach(([color, x, w], i) => {
              ctx.fillStyle = color;
              ctx.fillRect(x, 24 + i * 26, w, 14);
            });
            ctx.fillStyle = '#f4ebdd';
            ctx.font = '700 11px Nunito';
            ctx.fillText('2023          2024          2025          2026', 22, 186);
          });
          return [{ geo: atlas.quad(cell, 0.31, 0.196), color: '#ffffff', at: screenAt, rot: [LID_TILT, 0, 0] }];
        }}
      />
      <Hotspot id="laptop" at={[0, 0.12, -0.06]} size={[0.38, 0.26, 0.3]} anchor={[0.35, 0.55, 0.55]} />
    </group>
  );
}

/** On the desk to the right of the laptop, clear of the typing hands. */
const MUG: Vec3 = [1.1, DESK_TOP, -1.34];
const MUG_HEIGHT = 0.11;
const MUG_RADIUS = 0.045;

/**
 * A cartoon coffee mug: a straight cream cup with a red rim, a cream lip round dark coffee and a
 * big D handle, inked with the character's outline. Curls of steam rise off it.
 */
export function Mug({ still }: { still: boolean }) {
  const { base } = useKit();
  const geometry = useDisposable(() =>
    mergeParts([
      { geo: new CylinderGeometry(MUG_RADIUS, MUG_RADIUS, MUG_HEIGHT, 28), color: '#efe0c4', at: [0, MUG_HEIGHT / 2, 0] },
      { geo: new TorusGeometry(MUG_RADIUS - 0.002, 0.005, 8, 32), color: '#c4553b', at: [0, MUG_HEIGHT, 0], rot: [Math.PI / 2, 0, 0] },
      { geo: new CircleGeometry(MUG_RADIUS - 0.009, 28), color: '#3b2418', at: [0, MUG_HEIGHT + 0.0015, 0], rot: [-Math.PI / 2, 0, 0] },
      { geo: new TorusGeometry(0.032, 0.01, 10, 20, Math.PI), color: '#efe0c4', at: [MUG_RADIUS, MUG_HEIGHT * 0.5, 0], rot: [0, 0, -Math.PI / 2] },
    ]),
  );
  const outline = useDisposable(() => hull(geometry));
  const ink = useDisposable(inkOutline);
  return (
    <group position={MUG} rotation-y={-0.5}>
      <mesh geometry={geometry} material={base} castShadow receiveShadow />
      <mesh geometry={outline} material={ink} />
      {!still && <Steam />}
    </group>
  );
}

const WISPS = 3;
const RISE_S = 3.4;

/** A thin S-curl of steam, thick and clear at its foot, fading to nothing at its tip. */
function wispTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  const fade = ctx.createLinearGradient(0, 192, 0, 0);
  fade.addColorStop(0, 'rgb(255 255 255 / 0)');
  fade.addColorStop(0.2, 'rgb(255 255 255 / 0.85)');
  fade.addColorStop(1, 'rgb(255 255 255 / 0)');
  ctx.strokeStyle = fade;
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  ctx.filter = 'blur(1.5px)';
  ctx.beginPath();
  ctx.moveTo(32, 186);
  ctx.bezierCurveTo(6, 150, 58, 118, 32, 86);
  ctx.bezierCurveTo(10, 58, 50, 30, 30, 6);
  ctx.stroke();
  return new CanvasTexture(canvas);
}

/** Curls of steam rising off the coffee: each drifts up, sways and stretches, fading in and out on its own beat. */
function Steam() {
  const texture = useDisposable(wispTexture);
  const materials = useDisposable(() => {
    const list = Array.from({ length: WISPS }, () => new SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0 }));
    return Object.assign(list, { dispose: () => list.forEach((m) => m.dispose()) });
  });
  const sprites = useRef<(Sprite | null)[]>([]);
  useFrame(({ clock: { elapsedTime: t } }) => {
    sprites.current.forEach((sprite, i) => {
      if (!sprite) return;
      const life = ((t / RISE_S + i / WISPS) % 1 + 1) % 1;
      const side = (i - (WISPS - 1) / 2) * 0.022;
      sprite.position.set(side + Math.sin(t * 1.1 + i * 2) * 0.008, MUG_HEIGHT + 0.07 + life * 0.08, 0);
      sprite.scale.set(0.045, 0.11 + life * 0.05, 1);
      // A gentle sway, mirrored on alternate curls.
      materials[i]!.rotation = Math.sin(t * 0.9 + i * 1.7) * 0.18 * (i % 2 ? -1 : 1);
      materials[i]!.opacity = Math.sin(Math.PI * life) ** 1.3 * 0.55;
    });
  });
  return (
    <>
      {materials.map((material, i) => (
        <sprite key={i} ref={(sprite) => void (sprites.current[i] = sprite)} material={material} />
      ))}
    </>
  );
}

export function Journal() {
  return (
    <Model url={journalUrl} position={[-1.92, MATTRESS_TOP, -0.75]} rotationY={0.35}>
      <Hotspot id="journal" at={[0, 0.05, 0]} size={[0.36, 0.14, 0.28]} anchor={[0.3, 0.6, 0.6]} />
    </Model>
  );
}

export function Phone() {
  return (
    <Model url={phoneUrl} position={[-1.12, NIGHTSTAND_TOP, -1.7]} rotationY={0.4}>
      <Hotspot id="phone" at={[0, 0.02, 0]} size={[0.16, 0.08, 0.2]} anchor={[0.2, 0.45, 0.5]} />
    </Model>
  );
}

/** A rocker switch on the back wall above the nightstand: it turns the fairy lights on and off. */
export function LightSwitch({ on }: { on: boolean }) {
  const { base } = useKit();
  return (
    <group position={[-1.15, NIGHTSTAND_TOP + 0.45, -2]}>
      <Merged material={base} parts={() => [{ geo: rounded(0.08, 0.12, 0.014, 0.006), color: '#f1e9dc', at: [0, 0, 0.007] }]} />
      <group position={[0, 0, 0.016]} rotation-x={on ? 0.28 : -0.28}>
        <Merged material={base} parts={() => [{ geo: rounded(0.034, 0.056, 0.012, 0.004), color: '#e8a657' }]} />
      </group>
      <Hotspot id="lightSwitch" at={[0, 0, 0.03]} size={[0.14, 0.18, 0.08]} anchor={[0.3, 0.05, 0.75]} />
    </group>
  );
}

/** The radio on the dresser, beating gently while music plays. */
export function RecordPlayer({ spinning, still }: { spinning: boolean; still: boolean }) {
  return (
    <Model url={radioUrl} position={[-2.24, 0.85, 1.2]} pulse={spinning} still={still}>
      <Hotspot id="recordPlayer" at={[0, 0.11, 0]} size={[0.2, 0.26, 0.34]} anchor={[0.8, 0.5, 0]} />
    </Model>
  );
}

const CARD_COLORS = ['#e8a657', '#2f6f73', '#5b4b8a', '#4fa3d9'];

/** Cork board on the back wall with one card per certification (up to six). */
export function Corkboard({ certifications }: { certifications: { name: string; issuer: string }[] }) {
  const { atlas, base, lit } = useKit();
  const cards = certifications.slice(0, 6);
  const slot = (i: number): Vec3 => [((i % 3) - 1) * 0.27, 1.73 - Math.floor(i / 3) * 0.24, 0];
  return (
    <group position={[-0.55, 0, -1.975]}>
      <Merged
        material={base}
        parts={() => [
          { geo: new BoxGeometry(0.94, 0.66, 0.03), color: '#7a5038', at: [0, 1.6, 0] },
          { geo: new BoxGeometry(0.86, 0.58, 0.02), color: '#c39a6b', at: [0, 1.6, 0.012] },
          ...cards.map(
            (_, i): Part => {
              const [x, y] = slot(i);
              return { geo: new SphereGeometry(0.012, 8, 6), color: '#c4553b', at: [x, y + 0.07, 0.03] };
            },
          ),
        ]}
      />
      {cards.length > 0 && (
        <Merged
          material={lit}
          shadows={false}
          parts={() =>
            cards.flatMap((card, i): Part[] => {
              const cell = atlas.alloc();
              if (!cell) return [];
              atlas.paint(cell, 240, 170, (ctx) => {
                ctx.fillStyle = '#fbf6ee';
                ctx.fillRect(0, 0, 240, 170);
                ctx.fillStyle = CARD_COLORS[i % CARD_COLORS.length]!;
                ctx.fillRect(0, 0, 240, 18);
                ctx.fillStyle = '#1e1b24';
                ctx.font = '700 21px Nunito';
                wrapText(ctx, card.name, 212)
                  .slice(0, 4)
                  .forEach((line, n) => ctx.fillText(line, 14, 50 + n * 25));
                ctx.fillStyle = '#4a4350';
                ctx.font = '400 15px Nunito';
                ctx.fillText(card.issuer, 14, 156);
              });
              const [x, y] = slot(i);
              return [{ geo: atlas.quad(cell, 0.24, 0.17), color: '#ffffff', at: [x, y, 0.024], rot: [0, 0, ((i * 7) % 5) * 0.02 - 0.04] }];
            })
          }
        />
      )}
      <Hotspot id="corkboard" at={[0, 1.6, 0.05]} size={[0.96, 0.7, 0.12]} anchor={[0, 1.5, 1.2]} />
    </group>
  );
}
