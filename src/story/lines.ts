import type { Locale } from '@/domain/schemas';
import type { Phase } from './scene/time';
import type { Visitor } from './visitor';

/** The objects you can open, in the order they appear from left to right. */
export const OBJECTS = ['recordPlayer', 'polaroids', 'journal', 'phone', 'corkboard', 'laptop', 'window'] as const;
export type StoryObject = (typeof OBJECTS)[number];

interface Lines {
  /** Names for the keyboard and screen-reader buttons. */
  names: Record<StoryObject, string>;
  /** Resul's inner monologue when you look at something. The window has one per time of day. */
  thoughts: Record<Exclude<StoryObject, 'window'>, string>;
  window: Record<Phase, string>;
  ui: {
    sceneLabel: string;
    objects: string;
    close: string;
    allProjects: string;
    readOnJournal: string;
    music: string;
    musicSoon: string;
    timeOfDay: string;
    auto: string;
    phases: Record<Phase, string>;
    consequences: string;
    chat: { hello: string; email: string; phone: string; linkedin: string };
    who: string;
    visitors: Record<Visitor, string>;
    remember: string;
    change: string;
    chips: { cv: string; experience: string; contact: string; projects: string; paidWork: string };
    guide: string;
    rewinding: string;
  };
}

export const LINES: Record<Locale, Lines> = {
  en: {
    names: {
      recordPlayer: 'Record player',
      polaroids: 'Photo wall',
      journal: 'Journal',
      phone: 'Phone',
      corkboard: 'Cork board',
      laptop: 'Laptop',
      window: 'Window',
    },
    thoughts: {
      polaroids: 'Every one of these taught me something. Some of them twice.',
      laptop: 'My work history, minus the coffee.',
      journal: 'The honest version of me. Handwriting not included.',
      phone: 'Go on, send me a message.',
      recordPlayer: 'Music helps me think. Or procrastinate.',
      corkboard: 'Proof that I finish things. Sometimes.',
    },
    window: {
      dawn: 'Up before the bugs are. Mostly.',
      day: 'Sunlight: still the best debugger.',
      golden: 'This light makes even my code look good.',
      night: 'Quiet hours. Best time to ship, worst time to sleep.',
    },
    ui: {
      sceneLabel:
        "Resul's bedroom studio. He sits at his desk typing on a laptop, with photos of his projects pinned on the wall above the bed.",
      objects: 'Things in the room',
      close: 'Close',
      allProjects: 'All projects',
      readOnJournal: 'Read on the journal',
      music: 'Music',
      musicSoon: 'Music arrives soon. The needle is still warming up.',
      timeOfDay: 'Time of day',
      auto: 'Follow my clock',
      phases: { dawn: 'Dawn', day: 'Day', golden: 'Golden hour', night: 'Night' },
      consequences: 'This action will have consequences.',
      chat: {
        hello: 'Hey! Thanks for stopping by.',
        email: 'Email is the fastest way to reach me:',
        phone: 'Or call or text me:',
        linkedin: "I'm on LinkedIn too:",
      },
      who: "Who's visiting?",
      visitors: { recruiter: 'Recruiter', client: 'Client', explorer: 'Just looking around' },
      remember: 'Resul will remember that.',
      change: 'Change',
      chips: { cv: 'CV', experience: 'Experience', contact: 'Contact', projects: 'Projects', paidWork: 'Paid work' },
      guide: 'Butterfly: show me what to look at next',
      rewinding: 'Rewinding',
    },
  },
  tr: {
    names: {
      recordPlayer: 'Pikap',
      polaroids: 'Fotoğraf duvarı',
      journal: 'Günlük',
      phone: 'Telefon',
      corkboard: 'Mantar pano',
      laptop: 'Dizüstü bilgisayar',
      window: 'Pencere',
    },
    thoughts: {
      polaroids: 'Her biri bana bir şey öğretti. Bazıları iki kez.',
      laptop: 'İş geçmişim, kahveler hariç.',
      journal: 'Benim dürüst hâlim. El yazısı dahil değil.',
      phone: 'Hadi, bana bir mesaj at.',
      recordPlayer: 'Müzik düşünmeme yardım ediyor. Ya da oyalanmama.',
      corkboard: 'Bir şeyleri bitirdiğimin kanıtı. Bazen.',
    },
    window: {
      dawn: 'Hatalardan önce uyandım. Çoğunlukla.',
      day: 'Güneş ışığı hâlâ en iyi hata ayıklayıcı.',
      golden: 'Bu ışıkta kodum bile güzel görünüyor.',
      night: 'Sessiz saatler. Yayına almak için en iyi, uyumak için en kötü zaman.',
    },
    ui: {
      sceneLabel:
        "Resul'ün yatak odası stüdyosu. Masasında dizüstü bilgisayarında yazıyor; yatağın üstündeki duvarda projelerinin fotoğrafları asılı.",
      objects: 'Odadaki şeyler',
      close: 'Kapat',
      allProjects: 'Tüm projeler',
      readOnJournal: 'Günlükte oku',
      music: 'Müzik',
      musicSoon: 'Müzik yakında geliyor. İğne hâlâ ısınıyor.',
      timeOfDay: 'Günün saati',
      auto: 'Saatime uy',
      phases: { dawn: 'Şafak', day: 'Gündüz', golden: 'Altın saat', night: 'Gece' },
      consequences: 'Bu eylemin sonuçları olacak.',
      chat: {
        hello: 'Selam! Uğradığın için teşekkürler.',
        email: 'Bana en hızlı e-postayla ulaşırsın:',
        phone: 'Ya da ara veya mesaj at:',
        linkedin: "LinkedIn'de de varım:",
      },
      who: 'Kim geliyor?',
      visitors: { recruiter: 'İşe alım', client: 'Müşteri', explorer: 'Sadece bakıyorum' },
      remember: 'Resul bunu hatırlayacak.',
      change: 'Değiştir',
      chips: { cv: 'CV', experience: 'Deneyim', contact: 'İletişim', projects: 'Projeler', paidWork: 'Ücretli işler' },
      guide: 'Kelebek: sıradaki şeyi göster',
      rewinding: 'Geri sarılıyor',
    },
  },
};

/** What Resul thinks when you look at a hotspot. A Polaroid shows its project's hook. */
export function thoughtFor(id: string, lang: Locale, phase: Phase, hooks: Record<string, string>): string | undefined {
  if (id.startsWith('polaroid:')) return hooks[id.slice('polaroid:'.length)];
  if (id === 'window') return LINES[lang].window[phase];
  return LINES[lang].thoughts[id as keyof Lines['thoughts']];
}
