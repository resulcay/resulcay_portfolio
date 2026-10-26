import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_VOLUMES, readVolumes, saveVolumes } from '@/story/audio/volumes';
import { AudioEngine } from '@/story/audio/engine';
import { unlockAudio } from '@/scripts/audio-unlock';

function memory(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const broken = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
} as unknown as Storage;

describe('volumes', () => {
  it('starts at the defaults and remembers changes', () => {
    const storage = memory();
    expect(readVolumes(storage)).toEqual(DEFAULT_VOLUMES);
    saveVolumes(storage, { music: 0.2, effects: 1, ambience: 0, muted: true });
    expect(readVolumes(storage)).toEqual({ music: 0.2, effects: 1, ambience: 0, muted: true });
  });

  it('clamps and ignores junk', () => {
    const storage = memory();
    storage.setItem('story-volumes', JSON.stringify({ music: 7, effects: 'loud', ambience: -1 }));
    expect(readVolumes(storage)).toEqual({ ...DEFAULT_VOLUMES, music: 1, ambience: 0 });
    storage.setItem('story-volumes', '{nope');
    expect(readVolumes(storage)).toEqual(DEFAULT_VOLUMES);
  });

  it('survives storage that throws', () => {
    expect(readVolumes(broken)).toEqual(DEFAULT_VOLUMES);
    expect(() => saveVolumes(broken, DEFAULT_VOLUMES)).not.toThrow();
    const engine = new AudioEngine(broken);
    expect(() => engine.setVolume('music', 0.1)).not.toThrow();
    expect(engine.snapshot().music).toBe(0.1);
  });
});

describe('no sound before a gesture', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('the engine never creates an AudioContext on its own', () => {
    const AudioContext = vi.fn();
    vi.stubGlobal('window', { AudioContext });
    const engine = new AudioEngine(memory());
    engine.setTracks([{ title: 'A', artist: 'B', url: '/media/music/x/a.mp3' }]);
    engine.startMusic();
    engine.effect('tick');
    engine.effect('rewind');
    engine.setPhase('night');
    engine.setVolume('effects', 0.3);
    engine.setMuted(true);
    engine.duck(true);
    engine.setHidden(true);
    expect(AudioContext).not.toHaveBeenCalled();
    expect(engine.snapshot().playing).toBe(false);
  });

  it('unlockAudio makes one context, only when called', () => {
    const resume = vi.fn(() => Promise.resolve());
    const AudioContext = vi.fn(function (this: { resume: typeof resume }) {
      this.resume = resume;
    });
    vi.stubGlobal('window', { AudioContext });
    expect(AudioContext).not.toHaveBeenCalled();
    expect(unlockAudio()).toBeDefined();
    expect(AudioContext).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalled();
  });

  it('unlockAudio copes without Web Audio', () => {
    vi.stubGlobal('window', {});
    expect(unlockAudio()).toBeUndefined();
  });
});
