import {
  BackSide,
  Bone,
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  CapsuleGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Group,
  LatheGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NearestFilter,
  Quaternion,
  RedFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HEAD_SCALE, hairCap, sculptedHead, taperTube } from './shapes';

// Resul, about seven heads tall, seated on the origin's chair and facing -z.
// Every part is rigidly bound to one bone of a small skeleton, and parts are
// merged by material, so the whole figure is four draw calls.

type V = [number, number, number];
const v = (...xyz: V) => new Vector3(...xyz);

const HEAD_UNIT = 0.125;
const HEAD_CENTER = v(0, 1.322, -0.01);

const SIDES = [-1, 1] as const;
const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;

const BONES: [name: string, parent: string | null, at: V][] = [
  ['root', null, [0, 0, 0]],
  ['hips', 'root', [0, 0.55, 0.05]],
  ['spine', 'hips', [0, 0.62, 0.05]],
  ['neck', 'spine', [0, 1.15, 0.02]],
  ['head', 'neck', [0, 1.22, 0]],
  ['glasses', 'head', [0, 1.33, -0.13]],
  ...SIDES.map((s): [string, string, V] => [`lid${s}`, 'head', [s * 0.3 * HEAD_UNIT, HEAD_CENTER.y + 0.045 * HEAD_UNIT, HEAD_CENTER.z - 0.66 * HEAD_UNIT]]),
  ...SIDES.flatMap((s): [string, string, V][] => [
    [`shoulder${s}`, 'spine', [s * 0.185, 1.1, 0.03]],
    [`elbow${s}`, `shoulder${s}`, [s * 0.2, 0.84, -0.08]],
    [`wrist${s}`, `elbow${s}`, [s * 0.17, 0.8, -0.335]],
  ]),
];

interface Finger {
  name: (typeof FINGERS)[number];
  base: Vector3;
  mid: Vector3;
  tip: Vector3;
  radius: number;
}

/** Knuckle, middle joint and tip of each finger, resting on the keyboard. */
function fingers(s: number): Finger[] {
  const xh = s * 0.165;
  const along = (from: Vector3, dir: V, length: number) => from.clone().add(v(...dir).normalize().multiplyScalar(length));
  const straight = (name: Finger['name'], dx: number, a: number, b: number, radius: number): Finger => {
    const base = v(xh + s * dx, 0.797, -0.425);
    const mid = along(base, [0, -0.25, -1], a);
    return { name, base, mid, tip: along(mid, [0, -0.8, -0.6], b), radius };
  };
  const thumbBase = v(xh - s * 0.042, 0.787, -0.39);
  const thumbMid = along(thumbBase, [-s * 0.45, -0.25, -0.85], 0.032);
  return [
    { name: 'thumb', base: thumbBase, mid: thumbMid, tip: along(thumbMid, [-s * 0.3, -0.35, -0.88], 0.028), radius: 0.0095 },
    straight('index', -0.026, 0.042, 0.034, 0.0082),
    straight('middle', -0.008, 0.047, 0.037, 0.0085),
    straight('ring', 0.01, 0.044, 0.035, 0.008),
    straight('pinky', 0.027, 0.034, 0.028, 0.0072),
  ];
}

type Kind = 'toon' | 'shirt' | 'lens';

interface Part {
  geo: BufferGeometry;
  bone: string;
  kind: Kind;
  /** Part of the inked silhouette. */
  outline: boolean;
}

const UP = v(0, 1, 0);

function paint(geo: BufferGeometry, color: string | Color): BufferGeometry {
  if (geo.getAttribute('color')) return geo;
  const c = new Color(color);
  const colors = new Float32Array(geo.getAttribute('position').count * 3);
  for (let i = 0; i < colors.length; i += 3) colors.set([c.r, c.g, c.b], i);
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  return geo;
}

function ellipsoid(at: Vector3, scale: V, color: string, detail: [number, number] = [12, 9]): BufferGeometry {
  return paint(new SphereGeometry(1, ...detail).scale(...scale).translate(at.x, at.y, at.z), color);
}

/** A capsule from a to b. */
function capsule(a: Vector3, b: Vector3, radius: number, color: string): BufferGeometry {
  const dir = b.clone().sub(a);
  const g = new CapsuleGeometry(radius, dir.length(), 2, 6);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(UP, dir.normalize()));
  const mid = a.clone().lerp(b, 0.5);
  return paint(g.translate(mid.x, mid.y, mid.z), color);
}

