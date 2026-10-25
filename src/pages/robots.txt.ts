import type { APIRoute } from 'astro';

// Search and AI answer engines are welcome on purpose. Admin paths are not
// listed here, because naming them would reveal that they exist.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap.xml', site ?? 'https://resulcay.com').href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
