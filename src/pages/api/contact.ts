import type { APIRoute } from 'astro';
import { contactSchema } from '@/domain/schemas';
import { checkHuman } from '@/lib/auth';
import { content } from '@/lib/content';
import { clientIp, json, readJson } from '@/lib/http';

export const POST: APIRoute = async ({ request }) => {
  const parsed = await readJson(request, contactSchema);
  if ('response' in parsed) return parsed.response;
  const { token, website, ...message } = parsed.data;

  // A filled honeypot means a bot; it gets the same answer as a person.
  if (website) return json({ ok: true });
  if (!(await checkHuman(token, clientIp(request), 'contact'))) {
    return json({ error: 'The human check failed. Please try again.' }, 400);
  }
  if (!content.writable) return json({ error: "Messages can't be received right now. Please email me instead." }, 503);

  await content.saveMessage({ ...message, id: crypto.randomUUID(), receivedAt: new Date().toISOString(), read: false });
  return json({ ok: true });
};
