import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Gate } from '@/scripts/ready';
import {
  BufferAttribute,
  Color,
  InstancedMesh,
  Euler,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Quaternion,
  SkinnedMesh,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Atlas, grainTexture } from './atlas';
import { hull, inkOutline } from './character/resul';
import type { Phase } from './time';

export type Vec3 = [number, number, number];

/** Builds a GPU object once and disposes it when the component unmounts. */
export function useDisposable<T extends { dispose(): void }>(make: () => T): T {
  const value = useMemo(make, []);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

export interface Part {
  geo: BufferGeometry;
  color: string;
  at?: Vec3;
  rot?: Vec3;
  scale?: Vec3;
}

/**
 * Bakes many coloured primitives into one geometry (one draw call). With
 * `bake`, colours darken towards the floor for a painted, pre-lit look; that
 * needs the parts in world coordinates.
 */
export function mergeParts(parts: Part[], bake = false): BufferGeometry {
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const euler = new Euler();
  const position = new Vector3();
  const scale = new Vector3();
  const color = new Color();
  const geometries = parts.map((part) => {
    const g = part.geo.index ? part.geo.toNonIndexed() : part.geo.clone();
    part.geo.dispose();
    matrix.compose(
      position.set(...(part.at ?? [0, 0, 0])),
      quaternion.setFromEuler(euler.set(...(part.rot ?? [0, 0, 0]))),
      scale.set(...(part.scale ?? [1, 1, 1])),
    );
    g.applyMatrix4(matrix);
    color.set(part.color);
    const positions = g.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const k = bake ? 0.62 + 0.38 * Math.min(1, Math.max(0, positions.getY(i) / 2.6)) : 1;
      colors[i * 3] = color.r * k;
      colors[i * 3 + 1] = color.g * k;
      colors[i * 3 + 2] = color.b * k;
    }
    g.setAttribute('color', new BufferAttribute(colors, 3));
    return g;
  });
  const merged = mergeGeometries(geometries);
  for (const g of geometries) g.dispose();
  if (!merged) throw new Error('Could not merge scene parts');
  return merged;
}

/** Places local offsets around an origin turned by rotY, for furniture set at an angle. */
export function around(origin: Vec3, rotY: number) {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return ([x, y, z]: Vec3): Vec3 => [origin[0] + x * c + z * s, origin[1] + y, origin[2] - x * s + z * c];
}

export function Merged({
  parts,
  material,
  bake = false,
  shadows = true,
}: {
  parts: () => Part[];
  material: Material;
  bake?: boolean;
  shadows?: boolean;
}) {
  const geometry = useDisposable(() => mergeParts(parts(), bake));
  return <mesh geometry={geometry} material={material} castShadow={shadows} receiveShadow />;
}

/**
 * An invisible box the pointer can hit, tagged with a stable id and the point
 * a later camera move will look from (`anchor`, in the same space as `at`).
 * It costs no draw call.
 */
/** The character's ink outline, in its highlight gold, shared by every hotspot's object. */
let outlineMaterial: MeshBasicMaterial | undefined;
const hulls = new WeakMap<BufferGeometry, BufferGeometry>();

/** An outline hull for a mesh: the same surface pushed out and drawn inside out, skinned if the mesh is. */
function outlineFor(mesh: Mesh): Mesh {
  outlineMaterial ??= Object.assign(inkOutline(), { name: 'hotspot-outline' });
  const material = outlineMaterial;
  material.color.set('#e8a657');
  let geometry = hulls.get(mesh.geometry);
  if (!geometry) hulls.set(mesh.geometry, (geometry = hull(mesh.geometry)));
  if (mesh instanceof SkinnedMesh) {
    const skinned = new SkinnedMesh(geometry, material);
    skinned.bind(mesh.skeleton, mesh.bindMatrix);
    skinned.frustumCulled = false;
    return skinned;
  }
  return new Mesh(geometry, material);
}

