import type { APIRoute } from 'astro';
import { content } from '@/lib/content';
import { json } from '@/lib/http';

/** The current profile, for admin pages that change one field of it. */
export const GET: APIRoute = async () => json(await content.getProfile());
