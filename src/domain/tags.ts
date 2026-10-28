// Controlled tag vocabulary. Filters, chips and admin pickers all read from here,
// so a project can never carry a tag that the site doesn't know how to label.

export const PRICING = ['free', 'paid', 'freemium', 'in-app-purchases', 'not-public'] as const;
export const WORK_TYPES = ['personal', 'freelance', 'employer'] as const;
export const APP_TYPES = [
  'mobile-app',
  'desktop-app',
  'web-app',
  'website',
  'library',
  'backend',
  'game',
  'tool',
] as const;
export const PLATFORMS = ['ios', 'android', 'web', 'macos', 'windows', 'linux'] as const;
export const LANGUAGES = ['dart', 'csharp', 'kotlin', 'typescript', 'javascript', 'python', 'sql'] as const;
export const TECH = [
  'flutter',
  'dotnet',
  'aspnet-core',
  'ef-core',
  'signalr',
  'firebase',
  'google-cloud',
  'react',
  'angular',
  'nextjs',
  'wpf',
  'ffmpeg',
  'unity',
] as const;
export const STATUSES = ['live', 'in-development', 'archived', 'concept'] as const;
export const CATEGORIES = [
  'sports',
  'fitness',
  'social',
  'productivity',
  'finance',
  'business',
  'education',
  'health',
  'media',
  'mobility',
  'developer-tools',
] as const;

export type Pricing = (typeof PRICING)[number];
export type WorkType = (typeof WORK_TYPES)[number];
export type AppType = (typeof APP_TYPES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type Language = (typeof LANGUAGES)[number];
export type Tech = (typeof TECH)[number];
export type Status = (typeof STATUSES)[number];
export type Category = (typeof CATEGORIES)[number];

export type TagGroup =
  | 'pricing'
  | 'workType'
  | 'appTypes'
  | 'platforms'
  | 'languages'
  | 'tech'
  | 'status'
  | 'category';

type Label = { en: string; tr: string };

export const TAG_LABELS: Record<string, Label> = {
  free: { en: 'Free', tr: 'Ücretsiz' },
  paid: { en: 'Paid', tr: 'Ücretli' },
  freemium: { en: 'Freemium', tr: 'Freemium' },
  'in-app-purchases': { en: 'In-app purchases', tr: 'Uygulama içi satın alma' },
  'not-public': { en: 'Not public', tr: 'Herkese açık değil' },
  personal: { en: 'Personal', tr: 'Kişisel' },
  freelance: { en: 'Freelance client', tr: 'Serbest çalışma' },
  employer: { en: 'Employer', tr: 'İşveren' },
  'mobile-app': { en: 'Mobile app', tr: 'Mobil uygulama' },
  'desktop-app': { en: 'Desktop app', tr: 'Masaüstü uygulama' },
  'web-app': { en: 'Web app', tr: 'Web uygulaması' },
  website: { en: 'Website', tr: 'Web sitesi' },
  library: { en: 'Library or package', tr: 'Kütüphane veya paket' },
  backend: { en: 'Backend or API', tr: 'Backend veya API' },
  game: { en: 'Game', tr: 'Oyun' },
  tool: { en: 'Tool', tr: 'Araç' },
  ios: { en: 'iOS', tr: 'iOS' },
  android: { en: 'Android', tr: 'Android' },
  web: { en: 'Web', tr: 'Web' },
  macos: { en: 'macOS', tr: 'macOS' },
  windows: { en: 'Windows', tr: 'Windows' },
  linux: { en: 'Linux', tr: 'Linux' },
  dart: { en: 'Dart', tr: 'Dart' },
  csharp: { en: 'C#', tr: 'C#' },
  kotlin: { en: 'Kotlin', tr: 'Kotlin' },
  typescript: { en: 'TypeScript', tr: 'TypeScript' },
  javascript: { en: 'JavaScript', tr: 'JavaScript' },
  python: { en: 'Python', tr: 'Python' },
  sql: { en: 'SQL', tr: 'SQL' },
  flutter: { en: 'Flutter', tr: 'Flutter' },
  dotnet: { en: '.NET', tr: '.NET' },
  'aspnet-core': { en: 'ASP.NET Core', tr: 'ASP.NET Core' },
  'ef-core': { en: 'EF Core', tr: 'EF Core' },
  signalr: { en: 'SignalR', tr: 'SignalR' },
  firebase: { en: 'Firebase', tr: 'Firebase' },
  'google-cloud': { en: 'Google Cloud', tr: 'Google Cloud' },
  react: { en: 'React', tr: 'React' },
  angular: { en: 'Angular', tr: 'Angular' },
  nextjs: { en: 'Next.js', tr: 'Next.js' },
  wpf: { en: 'WPF', tr: 'WPF' },
  ffmpeg: { en: 'FFmpeg', tr: 'FFmpeg' },
  unity: { en: 'Unity', tr: 'Unity' },
  live: { en: 'Live', tr: 'Yayında' },
  'in-development': { en: 'In development', tr: 'Geliştiriliyor' },
  archived: { en: 'Archived', tr: 'Arşivlendi' },
  concept: { en: 'Concept', tr: 'Konsept' },
  sports: { en: 'Sports', tr: 'Spor' },
  fitness: { en: 'Fitness', tr: 'Fitness' },
  social: { en: 'Social', tr: 'Sosyal' },
  productivity: { en: 'Productivity', tr: 'Verimlilik' },
  finance: { en: 'Finance', tr: 'Finans' },
  business: { en: 'Business', tr: 'İş' },
  education: { en: 'Education', tr: 'Eğitim' },
  health: { en: 'Health', tr: 'Sağlık' },
  media: { en: 'Photo and video', tr: 'Fotoğraf ve video' },
  mobility: { en: 'Mobility', tr: 'Ulaşım' },
  'developer-tools': { en: 'Developer tools', tr: 'Geliştirici araçları' },
};

export function tagLabel(tag: string, lang: 'en' | 'tr'): string {
  return TAG_LABELS[tag]?.[lang] ?? tag;
}
