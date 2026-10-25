import type { ContentRepository } from '@/application/content-repository';
import { experience, profile, projects, testimonials } from './seed';

export const seedRepository: ContentRepository = {
  getProfile: async () => profile,
  listProjects: async () => projects,
  listExperience: async () => experience,
  listTestimonials: async () => testimonials,
};
