import type { APIRoute } from 'astro';
import { content } from '@/lib/content';
import { llmsSummary } from '@/lib/llms';

export const GET: APIRoute = async () => {
  const [profile, projects] = await Promise.all([content.getProfile(), content.listProjects()]);
  return new Response(llmsSummary(profile, projects), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
