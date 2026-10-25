import type { ContentStore } from '@/application/content-repository';

type ReadKey = 'getProfile' | 'listProjects' | 'listExperience' | 'listTestimonials';

/**
 * Remembers public reads for a short while inside one Worker instance, so a
 * burst of visitors costs a few Firestore reads instead of one per page.
 * Writes made through this wrapper clear it straight away.
 */
export function cachedStore(inner: ContentStore, ttlMs = 60_000, now = () => Date.now()): ContentStore {
  const cache = new Map<ReadKey, { value: Promise<unknown>; expiresAt: number }>();

  function read<K extends ReadKey>(key: K): ReturnType<ContentStore[K]> {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now()) return hit.value as ReturnType<ContentStore[K]>;
    const value = inner[key]();
    cache.set(key, { value, expiresAt: now() + ttlMs });
    // A failed read must not be remembered.
    value.catch(() => cache.delete(key));
    return value as ReturnType<ContentStore[K]>;
  }

  const invalidating =
    <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
    async (...args: A) => {
      try {
        await fn(...args);
      } finally {
        cache.clear();
      }
    };

  return {
    get writable() {
      return inner.writable;
    },
    getProfile: () => read('getProfile'),
    listProjects: () => read('listProjects'),
    listExperience: () => read('listExperience'),
    listTestimonials: () => read('listTestimonials'),
    saveProject: invalidating(inner.saveProject),
    deleteProject: invalidating(inner.deleteProject),
    saveProfile: invalidating(inner.saveProfile),
    saveExperience: invalidating(inner.saveExperience),
    saveTestimonials: invalidating(inner.saveTestimonials),
    listMessages: () => inner.listMessages(),
    saveMessage: (message) => inner.saveMessage(message),
    deleteMessage: (id) => inner.deleteMessage(id),
  };
}
