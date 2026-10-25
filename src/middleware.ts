import { defineMiddleware } from 'astro:middleware';
import { isAdminPath } from '@/lib/admin-guard';
import { hasAdminSession } from '@/lib/auth';
import { SECURITY_HEADERS } from '@/lib/security-headers';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const admin = isAdminPath(pathname);
  const api = pathname.startsWith('/api/');
  let response: Response;

  if (api && UNSAFE_METHODS.has(context.request.method) && context.request.headers.get('Origin') !== context.url.origin) {
    // Writes only come from this site's own pages.
    response = new Response('Forbidden', { status: 403 });
  } else if (admin && !(await hasAdminSession(context.request))) {
    const notFound = await context.rewrite('/404');
    response = new Response(notFound.body, { status: 404, headers: notFound.headers });
  } else {
    response = await next();
  }

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  if (admin || api) {
    response.headers.set('Cache-Control', 'private, no-store');
  } else if (!response.headers.has('Cache-Control')) {
    // Pages are cheap to render and content changes rarely; let the edge keep
    // them briefly and serve stale copies while refreshing.
    response.headers.set(
      'Cache-Control',
      response.status === 200 ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400' : 'no-store',
    );
  }
  return response;
});
