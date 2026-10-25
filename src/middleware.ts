import { defineMiddleware } from 'astro:middleware';
import { hasAdminSession, isAdminPath } from '@/lib/admin-guard';
import { SECURITY_HEADERS } from '@/lib/security-headers';

export const onRequest = defineMiddleware(async (context, next) => {
  let response: Response;

  if (isAdminPath(context.url.pathname) && !(await hasAdminSession(context.request))) {
    const notFound = await context.rewrite('/404');
    response = new Response(notFound.body, { status: 404, headers: notFound.headers });
  } else {
    response = await next();
  }

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  if (!response.headers.has('Cache-Control')) {
    // Pages are cheap to render and content changes rarely; let the edge keep
    // them briefly and serve stale copies while refreshing.
    response.headers.set(
      'Cache-Control',
      response.status === 200 ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400' : 'no-store',
    );
  }
  return response;
});
