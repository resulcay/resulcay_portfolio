import type { Locale } from '@/domain/schemas';
import { storyData } from '@/application/story';
import { content } from './content';
import { json } from './http';

export async function storyResponse(lang: Locale): Promise<Response> {
  const [profile, projects, experience, testimonials, music] = await Promise.all([
    content.getProfile(),
    content.listProjects(),
    content.listExperience(),
    content.listTestimonials(),
    content.listMusic(),
  ]);
  return json(storyData(lang, profile, projects, experience, testimonials, music), 200, {
    'Cache-Control': 'public, max-age=0, s-maxage=300',
  });
}
