// The stores' own badges, downloaded from Apple, Google and Microsoft and used as their
// guidelines ask: unaltered, linking to the app. Apple's Turkish badge wasn't reachable,
// so both languages use its English one.
import appStoreEn from '@/assets/badges/app-store-en.svg?url';
import googlePlayEn from '@/assets/badges/google-play-en.png?url';
import googlePlayTr from '@/assets/badges/google-play-tr.png?url';
import microsoftEn from '@/assets/badges/microsoft-en.svg?url';
import microsoftTr from '@/assets/badges/microsoft-tr.svg?url';
import type { Locale } from '@/domain/schemas';

export const STORES = ['appStore', 'googlePlay', 'microsoftStore'] as const;
export type Store = (typeof STORES)[number];

interface Badge {
  src: Record<Locale, string>;
  alt: Record<Locale, string>;
  /** Shown at a height that lines its lettering up with the others (Google's PNG carries a margin). */
  height: number;
  width: Record<Locale, number>;
}

export const BADGES: Record<Store, Badge> = {
  appStore: {
    src: { en: appStoreEn, tr: appStoreEn },
    alt: { en: 'Download on the App Store', tr: 'App Store’dan indirin' },
    height: 44,
    width: { en: 132, tr: 132 },
  },
  googlePlay: {
    src: { en: googlePlayEn, tr: googlePlayTr },
    alt: { en: 'Get it on Google Play', tr: 'Google Play’den alın' },
    height: 64,
    width: { en: 165, tr: 165 },
  },
  microsoftStore: {
    src: { en: microsoftEn, tr: microsoftTr },
    alt: { en: 'Get it from Microsoft', tr: 'Microsoft’tan alın' },
    height: 44,
    width: { en: 161, tr: 180 },
  },
};
