import type { APIRoute } from 'astro';
import { MEDIA_KEY } from '@/domain/media';
import { settings } from '@/lib/env';

// Uploaded files are served from R2 by this Worker. Keys are random and never
// reused, so browsers and the edge may keep them for a year.

export const GET: APIRoute = async ({ params, request, rewrite }) => {
  const key = params['key'] ?? '';
  const bucket = settings.media;
  if (!bucket || !MEDIA_KEY.test(key)) return rewrite('/404');

  const object = await bucket.get(key, { onlyIf: request.headers });
  if (!object) return rewrite('/404');

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (key.endsWith('.pdf')) headers.set('Content-Disposition', 'inline; filename="resul-cay-cv.pdf"');

  if (!('body' in object)) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
};
