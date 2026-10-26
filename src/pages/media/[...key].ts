import type { APIRoute } from 'astro';
import { MEDIA_KEY } from '@/domain/media';
import { settings } from '@/lib/env';

// Uploaded files are served from R2 by this Worker. Keys are random and never
// reused, so browsers and the edge may keep them for a year.

export const GET: APIRoute = async ({ params, request, rewrite }) => {
  const key = params['key'] ?? '';
  const bucket = settings.media;
  if (!bucket || !MEDIA_KEY.test(key)) return rewrite('/404');

  // Range requests let audio stream and seek; Safari won't play media without them.
  const object = await bucket.get(key, { onlyIf: request.headers, range: request.headers });
  if (!object) return rewrite('/404');

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Accept-Ranges', 'bytes');
  if (key.endsWith('.pdf')) headers.set('Content-Disposition', 'inline; filename="resul-cay-cv.pdf"');

  if (!('body' in object)) return new Response(null, { status: 304, headers });
  if (object.range && request.headers.has('Range')) {
    // R2 fills in every field, leaving the unused ones undefined, so test values rather than keys.
    const { offset, length, suffix } = object.range as { offset?: number; length?: number; suffix?: number };
    const start = suffix !== undefined ? object.size - suffix : (offset ?? 0);
    const size = suffix ?? length ?? object.size - start;
    headers.set('Content-Range', `bytes ${start}-${start + size - 1}/${object.size}`);
    headers.set('Content-Length', String(size));
    return new Response(object.body, { status: 206, headers });
  }
  return new Response(object.body, { headers });
};
