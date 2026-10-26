import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { StoryData } from '@/application/story';
import type { Locale } from '@/domain/schemas';
import { Stage, type Stats } from './Stage';
import { LINES, OBJECTS, thoughtFor, type StoryObject } from './lines';
import { parseHash, routeForHotspot, toHash, type Route } from './route';
import { phaseAt, type Phase } from './scene/time';
import type { Quality } from './scene/quality';
import { Choice, Panels } from './panels';
import { engine } from './audio/engine';
import { browserStorage, nextTarget, readVisited, readVisitor, saveVisited, saveVisitor, type Visitor } from './visitor';

interface StoryAppProps {
  data: StoryData;
  lang: Locale;
  siteKey: string | undefined;
  hour: number;
  initialQuality: Quality;
  pinned: boolean;
  still: boolean;
  post: boolean;
  onReady: () => void;
  onQuality: (quality: Quality) => void;
  onStats: (stats: Stats) => void;
  onRewind: (rewinding: boolean) => void;
}

const REWIND_MS = 700;

export function StoryApp({ data, lang, siteKey, hour, onRewind, ...stage }: StoryAppProps) {
  const lines = LINES[lang];
  const [route, setRoute] = useState<Route | null>(() => parseHash(location.hash));
  // The panel opens once the camera has arrived at its object.
  const [arrived, setArrived] = useState<StoryObject | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [phaseChoice, setPhaseChoice] = useState<Phase | 'auto'>('auto');
  const [visitor, setVisitor] = useState<Visitor | null>(() => readVisitor(browserStorage('localStorage')));
  const [visited, setVisited] = useState<StoryObject[]>(() => readVisited(browserStorage('sessionStorage')));
  const [remembered, setRemembered] = useState(false);
  const [rewind, setRewind] = useState(0);
  const [rewinding, setRewinding] = useState(false);
  const phase = phaseChoice === 'auto' ? phaseAt(hour) : phaseChoice;
  const focus = route?.object ?? null;

  useEffect(() => {
    setArrived((current) => (current === focus ? current : null));
  }, [focus]);

  useEffect(() => {
    if (!arrived) return;
    setVisited((current) => (current.includes(arrived) ? current : [...current, arrived]));
  }, [arrived]);

  useEffect(() => saveVisited(browserStorage('sessionStorage'), visited), [visited]);

  const startRewind = useCallback(() => {
    setRewind((n) => n + 1);
    setRewinding(true);
    engine.effect('rewind');
  }, []);

  useEffect(() => {
    if (!rewinding) return;
    const timer = setTimeout(() => setRewinding(false), REWIND_MS);
    return () => clearTimeout(timer);
  }, [rewinding, rewind]);

  useEffect(() => {
    onRewind(rewinding);
  }, [rewinding, onRewind]);

  useEffect(() => {
    if (!remembered) return;
    const timer = setTimeout(() => setRemembered(false), 3000);
    return () => clearTimeout(timer);
  }, [remembered]);

  useEffect(() => {
    // Every step back through history is a rewind.
    const sync = () => {
      setRoute(parseHash(location.hash));
      startRewind();
    };
    addEventListener('popstate', sync);
    return () => removeEventListener('popstate', sync);
  }, [startRewind]);

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
      startRewind();
    }
  }, [startRewind]);

  const select = useCallback(
    (id: string) => {
      const next = routeForHotspot(id);
      if (next) go(next);
    },
    [go],
  );

  const choose = (next: Visitor | null) => {
    saveVisitor(browserStorage('localStorage'), next);
    setVisitor(next);
    setRemembered(next !== null);
  };

  // Sound. The engine stays silent until the Start click handed it a context.
  const audio = useSyncExternalStore(engine.subscribe, engine.snapshot);
  const open = visitor !== null && route !== null && arrived === route.object;

  useEffect(() => {
    if (hovered) engine.effect('tick');
  }, [hovered]);

  useEffect(() => {
    engine.duck(open);
    if (!open || !route) return;
    engine.effect(route.object === 'phone' ? 'buzz' : route.object === 'journal' ? 'scratch' : 'whoosh');
  }, [open, route?.object]);

  useEffect(() => engine.setPhase(phase), [phase]);

  // Music starts quietly a couple of seconds after the visitor is known.
  useEffect(() => {
    if (!visitor) return;
    const timer = setTimeout(() => engine.startMusic(), 2000);
    return () => clearTimeout(timer);
  }, [visitor]);

  useEffect(() => {
    const sync = () => engine.setHidden(document.hidden);
    const mute = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]');
      // Autofill and password managers send keydown events with no key at all.
      if (typeof event.key === 'string' && event.key.toLowerCase() === 'm' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) engine.setMuted(!engine.snapshot().muted);
    };
    document.addEventListener('visibilitychange', sync);
    addEventListener('keydown', mute);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      removeEventListener('keydown', mute);
    };
  }, []);

  const hooks = useMemo(() => Object.fromEntries(data.projects.map((p) => [p.slug, p.hook])), [data.projects]);
  const thought = hovered ? thoughtFor(hovered, lang, phase, hooks) : undefined;
  const guide = visitor ? nextTarget(visitor, visited) : null;
  const chips = lines.ui.chips;

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
        <li>
          <button
            type="button"
            className="visually-hidden"
            onFocus={() => setHovered('resul')}
            onBlur={() => setHovered((current) => (current === 'resul' ? null : current))}
            onClick={() => select('resul')}
          >
            {lines.ui.resul}
          </button>
        </li>
        {guide && (
          <li>
            <button type="button" className="visually-hidden" onClick={() => setHovered(guide)}>
              {lines.ui.guide}
            </button>
          </li>
        )}
      </ul>
      <div className="story-scene" role="img" aria-label={lines.ui.sceneLabel}>
        <Stage
          {...stage}
          data={data}
          phase={phase}
          hovered={hovered}
          focus={focus}
          guide={guide}
          rewind={rewind}
          rewinding={rewinding}
          spinning={audio.playing}
          onHover={setHovered}
          onSelect={select}
          onArrive={setArrived}
        />
      </div>
      {visitor && (
        <div className="story-hud">
          {visitor === 'recruiter' && (
            <>
              <a className="story-chip" href={data.contact.cvPath} download>
                {chips.cv}
              </a>
              <button type="button" className="story-chip" onClick={() => go({ object: 'laptop' })}>
                {chips.experience}
              </button>
              <button type="button" className="story-chip" onClick={() => go({ object: 'phone' })}>
                {chips.contact}
              </button>
            </>
          )}
          {visitor === 'client' && (
            <>
              <button type="button" className="story-chip" onClick={() => go({ object: 'polaroids' })}>
                {chips.projects}
              </button>
              <button type="button" className="story-chip" onClick={() => go({ object: 'polaroids', paid: true })}>
                {chips.paidWork}
              </button>
              <button type="button" className="story-chip" onClick={() => go({ object: 'phone' })}>
                {chips.contact}
              </button>
            </>
          )}
          <button type="button" className="story-hud__change" onClick={() => choose(null)}>
            {lines.ui.change}
          </button>
        </div>
      )}
      <button
        type="button"
        className="story-mute"
        aria-pressed={audio.muted}
        aria-label={lines.ui.audio.mute}
        title={`${lines.ui.audio.mute} (M)`}
        onClick={() => engine.setMuted(!audio.muted)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"></path>
          {audio.muted ? (
            <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
          ) : (
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"></path>
          )}
        </svg>
      </button>
      <p className="story-thought" aria-live="polite">
        {remembered ? lines.ui.remember : thought}
      </p>
      {rewinding && (
        <svg className="story-rewind" width="44" height="32" viewBox="0 0 22 16" role="img" aria-label={lines.ui.rewinding}>
          <path d="M11 1 L1 8 L11 15Z M21 1 L11 8 L21 15Z" fill="currentColor"></path>
        </svg>
      )}
      {!visitor && <Choice lang={lang} onChoose={choose} />}
      {open && route && visitor && (
        <Panels
          route={route}
          data={data}
          lang={lang}
          siteKey={siteKey}
          visitor={visitor}
          phaseChoice={phaseChoice}
          onPhase={setPhaseChoice}
          onGo={go}
          onClose={close}
        />
      )}
    </>
  );
}