/** A ring around the axis from a to b, at a. */
function ring(at: Vector3, axis: Vector3, radius: number, tube: number, color: string): BufferGeometry {
  const g = new TorusGeometry(radius, tube, 5, 14);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(v(0, 0, 1), axis.clone().normalize()));
  return paint(g.translate(at.x, at.y, at.z), color);
}

const solid = (color: string) => () => new Color(color);

function headParts(): Part[] {
  const parts: Part[] = [];
  const add = (geo: BufferGeometry, bone = 'head', outline = true, kind: Kind = 'toon') => parts.push({ geo, bone, kind, outline });
  const toHead = (g: BufferGeometry) => g.scale(HEAD_UNIT, HEAD_UNIT, HEAD_UNIT).translate(HEAD_CENTER.x, HEAD_CENTER.y, HEAD_CENTER.z);

  add(toHead(sculptedHead()));

  for (const s of SIDES) {
    // Ears.
    add(toHead(paint(new SphereGeometry(1, 10, 8).scale(0.1, 0.22, 0.15).rotateY(s * 0.3).translate(s * 0.79, -0.03, 0.04), '#dc977a')));
    add(toHead(paint(new SphereGeometry(1, 8, 6).scale(0.05, 0.15, 0.09).rotateY(s * 0.3).translate(s * 0.83, -0.03, 0.04), '#b87b62')), 'head', false);

    // Eyes: white, iris, pupil and a catchlight; an upper lid that blinks.
    const eye = v(s * 0.3, 0.045, -0.66);
    add(toHead(paint(new SphereGeometry(0.13, 12, 8).translate(eye.x, eye.y, eye.z), '#f1ece4')), 'head', false);
    const disc = (r: number, dz: number, color: string, dx = 0, dy = 0) =>
      add(toHead(paint(new CircleGeometry(r, 14).rotateY(Math.PI).translate(eye.x + dx, eye.y + dy, eye.z - 0.13 - dz), color)), 'head', false);
    disc(0.078, 0.004, '#3b2519');
    disc(0.038, 0.008, '#0f0a08');
    disc(0.016, 0.012, '#ffffff', 0.028, 0.032);
    const lid = toHead(paint(new SphereGeometry(0.138, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.42).translate(eye.x, eye.y, eye.z), '#cf9673'));
    add(lid, `lid${s}`, false);
    const phi = Math.PI * 0.42;
    const lash = Array.from({ length: 7 }, (_, i) => {
      const a = ((i - 3) / 3) * 1.2;
      return v(eye.x + 0.14 * Math.sin(phi) * Math.sin(a), eye.y + 0.14 * Math.cos(phi), eye.z - 0.14 * Math.sin(phi) * Math.cos(a));
    });
    add(toHead(taperTube(lash, () => 0.012, solid('#1d1410'), { radial: 4, segments: 8, flatten: 0.5 })), `lid${s}`, false);

    // Thick, dark, straight brows.
    add(
      toHead(taperTube([v(s * 0.1, 0.262, -0.955), v(s * 0.3, 0.278, -0.925), v(s * 0.5, 0.25, -0.79)], (t) => 0.05 * (1 - 0.4 * t), solid('#1f150f'), { radial: 6, segments: 8, flatten: 0.55 })),
      'head',
      false,
    );
  }

  // Lips: subtle, with colour. Nothing above the upper lip.
  const lipRadius = (r: number) => (t: number) => r * Math.sqrt(Math.sin(Math.PI * t)) + 0.004;
  add(toHead(taperTube([v(-0.12, -0.552, -0.83), v(0, -0.537, -0.875), v(0.12, -0.552, -0.83)], lipRadius(0.02), solid('#b46d66'), { radial: 6, segments: 10, flatten: 0.55 })), 'head', false);
  add(toHead(taperTube([v(-0.1, -0.605, -0.82), v(0, -0.618, -0.862), v(0.1, -0.605, -0.82)], lipRadius(0.027), solid('#c27a70'), { radial: 6, segments: 10, flatten: 0.6 })), 'head', false);

  // Hair: a dark base over the crown, then tapered clumps swept up from the
  // hairline and back, overlapping so no scalp shows through.
  add(toHead(hairCap()));
  // Each strip starts at the hairline and runs back over the crown, lying flat
  // on the scalp, lifted at the front into a short quiff.
  const onSkull = (dir: Vector3, lift: number) => dir.clone().normalize().multiply(HEAD_SCALE).multiplyScalar(1 + lift);
  const outward = (p: Vector3) => p.clone().divide(HEAD_SCALE).normalize();
  const root = new Color('#1d130d');
  const tip = new Color('#4a3424');
  const shine = new Color('#76543b');
  const strips: [theta: number, alpha: number, length: number, width: number, quiff: number][] = [
    ...[-0.95, -0.65, -0.35, -0.1, 0.15, 0.4, 0.7, 0.98].map((a): [number, number, number, number, number] => [0.92, a + 0.04 * Math.sin(a * 9), 1.7, 0.17, 0.2]),
    ...[-0.8, -0.5, -0.2, 0.05, 0.3, 0.6, 0.88].map((a): [number, number, number, number, number] => [0.66, a, 1.55, 0.17, 0.13]),
    ...[-1.25, -1.0, 1.0, 1.25].map((a): [number, number, number, number, number] => [0.8, a, 1.45, 0.15, 0.05]),
    ...[-1.75, -1.5, 1.5, 1.75].map((a): [number, number, number, number, number] => [1.0, a, 1.2, 0.14, 0.02]),
    ...[-0.5, 0, 0.5].map((a): [number, number, number, number, number] => [0.35, a, 1.2, 0.18, 0.04]),
  ];
  for (const [theta, alpha, length, width, quiff] of strips) {
    const dir = v(Math.sin(theta) * Math.sin(alpha), Math.cos(theta), -Math.sin(theta) * Math.cos(alpha));
    const points = Array.from({ length: 6 }, (_, k) => {
      const s = k / 5;
      // Over the top: rotate the root direction back about the x axis.
      const d = dir.clone().applyAxisAngle(v(1, 0, 0), length * s);
      // Rises off the scalp just behind the hairline, then settles back down.
      return onSkull(d, 0.03 + quiff * Math.sin(Math.PI * Math.min(1, s / 0.7)));
    });
    add(
      toHead(
        taperTube(points, (t) => width * Math.min(1, 0.35 + t * 5) * (1 - 0.7 * t) + 0.01, (t) => root.clone().lerp(tip, t).lerp(shine, 0.55 * Math.exp(-(((t - 0.3) / 0.1) ** 2))), {
          radial: 5,
          segments: 8,
          flatten: 0.28,
          surface: outward,
        }),
      ),
    );
  }
  return parts;
}

