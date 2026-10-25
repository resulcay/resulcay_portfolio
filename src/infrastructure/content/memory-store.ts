import type { ContentStore } from '@/application/content-repository';
import type { ContactMessage, Experience, Profile, Project, Testimonial } from '@/domain/schemas';
import * as seed from './seed';

/**
 * Keeps content in memory, starting from the seed data. Local development
 * uses it writable so the admin can be tried without Firebase; production
 * uses it read-only as the fallback when Firebase isn't configured.
 */
export function memoryStore({ writable }: { writable: boolean }): ContentStore {
  let profile: Profile = structuredClone(seed.profile);
  const projects = new Map<string, Project>(seed.projects.map((p) => [p.slug, structuredClone(p)]));
  let experience: Experience[] = structuredClone(seed.experience);
  let testimonials: Testimonial[] = structuredClone(seed.testimonials);
  const messages = new Map<string, ContactMessage>();

  const write = <T extends unknown[]>(fn: (...args: T) => void) =>
    async (...args: T) => {
      if (!writable) throw new Error('Content storage is not configured');
      fn(...args);
    };

  return {
    writable,
    getProfile: async () => profile,
    listProjects: async () => [...projects.values()],
    listExperience: async () => experience,
    listTestimonials: async () => testimonials,
    saveProject: write((project: Project) => void projects.set(project.slug, project)),
    deleteProject: write((slug: string) => void projects.delete(slug)),
    saveProfile: write((next: Profile) => void (profile = next)),
    saveExperience: write((items: Experience[]) => void (experience = items)),
    saveTestimonials: write((items: Testimonial[]) => void (testimonials = items)),
    listMessages: async () => [...messages.values()].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    saveMessage: write((message: ContactMessage) => void messages.set(message.id, message)),
    deleteMessage: write((id: string) => void messages.delete(id)),
  };
}
