import type { APIRoute } from 'astro';
import { publicProjects } from '@/application/content';
import { content } from '@/lib/content';
import { buildSitemap } from '@/lib/sitemap';

export const GET: APIRoute = async ({ site }) => {
  const projects = publicProjects(await content.listProjects());
  const paths = ['/', '/projects', '/about', ...projects.map((p) => `/projects/${p.slug}`)];
  return new Response(buildSitemap(site?.origin ?? 'https://resulcay.com', paths), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
