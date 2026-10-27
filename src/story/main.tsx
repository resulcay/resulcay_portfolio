import { createRoot } from 'react-dom/client';
import type { StoryData } from '@/application/story';
import type { Locale } from '@/domain/schemas';
import { StoryApp } from './StoryApp';
import { CharacterDebug, isView } from './CharacterDebug';
import { parseQuality } from './scene/quality';
import { engine } from './audio/engine';
import { unlockAudio } from '@/scripts/audio-unlock';

interface MountOptions {
  dataUrl: string;
  lang: Locale;
  /** Turnstile site key for the phone's contact form, when configured. */
  siteKey: string | undefined;
  reducedMotion: boolean;
  /** The AudioContext made in the Start click, if the browser has Web Audio. */
  audio: AudioContext | undefined;
  /** Called once the renderer and scene exist, so the title screen can hide its loader. */
  onReady: () => void;
  onError: (error: unknown) => void;
}

/**
 * Loaded only after Start. Returns a function that tears the 3D view down and
 * frees its WebGL context. State for tests and QA lands on the container as
 * data-ready, data-quality, data-calls, data-triangles, data-fps and
 * data-rewinding. `?quality=` pins a level, `?hour=` sets the clock for the
 * window and `?post=off` turns the post pass off to compare.
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
  const post = params.get('post') !== 'off';

  engine.setTracks(data.music);
  // Without a context from the Start click (a deep link started the story),
  // sound waits for the visitor's first tap or key press.
  // pointerup and keydown are what browsers count as activation (touch only
  // activates on release, and Esc never does).
  const late = (event: Event) => {
    if (event instanceof KeyboardEvent && event.key === 'Escape') return;
    removeEventListener('pointerup', late);
    removeEventListener('keydown', late);
    const ctx = unlockAudio();
    if (ctx) engine.attach(ctx);
  };
  if (options.audio) engine.attach(options.audio);
  else {
    addEventListener('pointerup', late);
    addEventListener('keydown', late);
  }

  const root = createRoot(container, { onUncaughtError: options.onError });
  // ?debug=character: the character alone on a turntable, for review (&view=front|34|side|face, &pose=glasses, &variant=modly).
  if (params.get('debug') === 'character') {
    const view = params.get('view');
    root.render(
      <CharacterDebug
        initialView={isView(view) ? view : '34'}
        variant={params.get('variant') === 'modly' ? 'modly' : 'procedural'}
        pose={params.get('pose') === 'glasses' ? 'glasses' : undefined}
        onReady={() => {
          container.dataset['ready'] = 'true';
          options.onReady();
        }}
        onStats={({ triangles, outlineTriangles, drawCalls }) => {
          container.dataset['triangles'] = String(triangles);
          container.dataset['outlineTriangles'] = String(outlineTriangles);
          container.dataset['calls'] = String(drawCalls);
        }}
      />,
    );
    return () => {
      root.unmount();
      for (const key of ['ready', 'triangles', 'outlineTriangles', 'calls']) delete container.dataset[key];
    };
  }
  // No StrictMode: its dev-only double effect run would drop the WebGL context on first mount.
  root.render(
    <StoryApp
      data={data}
      lang={options.lang}
      siteKey={options.siteKey}
      hour={hour}
      initialQuality={pinned ?? (coarse ? 'medium' : 'high')}
      pinned={pinned !== undefined}
      still={options.reducedMotion}
      post={post}
      onReady={() => {
        container.dataset['ready'] = 'true';
        options.onReady();
      }}
      onQuality={(quality) => (container.dataset['quality'] = quality)}
      onStats={({ calls, triangles, fps }) => {
        container.dataset['calls'] = String(calls);
        container.dataset['triangles'] = String(triangles);
        container.dataset['fps'] = String(Math.round(fps));
      }}
      onRewind={(rewinding) => {
        if (rewinding) container.dataset['rewinding'] = 'true';
        else delete container.dataset['rewinding'];
      }}
    />,
  );
  return () => {
    removeEventListener('pointerup', late);
    removeEventListener('keydown', late);
    root.unmount();
    engine.detach();
    for (const key of ['ready', 'quality', 'calls', 'triangles', 'fps', 'rewinding']) delete container.dataset[key];
  };
}
