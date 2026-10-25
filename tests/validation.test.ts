import { describe, expect, it } from 'vitest';
import { httpsUrl, projectSchema, slug } from '@/domain/schemas';
import { projects } from '@/infrastructure/content/seed';

describe('validation rules', () => {
  it('accepts only https links', () => {
    expect(httpsUrl.safeParse('https://example.com').success).toBe(true);
    expect(httpsUrl.safeParse('http://example.com').success).toBe(false);
    expect(httpsUrl.safeParse('javascript:alert(1)').success).toBe(false);
  });

  it('accepts only lowercase hyphenated slugs', () => {
    expect(slug.safeParse('mac-yap').success).toBe(true);
    expect(slug.safeParse('Mac Yap').success).toBe(false);
    expect(slug.safeParse('mac--yap').success).toBe(false);
  });

  it('rejects tags outside the vocabulary', () => {
    const bad = { ...projects[0], platforms: ['playstation'] };
    expect(projectSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects empty translations', () => {
    const bad = { ...projects[0], hook: { en: 'Hello', tr: '   ' } };
    expect(projectSchema.safeParse(bad).success).toBe(false);
  });
});
