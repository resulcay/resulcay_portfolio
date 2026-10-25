import { describe, expect, it } from 'vitest';
import { experienceSchema, profileSchema, projectSchema, testimonialSchema } from '@/domain/schemas';
import { experience, profile, projects, testimonials } from '@/infrastructure/content/seed';
import { featuredProjects, publicProjects } from '@/application/content';
import { llmsFull, llmsSummary } from '@/lib/llms';

describe('seed content', () => {
  it('passes the same validation the admin will use', () => {
    expect(() => profileSchema.parse(profile)).not.toThrow();
    for (const p of projects) expect(() => projectSchema.parse(p), p.slug).not.toThrow();
    for (const e of experience) expect(() => experienceSchema.parse(e), e.id).not.toThrow();
    for (const t of testimonials) expect(() => testimonialSchema.parse(t)).not.toThrow();
  });

  it('has unique project slugs', () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('never claims a completed degree', () => {
    const university = profile.education.find((e) => e.school === 'Yalova University');
    expect(university?.completed).toBe(false);
    const text = llmsFull(profile, projects, experience).toLowerCase();
    expect(text).not.toMatch(/graduat/);
    expect(text).toContain('did not complete');
  });
});

describe('project lists', () => {
  it('keeps unlisted and private projects out of lists', () => {
    const base = projects[0]!;
    const list = [
      { ...base, slug: 'a', visibility: 'public' as const, order: 2 },
      { ...base, slug: 'b', visibility: 'unlisted' as const, order: 1 },
      { ...base, slug: 'c', visibility: 'private' as const, order: 0 },
    ];
    expect(publicProjects(list).map((p) => p.slug)).toEqual(['a']);
  });

  it('orders featured projects by their order field', () => {
    const orders = featuredProjects(projects).map((p) => p.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

describe('llms.txt', () => {
  it('links every public project', () => {
    const text = llmsSummary(profile, projects);
    for (const p of publicProjects(projects)) expect(text).toContain(`/projects/${p.slug}`);
  });
});
