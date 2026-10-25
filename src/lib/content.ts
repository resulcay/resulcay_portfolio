import type { ContentStore } from '@/application/content-repository';
import { FirestoreClient } from '@/infrastructure/firebase/firestore-client';
import { firestoreStore } from '@/infrastructure/content/firestore-store';
import { memoryStore } from '@/infrastructure/content/memory-store';
import { cachedStore } from '@/infrastructure/content/cached-store';
import { settings } from './env';

// Composition root: the one place that picks which adapter the site uses.
// Firestore when it's configured; otherwise the seed data, which local
// development can also edit in memory.
function create(): ContentStore {
  if (settings.firebase) return cachedStore(firestoreStore(new FirestoreClient(settings.firebase)));
  return memoryStore({ writable: import.meta.env.DEV });
}

export const content: ContentStore = create();
