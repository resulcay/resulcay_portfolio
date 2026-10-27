import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Euler, Quaternion, Vector3, type Bone, type Object3D } from 'three';
import { loadResul, solveElbow, type ResulModel } from './character/resul';
// Imported as an asset so its URL carries a content hash: a new model is never served from a stale cache.
import MODEL_URL from './character/resul.glb?url';
import { DESK_TOP, LAPTOP_Z, SEAT_TOP } from './Furniture';
import type { Vec3 } from './kit';

const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'] as const;
const SIDES = [
  { side: 'Left', x: 1 },
  { side: 'Right', x: -1 },
] as const;
/** His hip joints sit this far above the seat: half a thigh. */
const HIP_LIFT = 0.055;
const HAND_ROLL = 0.2;
/** How far forward of the chair's centre he sits. */
const SIT_FORWARD = 0.04;
/**
 * Where his wrists rest, in the chair's frame (he faces -z): at the laptop's
 * front edge, palms clear of the deck. His long hands reach the keys from there.
 */
const WRIST: Vec3 = [0.14, DESK_TOP + 0.07, LAPTOP_Z + 0.13];

/**
 * Where a wrist goes while typing, in the chair's frame: `x` is +1 for his
 * left hand (the chair's -x). The hands take turns bobbing, with a slight sway.
 */
export function typingWrist(x: number, time: number, glance: number): Vec3 {
  const phase = x > 0 ? 0 : Math.PI;
  const bob = Math.max(0, Math.sin(time * 7 + phase)) * 0.012 * (1 - glance);
  const sway = Math.sin(time * 1.3 + phase) * 0.008;
  return [-x * WRIST[0] + sway, WRIST[1] + bob, WRIST[2]];
}

export interface CharacterStats {
  triangles: number;
  outlineTriangles: number;
  drawCalls: number;
}

interface CharacterProps {
  still?: boolean;
  position?: Vec3;
  rotationY?: number;
  /** Warms the ink outline while he's looked at. */
  highlighted?: boolean;
  onStats?: (stats: CharacterStats) => void;
}

/** Resul at the desk: seated on the chair at the origin of this frame, facing -z, typing on the laptop. */
export function Character(props: CharacterProps) {
  const [model, setModel] = useState<ResulModel>();
  useEffect(() => {
    let live = true;
    let loaded: ResulModel | undefined;
    loadResul(MODEL_URL).then(
      (m) => {
        loaded = m;
        if (live) setModel(m);
        else m.dispose();
      },
      (error: unknown) => console.warn('The character failed to load', error),
    );
    return () => {
      live = false;
      loaded?.dispose();
    };
  }, []);
  return model ? <Seated model={model} {...props} /> : null;
}

const bell = (x: number) => (x > 0 && x < 1 ? Math.sin(Math.PI * x) : 0);
const rot = (x: number, y = 0, z = 0) => new Quaternion().setFromEuler(new Euler(x, y, z, 'YXZ'));

/** Rest-pose facts the rig needs, read once, in his own (the group's) space. */
export function restOf(model: ResulModel) {
  const { group } = model;
  group.updateMatrixWorld(true);
  const inverseGroup = group.getWorldQuaternion(new Quaternion()).invert();
  const local = new Map<Bone, Quaternion>();
  const world = new Map<Bone, Quaternion>();
  const at = new Map<string, Vector3>();
  for (const [name, bone] of model.bones) {
    local.set(bone, bone.quaternion.clone());
    world.set(bone, bone.getWorldQuaternion(new Quaternion()).premultiply(inverseGroup));
    at.set(name, group.worldToLocal(bone.getWorldPosition(new Vector3())));
  }
  // Each aimed bone points from its joint to the next one down the chain.
  const next: Record<string, string> = { UpLeg: 'Leg', Leg: 'Foot', Arm: 'ForeArm', ForeArm: 'Hand', Hand: 'HandMiddle1' };
  const dir = new Map<Bone, Vector3>();
  for (const { side } of SIDES) {
    for (const [from, to] of Object.entries(next)) dir.set(model.bones.get(side + from)!, at.get(side + to)!.clone().sub(at.get(side + from)!).normalize());
  }
  const length = (from: string, to: string) => at.get(`Left${to}`)!.distanceTo(at.get(`Left${from}`)!);
  return { local, world, dir, at, upper: length('Arm', 'ForeArm'), lower: length('ForeArm', 'Hand'), thigh: length('UpLeg', 'Leg') };
}

/**
 * Poses him seated and typing at `time` (seconds), glancing at the window by
 * `glance` (0 to 1). His group must sit in the chair's frame (facing -z).
 */
