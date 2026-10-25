import { z } from 'zod';
import { MEDIA_KEY } from './media';
import {
  APP_TYPES,
  CATEGORIES,
  LANGUAGES,
  PLATFORMS,
  PRICING,
  STATUSES,
  TECH,
  WORK_TYPES,
} from './tags';

// One set of schemas, used by the admin forms in the browser and again by the
// server before anything is stored. Limits here are the product's rules.

export const LOCALES = ['en', 'tr'] as const;
export type Locale = (typeof LOCALES)[number];

const text = (max: number) => z.string().trim().min(1).max(max);

export const localized = (max: number) => z.object({ en: text(max), tr: text(max) });

export const httpsUrl = z
  .url({ protocol: /^https$/ })
  .max(500);

export const slug = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

const yearMonth = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'Use YYYY or YYYY-MM');

export const projectLinksSchema = z
  .object({
    appStore: httpsUrl,
    googlePlay: httpsUrl,
    website: httpsUrl,
    repository: httpsUrl,
  })
  .partial();

export const mediaKey = z.string().regex(MEDIA_KEY, 'Not a media file key');

export const projectImageSchema = z.object({
  key: mediaKey,
  alt: localized(200),
  width: z.number().int().min(1).max(8192),
  height: z.number().int().min(1).max(8192),
});

export type ProjectImage = z.infer<typeof projectImageSchema>;

export const projectSchema = z.object({
  slug,
  title: text(80),
  hook: localized(140),
  story: localized(8000),
  role: localized(200),
  pricing: z.enum(PRICING),
  workType: z.enum(WORK_TYPES),
  appTypes: z.array(z.enum(APP_TYPES)).min(1).max(4),
  platforms: z.array(z.enum(PLATFORMS)).max(6),
  languages: z.array(z.enum(LANGUAGES)).max(8),
  tech: z.array(z.enum(TECH)).max(12),
  status: z.enum(STATUSES),
  category: z.enum(CATEGORIES),
  start: yearMonth.optional(),
  end: yearMonth.optional(),
  highlights: z.array(localized(160)).max(6),
  links: projectLinksSchema,
  /** The first image is the cover on cards and in link previews. */
  images: z.array(projectImageSchema).max(12).optional(),
  featured: z.boolean(),
  order: z.number().int().min(0).max(999),
  visibility: z.enum(['public', 'unlisted', 'private']),
});

export type Project = z.infer<typeof projectSchema>;

export const experienceSchema = z.object({
  id: slug,
  organization: text(80),
  title: localized(80),
  start: yearMonth,
  end: yearMonth.optional(),
  location: text(80),
  points: z.array(localized(240)).max(8),
});

export type Experience = z.infer<typeof experienceSchema>;

export const educationSchema = z.object({
  school: text(80),
  program: localized(120),
  start: z.string().regex(/^\d{4}$/),
  end: z.string().regex(/^\d{4}$/),
  completed: z.boolean(),
  note: localized(200).optional(),
});

export type Education = z.infer<typeof educationSchema>;

export const testimonialSchema = z.object({
  name: text(80),
  quote: localized(600),
});

export type Testimonial = z.infer<typeof testimonialSchema>;

export const profileSchema = z.object({
  name: text(80),
  title: localized(80),
  location: localized(80),
  summary: localized(1200),
  email: z.email().max(120),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use the international format, for example +905551112233'),
  availability: localized(160),
  cvPath: z.string().regex(/^\/[a-z0-9\-./]+\.pdf$/),
  links: z.object({
    github: httpsUrl,
    linkedin: httpsUrl,
    medium: httpsUrl,
    hackerrank: httpsUrl,
    bionluk: httpsUrl,
    blog: httpsUrl,
  }),
  skills: z
    .array(z.object({ group: localized(60), items: z.array(text(40)).min(1).max(20) }))
    .max(10),
  certifications: z.array(z.object({ name: text(120), issuer: text(80) })).max(20),
  education: z.array(educationSchema).max(5),
});

export type Profile = z.infer<typeof profileSchema>;

export const experienceListSchema = z.array(experienceSchema).max(30);
export const testimonialListSchema = z.array(testimonialSchema).max(20);

// Public forms. The Turnstile token travels with the form and is checked on
// the server before anything else happens.

const turnstileToken = z.string().min(1).max(2048);

export const contactSchema = z.object({
  name: text(80),
  email: z.email().max(120),
  message: z.string().trim().min(10).max(4000),
  lang: z.enum(LOCALES),
  /** Hidden field people never see; bots fill it in. */
  website: z.string().max(0).optional(),
  token: turnstileToken,
});

export type ContactInput = z.infer<typeof contactSchema>;

export const contactMessageSchema = contactSchema
  .omit({ token: true, website: true })
  .extend({ id: z.string().regex(/^[a-z0-9-]{8,64}$/), receivedAt: z.iso.datetime(), read: z.boolean() });

export type ContactMessage = z.infer<typeof contactMessageSchema>;

export const loginSchema = z.object({
  email: z.email().max(120),
  password: z.string().min(6).max(200),
  token: turnstileToken,
});
