import type { Locale } from '@/domain/schemas';

export const ui = {
  en: {
    'nav.projects': 'Projects',
    'nav.about': 'About',
    'nav.cv': 'Download CV',
    'nav.contact': 'Contact',
    'nav.skip': 'Skip to content',
    'nav.switchLang': 'Türkçe',
    'home.kicker': 'Episode 1',
    'home.title': 'Compile',
    'home.facts': 'At a glance',
    'home.featured': 'Selected work',
    'home.allProjects': 'All projects',
    'home.experience': 'Experience',
    'home.testimonials': 'What people say',
    'facts.role': 'Role',
    'facts.location': 'Based in',
    'facts.experience': 'Experience',
    'facts.experienceValue': '2+ years, mobile, backend and web',
    'facts.education': 'Education',
    'facts.availability': 'Availability',
    'projects.title': 'Projects',
    'projects.intro': 'Every project I can show, newest first. Open one for the full story.',
    'project.role': 'My role',
    'project.period': 'When',
    'project.links': 'Links',
    'project.details': 'Details',
    'project.back': 'Back to projects',
    'project.present': 'present',
    'group.pricing': 'Pricing',
    'group.workType': 'Work type',
    'group.appTypes': 'App type',
    'group.platforms': 'Platforms',
    'group.languages': 'Languages',
    'group.tech': 'Tech',
    'group.status': 'Status',
    'group.category': 'Category',
    'link.appStore': 'App Store',
    'link.googlePlay': 'Google Play',
    'link.website': 'Website',
    'link.repository': 'Source code',
    'about.title': 'About',
    'about.skills': 'Skills',
    'about.education': 'Education',
    'about.certifications': 'Certifications',
    'about.elsewhere': 'Elsewhere',
    'about.notCompleted': 'Not completed',
    'contact.title': 'Contact',
    'contact.intro': 'The fastest way to reach me is email. Phone works too.',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'footer.inspired': 'Art direction inspired by narrative adventure games.',
    'notFound.title': 'Wait… this moment never happened.',
    'notFound.body': "The page you're looking for isn't here. Maybe it never was. Let's go back to a moment that did.",
    'notFound.rewind': 'Rewind',
    'notFound.journal': 'Open the journal',
    'notFound.caption': 'this moment never happened',
  },
  tr: {
    'nav.projects': 'Projeler',
    'nav.about': 'Hakkımda',
    'nav.cv': 'CV indir',
    'nav.contact': 'İletişim',
    'nav.skip': 'İçeriğe geç',
    'nav.switchLang': 'English',
    'home.kicker': 'Bölüm 1',
    'home.title': 'Derleme',
    'home.facts': 'Kısaca',
    'home.featured': 'Seçili işler',
    'home.allProjects': 'Tüm projeler',
    'home.experience': 'Deneyim',
    'home.testimonials': 'Hakkımda söylenenler',
    'facts.role': 'Rol',
    'facts.location': 'Konum',
    'facts.experience': 'Deneyim',
    'facts.experienceValue': '2+ yıl, mobil, backend ve web',
    'facts.education': 'Eğitim',
    'facts.availability': 'Uygunluk',
    'projects.title': 'Projeler',
    'projects.intro': 'Gösterebildiğim tüm projeler, en yeniden eskiye. Ayrıntılar için birini aç.',
    'project.role': 'Rolüm',
    'project.period': 'Ne zaman',
    'project.links': 'Bağlantılar',
    'project.details': 'Ayrıntılar',
    'project.back': 'Projelere dön',
    'project.present': 'devam ediyor',
    'group.pricing': 'Fiyatlandırma',
    'group.workType': 'İş türü',
    'group.appTypes': 'Uygulama türü',
    'group.platforms': 'Platformlar',
    'group.languages': 'Diller',
    'group.tech': 'Teknolojiler',
    'group.status': 'Durum',
    'group.category': 'Kategori',
    'link.appStore': 'App Store',
    'link.googlePlay': 'Google Play',
    'link.website': 'Web sitesi',
    'link.repository': 'Kaynak kod',
    'about.title': 'Hakkımda',
    'about.skills': 'Yetenekler',
    'about.education': 'Eğitim',
    'about.certifications': 'Sertifikalar',
    'about.elsewhere': 'Diğer bağlantılar',
    'about.notCompleted': 'Tamamlanmadı',
    'contact.title': 'İletişim',
    'contact.intro': 'Bana en hızlı e-postayla ulaşabilirsin. Telefon da olur.',
    'contact.email': 'E-posta',
    'contact.phone': 'Telefon',
    'footer.inspired': 'Görsel yön, hikâye odaklı macera oyunlarından ilham alır.',
    'notFound.title': 'Dur… bu an hiç yaşanmadı.',
    'notFound.body': 'Aradığın sayfa burada değil. Belki hiç olmadı. Gerçekten yaşanmış bir ana geri dönelim.',
    'notFound.rewind': 'Geri sar',
    'notFound.journal': 'Günlüğü aç',
    'notFound.caption': 'bu an hiç yaşanmadı',
  },
} as const;

export type UiKey = keyof (typeof ui)['en'];

export function t(lang: Locale, key: UiKey): string {
  return ui[lang][key];
}

export function langFromUrl(url: URL): Locale {
  return url.pathname === '/tr' || url.pathname.startsWith('/tr/') ? 'tr' : 'en';
}

/** Path of the same page in the given language, e.g. /projects/macyap -> /tr/projects/macyap. */
export function localizePath(path: string, lang: Locale): string {
  const bare = path.replace(/^\/tr(?=\/|$)/, '') || '/';
  if (lang === 'en') return bare;
  return bare === '/' ? '/tr' : `/tr${bare}`;
}

const MONTHS: Record<Locale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
};

/** "2024-06" -> "Jun 2024", "2024" -> "2024". */
export function formatYearMonth(value: string, lang: Locale): string {
  const [year, month] = value.split('-');
  return month ? `${MONTHS[lang][Number(month) - 1]} ${year}` : (year ?? value);
}

export function formatPeriod(start: string | undefined, end: string | undefined, lang: Locale): string | undefined {
  if (!start) return undefined;
  const from = formatYearMonth(start, lang);
  return end ? `${from} – ${formatYearMonth(end, lang)}` : `${from} – ${t(lang, 'project.present')}`;
}
