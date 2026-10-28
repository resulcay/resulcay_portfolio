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
  thoughts: Record<Exclude<StoryObject, 'window'> | 'resul' | 'cat' | 'lightSwitch', string>;
  window: Record<Phase, string>;
  ui: {
    sceneLabel: string;
    /** The character, as a button: looking at him opens the journal. */
    resul: string;
    /** The cat on the rug, as a button: she answers with a trill. */
    cat: string;
    /** The switch above the nightstand, as a button: it turns the fairy lights on and off. */
    lightSwitch: string;
    objects: string;
    close: string;
    allProjects: string;
    readOnJournal: string;
    music: string;
    audio: {
      mute: string;
      nowPlaying: string;
      play: string;
      pause: string;
      prev: string;
      next: string;
      tracks: string;
      volume: string;
      music: string;
      effects: string;
      ambience: string;
      noTracks: string;
      credits: string;
      license: string;
      source: string;
      inspired: string;
    };
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
      resul: "That's me. Usually more coffee involved.",
      cat: 'The real boss of this room.',
      lightSwitch: 'Fairy lights: on or off?',
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
      resul: 'Resul',
      cat: 'Cat',
      lightSwitch: 'Light switch',
      objects: 'Things in the room',
      close: 'Close',
      allProjects: 'All projects',
      readOnJournal: 'Read on the journal',
      music: 'Music',
      audio: {
        mute: 'Sound off',
        nowPlaying: 'Now playing',
        play: 'Play',
        pause: 'Pause',
        prev: 'Previous track',
        next: 'Next track',
        tracks: 'On the shelf',
        volume: 'Volume',
        music: 'Music',
        effects: 'Effects',
        ambience: 'Room sounds',
        noTracks: "No records on the shelf yet. For now the room hums along on its own.",
        credits: 'Credits',
        license: 'Licence',
        source: 'Source',
        inspired: 'Inspired by narrative adventure games.',
      },
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
      journal: 'Benim dürüst halim. El yazısı dahil değil.',
      phone: 'Hadi, bana bir mesaj at.',
      recordPlayer: 'Müzik düşünmeme yardım ediyor. Ya da oyalanmama.',
      corkboard: 'Bir şeyleri bitirdiğimin kanıtı. Bazen.',
      resul: 'Bu benim. Genelde daha çok kahve oluyor.',
      cat: 'Bu odanın asıl patronu.',
      lightSwitch: 'Süs ışıkları: açık mı kapalı mı?',
    },
    window: {
      dawn: 'Hatalardan önce uyandım. Çoğunlukla.',
      day: 'Güneş ışığı hala en iyi hata ayıklayıcı.',
      golden: 'Bu ışıkta kodum bile güzel görünüyor.',
      night: 'Sessiz saatler. Yayına almak için en iyi, uyumak için en kötü zaman.',
    },
    ui: {
      sceneLabel:
        "Resul'ün yatak odası stüdyosu. Masasında dizüstü bilgisayarında yazıyor; yatağın üstündeki duvarda projelerinin fotoğrafları asılı.",
      resul: 'Resul',
      cat: 'Kedi',
      lightSwitch: 'Işık düğmesi',
      objects: 'Odadaki şeyler',
      close: 'Kapat',
      allProjects: 'Tüm projeler',
      readOnJournal: 'Günlükte oku',
      music: 'Müzik',
      audio: {
        mute: 'Ses kapalı',
        nowPlaying: 'Şimdi çalıyor',
        play: 'Çal',
        pause: 'Duraklat',
        prev: 'Önceki parça',
        next: 'Sonraki parça',
        tracks: 'Raftakiler',
        volume: 'Ses düzeyi',
        music: 'Müzik',
        effects: 'Efektler',
        ambience: 'Oda sesleri',
        noTracks: 'Rafta henüz plak yok. Şimdilik oda kendi kendine mırıldanıyor.',
        credits: 'Künye',
        license: 'Lisans',
        source: 'Kaynak',
        inspired: 'Hikaye odaklı macera oyunlarından ilham alındı.',
      },
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
