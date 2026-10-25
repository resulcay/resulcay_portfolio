import type { APIRoute } from 'astro';
import { content } from '@/lib/content';
import { json } from '@/lib/http';

export const DELETE: APIRoute = async ({ params }) => {
  const id = params['id'] ?? '';
  if (!/^[a-z0-9-]{8,64}$/.test(id)) return json({ error: 'Unknown message.' }, 404);
  await content.deleteMessage(id);
  return json({ ok: true });
};
