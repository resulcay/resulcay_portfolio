import type { Locale } from '@/domain/schemas';
import { storyData } from '@/application/story';
import { latestArticles } from '@/infrastructure/medium';
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
  // The lighthouse poster's articles; an unreachable feed just leaves it empty.
  const articles = await latestArticles(profile.links.medium);
  return json(storyData(lang, profile, projects, experience, testimonials, music, articles), 200, {
    'Cache-Control': 'public, max-age=0, s-maxage=300',
  });
}
