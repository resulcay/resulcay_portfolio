// Short, quiet sound effects made in the browser with Web Audio, so there
// are almost no files to download (the cat's meow is the one recording).
// Each one starts now and cleans up after itself.
import meowUrl from './cat-meow.mp3?url';

export type EffectName = 'tick' | 'whoosh' | 'buzz' | 'scratch' | 'rewind' | 'click' | 'mrrr';

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
const samples = new Map<string, Promise<AudioBuffer>>();

/** A short recorded sound, fetched and decoded once. */
function sample(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  let loading = samples.get(url);
  if (!loading) {
    loading = fetch(url)
      .then((response) => response.arrayBuffer())
      .then((bytes) => ctx.decodeAudioData(bytes));
    samples.set(url, loading);
  }
  return loading;
}

/** Two seconds of white noise, made once per context. */
export function noise(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

function envelope(ctx: AudioContext, out: AudioNode, peak: number, attack: number, release: number): GainNode {
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  gain.connect(out);
  return gain;
}

function noiseSource(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx);
  source.start(ctx.currentTime, Math.random());
  source.stop(ctx.currentTime + seconds);
  return source;
}

export const EFFECTS: Record<EffectName, (ctx: AudioContext, out: AudioNode) => void> = {
  /** The light switch: a small plastic click. */
  click(ctx, out) {
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 2500;
    noiseSource(ctx, 0.04).connect(high).connect(envelope(ctx, out, 0.18, 0.001, 0.025));
  },

  /** The cat: a real meow by Yomecerlm3 (Pixabay Content License). */
  mrrr(ctx, out) {
    void sample(ctx, meowUrl).then((buffer) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.6;
      source.connect(gain).connect(out);
      source.start();
    }, () => undefined);
  },

  /** A soft tick when the eye lands on something. */
  tick(ctx, out) {
    const osc = ctx.createOscillator();
    osc.frequency.value = 1800;
    osc.connect(envelope(ctx, out, 0.05, 0.004, 0.04));
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  },

  /** A paper page turning as a panel opens. */
  whoosh(ctx, out) {
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.2;
    band.frequency.setValueAtTime(600, ctx.currentTime);
    band.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + 0.35);
    noiseSource(ctx, 0.5).connect(band).connect(envelope(ctx, out, 0.22, 0.12, 0.3));
  },

  /** The phone buzzing twice on the bedside table. */
  buzz(ctx, out) {
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 900;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    for (const start of [0, 0.22]) {
      gain.gain.setValueAtTime(0.12, t + start);
      gain.gain.setValueAtTime(0, t + start + 0.14);
    }
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 150;
    osc.connect(low).connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + 0.4);
  },

  /** A pencil scratching across the journal. */
  scratch(ctx, out) {
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 2500;
    const gain = ctx.createGain();
    const jitter = Float32Array.from({ length: 24 }, (_, i) => (i === 0 || i === 23 ? 0 : 0.02 + Math.random() * 0.1));
    gain.gain.setValueCurveAtTime(jitter, ctx.currentTime, 0.45);
    noiseSource(ctx, 0.5).connect(high).connect(gain).connect(out);
  },

  /** Tape rewinding: a falling, wobbling whoosh that swells and cuts off, as if played backwards. */
  rewind(ctx, out) {
    const t = ctx.currentTime;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 2;
    band.frequency.setValueAtTime(3200, t);
    band.frequency.exponentialRampToValueAtTime(250, t + 0.7);
    const swell = ctx.createGain();
    swell.gain.setValueAtTime(0.0001, t);
    swell.gain.exponentialRampToValueAtTime(0.28, t + 0.6);
    swell.gain.linearRampToValueAtTime(0, t + 0.7);
    noiseSource(ctx, 0.75).connect(band).connect(swell).connect(out);

    const tone = ctx.createOscillator();
    tone.type = 'sawtooth';
    tone.frequency.setValueAtTime(700, t);
    tone.frequency.exponentialRampToValueAtTime(110, t + 0.7);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 7;
    const depth = ctx.createGain();
    depth.gain.value = 25;
    wobble.connect(depth).connect(tone.detune);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1200;
    const level = ctx.createGain();
    level.gain.setValueAtTime(0.0001, t);
    level.gain.exponentialRampToValueAtTime(0.05, t + 0.6);
    level.gain.linearRampToValueAtTime(0, t + 0.7);
    tone.connect(low).connect(level).connect(out);
    for (const osc of [tone, wobble]) {
      osc.start(t);
      osc.stop(t + 0.72);
    }
  },
};
