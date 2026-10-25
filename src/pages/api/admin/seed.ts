import type { APIRoute } from 'astro';
import { content } from '@/lib/content';
import { json } from '@/lib/http';

// Until anything is saved, Firestore reads fall back to the starter content
// in the code. This writes whatever the site currently shows into storage,
// so every part of it becomes editable. Running it again changes nothing.
export const POST: APIRoute = async () => {
  if (!content.writable) return json({ error: 'Storage is not configured.' }, 503);
  const [profile, projects, experience, testimonials] = await Promise.all([
    content.getProfile(),
    content.listProjects(),
    content.listExperience(),
    content.listTestimonials(),
  ]);
  for (const project of projects) await content.saveProject(project);
  await content.saveExperience(experience);
  await content.saveTestimonials(testimonials);
  // The profile goes last: its presence is what marks the import as done.
  await content.saveProfile(profile);
  return json({ ok: true, projects: projects.length });
};
