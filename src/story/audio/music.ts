export interface Track {
  title: string;
  artist: string;
  url: string;
}

interface Deck {
  element: HTMLAudioElement;
  gain: GainNode;
}

const CROSSFADE = 4;

/**
 * Streams the playlist through two audio elements, so one track can fade
 * into the next. Elements load nothing until a track is played.
 */
export class MusicPlayer {
  #ctx: AudioContext;
  #decks: [Deck, Deck];
  #active = 0;
  #tracks: Track[] = [];
  #index = 0;
  #playing = false;
  #fading = false;
  #resumeOnShow = false;
  #onChange: () => void;

  constructor(ctx: AudioContext, out: AudioNode, onChange: () => void) {
    this.#ctx = ctx;
    this.#onChange = onChange;
    const deck = (): Deck => {
      const element = new Audio();
      element.preload = 'none';
      const gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(element).connect(gain).connect(out);
      element.addEventListener('timeupdate', () => this.#nearEnd(element));
      element.addEventListener('ended', () => element === this.#current.element && this.next());
      // A file that won't load or decode shows as stopped, so the play button comes back.
      element.addEventListener('error', () => element === this.#current.element && this.#stopped());
      return { element, gain };
    };
    this.#decks = [deck(), deck()];
  }

  get #current(): Deck {
    return this.#decks[this.#active]!;
  }

  get playing(): boolean {
    return this.#playing;
  }

  get index(): number {
    return this.#index;
  }

  setTracks(tracks: Track[]): void {
    this.#tracks = tracks;
  }

  play(index = this.#index, fade = 1.5): void {
    const track = this.#tracks[index];
    if (!track) return;
    const from = this.#current;
    this.#active = 1 - this.#active;
    const to = this.#current;
    const t = this.#ctx.currentTime;
    to.element.src = track.url;
    to.gain.gain.cancelScheduledValues(t);
    to.gain.gain.setValueAtTime(0, t);
    to.gain.gain.linearRampToValueAtTime(1, t + fade);
    // A refused play() (autoplay rules) just leaves the play button for the visitor.
    to.element.play().catch(() => this.#stopped());
    from.gain.gain.cancelScheduledValues(t);
    from.gain.gain.setValueAtTime(from.gain.gain.value, t);
    from.gain.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => from !== this.#current && from.element.pause(), fade * 1000 + 50);
    this.#index = index;
    this.#playing = true;
    this.#fading = false;
    this.#onChange();
  }

  toggle(): void {
    if (this.#playing) {
      this.#current.element.pause();
      this.#stopped();
    } else if (this.#current.element.src) {
      this.#current.element.play().catch(() => this.#stopped());
      this.#playing = true;
      this.#onChange();
    } else this.play(this.#index);
  }

  next(): void {
    if (this.#tracks.length) this.play((this.#index + 1) % this.#tracks.length);
  }

  prev(): void {
    if (this.#tracks.length) this.play((this.#index - 1 + this.#tracks.length) % this.#tracks.length);
  }

  /** Pause while the tab is hidden, and pick up again when it's back. */
  setHidden(hidden: boolean): void {
    if (hidden && this.#playing) {
      this.#current.element.pause();
      this.#resumeOnShow = true;
    } else if (!hidden && this.#resumeOnShow) {
      this.#resumeOnShow = false;
      this.#current.element.play().catch(() => this.#stopped());
    }
  }

  #nearEnd(element: HTMLAudioElement): void {
    if (element !== this.#current.element || this.#fading || !this.#playing) return;
    if (element.duration - element.currentTime < CROSSFADE && this.#tracks.length > 1) {
      this.#fading = true;
      this.play((this.#index + 1) % this.#tracks.length, CROSSFADE);
    }
  }

  #stopped(): void {
    this.#playing = false;
    this.#onChange();
  }

  dispose(): void {
    for (const { element } of this.#decks) {
      element.pause();
      element.removeAttribute('src');
      element.load();
    }
  }
}
