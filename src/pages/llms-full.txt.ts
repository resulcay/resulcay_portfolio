import type { APIRoute } from 'astro';
import { content } from '@/lib/content';
import { llmsFull } from '@/lib/llms';

export const GET: APIRoute = async () => {
  const [profile, projects, experience] = await Promise.all([
    content.getProfile(),
    content.listProjects(),
    content.listExperience(),
  ]);
  return new Response(llmsFull(profile, projects, experience), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
