import type { Experience, Locale, Profile, Project, Testimonial } from '@/domain/schemas';
import { tagLabel } from '@/domain/tags';
import { formatPeriod, t } from '@/i18n/ui';
import { publicProjects } from './content';

/** Everything Story mode shows, in one language, so the 3D view never needs the Journal's pages. */
export function storyData(
  lang: Locale,
  profile: Profile,
  projects: Project[],
  experience: Experience[],
  testimonials: Testimonial[],
) {
  return {
    lang,
    profile: {
      name: profile.name,
      title: profile.title[lang],
      location: profile.location[lang],
      summary: profile.summary[lang],
      links: profile.links,
      skills: profile.skills.map((s) => ({ group: s.group[lang], items: s.items })),
      certifications: profile.certifications,
      education: profile.education.map((e) => ({
        school: e.school,
        program: e.program[lang],
        start: e.start,
        end: e.end,
        completed: e.completed,
        // Spelled out so the story can never imply a finished degree.
        status: e.completed ? undefined : t(lang, 'about.notCompleted'),
        note: e.note?.[lang],
      })),
    },
    contact: { email: profile.email, phone: profile.phone, cvPath: profile.cvPath },
    projects: publicProjects(projects).map((p) => ({
      slug: p.slug,
      title: p.title,
      hook: p.hook[lang],
      role: p.role[lang],
      period: formatPeriod(p.start, p.end, lang),
      story: p.story[lang],
      highlights: p.highlights.map((h) => h[lang]),
      // Work someone paid for: what a client wants to see first.
      paid: ['paid', 'freemium', 'in-app-purchases'].includes(p.pricing) || p.workType === 'freelance',
      tags: [p.category, ...p.appTypes, ...p.platforms, ...p.languages, ...p.tech].map((tag) => tagLabel(tag, lang)),
      links: p.links,
      images: (p.images ?? []).map((i) => ({ src: `/media/${i.key}`, alt: i.alt[lang], width: i.width, height: i.height })),
    })),
    experience: experience.map((e) => ({
      organization: e.organization,
      title: e.title[lang],
      start: e.start,
      end: e.end,
      location: e.location,
      period: formatPeriod(e.start, e.end, lang),
      points: e.points.map((p) => p[lang]),
    })),
    testimonials: testimonials.map((x) => ({ name: x.name, quote: x.quote[lang] })),
  };
}

export type StoryData = ReturnType<typeof storyData>;
