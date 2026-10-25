import type { ContactMessage, Experience, Profile, Project, Testimonial } from '@/domain/schemas';

// The UI depends on these ports only. Pages read through ContentRepository;
// the admin writes through ContentStore. Adapters live in infrastructure.
export interface ContentRepository {
  getProfile(): Promise<Profile>;
  listProjects(): Promise<Project[]>;
  listExperience(): Promise<Experience[]>;
  listTestimonials(): Promise<Testimonial[]>;
}

export interface ContentStore extends ContentRepository {
  /** False when the store is a read-only fallback, so the admin can say so. */
  readonly writable: boolean;
  saveProject(project: Project): Promise<void>;
  deleteProject(slug: string): Promise<void>;
  saveProfile(profile: Profile): Promise<void>;
  saveExperience(items: Experience[]): Promise<void>;
  saveTestimonials(items: Testimonial[]): Promise<void>;
  listMessages(): Promise<ContactMessage[]>;
  saveMessage(message: ContactMessage): Promise<void>;
  deleteMessage(id: string): Promise<void>;
}
