import type { ContentRepository } from './content-repository';
import type { Project } from '@/domain/schemas';

export function publicProjects(projects: Project[]): Project[] {
  return projects
    .filter((p) => p.visibility === 'public')
    .sort((a, b) => a.order - b.order || (b.start ?? '').localeCompare(a.start ?? ''));
}

export function featuredProjects(projects: Project[]): Project[] {
  return publicProjects(projects).filter((p) => p.featured);
}

export async function findProject(repo: ContentRepository, slug: string): Promise<Project | undefined> {
  const projects = await repo.listProjects();
  // Unlisted projects are reachable by their URL but kept out of lists.
  return projects.find((p) => p.slug === slug && p.visibility !== 'private');
}
