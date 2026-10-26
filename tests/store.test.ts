import { describe, expect, it, vi } from 'vitest';
import { fromFields, toFields } from '@/infrastructure/firebase/firestore-values';
import { cachedStore } from '@/infrastructure/content/cached-store';
import { memoryStore } from '@/infrastructure/content/memory-store';
import { withSeedProjects } from '@/infrastructure/content/firestore-store';
import { musicListSchema, musicTrackSchema } from '@/domain/schemas';
import { projects } from '@/infrastructure/content/seed';

describe('Firestore value conversion', () => {
  it('round-trips a project', () => {
    const project = projects[0];
    expect(fromFields(toFields(project as unknown as Record<string, unknown>))).toEqual(project);
  });

  it('keeps integers and decimals apart', () => {
    const fields = toFields({ order: 3, ratio: 1.5 });
    expect(fields['order']).toEqual({ integerValue: '3' });
    expect(fields['ratio']).toEqual({ doubleValue: 1.5 });
  });

  it('leaves out undefined fields', () => {
    expect(Object.keys(toFields({ a: 1, b: undefined }))).toEqual(['a']);
  });
});

describe('starter projects before the import', () => {
  it('a saved project replaces its starter version and the rest stay', () => {
    const edited = { ...projects[0]!, title: 'Edited' };
    const extra = { ...projects[1]!, slug: 'brand-new' };
    const merged = withSeedProjects([edited, extra], projects);
    expect(merged).toHaveLength(projects.length + 1);
    expect(merged[0]?.title).toBe('Edited');
    expect(merged.slice(1, projects.length)).toEqual(projects.slice(1));
    expect(merged.at(-1)?.slug).toBe('brand-new');
  });
});

describe('content stores', () => {
  it('a read-only store refuses writes', async () => {
    const store = memoryStore({ writable: false });
    await expect(store.saveProject(projects[0]!)).rejects.toThrow();
  });

  it('the cache serves repeated reads and clears on write', async () => {
    const inner = memoryStore({ writable: true });
    const spy = vi.spyOn(inner, 'listProjects');
    let clock = 0;
    const store = cachedStore(inner, 1000, () => clock);

    await store.listProjects();
    await store.listProjects();
    expect(spy).toHaveBeenCalledTimes(1);

    await store.saveProject({ ...projects[0]!, title: 'Changed' });
    const after = await store.listProjects();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(after.find((p) => p.slug === projects[0]!.slug)?.title).toBe('Changed');

    clock = 5000;
    await store.listProjects();
    expect(spy).toHaveBeenCalledTimes(3);
  });
});

describe('music tracks', () => {
  const track = {
    id: 'evening-walk',
    title: 'Evening Walk',
    artist: 'Someone Kind',
    key: 'music/tracks/0b6f4b5e-1c2d-4e5f-8a9b-0c1d2e3f4a5b.mp3',
    license: 'CC BY 4.0',
    sourceUrl: 'https://example.org/evening-walk',
  };

  it('validates a track and insists on a licence, a source and the music folder', () => {
    expect(musicTrackSchema.safeParse(track).success).toBe(true);
    expect(musicTrackSchema.safeParse({ ...track, license: '' }).success).toBe(false);
    expect(musicTrackSchema.safeParse({ ...track, sourceUrl: 'http://example.org' }).success).toBe(false);
    expect(musicTrackSchema.safeParse({ ...track, key: 'site/x/0b6f4b5e1c2d.png' }).success).toBe(false);
    expect(musicListSchema.safeParse(Array(21).fill(track)).success).toBe(false);
  });

  it('starts empty, saves, and the cache sees the save', async () => {
    const store = cachedStore(memoryStore({ writable: true }));
    expect(await store.listMusic()).toEqual([]);
    await store.saveMusic([track]);
    expect(await store.listMusic()).toEqual([track]);
  });
});
