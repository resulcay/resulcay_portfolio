import {
  BackSide,
  CatmullRomCurve3,
  DataTexture,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  SkinnedMesh,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Bone,
  type BufferGeometry,
  type Material,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Resul: a low-poly "mini modular" figure (converted offline from FBX to a
// quantized glTF with one flat colour per part), on a Mixamo-style skeleton.
// He faces +z, stands 1.74 m with his feet on y = 0, and is posed in code.

/** The toon ramp: four flat steps of light. */
function gradientMap(): DataTexture {
  const texture = new DataTexture(new Uint8Array([72, 132, 196, 255]), 4, 1, RedFormat);
  texture.minFilter = texture.magFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

/** A warm rim of light on the edges facing away from the camera's view. */
function withRim(material: MeshToonMaterial): MeshToonMaterial {
  material.onBeforeCompile = (shader) => {
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
function inkOutline(): MeshBasicMaterial {
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

/** The same surface welded, with smooth normals, so the pushed-out hull has no gaps at hard edges. */
function hull(geometry: BufferGeometry): BufferGeometry {
  const g = geometry.clone();
  g.deleteAttribute('normal');
  const welded = mergeVertices(g, 1e-4);
  welded.computeVertexNormals();
  g.dispose();
  return welded;
}

/**
 * Eyes, a smile and thin dark rounded-hexagon glasses (his fringe stands in for brows), in his standing (rest)
 * space. The model's face is blank: its texture didn't come with the FBX.
 */
function face(): { dark: BufferGeometry; light: BufferGeometry } {
  const eyeY = 1.3;
  const faceZ = 0.338;
  const lensZ = faceZ + 0.022;
  const dark: BufferGeometry[] = [];
  const light: BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const cx = s * 0.12;
    dark.push(new SphereGeometry(1, 12, 8).scale(0.03, 0.045, 0.012).translate(cx, eyeY, faceZ));
    light.push(new SphereGeometry(1, 8, 6).scale(0.009, 0.011, 0.004).translate(cx + 0.01, eyeY + 0.016, faceZ + 0.01));
    // Rims: a rounded hexagon around each eye, curving back a touch at the sides.
    const ring = [[-0.5, 0.12], [-0.32, 0.5], [0.32, 0.5], [0.5, 0.12], [0.36, -0.5], [-0.36, -0.5]].map(
      ([u, w]) => new Vector3(cx + u! * 0.15, eyeY + w! * 0.11, lensZ - 0.012 * (u! * 2) ** 2),
    );
    dark.push(new TubeGeometry(new CatmullRomCurve3(ring, true, 'centripetal'), 48, 0.0045, 5, true));
    const temple = new CatmullRomCurve3([
      new Vector3(s * 0.195, eyeY + 0.02, lensZ - 0.012),
      new Vector3(s * 0.33, eyeY + 0.025, 0.24),
      new Vector3(s * 0.365, eyeY + 0.005, 0.05),
    ]);
    dark.push(new TubeGeometry(temple, 16, 0.004, 4, false));
  }
  dark.push(
    new TubeGeometry(new CatmullRomCurve3([new Vector3(-0.045, eyeY + 0.03, lensZ), new Vector3(0, eyeY + 0.045, lensZ + 0.006), new Vector3(0.045, eyeY + 0.03, lensZ)]), 8, 0.004, 4, false),
    // A small smile.
    new TubeGeometry(new CatmullRomCurve3([new Vector3(-0.035, 1.175, 0.345), new Vector3(0, 1.162, 0.352), new Vector3(0.035, 1.175, 0.345)]), 8, 0.004, 4, false),
  );
  const strip = (parts: BufferGeometry[]) => {
    const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
    for (const p of parts) p.dispose();
    if (!merged) throw new Error('Could not merge the face');
    return merged;
  };
  return { dark: strip(dark), light: strip(light) };
}

export interface ResulModel {
  /** Holds the glTF scene; its local space is his rest space. */
  group: Group;
  bones: Map<string, Bone>;
  outline: MeshBasicMaterial;
  triangles: number;
  outlineTriangles: number;
  drawCalls: number;
  dispose(): void;
}

export async function loadResul(url: string): Promise<ResulModel> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  return buildResul((await new GLTFLoader().loadAsync(url)).scene);
}

/** Toon materials, ink outlines and his face, on the loaded glTF scene. */
export function buildResul(scene: Group): ResulModel {
  const group = new Group();
  group.add(scene);
  group.updateMatrixWorld(true);

  const gradient = gradientMap();
  const outline = inkOutline();
  const owned: { dispose(): void }[] = [gradient, outline];
  const count = (g: BufferGeometry) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  let triangles = 0;
  let outlineTriangles = 0;
  let drawCalls = 0;

  const skinned: SkinnedMesh[] = [];
  scene.traverse((o) => o instanceof SkinnedMesh && skinned.push(o));
  for (const mesh of skinned) {
    const source = mesh.material as Material & { color: MeshToonMaterial['color'] };
    const toon = withRim(new MeshToonMaterial({ color: source.color, gradientMap: gradient }));
    source.dispose();
    mesh.material = toon;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const ink = new SkinnedMesh(hull(mesh.geometry), outline);
    ink.bind(mesh.skeleton, mesh.bindMatrix);
    ink.frustumCulled = false;
    ink.position.copy(mesh.position);
    ink.quaternion.copy(mesh.quaternion);
    ink.scale.copy(mesh.scale);
    mesh.parent!.add(ink);
    owned.push(toon, mesh.geometry, ink.geometry);
    triangles += count(mesh.geometry);
    outlineTriangles += count(ink.geometry);
    drawCalls += 2;
  }

  const bones = new Map<string, Bone>();
  skinned[0]!.skeleton.bones.forEach((bone) => bones.set(bone.name, bone));
  const head = bones.get('Head')!;
  // Face parts ride on the head bone: bring them from rest space (the group sits at the origin) into its space.
  const toHead = new Matrix4().copy(head.matrixWorld).invert();
  const parts = face();
  const dark = new MeshToonMaterial({ color: '#2a292e', gradientMap: gradient });
  const shine = new MeshBasicMaterial({ color: '#ffffff' });
  for (const [geometry, material] of [
    [parts.dark, dark],
    [parts.light, shine],
  ] as const) {
    geometry.applyMatrix4(toHead);
    const mesh = new Mesh(geometry, material);
    head.add(mesh);
    owned.push(geometry, material);
    triangles += count(geometry);
    drawCalls += 1;
  }

  return {
    group,
    bones,
    outline,
    triangles: Math.round(triangles),
    outlineTriangles: Math.round(outlineTriangles),
    drawCalls,
    dispose() {
      for (const o of owned) o.dispose();
    },
  };
}

/**
 * Two-bone IK: where the elbow goes so a limb of lengths `a` (upper) and `b`
 * (lower) from `root` reaches `target`, bending towards `pole`. Out of reach,
 * the limb points straight at the target.
 */
export function solveElbow(root: Vector3, target: Vector3, a: number, b: number, pole: Vector3): Vector3 {
  const toTarget = target.clone().sub(root);
  const d = Math.min(Math.max(toTarget.length(), Math.abs(a - b) + 1e-4), a + b - 1e-4);
  const u = toTarget.normalize();
  const along = (a * a - b * b + d * d) / (2 * d);
  const out = Math.sqrt(Math.max(0, a * a - along * along));
  const bend = pole.clone().addScaledVector(u, -pole.dot(u)).normalize();
  return root.clone().addScaledVector(u, along).addScaledVector(bend, out);
}