function glassesParts(): { frame: Part[]; lens: Part[] } {
  const frame: Part[] = [];
  const lens: Part[] = [];
  const metal = '#2a292e';
  const toHead = (g: BufferGeometry) => g.scale(HEAD_UNIT, HEAD_UNIT, HEAD_UNIT).translate(HEAD_CENTER.x, HEAD_CENTER.y, HEAD_CENTER.z);
  const corners: [number, number][] = [
    [-0.5, 0.12],
    [-0.32, 0.5],
    [0.32, 0.5],
    [0.5, 0.12],
    [0.36, -0.5],
    [-0.36, -0.5],
  ];
  for (const s of SIDES) {
    const cx = s * 0.3;
    const points = corners.map(([x, y]) => v(cx + x * 0.44, 0.045 + y * 0.33, -1.03 + 0.25 * (x * 0.44) ** 2 * s));
    const curve = new CatmullRomCurve3(points, true, 'centripetal');
    frame.push({ geo: toHead(paint(new TubeGeometry(curve, 32, 0.012, 4, true), metal)), bone: 'glasses', kind: 'toon', outline: false });
    // The lens: the same rounded hexagon, filled.
    const shape = new Shape(curve.getPoints(30).map((p) => new Vector2(p.x - cx, p.y - 0.045)));
    lens.push({ geo: toHead(paint(new ShapeGeometry(shape).translate(cx, 0.045, -1.03), '#ffffff')), bone: 'glasses', kind: 'lens', outline: false });
    frame.push({ geo: toHead(ellipsoid(v(s * 0.085, -0.07, -0.98), [0.022, 0.03, 0.015], metal, [8, 6])), bone: 'glasses', kind: 'toon', outline: false });
    frame.push({
      geo: toHead(taperTube([v(s * 0.52, 0.1, -1.0), v(s * 0.8, 0.09, -0.6), v(s * 0.865, 0.05, -0.1), v(s * 0.84, -0.06, 0.1), v(s * 0.78, -0.16, 0.16)], () => 0.011, solid(metal), { radial: 5, segments: 14 })),
      bone: 'glasses',
      kind: 'toon',
      outline: false,
    });
  }
  frame.push({ geo: toHead(taperTube([v(-0.1, 0.1, -1.04), v(0, 0.135, -1.06), v(0.1, 0.1, -1.04)], () => 0.011, solid(metal), { radial: 5, segments: 8 })), bone: 'glasses', kind: 'toon', outline: false });
  return { frame, lens };
}

