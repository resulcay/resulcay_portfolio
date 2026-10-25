import type { APIRoute } from 'astro';
import { experienceListSchema, profileSchema, testimonialListSchema } from '@/domain/schemas';
import { content } from '@/lib/content';
import { json, readJson } from '@/lib/http';

export const PUT: APIRoute = async ({ params, request }) => {
  switch (params['doc']) {
    case 'profile': {
      const parsed = await readJson(request, profileSchema);
      if ('response' in parsed) return parsed.response;
      await content.saveProfile(parsed.data);
      return json({ ok: true });
    }
    case 'experience': {
      const parsed = await readJson(request, experienceListSchema);
      if ('response' in parsed) return parsed.response;
      await content.saveExperience(parsed.data);
      return json({ ok: true });
    }
    case 'testimonials': {
      const parsed = await readJson(request, testimonialListSchema);
      if ('response' in parsed) return parsed.response;
      await content.saveTestimonials(parsed.data);
      return json({ ok: true });
    }
    default:
      return json({ error: 'Unknown document.' }, 404);
  }
};
