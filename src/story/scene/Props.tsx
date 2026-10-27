import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, CylinderGeometry, SphereGeometry, type Group } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { around, Hotspot, Merged, useKit, type Part, type Vec3 } from './kit';
import { wrapText } from './atlas';
import { DESK_TOP, LAPTOP_Z, SEAT, SEAT_TURN } from './Furniture';

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
    <group position={LAPTOP} rotation-y={SEAT_TURN}>
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
            ctx.font = '700 11px "Atkinson Hyperlegible"';
            ctx.fillText('2023          2024          2025          2026', 22, 186);
          });
          return [{ geo: atlas.quad(cell, 0.31, 0.196), color: '#ffffff', at: screenAt, rot: [LID_TILT, 0, 0] }];
        }}
      />
      <Hotspot id="laptop" at={[0, 0.12, -0.06]} size={[0.38, 0.26, 0.3]} anchor={[0.35, 0.55, 0.55]} />
    </group>
  );
}

export function Journal() {
  const { base } = useKit();
  return (
    <group position={[-1.75, 0.575, -0.2]} rotation-y={0.35}>
      <Merged
        material={base}
        parts={() => [
          { geo: rounded(0.22, 0.03, 0.3), color: '#5b4b8a' },
          { geo: new BoxGeometry(0.205, 0.024, 0.29), color: '#f4ebdd', at: [0.01, 0.002, 0] },
          { geo: new BoxGeometry(0.012, 0.034, 0.302), color: '#e8a657', at: [0.07, 0, 0] },
        ]}
      />
      <Hotspot id="journal" at={[0, 0.03, 0]} size={[0.3, 0.12, 0.38]} anchor={[0.3, 0.6, 0.6]} />
    </group>
  );
}

export function Phone() {
  const { atlas, base, glow } = useKit();
  return (
    <group position={[-1.12, 0.505, -1.7]} rotation-y={0.4}>
      <Merged material={base} parts={() => [{ geo: rounded(0.075, 0.01, 0.15, 0.004), color: '#222226' }]} />
      <Merged
        material={glow}
        shadows={false}
        parts={() => {
          const cell = atlas.alloc()!;
          atlas.paint(cell, 65, 135, (ctx) => {
            const bg = ctx.createLinearGradient(0, 0, 0, 135);
            bg.addColorStop(0, '#5b4b8a');
            bg.addColorStop(1, '#e8a657');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, 65, 135);
            const now = new Date();
            ctx.fillStyle = '#f4ebdd';
            ctx.font = '500 16px "Dudu Calligraphy"';
            ctx.textAlign = 'center';
            ctx.fillText(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`, 32, 40);
          });
          return [{ geo: atlas.quad(cell, 0.066, 0.137), color: '#ffffff', at: [0, 0.0055, 0], rot: [-Math.PI / 2, 0, 0] }];
        }}
      />
      <Hotspot id="phone" at={[0, 0.02, 0]} size={[0.14, 0.08, 0.2]} anchor={[0.2, 0.45, 0.5]} />
    </group>
  );
}

export function RecordPlayer({ spinning }: { spinning: boolean }) {
  const { base } = useKit();
  const vinyl = useRef<Group>(null);
  // About 33⅓ rpm while music plays.
  useFrame((_, delta) => {
    if (spinning && vinyl.current) vinyl.current.rotation.y -= delta * 3.5;
  });
  return (
    <group position={[-2.24, 0.85, 1.2]} rotation-y={Math.PI / 2}>
      <Merged
        material={base}
        parts={() => [
          { geo: rounded(0.42, 0.08, 0.34, 0.012), color: '#7a4e33', at: [0, 0.04, 0] },
          { geo: new CylinderGeometry(0.02, 0.02, 0.03, 10), color: '#c9ccd2', at: [0.15, 0.095, -0.1] },
          { geo: new BoxGeometry(0.012, 0.01, 0.2), color: '#c9ccd2', at: [0.12, 0.11, -0.01], rot: [0, 0.35, 0] },
        ]}
      />
      <group ref={vinyl} position={[-0.04, 0.086, 0]}>
        <Merged
          material={base}
          parts={() => [
            { geo: new CylinderGeometry(0.14, 0.14, 0.012, 32), color: '#1b1b1f' },
            { geo: new CylinderGeometry(0.045, 0.045, 0.014, 20), color: '#e8a657', at: [0, 0.002, 0] },
            { geo: new BoxGeometry(0.03, 0.016, 0.008), color: '#5b4b8a', at: [0.022, 0.002, 0] },
          ]}
        />
      </group>
      <Hotspot id="recordPlayer" at={[0, 0.06, 0]} size={[0.46, 0.16, 0.38]} anchor={[0, 0.5, 0.8]} />
    </group>
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
                ctx.font = '700 21px "Atkinson Hyperlegible"';
                wrapText(ctx, card.name, 212)
                  .slice(0, 4)
                  .forEach((line, n) => ctx.fillText(line, 14, 50 + n * 25));
                ctx.fillStyle = '#4a4350';
                ctx.font = '400 15px "Atkinson Hyperlegible"';
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