function bodyParts(): Part[] {
  const parts: Part[] = [];
  const add = (geo: BufferGeometry, bone: string, kind: Kind = 'toon', outline = true) => parts.push({ geo, bone, kind, outline });
  const SKIN = '#d6a07a';
  const JEANS = '#2d3549';

  // Torso: a lathe, flattened front to back, leaning a touch forward.
  const torso = new LatheGeometry(
    [
      [0.12, 0],
      [0.15, 0.05],
      [0.158, 0.18],
      [0.162, 0.32],
      [0.172, 0.43],
      [0.168, 0.5],
      [0.13, 0.555],
      [0.06, 0.585],
    ].map(([r, y]) => new Vector2(r, y)),
    24,
  )
    .scale(1.12, 1, 0.72)
    .rotateX(-0.06)
    .translate(0, 0.58, 0.05);
  add(paint(torso, '#ffffff'), 'spine', 'shirt');
  add(ring(v(0, 1.158, 0.035), v(0, 1, 0), 0.056, 0.01, '#c9d3c4'), 'spine', 'shirt');
  add(paint(new LatheGeometry([new Vector2(0.056, 0), new Vector2(0.052, 0.06), new Vector2(0.055, 0.11)], 14).translate(0, 1.13, 0.0), SKIN), 'neck');

  for (const s of SIDES) {
    add(ellipsoid(v(s * 0.172, 1.09, 0.035), [0.06, 0.05, 0.055], '#ffffff', [12, 8]), 'spine', 'shirt');
    const shoulder = v(s * 0.185, 1.1, 0.03);
    const elbow = v(s * 0.2, 0.84, -0.08);
    const wrist = v(s * 0.17, 0.8, -0.335);
    add(taperTube([shoulder, v(s * 0.2, 0.97, -0.02), elbow], (t) => 0.05 - 0.007 * t, solid('#ffffff'), { radial: 9, segments: 5 }), `shoulder${s}`, 'shirt');
    add(taperTube([elbow, elbow.clone().lerp(wrist, 0.5).add(v(0, 0.01, 0)), wrist], (t) => 0.043 - 0.008 * t, solid('#ffffff'), { radial: 9, segments: 5 }), `elbow${s}`, 'shirt');
    add(ring(wrist, wrist.clone().sub(elbow), 0.035, 0.007, '#c9d3c4'), `elbow${s}`, 'shirt', false);

    // Hand: palm, then two segments per finger, each on its own bone.
    add(ellipsoid(v(s * 0.165, 0.792, -0.385), [0.04, 0.0135, 0.047], SKIN), `wrist${s}`);
    add(capsule(wrist.clone().add(v(0, -0.004, -0.01)), v(s * 0.165, 0.793, -0.37), 0.02, SKIN), `wrist${s}`);
    for (const f of fingers(s)) {
      add(capsule(f.base, f.mid, f.radius, SKIN), `${f.name}${s}a`, 'toon', false);
      add(capsule(f.mid, f.tip, f.radius * 0.9, '#d19a77'), `${f.name}${s}b`, 'toon', false);
    }

    // Jeans: thigh, knee, shin, with an outer seam and folds over the knee.
    add(taperTube([v(s * 0.092, 0.535, 0.09), v(s * 0.097, 0.535, -0.12), v(s * 0.1, 0.53, -0.33)], (t) => 0.078 - 0.016 * t, solid(JEANS), { radial: 12, segments: 8 }), 'hips');
    add(ellipsoid(v(s * 0.1, 0.522, -0.355), [0.058, 0.058, 0.058], JEANS), 'hips');
    add(taperTube([v(s * 0.1, 0.52, -0.37), v(s * 0.1, 0.32, -0.385), v(s * 0.1, 0.11, -0.4)], (t) => 0.053 - 0.01 * t, solid(JEANS), { radial: 12, segments: 8 }), 'hips');
    add(taperTube([v(s * 0.168, 0.545, 0.05), v(s * 0.172, 0.545, -0.12), v(s * 0.158, 0.535, -0.32)], () => 0.0025, solid('#56607d'), { radial: 4, segments: 8 }), 'hips', 'toon', false);
    for (const k of [0, 1]) {
      const y = 0.578 - k * 0.012;
      const z = -0.33 - k * 0.025;
      add(taperTube([v(s * 0.1 - 0.045, y - 0.012, z), v(s * 0.1, y, z - 0.008), v(s * 0.1 + 0.045, y - 0.012, z)], () => 0.004, solid('#1f2536'), { radial: 4, segments: 6 }), 'hips', 'toon', false);
    }

    // White sneakers: upper, toe cap, sole with a stripe, laces and collar.
    add(ellipsoid(v(s * 0.1, 0.062, -0.445), [0.052, 0.048, 0.125], '#f2eee8'), 'root');
    add(ellipsoid(v(s * 0.1, 0.046, -0.53), [0.05, 0.034, 0.062], '#e7e2da'), 'root');
    add(paint(new BoxGeometry(0.108, 0.024, 0.27).translate(s * 0.1, 0.012, -0.45), '#dcd5c9'), 'root');
    add(paint(new BoxGeometry(0.11, 0.006, 0.272).translate(s * 0.1, 0.026, -0.45), '#9b9488'), 'root', 'toon', false);
    for (let k = 0; k < 4; k++) {
      add(paint(new BoxGeometry(0.05, 0.005, 0.006).translate(s * 0.1, 0.104 - k * 0.006, -0.405 - k * 0.024), '#ffffff'), 'root', 'toon', false);
    }
    add(ring(v(s * 0.1, 0.098, -0.395), v(0, 1, 0), 0.044, 0.009, '#e8e2d8'), 'root');
  }
  add(ellipsoid(v(0, 0.54, 0.06), [0.165, 0.085, 0.15], JEANS), 'hips');
  return parts;
}

