import { BoxGeometry, CylinderGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { around, Merged, useKit, type Part, type Vec3 } from './kit';
import { Model } from './Model';
import bedUrl from './models/bed.glb?url';
import nightstandUrl from './models/nightstand.glb?url';
import treeUrl from './models/tree.glb?url';
import catUrl from './models/cat.glb?url';

/** Where the chair stands and how it's turned; the character sits here. */
// Square to the desk, the seat's front at the desk's edge: his forearms come straight over it.
export const SEAT: Vec3 = [0.62, 0, -0.92];
export const SEAT_TURN = 0;
// Sized to Resul's short-legged, big-headed build: feet flat on the floor from
// the seat, and the desk low enough that his elbows stay above it.
export const SEAT_TOP = 0.4;
export const DESK_TOP = 0.53;
/** The desk top's centre and size, in the room. */
export const DESK = { x: 0.9, z: -1.565, width: 1.5, depth: 0.85 };
/** The laptop, in the chair's frame (facing -z): its near edge 10 cm in from the desk's. */
export const LAPTOP_Z = -0.44;

const WOOD = '#8a5a3c';
const LIGHT_WOOD = '#a77a55';

const rounded = (w: number, h: number, d: number, r = 0.02) => new RoundedBoxGeometry(w, h, d, 2, r);

/** The bed model's mattress top; the blanket and the journal rest on it. */
export const MATTRESS_TOP = 0.457;
/** The nightstand model's top, where the phone lies. */
export const NIGHTSTAND_TOP = 0.5;

function blanket(): Part[] {
  return [{ geo: rounded(1.0, 0.06, 0.9, 0.03), color: '#6d5ba0', at: [-1.95, MATTRESS_TOP + 0.015, -0.55] }];
}

function desk(): Part[] {
  const legs = ([-0.7, 0.7] as const).flatMap((dx) =>
    ([-0.38, 0.38] as const).map(
      (dz): Part => ({ geo: new BoxGeometry(0.05, DESK_TOP - 0.05, 0.05), color: WOOD, at: [DESK.x + dx, (DESK_TOP - 0.05) / 2, DESK.z + dz] }),
    ),
  );
  return [
    { geo: rounded(DESK.width, 0.05, DESK.depth, 0.015), color: LIGHT_WOOD, at: [DESK.x, DESK_TOP - 0.025, DESK.z] },
    { geo: new BoxGeometry(0.42, DESK_TOP - 0.2, 0.7), color: '#2f6f73', at: [1.42, (DESK_TOP + 0.15) / 2, -1.6] },
    ...legs,
  ];
}

function chair(): Part[] {
  const at = around(SEAT, SEAT_TURN);
  const rot: Vec3 = [0, SEAT_TURN, 0];
  const legs = ([-0.19, 0.19] as const).flatMap((dx) =>
    ([-0.18, 0.18] as const).map(
      (dz): Part => ({ geo: new CylinderGeometry(0.018, 0.018, SEAT_TOP - 0.03, 8), color: '#2b2b30', at: at([dx, (SEAT_TOP - 0.03) / 2, dz]), rot }),
    ),
  );
  return [
    { geo: rounded(0.46, 0.06, 0.44), color: '#e8a657', at: at([0, SEAT_TOP - 0.03, 0]), rot },
    { geo: rounded(0.44, 0.44, 0.05), color: '#e8a657', at: at([0, SEAT_TOP + 0.25, 0.22]), rot },
    ...legs,
  ];
}

function dresser(): Part[] {
  const drawers = [0.22, 0.48, 0.74].map(
    (y): Part => ({ geo: new BoxGeometry(0.01, 0.015, 0.8), color: '#2d4f50', at: [-2.03, y, 1.2] }),
  );
  return [
    { geo: rounded(0.45, 0.85, 1.0), color: '#4f7f7f', at: [-2.26, 0.425, 1.2] },
    ...drawers,
  ];
}

function shelf(): Part[] {
  const spines: [color: string, width: number, height: number][] = [
    ['#5b4b8a', 0.04, 0.22],
    ['#e8a657', 0.05, 0.25],
    ['#2f6f73', 0.035, 0.2],
    ['#c4553b', 0.045, 0.24],
    ['#f1e9dc', 0.04, 0.21],
  ];
  const books = spines.map(
    ([color, w, h], i): Part => ({ geo: new BoxGeometry(w, h, 0.16), color, at: [1.82 + i * 0.055, 1.92 + h / 2, -1.9] }),
  );
  return [{ geo: new BoxGeometry(0.75, 0.035, 0.22), color: LIGHT_WOOD, at: [2.05, 1.9, -1.89] }, ...books];
}

export function Furniture({ still }: { still: boolean }) {
  const { base } = useKit();
  return (
    <>
      <Merged material={base} bake parts={() => [...blanket(), ...desk(), ...chair(), ...dresser(), ...shelf()]} />
      {/* Headboard against the back wall. */}
      <Model url={bedUrl} position={[-1.95, 0, -0.95]} rotationY={-Math.PI / 2} color="#efe6d8" />
      <Model url={nightstandUrl} position={[-1.15, 0, -1.74]} />
      <Model url={treeUrl} position={[2.1, 0, -1.55]} />
      {/* On the rug, grooming: the cat's one clip is it licking a paw and washing its face. */}
      <Model url={catUrl} position={[-0.2, 0.017, 0.55]} rotationY={-0.3} clip="Take 001" still={still} />
    </>
  );
}

/** Two abstract posters in the site palette. */
export function Posters() {
  const { atlas, lit } = useKit();
  return (
    <Merged
      material={lit}
      shadows={false}
      parts={() => {
        const a = atlas.alloc()!;
        atlas.paint(a, 110, 150, (ctx) => {
          ctx.fillStyle = '#2f6f73';
          ctx.fillRect(0, 0, 110, 150);
          ctx.fillStyle = '#e8a657';
          ctx.beginPath();
          ctx.arc(55, 60, 32, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1e1b24';
          ctx.fillRect(0, 100, 110, 50);
          ctx.fillStyle = '#f4ebdd';
          ctx.font = '500 13px "Dudu Calligraphy"';
          ctx.fillText('SUNDOWN', 14, 128);
        });
        const b = atlas.alloc()!;
        atlas.paint(b, 100, 100, (ctx) => {
          ctx.fillStyle = '#f4ebdd';
          ctx.fillRect(0, 0, 100, 100);
          ctx.fillStyle = '#5b4b8a';
          ctx.fillRect(14, 14, 44, 72);
          ctx.fillStyle = '#4fa3d9';
          ctx.beginPath();
          ctx.moveTo(52, 86);
          ctx.lineTo(86, 20);
          ctx.lineTo(86, 86);
          ctx.fill();
        });
        const facing: Vec3 = [0, Math.PI / 2, 0];
        return [
          { geo: atlas.quad(a, 0.55, 0.75), color: '#ffffff', at: [-2.488, 1.75, 0.35], rot: facing },
          { geo: atlas.quad(b, 0.5, 0.5), color: '#ffffff', at: [-2.488, 1.55, 1.2], rot: [0.04, Math.PI / 2, 0] },
        ];
      }}
    />
  );
}