export function poseSeated(model: ResulModel, rest: ReturnType<typeof restOf>, time: number, glance: number) {
  const { group, bones } = model;
  // Seat him: turned to face the desk (-z), hip joints just above the seat.
  const hipY = SEAT_TOP + HIP_LIFT;
  // Thighs slope down just enough for his feet to rest flat on the floor.
  const thighDrop = Math.asin(Math.min(1, Math.max(0, (hipY - rest.at.get('LeftLeg')!.y) / rest.thigh)));
  group.rotation.y = Math.PI;
  group.position.set(0, hipY - rest.at.get('LeftUpLeg')!.y, -SIT_FORWARD);
  const inverseGroup = group.getWorldQuaternion(new Quaternion()).invert();
  const modelQ = (o: Object3D) => o.getWorldQuaternion(new Quaternion()).premultiply(inverseGroup);
  const setModel = (bone: Bone, q: Quaternion) => bone.quaternion.copy(modelQ(bone.parent!).invert().multiply(q));
  /** Keeps the rest pose relative to the parent, turned by `extra` in his space. */
  const follow = (bone: Bone, extra?: Quaternion) => {
    bone.quaternion.copy(rest.local.get(bone)!);
    if (extra) setModel(bone, extra.clone().multiply(modelQ(bone)));
  };
  const aim = (bone: Bone, dir: Vector3) => setModel(bone, new Quaternion().setFromUnitVectors(rest.dir.get(bone)!, dir.clone().normalize()).multiply(rest.world.get(bone)!));
  const bone = (name: string) => bones.get(name)!;
  const inModel = (p: Vec3) => group.worldToLocal(group.parent!.localToWorld(new Vector3(...p)));
  const breath = Math.sin(time * 1.6);

  follow(bone('Hips'));
  follow(bone('Spine'), rot(0.1));
  follow(bone('Spine1'), rot(0.05 + breath * 0.01));
  follow(bone('Spine2'), rot(breath * 0.012));
  // Looking down at the screen; now and then up and to his right, at the window.
  const pitch = 0.22 - glance * 0.32;
  const yaw = -glance * 0.3 + Math.sin(time * 0.4) * 0.03;
  follow(bone('Neck'), rot(pitch * 0.4, yaw * 0.4));
  follow(bone('Head'), rot(pitch * 0.6, yaw * 0.6, Math.sin(time * 0.6) * 0.03));

  for (const { side, x } of SIDES) {
    aim(bone(`${side}UpLeg`), new Vector3(x * 0.08, -Math.sin(thighDrop), Math.cos(thighDrop)));
    aim(bone(`${side}Leg`), new Vector3(0, -1, 0.06));
    setModel(bone(`${side}Foot`), rest.world.get(bone(`${side}Foot`))!.clone());
    follow(bone(`${side}ToeBase`));

    const phase = x > 0 ? 0 : Math.PI;
    const wrist = inModel(typingWrist(x, time, glance));
    follow(bone(`${side}Shoulder`));
    const shoulder = group.worldToLocal(bone(`${side}Arm`).getWorldPosition(new Vector3()));
    // Elbows out to the sides more than down, so the forearms come over the desk's edge.
    const elbow = solveElbow(shoulder, wrist, rest.upper, rest.lower, new Vector3(x, -0.5, -0.3));
    aim(bone(`${side}Arm`), elbow.clone().sub(shoulder));
    aim(bone(`${side}ForeArm`), wrist.clone().sub(elbow));
    aim(bone(`${side}Hand`), new Vector3(-x * 0.03, 0.05, 1));
    // Roll the hand level: the aim leaves the pinky side lower.
    setModel(bone(`${side}Hand`), rot(0, 0, x * HAND_ROLL).multiply(modelQ(bone(`${side}Hand`))));

    FINGERS.forEach((finger, i) => {
      const press = finger === 'Thumb' ? 0 : Math.max(0, Math.sin(time * (11 + i * 1.7) + i * 2.3 + phase)) * (1 - glance);
      // Gently curled; a key press bends the knuckle a little more.
      for (let k = 1; k <= 3; k++) {
        const joint = bone(`${side}Hand${finger}${k}`);
        follow(joint, finger === 'Thumb' ? rot(-0.25) : rot(k === 1 ? 0.04 + press * 0.1 : 0.04));
      }
    });
  }
}

function Seated({ model, still = false, position, rotationY = 0, highlighted = false, onStats }: CharacterProps & { model: ResulModel }) {
  const rest = useMemo(() => restOf(model), [model]);
  useEffect(() => {
    onStats?.({ triangles: model.triangles, outlineTriangles: model.outlineTriangles, drawCalls: model.drawCalls });
  }, [model, onStats]);
  useEffect(() => {
    model.outline.color.set(highlighted ? '#e8a657' : '#2a1d22');
  }, [model, highlighted]);

  useFrame(({ clock: { elapsedTime: t } }) => {
    poseSeated(model, rest, still ? 0 : t, still ? 0 : bell(((t % 11) - 8) / 2.4));
  });

  return (
    <group position={position ?? [0, 0, 0]} rotation-y={rotationY}>
      <primitive object={model.group} />
    </group>
  );
}
