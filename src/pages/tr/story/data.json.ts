import type { APIRoute } from 'astro';
import { storyResponse } from '@/lib/story';

export const GET: APIRoute = () => storyResponse('tr');
