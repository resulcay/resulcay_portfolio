import type { Phase } from '../scene/time';
import { noise } from './effects';

/**
 * A quiet room: filtered noise as room tone, plus birds by day or crickets in
 * the evening, all made in the browser.
 */
export class Ambience {
  #ctx: AudioContext;
  #out: AudioNode;
  #tone: AudioBufferSourceNode;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(ctx: AudioContext, out: AudioNode) {
    this.#ctx = ctx;
    this.#out = out;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 450;
    const level = ctx.createGain();
    level.gain.value = 0.05;
    this.#tone = ctx.createBufferSource();
    this.#tone.buffer = noise(ctx);
    this.#tone.loop = true;
    this.#tone.connect(low).connect(level).connect(out);
    this.#tone.start();
  }

  setPhase(phase: Phase): void {
    clearTimeout(this.#timer);
    const birds = phase === 'dawn' || phase === 'day';
    const next = () => {
      // While the tab is hidden the context is suspended; don't pile sounds up.
      if (this.#ctx.state === 'running') (birds ? this.#chirps() : this.#crickets());
      this.#timer = setTimeout(next, birds ? 4000 + Math.random() * 5000 : 1500 + Math.random() * 1500);
    };
    this.#timer = setTimeout(next, 1500);
  }

  /** A few FM chirps from a bird across the street. */
  #chirps(): void {
    const ctx = this.#ctx;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const t = ctx.currentTime + i * 0.16;
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(2600, t);
      osc.frequency.exponentialRampToValueAtTime(4200, t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(3000, t + 0.11);
      const mod = ctx.createOscillator();
      mod.frequency.value = 60;
      const depth = ctx.createGain();
      depth.gain.value = 300;
      mod.connect(depth).connect(osc.frequency);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.03, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain).connect(this.#out);
      for (const o of [osc, mod]) {
        o.start(t);
        o.stop(t + 0.13);
      }
    }
  }

  /** Crickets: a high tone pulsed fast, in short bursts. */
  #crickets(): void {
    const ctx = this.#ctx;
    for (let i = 0; i < 3; i++) {
      const t = ctx.currentTime + i * 0.35;
      const osc = ctx.createOscillator();
      osc.frequency.value = 4400;
      const pulse = ctx.createOscillator();
      pulse.type = 'square';
      pulse.frequency.value = 28;
      const am = ctx.createGain();
      am.gain.value = 0;
      pulse.connect(am.gain);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.012, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(am).connect(gain).connect(this.#out);
      for (const o of [osc, pulse]) {
        o.start(t);
        o.stop(t + 0.26);
      }
    }
  }

  dispose(): void {
    clearTimeout(this.#timer);
    this.#tone.stop();
  }
}
