import { seedRepository } from '@/infrastructure/content/seed-repository';
import type { ContentRepository } from '@/application/content-repository';

// Composition root: the one place that picks which adapter the pages use.
export const content: ContentRepository = seedRepository;