/** Light tops of the jeans a little, as faded denim does. */
function fadeDenim(parts: Part[]): void {
  const top = new Color('#3d4763');
  const c = new Color();
  for (const part of parts) {
    if (part.bone !== 'hips' || !part.outline) continue;
    const colors = part.geo.getAttribute('color');
    const normal = part.geo.getAttribute('normal');
    for (let i = 0; i < colors.count; i++) {
      c.fromBufferAttribute(colors, i).lerp(top, Math.max(0, normal.getY(i)) * 0.25);
      colors.setXYZ(i, c.r, c.g, c.b);
    }
  }
}

function merge(parts: Part[], boneIndex: Map<string, number>): BufferGeometry {
  const geometries = parts.map(({ geo, bone }) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (!g.getAttribute('uv')) g.setAttribute('uv', new BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    const count = g.getAttribute('position').count;
    const index = new Uint16Array(count * 4);
    const weight = new Float32Array(count * 4);
    const b = boneIndex.get(bone);
    if (b === undefined) throw new Error(`No bone ${bone}`);
    for (let i = 0; i < count; i++) {
      index[i * 4] = b;
      weight[i * 4] = 1;
    }
    g.setAttribute('skinIndex', new BufferAttribute(index, 4));
    g.setAttribute('skinWeight', new BufferAttribute(weight, 4));
    return g;
  });
  const merged = mergeGeometries(geometries);
  if (!merged) throw new Error('Could not merge the character');
  return merged;
}

/** Same silhouette with welded, smooth normals, so the pushed-out hull has no gaps. */
function outlineGeometry(geometry: BufferGeometry): BufferGeometry {
  const g = geometry.clone();
  for (const name of ['normal', 'uv', 'color']) g.deleteAttribute(name);
  const welded = mergeVertices(g, 1e-4);
  welded.computeVertexNormals();
  g.dispose();
  return welded;
}

