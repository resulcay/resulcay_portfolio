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

describe('public form rules', () => {
  const message = { name: 'Ada', email: 'ada@example.com', message: 'Hello there, nice work!', lang: 'en', token: 't' };

  it('accepts a normal contact message', async () => {
    const { contactSchema } = await import('@/domain/schemas');
    expect(contactSchema.safeParse(message).success).toBe(true);
  });

  it('refuses short messages, bad emails, a filled honeypot and a missing check', async () => {
    const { contactSchema } = await import('@/domain/schemas');
    expect(contactSchema.safeParse({ ...message, message: 'hi' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...message, email: 'nope' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...message, website: 'spam.example' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...message, token: '' }).success).toBe(false);
  });

  it('requires a human check token to sign in', async () => {
    const { loginSchema } = await import('@/domain/schemas');
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'secret1', token: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'secret1' }).success).toBe(false);
  });

  it('only accepts project images stored under a server-made key', () => {
    const image = { key: 'projects/macyap/0b6f4b5e-1c2d-4e5f.webp', alt: { en: 'Screen', tr: 'Ekran' }, width: 800, height: 600 };
    expect(projectSchema.safeParse({ ...projects[0], images: [image] }).success).toBe(true);
    expect(projectSchema.safeParse({ ...projects[0], images: [{ ...image, key: 'https://evil.example/x.webp' }] }).success).toBe(false);
  });
});
