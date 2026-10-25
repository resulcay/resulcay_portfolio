import type { APIRoute } from 'astro';
import { loginSchema } from '@/domain/schemas';
import { checkHuman, signIn } from '@/lib/auth';
import { clientIp, json, readJson } from '@/lib/http';
import { sessionCookie } from '@/lib/session';

// Admin sign-in. The name says nothing about what it is, and every failure
// looks the same, so the endpoint gives nothing away to a curious visitor.

const refused = () => json({ error: "That didn't work." }, 401);

export const POST: APIRoute = async ({ request }) => {
  const parsed = await readJson(request, loginSchema);
  if ('response' in parsed) return refused();
  const { email, password, token } = parsed.data;

  if (!(await checkHuman(token, clientIp(request), 'rewind'))) return refused();
  const session = await signIn(email, password);
  if (!session) return refused();

  return json({ ok: true, next: '/admin' }, 200, { 'Set-Cookie': sessionCookie(session) });
};
