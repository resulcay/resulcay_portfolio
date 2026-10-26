import type { ContentStore } from '@/application/content-repository';
import {
  contactMessageSchema,
  experienceListSchema,
  musicListSchema,
  profileSchema,
  projectSchema,
  testimonialListSchema,
  type ContactMessage,
  type Project,
} from '@/domain/schemas';
import type { z } from 'zod';
import type { FirestoreClient } from '../firebase/firestore-client';
import * as seed from './seed';

// Layout in Firestore:
//   projects/{slug}       one document per project
//   site/profile          the profile
//   site/experience       { items: Experience[] }
//   site/testimonials     { items: Testimonial[] }
//   site/music            { items: MusicTrack[] }
//   messages/{id}         contact form messages
// Until the starter content is imported, missing site documents fall back to
// the seed data so the public site is never empty.

function parse<T>(schema: z.ZodType<T>, data: unknown, where: string): T | undefined {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  console.error(`Skipping invalid Firestore document ${where}`, result.error.issues);
  return undefined;
}

/**
 * Before the import, a saved project replaces its starter version and the
 * other starter projects stay visible, so saving one doesn't hide the rest.
 * shortcut: deleting a starter project before the import doesn't hide it; run the import first.
 */
export function withSeedProjects(stored: Project[], starter: Project[]): Project[] {
  const saved = new Map(stored.map((p) => [p.slug, p]));
  const starterSlugs = new Set(starter.map((p) => p.slug));
  return [...starter.map((p) => saved.get(p.slug) ?? p), ...stored.filter((p) => !starterSlugs.has(p.slug))];
}

export function firestoreStore(db: FirestoreClient): ContentStore {
  return {
    writable: true,

    async getProfile() {
      const doc = await db.get('site', 'profile');
      return (doc && parse(profileSchema, doc.data, 'site/profile')) ?? seed.profile;
    },

    async listProjects() {
      const [docs, imported] = await Promise.all([db.list('projects'), db.get('site', 'profile')]);
      const stored = docs
        .map((doc) => parse(projectSchema, doc.data, `projects/${doc.id}`))
        .filter((p): p is Project => p !== undefined);
      return imported ? stored : withSeedProjects(stored, seed.projects);
    },

    async listExperience() {
      const doc = await db.get('site', 'experience');
      return (doc && parse(experienceListSchema, doc.data['items'] ?? [], 'site/experience')) ?? seed.experience;
    },

    async listTestimonials() {
      const doc = await db.get('site', 'testimonials');
      return (doc && parse(testimonialListSchema, doc.data['items'] ?? [], 'site/testimonials')) ?? seed.testimonials;
    },

    async listMusic() {
      const doc = await db.get('site', 'music');
      return (doc && parse(musicListSchema, doc.data['items'] ?? [], 'site/music')) ?? seed.music;
    },

    saveProject: (project) => db.set('projects', project.slug, project),
    deleteProject: (slug) => db.delete('projects', slug),
    saveProfile: (profile) => db.set('site', 'profile', profile),
    saveExperience: (items) => db.set('site', 'experience', { items }),
    saveTestimonials: (items) => db.set('site', 'testimonials', { items }),
    saveMusic: (items) => db.set('site', 'music', { items }),

    async listMessages() {
      const docs = await db.list('messages');
      return docs
        .map((doc) => parse(contactMessageSchema, doc.data, `messages/${doc.id}`))
        .filter((m): m is ContactMessage => m !== undefined)
        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    },
    saveMessage: (message) => db.set('messages', message.id, message),
    deleteMessage: (id) => db.delete('messages', id),
  };
}