/** The toon ramp both character variants share: four flat steps of light. */
export function gradientMap(): DataTexture {
  const texture = new DataTexture(new Uint8Array([72, 132, 196, 255]), 4, 1, RedFormat);
  texture.minFilter = texture.magFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Sage waffle knit: a grid of soft cells, also used as a slight bump. */
function waffleTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#7f9a79';
  ctx.fillRect(0, 0, 32, 32);
  for (let y = 0; y < 32; y += 8) {
    for (let x = 0; x < 32; x += 8) {
      ctx.fillStyle = '#9db697';
      ctx.fillRect(x + 1.5, y + 1.5, 5, 5);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(10, 14);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A warm rim of light on the edges facing away from the camera's view; `extend` can patch the shader further. */
export function withRim(material: MeshToonMaterial, extend?: (shader: WebGLProgramParametersWithUniforms) => void): MeshToonMaterial {
  material.onBeforeCompile = (shader) => {
    extend?.(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `{
        float rim = pow(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 3.0);
        outgoingLight += vec3(1.0, 0.7, 0.42) * rim * 0.32;
      }
      #include <opaque_fragment>`,
    );
  };
  return material;
}

/** An inked line, drawn inside out on a smooth hull, whose width grows with distance so it reads the same near and far. */
export function inkOutline(): MeshBasicMaterial {
  const outline = new MeshBasicMaterial({ color: '#2a1d22', side: BackSide });
  outline.onBeforeCompile = (shader) => {
    shader.uniforms['uThickness'] = { value: 0.0016 };
    shader.vertexShader = `uniform float uThickness;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      transformed += normal * length((modelViewMatrix * vec4(position, 1.0)).xyz) * uThickness;`,
    );
  };
  return outline;
}

export interface BuiltCharacter {
  group: Group;
  bones: Map<string, Bone>;
  outline: MeshBasicMaterial;
  /** The figure itself. */
  triangles: number;
  /** The inked outline hull, drawn on top of that. */
  outlineTriangles: number;
  drawCalls: number;
  dispose(): void;
}

export function buildCharacter(): BuiltCharacter {
  const bones = new Map<string, Bone>();
  const add = (name: string, parent: string | null, at: Vector3) => {
    const bone = new Bone();
    bone.name = name;
    const parentBone = parent ? bones.get(parent)! : undefined;
    bone.position.copy(parentBone ? at.clone().sub(parentBone.getWorldPosition(new Vector3())) : at);
    parentBone?.add(bone);
    bone.updateMatrixWorld(true);
    bones.set(name, bone);
  };
  for (const [name, parent, at] of BONES) add(name, parent, v(...at));
  for (const s of SIDES) {
    for (const f of fingers(s)) {
      add(`${f.name}${s}a`, `wrist${s}`, f.base);
      add(`${f.name}${s}b`, `${f.name}${s}a`, f.mid);
    }
  }
  const list = [...bones.values()];
  const boneIndex = new Map(list.map((bone, i) => [bone.name, i]));
  const skeleton = new Skeleton(list);

  const head = headParts();
  const glasses = glassesParts();
  const body = bodyParts();
  fadeDenim(body);
  const all = [...head, ...glasses.frame, ...body];

  const gradient = gradientMap();
  const waffle = waffleTexture();
  const toon = withRim(new MeshToonMaterial({ vertexColors: true, gradientMap: gradient }));
  const shirt = withRim(new MeshToonMaterial({ vertexColors: true, gradientMap: gradient, map: waffle, bumpMap: waffle, bumpScale: 0.8 }));
  const lens = new MeshStandardMaterial({ color: '#e6efff', transparent: true, depthWrite: false, side: DoubleSide, roughness: 0.15 });
  // Glass: nearly clear face on, a soft sheen towards the edges.
  lens.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
      gl_FragColor.a = 0.05 + 0.5 * pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.5);`,
    );
  };
  const outline = inkOutline();

  const group = new Group();
  group.add(bones.get('root')!);
  const geometries: BufferGeometry[] = [];
  const meshes = (
    [
      [all.filter((p) => p.kind === 'toon'), toon],
      [all.filter((p) => p.kind === 'shirt'), shirt],
      [glasses.lens, lens],
    ] as [Part[], Material][]
  ).map(([parts, material]) => {
    const geometry = merge(parts, boneIndex);
    geometries.push(geometry);
    return new SkinnedMesh(geometry, material);
  });
  const outlined = merge(
    all.filter((p) => p.outline),
    boneIndex,
  );
  const hullGeometry = outlineGeometry(outlined);
  outlined.dispose();
  geometries.push(hullGeometry);
  meshes.push(new SkinnedMesh(hullGeometry, outline));

  for (const mesh of meshes) {
    mesh.bind(skeleton, new Matrix4());
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.material !== lens && mesh.material !== outline;
    mesh.receiveShadow = mesh.castShadow;
    group.add(mesh);
  }
  for (const part of [...all, ...glasses.lens]) part.geo.dispose();

  const count = (g: BufferGeometry) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  const triangles = geometries.slice(0, -1).reduce((sum, g) => sum + count(g), 0);
  return {
    group,
    bones,
    outline,
    triangles: Math.round(triangles),
    outlineTriangles: Math.round(count(hullGeometry)),
    drawCalls: meshes.length,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of [toon, shirt, lens, outline]) m.dispose();
      gradient.dispose();
      waffle.dispose();
      skeleton.dispose();
    },
  };
}
