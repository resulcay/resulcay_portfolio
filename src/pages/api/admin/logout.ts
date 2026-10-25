import type { APIRoute } from 'astro';
import { json } from '@/lib/http';
import { clearedSessionCookie } from '@/lib/session';

export const POST: APIRoute = () => json({ ok: true, next: '/' }, 200, { 'Set-Cookie': clearedSessionCookie });
