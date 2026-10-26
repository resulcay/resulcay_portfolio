import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, SphereGeometry, Vector3 } from 'three';

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A soft 2D bump centred at (cx, cy). */
const bump = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
  Math.exp(-((x - cx) ** 2) / (sx * sx) - ((y - cy) ** 2) / (sy * sy));

/**
 * A tube along a smooth curve whose radius follows `radius(t)`, optionally
 * flattened into a strip. Colours come from `color(t)`, root (0) to tip (1).
 */
export function taperTube(
  points: Vector3[],
  radius: (t: number) => number,
  color: (t: number) => Color,
  {
    radial = 8,
    segments = 12,
    flatten = 1,
    surface,
  }: {
    radial?: number;
    segments?: number;
    flatten?: number;
    /** The outward direction at a point; given, the strip lies flat against it (as hair on a scalp). */
    surface?: (p: Vector3) => Vector3;
  } = {},
): BufferGeometry {
  const curve = new CatmullRomCurve3(points, false, 'centripetal');
  const frames = curve.computeFrenetFrames(segments, false);
  if (surface) {
    const p = new Vector3();
    for (let i = 0; i <= segments; i++) {
      const tangent = frames.tangents[i]!;
      const out = surface(curve.getPointAt(i / segments, p));
      frames.binormals[i]!.crossVectors(tangent, out).normalize();
      frames.normals[i]!.crossVectors(frames.binormals[i]!, tangent).normalize();
    }
  }
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  const p = new Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, p);
    const n = frames.normals[i]!;
    const b = frames.binormals[i]!;
    const r = radius(t);
    const c = color(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      positions.push(
        p.x + (n.x * Math.cos(a) * flatten + b.x * Math.sin(a)) * r,
        p.y + (n.y * Math.cos(a) * flatten + b.y * Math.sin(a)) * r,
        p.z + (n.z * Math.cos(a) * flatten + b.z * Math.sin(a)) * r,
      );
      uvs.push(t, j / radial);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const d = a + radial + 1;
      // Wound so the outside faces out (front faces and normals point away from the core).
      index.push(a, a + 1, d, a + 1, d + 1, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const SKIN = new Color('#d9a27b');
const CHEEK = new Color('#e3907a');
const COOL = new Color('#b78a72');
export const HAIR = new Color('#2e2018');

/** The head's base proportions, before sculpting: narrower than tall, a little deep. */
export const HEAD_SCALE = new Vector3(0.8, 1, 0.9);

/**
 * The head, sculpted from a unit sphere facing -z: brow ridge, eye sockets,
 * nose bridge and tip, cheekbones, lips, a narrower jaw and chin. Skin colour
 * is painted per vertex: warm cheeks and nose, cooler under the brows, and a
 * short fade into the hair on the sides and back.
 */
export function sculptedHead(): BufferGeometry {
  const geometry = new SphereGeometry(1, 40, 30);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const d = new Vector3();
  const c = new Color();
  for (let i = 0; i < position.count; i++) {
    d.fromBufferAttribute(position, i).normalize();
    const front = smooth(0.15, -0.75, d.z);
    let x = d.x * HEAD_SCALE.x;
    let y = d.y * HEAD_SCALE.y;
    let z = d.z * HEAD_SCALE.z;

    // Lower face: a narrower jaw and chin; a fuller back of the skull.
    const low = smooth(-0.15, -1, d.y);
    x *= 1 - 0.2 * low;
    if (d.z > 0) z *= 1 + 0.1 * smooth(-0.2, 0.6, d.y);
    z *= 1 - 0.12 * low * smooth(0, 1, d.z);

    let forward = 0;
    forward += 0.07 * bump(d.x, d.y, 0, 0.24, 0.6, 0.07) * front; // brow ridge
    forward -= 0.08 * (bump(d.x, d.y, 0.3, 0.05, 0.13, 0.1) + bump(d.x, d.y, -0.3, 0.05, 0.13, 0.1)) * front; // eye sockets
    forward += 0.08 * bump(d.x, d.y, 0, -0.06, 0.065, 0.24) * front; // nose bridge
    forward += 0.19 * bump(d.x, d.y, 0, -0.34, 0.1, 0.08) * front; // nose tip
    forward += 0.06 * (bump(d.x, d.y, 0.1, -0.37, 0.06, 0.05) + bump(d.x, d.y, -0.1, -0.37, 0.06, 0.05)) * front; // nostril wings
    forward += 0.05 * bump(d.x, d.y, 0, -0.57, 0.22, 0.07) * front; // lips
    forward += 0.06 * bump(d.x, d.y, 0, -0.88, 0.2, 0.1) * front; // chin
    const cheek = bump(d.x, d.y, 0.48, -0.14, 0.15, 0.1) + bump(d.x, d.y, -0.48, -0.14, 0.15, 0.1);
    const out = 0.05 * cheek * front;
    position.setXYZ(i, x * (1 + out), y, z * (1 + out) - forward);

    // Paint.
    c.copy(SKIN);
    c.lerp(CHEEK, 0.35 * (bump(d.x, d.y, 0.45, -0.25, 0.2, 0.15) + bump(d.x, d.y, -0.45, -0.25, 0.2, 0.15)) * front);
    c.lerp(CHEEK, 0.3 * bump(d.x, d.y, 0, -0.33, 0.1, 0.1) * front);
    c.lerp(COOL, 0.5 * bump(d.x, d.y, 0, 0.1, 0.55, 0.06) * front);
    c.lerp(COOL, 0.35 * smooth(-0.7, -1, d.y));
    // Short sides: skin fades into dark hair above the ears and at the back.
    const fade = smooth(-0.2, 0.25, d.y + 0.25 * smooth(0, 1, d.z)) * (1 - front);
    c.lerp(HAIR, 0.85 * fade);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The base layer of hair: a dark shell over the crown, tilted back so the
 * hairline sits high on the forehead. Clumps on top give it shape.
 */
export function hairCap(): BufferGeometry {
  const geometry = new SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.4);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const root = new Color('#1c120c');
  const top = new Color('#35251a');
  const c = new Color();
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    c.copy(root).lerp(top, smooth(0.3, 1, y));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.rotateX(0.3);
  geometry.scale(HEAD_SCALE.x * 1.035, HEAD_SCALE.y * 1.03, HEAD_SCALE.z * 1.035);
  return geometry;
}
