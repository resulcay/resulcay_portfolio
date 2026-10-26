export type Bus = 'music' | 'effects' | 'ambience';

export interface Volumes {
  music: number;
  effects: number;
  ambience: number;
  muted: boolean;
}

export const DEFAULT_VOLUMES: Volumes = { music: 0.5, effects: 0.7, ambience: 0.4, muted: false };

const KEY = 'story-volumes';

const level = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/** Saved volumes, or the defaults; storage that's blocked or holds junk never breaks the story. */
export function readVolumes(storage: Storage | undefined): Volumes {
  try {
    const saved = JSON.parse(storage?.getItem(KEY) ?? '{}') as Partial<Record<keyof Volumes, unknown>>;
    return {
      music: level(saved.music, DEFAULT_VOLUMES.music),
      effects: level(saved.effects, DEFAULT_VOLUMES.effects),
      ambience: level(saved.ambience, DEFAULT_VOLUMES.ambience),
      muted: saved.muted === true,
    };
  } catch {
    return { ...DEFAULT_VOLUMES };
  }
}

export function saveVolumes(storage: Storage | undefined, volumes: Volumes): void {
  try {
    storage?.setItem(KEY, JSON.stringify(volumes));
  } catch {
    // Not remembered this time.
  }
}
