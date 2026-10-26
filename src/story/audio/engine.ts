import type { Phase } from '../scene/time';
import { browserStorage } from '../visitor';
import { Ambience } from './ambience';
import { EFFECTS, type EffectName } from './effects';
import { MusicPlayer, type Track } from './music';
import { readVolumes, saveVolumes, type Bus, type Volumes } from './volumes';

export interface AudioState extends Volumes {
  playing: boolean;
  index: number;
  tracks: Track[];
}

const TICK_GAP_MS = 120;

/**
 * Story mode's sound: music, effects and ambience buses into a master gain.
 * It never creates an AudioContext itself; the title screen makes one in the
 * Start click and hands it over with attach(). Until then every call is a
 * quiet no-op, so nothing can play before a gesture.
 */
export class AudioEngine {
  #storage: Storage | undefined;
  #state: AudioState;
  #listeners = new Set<() => void>();
  #ctx: AudioContext | undefined;
  #master: GainNode | undefined;
  #buses: Partial<Record<Bus, GainNode>> = {};
  #duck: GainNode | undefined;
  #music: MusicPlayer | undefined;
  #ambience: Ambience | undefined;
  #phase: Phase | undefined;
  #lastTick = 0;
  /** Music was asked for before there was a context; start it on attach. */
  #wantMusic = false;

  constructor(storage: Storage | undefined) {
    this.#storage = storage;
    this.#state = { ...readVolumes(storage), playing: false, index: 0, tracks: [] };
  }

  /** For React's useSyncExternalStore. */
  readonly subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  };

  readonly snapshot = () => this.#state;

  #update(patch: Partial<AudioState>): void {
    this.#state = { ...this.#state, ...patch };
    for (const listener of this.#listeners) listener();
  }

  attach(ctx: AudioContext): void {
    if (this.#ctx) return;
    this.#ctx = ctx;
    this.#master = ctx.createGain();
    this.#master.connect(ctx.destination);
    this.#duck = ctx.createGain();
    this.#duck.connect(this.#master);
    for (const bus of ['music', 'effects', 'ambience'] as const) {
      const gain = ctx.createGain();
      gain.connect(bus === 'music' ? this.#duck : this.#master);
      this.#buses[bus] = gain;
    }
    this.#apply();
    this.#music = new MusicPlayer(ctx, this.#buses.music!, () =>
      this.#update({ playing: this.#music?.playing ?? false, index: this.#music?.index ?? 0 }),
    );
    this.#music.setTracks(this.#state.tracks);
    this.#ambience = new Ambience(ctx, this.#buses.ambience!);
    if (this.#phase) this.#ambience.setPhase(this.#phase);
    if (this.#wantMusic) this.startMusic();
  }

  /** Stops everything and closes the context; a later attach() starts fresh. */
  detach(): void {
    this.#music?.dispose();
    this.#ambience?.dispose();
    void this.#ctx?.close();
    this.#ctx = this.#master = this.#duck = this.#music = this.#ambience = undefined;
    this.#buses = {};
    this.#wantMusic = false;
    this.#update({ playing: false });
  }

  #apply(): void {
    const t = this.#ctx?.currentTime ?? 0;
    this.#master?.gain.setTargetAtTime(this.#state.muted ? 0 : 1, t, 0.05);
    for (const bus of ['music', 'effects', 'ambience'] as const) this.#buses[bus]?.gain.setTargetAtTime(this.#state[bus], t, 0.05);
  }

  #save(): void {
    const { music, effects, ambience, muted } = this.#state;
    saveVolumes(this.#storage, { music, effects, ambience, muted });
  }

  setVolume(bus: Bus, value: number): void {
    this.#update({ [bus]: Math.min(1, Math.max(0, value)) });
    this.#save();
    this.#apply();
  }

  setMuted(muted: boolean): void {
    this.#update({ muted });
    this.#save();
    this.#apply();
  }

  /** Lowers the music under an open panel. */
  duck(on: boolean): void {
    this.#duck?.gain.setTargetAtTime(on ? 0.3 : 1, this.#ctx?.currentTime ?? 0, 0.25);
  }

  setHidden(hidden: boolean): void {
    if (!this.#ctx) return;
    this.#music?.setHidden(hidden);
    void (hidden ? this.#ctx.suspend() : this.#ctx.resume());
  }

  effect(name: EffectName): void {
    if (!this.#ctx || !this.#buses.effects || this.#state.muted) return;
    if (name === 'tick') {
      const now = performance.now();
      if (now - this.#lastTick < TICK_GAP_MS) return;
      this.#lastTick = now;
    }
    EFFECTS[name](this.#ctx, this.#buses.effects);
  }

  setTracks(tracks: Track[]): void {
    this.#update({ tracks });
    this.#music?.setTracks(tracks);
  }

  /** Starts the playlist quietly, once; does nothing without tracks or a context. */
  startMusic(): void {
    this.#wantMusic = !this.#music;
    if (!this.#music || this.#state.playing || this.#state.tracks.length === 0) return;
    this.#music.play(0, 3);
  }

  toggle(): void {
    this.#music?.toggle();
  }

  next(): void {
    this.#music?.next();
  }

  prev(): void {
    this.#music?.prev();
  }

  select(index: number): void {
    this.#music?.play(index);
  }

  setPhase(phase: Phase): void {
    this.#phase = phase;
    this.#ambience?.setPhase(phase);
  }
}

export const engine = new AudioEngine(browserStorage('localStorage'));
