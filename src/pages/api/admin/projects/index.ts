import type { APIRoute } from 'astro';
import { projectSchema } from '@/domain/schemas';
import { content } from '@/lib/content';
import { json, readJson } from '@/lib/http';

export const POST: APIRoute = async ({ request }) => {
  const parsed = await readJson(request, projectSchema);
  if ('response' in parsed) return parsed.response;
  await content.saveProject(parsed.data);
  return json({ ok: true, slug: parsed.data.slug });
};
