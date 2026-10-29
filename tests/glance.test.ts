import { describe, expect, it } from 'vitest';
import { experienceMonths, latestRole, storeApps, topTech } from '@/application/glance';
import type { Experience, Project } from '@/domain/schemas';
import { experience as seedExperience, projects as seedProjects } from '@/infrastructure/content/seed';

const job = (start: string, end?: string): Experience => ({ id: 'x', organization: 'O', title: { en: 'T', tr: 'T' }, start, ...(end ? { end } : {}), location: 'L', points: [] });

describe('experienceMonths', () => {
  it('counts each month once, across overlapping roles', () => {
    expect(experienceMonths([job('2024-01', '2024-06'), job('2024-04', '2024-12')], new Date(2026, 0))).toBe(12);
  });

  it('runs an open role to now, and reads a bare year as the whole year', () => {
    expect(experienceMonths([job('2025-11')], new Date(2026, 1))).toBe(4);
    expect(experienceMonths([job('2020', '2020')], new Date(2026, 0))).toBe(12);
  });

  it('gives just over two years for the seed CV', () => {
    expect(Math.floor(experienceMonths(seedExperience, new Date(2026, 9)) / 12)).toBe(2);
  });
});

describe('project facts', () => {
  const p = (tech: string[], links: Project['links'] = {}, visibility: Project['visibility'] = 'public') => ({ ...seedProjects[0]!, tech, links, visibility }) as Project;

  it('ranks tech by how many public projects use it', () => {
    expect(topTech([p(['flutter', 'firebase']), p(['flutter']), p(['dotnet'], {}, 'private')], 5)).toEqual(['flutter', 'firebase']);
  });

  it('counts public apps with a store link', () => {
    expect(storeApps([p([], { googlePlay: 'https://play.google.com/x' }), p([], { website: 'https://x.dev' }), p([], { appStore: 'https://apps.apple.com/x' }, 'private')])).toBe(1);
  });

  it('counts each public store listing', () => {
    expect(storeApps([p([], { appStore: 'https://apps.apple.com/x', googlePlay: 'https://play.google.com/x' })])).toBe(2);
    expect(storeApps(seedProjects)).toBe(11);
  });

  it('picks the most recent role', () => {
    expect(latestRole([job('2022-06', '2022-08'), job('2024-06', '2025-04')])?.start).toBe('2024-06');
  });
});
