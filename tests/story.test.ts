import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { storyData } from '@/application/story';
import { storyFits } from '@/scripts/story-capability';
import { experience, profile, projects, testimonials } from '@/infrastructure/content/seed';

const str = z.string().min(1);
const storyDataSchema = z.strictObject({
  lang: z.enum(['en', 'tr']),
  profile: z.strictObject({
    name: str,
    title: str,
    location: str,
    summary: str,
    links: z.record(z.string(), z.url()),
    skills: z.array(z.strictObject({ group: str, items: z.array(str) })),
    certifications: z.array(z.strictObject({ name: str, issuer: str })),
    education: z.array(
      z.strictObject({
        school: str,
        program: str,
        start: str,
        end: str,
        completed: z.boolean(),
        status: str.optional(),
        note: str.optional(),
      }),
    ),
  }),
  contact: z.strictObject({ email: z.email(), phone: str, cvPath: str }),
  projects: z.array(
    z.strictObject({
      slug: str,
      title: str,
      hook: str,
      role: str,
      story: str,
      highlights: z.array(str),
      tags: z.array(str),
      links: z.record(z.string(), z.url()),
      images: z.array(z.strictObject({ src: z.string().startsWith('/media/'), alt: str, width: z.number(), height: z.number() })),
    }),
  ),
  experience: z.array(
    z.strictObject({ organization: str, title: str, start: str, end: str.optional(), location: str, points: z.array(str) }),
  ),
  testimonials: z.array(z.strictObject({ name: str, quote: str })),
});

describe('story data', () => {
  it.each(['en', 'tr'] as const)('has the documented shape in %s', (lang) => {
    // Through JSON, as the browser receives it.
    const data = JSON.parse(JSON.stringify(storyData(lang, profile, projects, experience, testimonials)));
    expect(() => storyDataSchema.parse(data)).not.toThrow();
  });

  it('localizes text and spells out an unfinished degree', () => {
    const tr = storyData('tr', profile, projects, experience, testimonials);
    expect(tr.profile.title).toBe(profile.title.tr);
    const unfinished = tr.profile.education.find((e) => !e.completed);
    expect(unfinished?.status).toBe('Tamamlanmadı');
  });

  it('only includes public projects', () => {
    const hidden = { ...projects[0]!, slug: 'hidden', visibility: 'unlisted' as const };
    const data = storyData('en', profile, [...projects, hidden], experience, testimonials);
    expect(data.projects.map((p) => p.slug)).not.toContain('hidden');
  });
});

describe('storyFits', () => {
  const capable = { webgl2: true, deviceMemory: 8, saveData: false, reducedMotion: false };

  it('accepts a capable device, including one that hides its memory', () => {
    expect(storyFits(capable)).toBe(true);
    expect(storyFits({ ...capable, deviceMemory: undefined })).toBe(true);
  });

  it.each([
    ['no WebGL2', { webgl2: false }],
    ['low memory', { deviceMemory: 2 }],
    ['Save-Data', { saveData: true }],
    ['reduced motion', { reducedMotion: true }],
  ])('points to the journal with %s', (_, change) => {
    expect(storyFits({ ...capable, ...change })).toBe(false);
  });
});
