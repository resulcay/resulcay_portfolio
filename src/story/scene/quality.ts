export type Quality = 'low' | 'medium' | 'high';

const LEVELS: Quality[] = ['low', 'medium', 'high'];

export const DPR: Record<Quality, [number, number]> = { high: [1, 1.75], medium: [1, 1.25], low: [1, 1] };

export function parseQuality(value: string | null): Quality | undefined {
  return LEVELS.find((level) => level === value);
}

/**
 * Steps quality down when frames get slow. It only steps up while nothing has
 * been lowered yet, so it can never flip back and forth between two levels.
 */
export function createQualityGovernor(initial: Quality) {
  let level = initial;
  let lowered = false;
  let goodWindows = 0;
  return {
    get level() {
      return level;
    },
    /** Feed the average fps of one ~2 s window; returns the level to use. */
    window(fps: number): Quality {
      const i = LEVELS.indexOf(level);
      const floor = level === 'high' ? 50 : 30;
      if (i > 0 && fps < floor) {
        level = LEVELS[i - 1]!;
        lowered = true;
        goodWindows = 0;
      } else if (!lowered && i < LEVELS.length - 1 && fps >= 58) {
        if (++goodWindows >= 2) {
          level = LEVELS[i + 1]!;
          goodWindows = 0;
        }
      } else {
        goodWindows = 0;
      }
      return level;
    },
  };
}
