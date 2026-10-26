import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryData } from '@/application/story';
import type { Locale } from '@/domain/schemas';
import { Stage, type Stats } from './Stage';
import { LINES, OBJECTS, thoughtFor, type StoryObject } from './lines';
import { parseHash, routeForHotspot, toHash, type Route } from './route';
import { phaseAt, type Phase } from './scene/time';
import type { Quality } from './scene/quality';
import { Panels } from './panels';

interface StoryAppProps {
  data: StoryData;
  lang: Locale;
  siteKey: string | undefined;
  hour: number;
  initialQuality: Quality;
  pinned: boolean;
  still: boolean;
  onReady: () => void;
  onQuality: (quality: Quality) => void;
  onStats: (stats: Stats) => void;
}

export function StoryApp({ data, lang, siteKey, hour, ...stage }: StoryAppProps) {
  const lines = LINES[lang];
  const [route, setRoute] = useState<Route | null>(() => parseHash(location.hash));
  // The panel opens once the camera has arrived at its object.
  const [arrived, setArrived] = useState<StoryObject | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [phaseChoice, setPhaseChoice] = useState<Phase | 'auto'>('auto');
  const phase = phaseChoice === 'auto' ? phaseAt(hour) : phaseChoice;
  const focus = route?.object ?? null;

  useEffect(() => {
    setArrived((current) => (current === focus ? current : null));
  }, [focus]);

  useEffect(() => {
    const sync = () => setRoute(parseHash(location.hash));
    addEventListener('popstate', sync);
    return () => removeEventListener('popstate', sync);
  }, []);

  const go = useCallback((next: Route) => {
    history.pushState({ story: true }, '', toHash(next));
    setRoute(next);
  }, []);

  const close = useCallback(() => {
    // Our own history entry: step back, and popstate updates the route.
    if ((history.state as { story?: boolean } | null)?.story) history.back();
    else {
      history.replaceState(null, '', location.pathname + location.search);
      setRoute(null);
    }
  }, []);

  const select = useCallback(
    (id: string) => {
      const next = routeForHotspot(id);
      if (next) go(next);
    },
    [go],
  );

  const hooks = useMemo(() => Object.fromEntries(data.projects.map((p) => [p.slug, p.hook])), [data.projects]);
  const thought = hovered ? thoughtFor(hovered, lang, phase, hooks) : undefined;

  return (
    <>
      <ul className="story-objects" aria-label={lines.ui.objects}>
        {OBJECTS.map((object) => (
          <li key={object}>
            <button
              type="button"
              className="visually-hidden"
              onFocus={() => setHovered(object)}
              onBlur={() => setHovered((current) => (current === object ? null : current))}
              onClick={() => go({ object })}
            >
              {lines.names[object]}
            </button>
          </li>
        ))}
      </ul>
      <div className="story-scene" role="img" aria-label={lines.ui.sceneLabel}>
        <Stage
          {...stage}
          data={data}
          phase={phase}
          hovered={hovered}
          focus={focus}
          onHover={setHovered}
          onSelect={select}
          onArrive={setArrived}
        />
      </div>
      <p className="story-thought" aria-live="polite">
        {thought}
      </p>
      {route && arrived === route.object && (
        <Panels
          route={route}
          data={data}
          lang={lang}
          siteKey={siteKey}
          phaseChoice={phaseChoice}
          onPhase={setPhaseChoice}
          onGo={go}
          onClose={close}
        />
      )}
    </>
  );
}
