import { Bone, BufferAttribute, Group, Matrix4, MeshToonMaterial, Skeleton, SkinnedMesh, Vector3, type BufferGeometry, type Mesh, type WebGLProgramParametersWithUniforms } from 'three';
import { gradientMap, inkOutline, withRim } from './build';

// Resul from Modly: one standing scan (cleaned offline in character-gen),
// painted with vertex colours, facing +z with his feet on the origin.
// A light rig bends him at the spine, neck and head, and swings his right arm.

/** Bones in index order: name, parent, bind position. */
const BONES: [string, number, [number, number, number]][] = [
  ['root', -1, [0, 0, 0]],
  ['hips', 0, [0, 0.95, 0]],
  ['spine', 1, [0, 1.1, 0]],
  ['chest', 2, [0, 1.3, 0]],
  ['neck', 3, [0, 1.47, 0]],
  ['head', 4, [0, 1.56, 0]],
  ['armR', 3, [-0.19, 1.42, -0.02]],
];
const SPINE_BONES = [1, 2, 3, 4, 5];
const HEAD = 5;
const ARM = 6;

/**
 * Skin weights for one vertex: up to two bones blended by height along the
 * spine, with his hanging right arm (x below -0.2, under the shoulder) on its own bone.
 */
export function modlyWeights(x: number, y: number): { index: [number, number, number, number]; weight: [number, number, number, number] } {
  const heights = SPINE_BONES.map((i) => BONES[i]![2][1]);
  let a = SPINE_BONES.at(-1)!;
  let b = a;
  let t = 0;
  if (y <= heights[0]!) a = b = SPINE_BONES[0]!;
  else {
    for (let i = 0; i < heights.length - 1; i++) {
      if (y <= heights[i + 1]!) {
        a = SPINE_BONES[i]!;
        b = SPINE_BONES[i + 1]!;
        t = (y - heights[i]!) / (heights[i + 1]! - heights[i]!);
        break;
      }
    }
  }
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  // A soft seam at the armpit and the top of the shoulder, so the sleeve doesn't tear.
  const arm = y > 0.68 ? clamp((-x - 0.195) / 0.02) * clamp((1.44 - y) / 0.06) : 0;
  const rest = 1 - arm;
  if (a === b) return { index: [a, ARM, 0, 0], weight: [rest, arm, 0, 0] };
  return { index: [a, b, ARM, 0], weight: [rest * (1 - t), rest * t, arm, 0] };
}

/** The glTF's quantized attributes, baked to plain floats in the node's space. */
function bake(mesh: Mesh): BufferGeometry {
  const geometry = mesh.geometry.clone();
  for (const name of Object.keys(geometry.attributes)) {
    const source = geometry.getAttribute(name);
    const array = new Float32Array(source.count * source.itemSize);
    for (let i = 0; i < source.count; i++) for (let c = 0; c < source.itemSize; c++) array[i * source.itemSize + c] = source.getComponent(i, c);
    geometry.setAttribute(name, new BufferAttribute(array, source.itemSize));
  }
  mesh.updateWorldMatrix(true, false);
  geometry.applyMatrix4(mesh.matrixWorld);
  return geometry;
}

function skin(geometry: BufferGeometry, onHead: boolean) {
  const position = geometry.getAttribute('position');
  const index = new Uint16Array(position.count * 4);
  const weight = new Float32Array(position.count * 4);
  for (let i = 0; i < position.count; i++) {
    const w = onHead ? { index: [HEAD, 0, 0, 0], weight: [1, 0, 0, 0] } : modlyWeights(position.getX(i), position.getY(i));
    index.set(w.index, i * 4);
    weight.set(w.weight, i * 4);
  }
  geometry.setAttribute('skinIndex', new BufferAttribute(index, 4));
  geometry.setAttribute('skinWeight', new BufferAttribute(weight, 4));
}

/**
 * Sage knit, drawn in the shader: a waffle of soft cells wrapped round his
 * body (in bind pose space, so it moves with him) on the sage vertices only,
 * fading out where the cells get smaller than a pixel.
 */
function knit(shader: WebGLProgramParametersWithUniforms) {
  shader.vertexShader = `varying vec3 vKnit;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvKnit = position;');
  shader.fragmentShader = `varying vec3 vKnit;\n${shader.fragmentShader}`.replace(
    '#include <color_fragment>',
    `#include <color_fragment>
    {
      float sage = 1.0 - smoothstep(0.03, 0.08, distance(vColor.rgb, vec3(0.27, 0.39, 0.25)));
      vec2 knitUv = vec2(atan(vKnit.x, vKnit.z) * 0.16, vKnit.y) / 0.009;
      vec2 cell = abs(fract(knitUv) - 0.5);
      float raised = 1.0 - smoothstep(0.28, 0.38, max(cell.x, cell.y));
      float fine = 1.0 - smoothstep(0.3, 0.6, length(fwidth(knitUv)));
      diffuseColor.rgb *= mix(1.0, mix(0.9, 1.04, raised), sage * fine);
    }`,
  );
}

export interface ModlyCharacter {
  group: Group;
  bones: Bone[];
  outline: ReturnType<typeof inkOutline>;
  triangles: number;
  outlineTriangles: number;
  drawCalls: number;
  dispose(): void;
}

export async function loadModly(url: string): Promise<ModlyCharacter> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(url);
  const node = (name: string) => gltf.scene.getObjectByName(name) as Mesh;
  const body = bake(node('body'));
  const glasses = bake(node('glasses'));
  for (const mesh of [node('body'), node('glasses')]) {
    mesh.geometry.dispose();
    (mesh.material as MeshToonMaterial).dispose();
  }
  skin(body, false);
  skin(glasses, true);

  const bones = BONES.map(([name]) => Object.assign(new Bone(), { name }));
  BONES.forEach(([, parent, at], i) => {
    const parentAt = parent < 0 ? [0, 0, 0] : BONES[parent]![2];
    bones[i]!.position.copy(new Vector3(...at).sub(new Vector3(...parentAt)));
    if (parent >= 0) bones[parent]!.add(bones[i]!);
  });
  bones[0]!.updateMatrixWorld(true);
  const skeleton = new Skeleton(bones);

  const gradient = gradientMap();
  const toon = withRim(new MeshToonMaterial({ vertexColors: true, gradientMap: gradient }), knit);
  const outline = inkOutline();
  const group = new Group();
  group.add(bones[0]!);
  // The scan already has welded, smooth normals, so the hull shares its geometry.
  const meshes = [new SkinnedMesh(body, toon), new SkinnedMesh(glasses, toon), new SkinnedMesh(body, outline)];
  for (const mesh of meshes) {
    mesh.bind(skeleton, new Matrix4());
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.receiveShadow = mesh.material !== outline;
    group.add(mesh);
  }

  const count = (g: BufferGeometry) => g.index!.count / 3;
  return {
    group,
    bones,
    outline,
    triangles: count(body) + count(glasses),
    outlineTriangles: count(body),
    drawCalls: meshes.length,
    dispose() {
      body.dispose();
      glasses.dispose();
      toon.dispose();
      outline.dispose();
      gradient.dispose();
      skeleton.dispose();
    },
  };
}
