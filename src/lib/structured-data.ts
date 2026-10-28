import type { Locale, Profile, Project } from '@/domain/schemas';
import { localizePath } from '@/i18n/ui';

const SITE = 'https://resulcay.com';

export function personLd(profile: Profile, lang: Locale) {
  const school = profile.education.find((e) => !e.completed);
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: new URL(localizePath('/', lang), SITE).href,
    mainEntity: {
      '@type': 'Person',
      '@id': `${SITE}/#person`,
      name: profile.name,
      jobTitle: profile.title[lang],
      description: profile.summary[lang],
      email: `mailto:${profile.email}`,
      telephone: profile.phone,
      url: SITE,
      address: { '@type': 'PostalAddress', addressLocality: 'Antalya', addressCountry: 'TR' },
      knowsAbout: profile.skills.flatMap((s) => s.items),
      // Attended, not graduated: alumniOf is the closest schema.org term, and the
      // description says plainly that the degree was not completed.
      ...(school && {
        alumniOf: {
          '@type': 'CollegeOrUniversity',
          name: school.school,
          description: school.note?.[lang],
        },
      }),
      sameAs: Object.values(profile.links),
    },
  };
}

export function projectLd(project: Project, lang: Locale) {
  const isApp = project.appTypes.some((a) => a === 'mobile-app' || a === 'desktop-app' || a === 'web-app');
  return {
    '@context': 'https://schema.org',
    '@type': isApp ? 'SoftwareApplication' : 'CreativeWork',
    name: project.title,
    description: project.hook[lang],
    url: new URL(localizePath(`/projects/${project.slug}`, lang), SITE).href,
    creator: { '@id': `${SITE}/#person` },
    ...(isApp && project.platforms.length > 0 && { operatingSystem: project.platforms.join(', ') }),
    ...(isApp && { applicationCategory: project.category }),
    ...(project.start && { dateCreated: project.start }),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: new URL(item.path, SITE).href,
    })),
  };
}
