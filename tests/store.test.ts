import { describe, expect, it, vi } from 'vitest';
import { fromFields, toFields } from '@/infrastructure/firebase/firestore-values';
import { cachedStore } from '@/infrastructure/content/cached-store';
import { memoryStore } from '@/infrastructure/content/memory-store';
import { withSeedProjects } from '@/infrastructure/content/firestore-store';
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
