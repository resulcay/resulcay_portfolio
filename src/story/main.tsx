import { createRoot } from 'react-dom/client';
import type { StoryData } from '@/application/story';
import { Room } from './Room';

interface MountOptions {
  dataUrl: string;
  reducedMotion: boolean;
  /** Called once the renderer and scene exist, so the title screen can hide its loader. */
  onReady: () => void;
  onError: (error: unknown) => void;
}

/** Loaded only after Start. Returns a function that tears the 3D view down and frees its WebGL context. */
export async function mountStory(container: HTMLElement, options: MountOptions): Promise<() => void> {
  const response = await fetch(options.dataUrl);
  if (!response.ok) throw new Error(`Story data failed: ${response.status}`);
  const data = (await response.json()) as StoryData;

  const root = createRoot(container, { onUncaughtError: options.onError });
  // No StrictMode: its dev-only double effect run would drop the WebGL context on first mount.
  root.render(<Room frames={data.projects.length} reducedMotion={options.reducedMotion} onReady={options.onReady} />);
  return () => root.unmount();
}
