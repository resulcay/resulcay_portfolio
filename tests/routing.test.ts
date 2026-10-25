import { describe, expect, it } from 'vitest';
import { formatPeriod, langFromUrl, localizePath } from '@/i18n/ui';
import { isAdminPath } from '@/lib/admin-guard';
import { buildSitemap } from '@/lib/sitemap';

describe('localizePath', () => {
  it.each([
    ['/', 'tr', '/tr'],
    ['/tr', 'en', '/'],
    ['/projects/macyap', 'tr', '/tr/projects/macyap'],
    ['/tr/projects/macyap', 'en', '/projects/macyap'],
    ['/tr/about', 'tr', '/tr/about'],
    ['/trending', 'en', '/trending'],
  ] as const)('%s in %s is %s', (path, lang, expected) => {
    expect(localizePath(path, lang)).toBe(expected);
  });

  it('reads the language from the URL', () => {
    expect(langFromUrl(new URL('https://resulcay.com/tr/about'))).toBe('tr');
    expect(langFromUrl(new URL('https://resulcay.com/trending'))).toBe('en');
  });
});

describe('formatPeriod', () => {
  it('formats both languages', () => {
    expect(formatPeriod('2024-06', '2025-04', 'en')).toBe('Jun 2024 – Apr 2025');
    expect(formatPeriod('2024-06', undefined, 'tr')).toBe('Haz 2024 – devam ediyor');
    expect(formatPeriod(undefined, undefined, 'en')).toBeUndefined();
  });
});

describe('isAdminPath', () => {
  it.each(['/admin', '/admin/', '/admin/projects', '/tr/admin', '/ADMIN'])('%s is admin', (p) => {
    expect(isAdminPath(p)).toBe(true);
  });
  it.each(['/', '/administrator', '/projects/admin', '/about'])('%s is not admin', (p) => {
    expect(isAdminPath(p)).toBe(false);
  });
});

describe('buildSitemap', () => {
  it('lists both languages with alternates', () => {
    const xml = buildSitemap('https://resulcay.com', ['/', '/about']);
    expect(xml).toContain('<loc>https://resulcay.com/</loc>');
    expect(xml).toContain('<loc>https://resulcay.com/tr</loc>');
    expect(xml).toContain('<loc>https://resulcay.com/tr/about</loc>');
    expect(xml.match(/<url>/g)).toHaveLength(4);
  });
});
