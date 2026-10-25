import type { ContentStore } from '@/application/content-repository';
import {
  contactMessageSchema,
  experienceListSchema,
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
//   messages/{id}         contact form messages
// Until the starter content is imported, missing site documents fall back to
// the seed data so the public site is never empty.

function parse<T>(schema: z.ZodType<T>, data: unknown, where: string): T | undefined {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  console.error(`Skipping invalid Firestore document ${where}`, result.error.issues);
  return undefined;
}

export function firestoreStore(db: FirestoreClient): ContentStore {
  return {
    writable: true,

    async getProfile() {
      const doc = await db.get('site', 'profile');
      return (doc && parse(profileSchema, doc.data, 'site/profile')) ?? seed.profile;
    },

    async listProjects() {
      const docs = await db.list('projects');
      if (docs.length === 0 && !(await db.get('site', 'profile'))) return seed.projects;
      return docs
        .map((doc) => parse(projectSchema, doc.data, `projects/${doc.id}`))
        .filter((p): p is Project => p !== undefined);
    },

    async listExperience() {
      const doc = await db.get('site', 'experience');
      return (doc && parse(experienceListSchema, doc.data['items'] ?? [], 'site/experience')) ?? seed.experience;
    },

    async listTestimonials() {
      const doc = await db.get('site', 'testimonials');
      return (doc && parse(testimonialListSchema, doc.data['items'] ?? [], 'site/testimonials')) ?? seed.testimonials;
    },

    saveProject: (project) => db.set('projects', project.slug, project),
    deleteProject: (slug) => db.delete('projects', slug),
    saveProfile: (profile) => db.set('site', 'profile', profile),
    saveExperience: (items) => db.set('site', 'experience', { items }),
    saveTestimonials: (items) => db.set('site', 'testimonials', { items }),

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