export function Hotspot({
  id,
  at,
  size,
  anchor,
  rotY = 0,
  highlight = true,
}: {
  id: string;
  at: Vec3;
  size: Vec3;
  anchor: Vec3;
  rotY?: number;
  /** Outline the hotspot's sibling meshes, like the character, while it's looked at. */
  highlight?: boolean;
}) {
  const { hovered, hover, select } = useInteraction();
  const ref = useRef<Mesh>(null);
  const active = hovered === id;

  useEffect(() => {
    const parent = ref.current?.parent;
    if (!active || !highlight || !parent) return;
    const outlined: Mesh[] = [];
    parent.traverse((o) => {
      // Not the hotspot's own invisible box, instanced bulbs or another outline.
      if (!(o instanceof Mesh) || o === ref.current || o instanceof InstancedMesh || o.material === outlineMaterial || !o.visible) return;
      outlined.push(o);
    });
    const outlines = outlined.map((mesh) => {
      const outline = outlineFor(mesh);
      mesh.add(outline);
      return outline;
    });
    return () => outlines.forEach((outline) => outline.removeFromParent());
  }, [active, highlight]);

  const pointerType = (event: ThreeEvent<MouseEvent>) => (event.nativeEvent as PointerEvent).pointerType;
  return (
    <mesh
      ref={ref}
      name={id}
      position={at}
      rotation-y={rotY}
      userData={{ id, anchor }}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (pointerType(event) === 'mouse') hover(id);
      }}
      onPointerOut={(event) => {
        if (pointerType(event) === 'mouse' && active) hover(null);
      }}
      onClick={(event) => {
        event.stopPropagation();
        // A drag that orbits the camera isn't a click.
        if (event.delta > 6) return;
        // Touch: the first tap shows the thought, the second opens it.
        if (pointerType(event) === 'mouse' || active) select(id);
        else hover(id);
      }}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

interface Interaction {
  hovered: string | null;
  hover: (id: string | null) => void;
  select: (id: string) => void;
}

export const InteractionContext = createContext<Interaction>({ hovered: null, hover: () => {}, select: () => {} });

/** The loads the room waits for before it's shown, so nothing pops in afterwards. */
export const GateContext = createContext<Gate | null>(null);

export const useInteraction = () => useContext(InteractionContext);

interface Kit {
  atlas: Atlas;
  phase: Phase;
  /** Vertex-coloured, lit: furniture, props and the character. */
  base: MeshLambertMaterial;
  /** Like base, with paper grain: walls and floor. */
  wall: MeshLambertMaterial;
  /** Atlas surfaces that take the room's light: photos, cards, posters. */
  lit: MeshLambertMaterial;
  /** Atlas surfaces that glow: screens and the sky. */
  glow: MeshBasicMaterial;
  lens: MeshBasicMaterial;
}

const KitContext = createContext<Kit | null>(null);

export function useKit(): Kit {
  const kit = useContext(KitContext);
  if (!kit) throw new Error('useKit needs a KitProvider');
  return kit;
}

export function KitProvider({ phase, children }: { phase: Phase; children: ReactNode }) {
  const atlas = useDisposable(() => new Atlas());
  const grain = useDisposable(grainTexture);
  const base = useDisposable(() => new MeshLambertMaterial({ vertexColors: true }));
  const wall = useDisposable(() => new MeshLambertMaterial({ vertexColors: true, map: grain }));
  const lit = useDisposable(() => new MeshLambertMaterial({ map: atlas.texture }));
  const glow = useDisposable(() => new MeshBasicMaterial({ map: atlas.texture, toneMapped: false }));
  const lens = useDisposable(
    () => new MeshBasicMaterial({ color: '#d8e8ff', transparent: true, opacity: 0.18, depthWrite: false }),
  );
  // Warm, glowing twins of the shared materials, swapped in while an object is looked at.
  const kit = useMemo(
    () => ({ atlas, phase, base, wall, lit, glow, lens }),
    [atlas, phase, base, wall, lit, glow, lens],
  );
  return <KitContext.Provider value={kit}>{children}</KitContext.Provider>;
}
