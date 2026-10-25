import type { Experience, Profile, Project, Testimonial } from '@/domain/schemas';

// The UI depends on this port only. Today it's backed by seed data; the
// Firestore adapter plugs in here later without touching any page.
export interface ContentRepository {
  getProfile(): Promise<Profile>;
  listProjects(): Promise<Project[]>;
  listExperience(): Promise<Experience[]>;
  listTestimonials(): Promise<Testimonial[]>;
}
