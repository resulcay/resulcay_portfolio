import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, CatmullRomCurve3, Matrix4, TubeGeometry, Vector3, type InstancedMesh } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Hotspot, Merged, useDisposable, useKit, type Vec3 } from './kit';
import { PHASES, type Phase } from './time';

// The room is a diorama: floor, back wall (z = -2) and left wall (x = -2.5),
// open towards the camera. One unit is one metre.

export function Shell() {
  const { wall, base } = useKit();
  return (
    <>
      <Merged
        material={wall}
        bake
        shadows={false}
        parts={() => [
          { geo: new BoxGeometry(5.3, 0.12, 4.3), color: '#8c5c45', at: [0.15, -0.06, 0.15] },
          { geo: new BoxGeometry(5.3, 2.9, 0.12), color: '#dcc5aa', at: [0.15, 1.45, -2.06] },
          { geo: new BoxGeometry(0.12, 2.9, 4.3), color: '#cfb59a', at: [-2.56, 1.45, 0.15] },
        ]}
      />
      <Merged
        material={base}
        bake
        parts={() => [
          { geo: new BoxGeometry(5.2, 0.1, 0.02), color: '#efe6d6', at: [0.1, 0.05, -1.99] },
          { geo: new BoxGeometry(0.02, 0.1, 4.2), color: '#efe6d6', at: [-2.49, 0.05, 0.1] },
          { geo: new RoundedBoxGeometry(2.3, 0.015, 1.6, 2, 0.007), color: '#5b4b8a', at: [0.3, 0.008, 0.25] },
          { geo: new RoundedBoxGeometry(2.0, 0.017, 1.3, 2, 0.007), color: '#e8a657', at: [0.3, 0.009, 0.25] },
        ]}
      />
    </>
  );
}

const WINDOW: Vec3 = [0.9, 1.65, -2];

function paintSky(ctx: CanvasRenderingContext2D, phase: Phase) {
  const light = PHASES[phase];
  const sky = ctx.createLinearGradient(0, 0, 0, 120);
  sky.addColorStop(0, light.skyTop);
  sky.addColorStop(1, light.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 150, 120);
  if (phase === 'night') {
    ctx.fillStyle = '#f4ebdd';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 37) % 150, (i * 23) % 80, 1, 1);
    ctx.beginPath();
    ctx.arc(110, 30, 9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const y = phase === 'day' ? 30 : 78;
    const glow = ctx.createRadialGradient(100, y, 2, 100, y, 40);
    glow.addColorStop(0, '#fff6dd');
    glow.addColorStop(0.3, 'rgba(255, 220, 160, 0.8)');
    glow.addColorStop(1, 'rgba(255, 210, 150, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 150, 120);
  }
  // Rooftops and a hill across the street.
  ctx.fillStyle = phase === 'night' ? '#141226' : '#2f6f73';
  ctx.beginPath();
  ctx.moveTo(0, 96);
  ctx.bezierCurveTo(40, 84, 90, 100, 150, 88);
  ctx.lineTo(150, 120);
  ctx.lineTo(0, 120);
  ctx.fill();
  ctx.fillStyle = phase === 'night' ? '#0d0b18' : '#1e1b24';
  ctx.fillRect(8, 100, 30, 20);
  ctx.fillRect(44, 106, 22, 14);
  ctx.fillRect(112, 102, 30, 18);
}

export function Window() {
  const { atlas, glow, base, phase } = useKit();
  const sky = useDisposable(() => {
    const cell = atlas.alloc()!;
    atlas.paint(cell, 150, 120, (ctx) => paintSky(ctx, phase));
    return atlas.quad(cell, 1.5, 1.2);
  });
  const [x, y, z] = WINDOW;
  const frame = '#efe6d6';
  return (
    <>
      <mesh geometry={sky} material={glow} position={[x, y, z + 0.005]} />
      <Merged
        material={base}
        parts={() => [
          { geo: new BoxGeometry(1.62, 0.07, 0.06), color: frame, at: [x, y + 0.63, z + 0.02] },
          { geo: new BoxGeometry(1.62, 0.07, 0.06), color: frame, at: [x, y - 0.63, z + 0.02] },
          { geo: new BoxGeometry(0.07, 1.33, 0.06), color: frame, at: [x - 0.78, y, z + 0.02] },
          { geo: new BoxGeometry(0.07, 1.33, 0.06), color: frame, at: [x + 0.78, y, z + 0.02] },
          { geo: new BoxGeometry(0.035, 1.2, 0.03), color: frame, at: [x, y, z + 0.02] },
          { geo: new BoxGeometry(1.5, 0.035, 0.03), color: frame, at: [x, y + 0.1, z + 0.02] },
          { geo: new BoxGeometry(1.8, 0.04, 0.16), color: frame, at: [x, y - 0.68, z + 0.07] },
        ]}
      />
      <Hotspot id="window" at={[x, y, z + 0.1]} size={[1.6, 1.3, 0.2]} anchor={[x, y - 0.1, -0.4]} />
    </>
  );
}

/** Fairy lights along the top of both walls; they glow at night. */
export function StringLights() {
  const { base, phase } = useKit();
  const curve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(2.6, 2.6, -1.96),
        new Vector3(1.4, 2.4, -1.96),
        new Vector3(0.2, 2.58, -1.96),
        new Vector3(-1.1, 2.4, -1.96),
        new Vector3(-2.44, 2.6, -1.94),
        new Vector3(-2.46, 2.42, -0.8),
        new Vector3(-2.46, 2.6, 0.4),
        new Vector3(-2.46, 2.44, 1.5),
        new Vector3(-2.46, 2.6, 2.3),
      ]),
    [],
  );
  const wire = useDisposable(() => new TubeGeometry(curve, 120, 0.004, 4));
  const bulbs = useRef<InstancedMesh>(null);
  const count = 36;
  useLayoutEffect(() => {
    const m = new Matrix4();
    for (let i = 0; i < count; i++) {
      const p = curve.getPointAt((i + 0.5) / count);
      bulbs.current!.setMatrixAt(i, m.makeTranslation(p.x, p.y - 0.03, p.z));
    }
    bulbs.current!.instanceMatrix.needsUpdate = true;
  }, [curve]);
  return (
    <>
      <mesh geometry={wire} material={base} />
      <instancedMesh ref={bulbs} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.028, 8, 6]} />
        <meshBasicMaterial color={PHASES[phase].lightsOn ? '#ffd27a' : '#9a8b70'} toneMapped={false} />
      </instancedMesh>
    </>
  );
}
