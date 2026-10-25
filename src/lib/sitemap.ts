import { localizePath } from '@/i18n/ui';

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One <url> per English path, with its Turkish twin listed as an alternate (and vice versa). */
export function buildSitemap(origin: string, paths: string[]): string {
  const urls = paths.flatMap((path) => {
    const en = escapeXml(new URL(localizePath(path, 'en'), origin).href);
    const tr = escapeXml(new URL(localizePath(path, 'tr'), origin).href);
    const alternates = [
      `<xhtml:link rel="alternate" hreflang="en" href="${en}"/>`,
      `<xhtml:link rel="alternate" hreflang="tr" href="${tr}"/>`,
    ].join('');
    return [en, tr].map((loc) => `<url><loc>${loc}</loc>${alternates}</url>`);
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>\n`;
}
