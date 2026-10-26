import { createRoot } from 'react-dom/client';
import type { StoryData } from '@/application/story';
import { Stage } from './Stage';
import { phaseAt } from './scene/time';
import { parseQuality } from './scene/quality';

interface MountOptions {
  dataUrl: string;
  reducedMotion: boolean;
  /** Called once the renderer and scene exist, so the title screen can hide its loader. */
  onReady: () => void;
  onError: (error: unknown) => void;
}

/**
 * Loaded only after Start. Returns a function that tears the 3D view down and
 * frees its WebGL context. State for tests and QA lands on the container as
 * data-ready, data-quality, data-calls and data-triangles. `?quality=` pins a
 * level and `?hour=` sets the clock for the window.
 */
export async function mountStory(container: HTMLElement, options: MountOptions): Promise<() => void> {
  const [response] = await Promise.all([
    fetch(options.dataUrl),
    // Canvas text needs the fonts in memory before it's painted.
    document.fonts.load('600 26px "Fraunces Variable"'),
    document.fonts.load('500 26px Caveat'),
    document.fonts.load('700 21px "Atkinson Hyperlegible"'),
    document.fonts.load('400 15px "Atkinson Hyperlegible"'),
  ]);
  if (!response.ok) throw new Error(`Story data failed: ${response.status}`);
  const data = (await response.json()) as StoryData;

  const params = new URLSearchParams(location.search);
  const pinned = parseQuality(params.get('quality'));
  const hourParam = Number(params.get('hour'));
  const hour = params.has('hour') && hourParam >= 0 && hourParam < 24 ? hourParam : new Date().getHours();
  const coarse = matchMedia('(pointer: coarse)').matches;

  const root = createRoot(container, { onUncaughtError: options.onError });
  // No StrictMode: its dev-only double effect run would drop the WebGL context on first mount.
  root.render(
    <Stage
      data={data}
      phase={phaseAt(hour)}
      initialQuality={pinned ?? (coarse ? 'medium' : 'high')}
      pinned={pinned !== undefined}
      still={options.reducedMotion}
      onReady={() => {
        container.dataset['ready'] = 'true';
        options.onReady();
      }}
      onQuality={(quality) => (container.dataset['quality'] = quality)}
      onStats={({ calls, triangles }) => {
        container.dataset['calls'] = String(calls);
        container.dataset['triangles'] = String(triangles);
      }}
    />,
  );
  return () => {
    root.unmount();
    for (const key of ['ready', 'quality', 'calls', 'triangles']) delete container.dataset[key];
  };
}
