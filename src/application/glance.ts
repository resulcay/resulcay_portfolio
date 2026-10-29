import type { Experience, Project } from '@/domain/schemas';
import { publicProjects } from './content';

// The home page's "At a glance" facts, worked out from the content so they
// stay right as Resul edits it in the admin.

/** Months since year 0; a bare year starts in January or ends in December. */
const monthIndex = (yearMonth: string, edge: 'start' | 'end') => {
  const [year, month] = yearMonth.split('-').map(Number);
  return year! * 12 + (month ?? (edge === 'start' ? 1 : 12)) - 1;
};

/** Total months worked, counting overlapping roles once; a role without an end runs to `now`. */
export function experienceMonths(experience: Experience[], now: Date): number {
  const current = now.getFullYear() * 12 + now.getMonth();
  const spans = experience
    .map((job) => [monthIndex(job.start, 'start'), job.end ? monthIndex(job.end, 'end') + 1 : current + 1] as const)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let reach = -Infinity;
  for (const [start, end] of spans) {
    const from = Math.max(start, reach);
    if (end > from) total += end - from;
    reach = Math.max(reach, end);
  }
  return total;
}

/** The tech used across the most public projects, most used first. */
export function topTech(projects: Project[], count: number): string[] {
  const uses = new Map<string, number>();
  for (const project of publicProjects(projects)) for (const tech of project.tech) uses.set(tech, (uses.get(tech) ?? 0) + 1);
  return [...uses].sort((a, b) => b[1] - a[1]).slice(0, count).map(([tech]) => tech);
}

/** Store listings across public projects, counting each store separately. */
export const storeApps = (projects: Project[]) =>
  publicProjects(projects).reduce(
    (total, project) =>
      total + Number(Boolean(project.links.appStore)) + Number(Boolean(project.links.googlePlay)) + Number(Boolean(project.links.microsoftStore)),
    0,
  );

/** The most recent role, by start date. */
export const latestRole = (experience: Experience[]) => [...experience].sort((a, b) => b.start.localeCompare(a.start))[0];
