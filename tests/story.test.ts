import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { storyData } from '@/application/story';
import { storyFits } from '@/scripts/story-capability';
import { phaseAt } from '@/story/scene/time';
import { createQualityGovernor, parseQuality } from '@/story/scene/quality';
import { LINES, OBJECTS, thoughtFor } from '@/story/lines';
import { parseHash, routeForHotspot, toHash } from '@/story/route';
import { nextTarget, readVisited, readVisitor, saveVisited, saveVisitor } from '@/story/visitor';
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
      period: str.optional(),
      story: str,
      highlights: z.array(str),
      tags: z.array(str),
      paid: z.boolean(),
      links: z.record(z.string(), z.url()),
      images: z.array(z.strictObject({ src: z.string().startsWith('/media/'), alt: str, width: z.number(), height: z.number() })),
    }),
  ),
  experience: z.array(
    z.strictObject({ organization: str, title: str, start: str, end: str.optional(), location: str, period: str, points: z.array(str) }),
  ),
  testimonials: z.array(z.strictObject({ name: str, quote: str })),
  music: z.array(
    z.strictObject({ title: str, artist: str, url: z.string().startsWith('/media/music/'), license: str, sourceUrl: z.url(), credit: str.optional() }),
  ),
});

describe('story data', () => {
  it.each(['en', 'tr'] as const)('has the documented shape in %s', (lang) => {
    // Through JSON, as the browser receives it.
    const track = {
      id: 'evening-walk',
      title: 'Evening Walk',
      artist: 'Someone Kind',
      key: 'music/tracks/0b6f4b5e-1c2d-4e5f-8a9b-0c1d2e3f4a5b.mp3',
      license: 'CC BY 4.0',
      sourceUrl: 'https://example.org/evening-walk',
      credit: { en: 'Thanks to Someone Kind', tr: 'Someone Kind sağ olsun' },
    };
    const data = JSON.parse(JSON.stringify(storyData(lang, profile, projects, experience, testimonials, [track])));
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

describe('time of day', () => {
  it.each([
    [4, 'night'],
    [5, 'dawn'],
    [7, 'dawn'],
    [8, 'day'],
    [16, 'day'],
    [17, 'golden'],
    [19, 'golden'],
    [20, 'night'],
    [0, 'night'],
  ] as const)('%i:00 is %s', (hour, phase) => {
    expect(phaseAt(hour)).toBe(phase);
  });
});

describe('quality governor', () => {
  it('steps down one level per slow window', () => {
    const g = createQualityGovernor('high');
    expect(g.window(40)).toBe('medium');
    expect(g.window(25)).toBe('low');
    expect(g.window(10)).toBe('low');
  });

  it('steps up only after two smooth windows, and never after a step down', () => {
    const g = createQualityGovernor('medium');
    expect(g.window(60)).toBe('medium');
    expect(g.window(60)).toBe('high');
    expect(g.window(45)).toBe('medium');
    for (let i = 0; i < 5; i++) expect(g.window(60)).toBe('medium');
  });

  it('keeps medium between the thresholds', () => {
    const g = createQualityGovernor('medium');
    expect(g.window(40)).toBe('medium');
  });

  it('reads a pinned level from the URL', () => {
    expect(parseQuality('low')).toBe('low');
    expect(parseQuality('ultra')).toBeUndefined();
  });
});

describe('story lines', () => {
  const strings = (value: unknown): string[] =>
    typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

  it('gives every object a name and a thought in both languages', () => {
    for (const lang of ['en', 'tr'] as const) {
      for (const object of OBJECTS) {
        expect(LINES[lang].names[object], `${lang} ${object}`).toBeTruthy();
        expect(thoughtFor(object, lang, 'golden', {}), `${lang} ${object}`).toBeTruthy();
      }
    }
  });

  it('has the same keys in English and Turkish', () => {
    const keys = (value: unknown, prefix = ''): string[] =>
      typeof value === 'string' ? [prefix] : Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => keys(v, `${prefix}.${k}`));
    expect(keys(LINES.tr).sort()).toEqual(keys(LINES.en).sort());
  });

  it('never mentions graduating', () => {
    for (const line of strings(LINES)) expect(line).not.toMatch(/graduat|mezun/i);
  });

  it('gives Resul himself a thought in both languages, and opens his journal', () => {
    expect(thoughtFor('resul', 'en', 'day', {})).toBe("That's me. Usually more coffee involved.");
    expect(thoughtFor('resul', 'tr', 'day', {})).toBe('Bu benim. Genelde daha çok kahve oluyor.');
    expect(routeForHotspot('resul')).toEqual({ object: 'journal' });
  });

  it("uses a project's hook for its Polaroid", () => {
    expect(thoughtFor('polaroid:macyap', 'en', 'day', { macyap: 'A hook' })).toBe('A hook');
  });
});

describe('story routes', () => {
  it.each([
    ['#laptop', { object: 'laptop' }],
    ['#project/macyap', { object: 'polaroids', project: 'macyap' }],
    ['#polaroids', { object: 'polaroids' }],
    ['#paid-work', { object: 'polaroids', paid: true }],
    ['', null],
    ['#contact', null],
    ['#project/Bad_Slug', null],
  ])('%s', (hash, route) => {
    expect(parseHash(hash)).toEqual(route);
  });

  it('round-trips through the hash', () => {
    for (const route of [
      { object: 'window' as const },
      { object: 'polaroids' as const, project: 'floria' },
      { object: 'polaroids' as const, paid: true as const },
    ]) {
      expect(parseHash(toHash(route))).toEqual(route);
    }
  });

  it('sends a Polaroid click to its project', () => {
    expect(routeForHotspot('polaroid:floria')).toEqual({ object: 'polaroids', project: 'floria' });
    expect(routeForHotspot('phone')).toEqual({ object: 'phone' });
  });
});

describe('visitor choice', () => {
  const memory = (): Storage => {
    const data = new Map<string, string>();
    return {
      get length() {
        return data.size;
      },
      clear: () => data.clear(),
      getItem: (key) => data.get(key) ?? null,
      key: (i) => [...data.keys()][i] ?? null,
      removeItem: (key) => void data.delete(key),
      setItem: (key, value) => void data.set(key, value),
    };
  };

  it('remembers the answer and forgets it on request', () => {
    const storage = memory();
    expect(readVisitor(storage)).toBeNull();
    saveVisitor(storage, 'client');
    expect(readVisitor(storage)).toBe('client');
    saveVisitor(storage, null);
    expect(readVisitor(storage)).toBeNull();
  });

  it('ignores unknown values and storage that throws', () => {
    const storage = memory();
    storage.setItem('story-visitor', 'boss');
    expect(readVisitor(storage)).toBeNull();
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } as unknown as Storage;
    expect(readVisitor(broken)).toBeNull();
    expect(() => saveVisitor(broken, 'recruiter')).not.toThrow();
    expect(readVisited(broken)).toEqual([]);
  });

  it('round-trips the visited objects', () => {
    const storage = memory();
    saveVisited(storage, ['laptop', 'phone']);
    expect(readVisited(storage)).toEqual(['laptop', 'phone']);
  });
});

describe('butterfly guide', () => {
  it.each([
    ['recruiter', [], 'laptop'],
    ['recruiter', ['laptop'], 'phone'],
    ['client', [], 'polaroids'],
    ['client', ['polaroids'], 'phone'],
    ['explorer', ['polaroids'], 'laptop'],
  ] as const)('%s after %j goes to %s', (visitor, visited, target) => {
    expect(nextTarget(visitor, visited)).toBe(target);
  });

  it('rests once everything has been seen', () => {
    expect(nextTarget('explorer', OBJECTS)).toBeNull();
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
