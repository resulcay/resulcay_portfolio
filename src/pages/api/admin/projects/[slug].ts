import type { APIRoute } from 'astro';
import { slug as slugSchema } from '@/domain/schemas';
import { content } from '@/lib/content';
import { json } from '@/lib/http';

export const DELETE: APIRoute = async ({ params }) => {
  const slug = slugSchema.safeParse(params['slug']);
  if (!slug.success) return json({ error: 'Unknown project.' }, 404);
  await content.deleteProject(slug.data);
  return json({ ok: true });
};
