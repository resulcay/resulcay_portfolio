export type Phase = 'dawn' | 'day' | 'golden' | 'night';

/** The window follows the visitor's own clock. */
export function phaseAt(hour: number): Phase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'golden';
  return 'night';
}

export interface Light {
  skyTop: string;
  skyBottom: string;
  sun: string;
  sunIntensity: number;
  /** Hemisphere light strength: how bright the shadows are. */
  ambient: number;
  windowGlow: number;
  lightsOn: boolean;
}

export const PHASES: Record<Phase, Light> = {
  dawn: { skyTop: '#7b86c4', skyBottom: '#f6c7a1', sun: '#ffcf9e', sunIntensity: 1.6, ambient: 1.1, windowGlow: 4, lightsOn: false },
  day: { skyTop: '#6fa8dc', skyBottom: '#d6ebf7', sun: '#fff1d8', sunIntensity: 2.2, ambient: 1.4, windowGlow: 4, lightsOn: false },
  golden: { skyTop: '#5b4b8a', skyBottom: '#f2b366', sun: '#f0a85a', sunIntensity: 2.6, ambient: 1.1, windowGlow: 6, lightsOn: false },
  night: { skyTop: '#121831', skyBottom: '#2e3360', sun: '#8fa3ff', sunIntensity: 0.6, ambient: 0.9, windowGlow: 1, lightsOn: true },
};
