import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { StoryData } from '@/application/story';
import { BUTTERFLY_ART } from '@/components/butterfly-art';
import type { Locale } from '@/domain/schemas';
import { localizePath, t } from '@/i18n/ui';
import { LINES } from './lines';
import type { Route } from './route';
import type { Phase } from './scene/time';
import { VISITORS, type Visitor } from './visitor';
import { engine } from './audio/engine';
import type { Bus } from './audio/volumes';

type Project = StoryData['projects'][number];

interface PanelsProps {
  route: Route;
  data: StoryData;
  lang: Locale;
  siteKey: string | undefined;
  visitor: Visitor;
  phaseChoice: Phase | 'auto';
  onPhase: (phase: Phase | 'auto') => void;
  onGo: (route: Route) => void;
  onClose: () => void;
}

/** The sunset palettes of the polaroid photos, as on the home page's cards. */
const PALETTES = [
  ['#5b4b8a', '#e8a657', '#2f6f73'],
  ['#2f6f73', '#f6c47e', '#1e1b24'],
  ['#d98a62', '#5b4b8a', '#2f6f73'],
  ['#3b3060', '#e8a657', '#4fa3d9'],
] as const;

/**
 * Each object opens its own kind of page: the lighthouse poster your writing as sea charts at dusk, the phone the home page's contact phone, the
 * laptop a laptop screen, the photo wall polaroids, the journal a notebook, the cork board
 * pinned cards, the record player a spinning record, the window its skies.
 */
export function Panels({ route, data, lang, siteKey, visitor, phaseChoice, onPhase, onGo, onClose }: PanelsProps) {
  const ui = LINES[lang].ui;
  switch (route.object) {
    case 'polaroids': {
      const project = data.projects.find((p) => p.slug === route.project);
      // A client sees paid work first (a stable sort keeps the rest in order); "Paid work" shows only that.
      const shown = route.paid
        ? data.projects.filter((p) => p.paid)
        : visitor === 'client'
          ? [...data.projects].sort((a, b) => Number(b.paid) - Number(a.paid))
          : data.projects;
      return project ? (
        <Panel variant="case" title={project.title} lang={lang} onClose={onClose}>
          <CaseStudy project={project} index={data.projects.indexOf(project)} lang={lang} onAll={() => onGo({ object: 'polaroids' })} />
        </Panel>
      ) : (
        <Panel variant="wall" title={route.paid ? ui.chips.paidWork : t(lang, 'projects.title')} lang={lang} onClose={onClose}>
          <ul className="story-wall">
            {shown.map((p) => (
              <li key={p.slug}>
                <button type="button" onClick={() => onGo({ object: 'polaroids', project: p.slug })}>
                  <Photo project={p} index={data.projects.indexOf(p)} />
                  <strong>{p.title}</strong>
                  <span>{p.hook}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      );
    }
    case 'lighthouse':
      return (
        <Panel variant="lighthouse" title={t(lang, 'home.writing')} lang={lang} onClose={onClose}>
          {data.writing.length > 0 ? (
            <ul className="story-charts">
              {data.writing.map((article) => (
                <li key={article.url} className="story-chart">
                  <svg className="story-chart__compass" viewBox="-20 -20 40 40" aria-hidden="true">
                    <circle r="13" fill="none" stroke="currentColor" strokeWidth="0.8" />
                    <path d="M0-9 1.6-1.6 9 0 1.6 1.6 0 9-1.6 1.6-9 0-1.6-1.6Z" transform="rotate(45)" fill="currentColor" opacity="0.6" />
                    <path d="M0-19 3-3 19 0 3 3 0 19-3 3-19 0-3-3Z" fill="currentColor" />
                  </svg>
                  <p className="story-chart__when">{article.date}</p>
                  <h3>
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      {article.title}
                    </a>
                  </h3>
                  {article.summary && <p>{article.summary}</p>}
                  <ul className="story-chips">
                    {article.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hand story-soon">{ui.noArticles}</p>
          )}
          <p className="story-links">
            <a href={data.profile.links.medium} target="_blank" rel="noopener noreferrer">
              {t(lang, 'home.allArticles')}
            </a>
          </p>
        </Panel>
      );
    case 'laptop':
      return (
        <Panel variant="laptop" title={t(lang, 'home.experience')} lang={lang} onClose={onClose} closeButton={false}>
          <div className="story-laptop">
            <div className="story-laptop__screen">
              {/* The window's red button is this page's Close. */}
              <div className="story-laptop__bar">
                <button type="button" className="story-laptop__close" aria-label={ui.close} title={ui.close} onClick={onClose}>
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
                  </svg>
                </button>
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <b aria-hidden="true">experience.md</b>
              </div>
              <ol className="story-timeline">
                {data.experience.map((e) => (
                  <li key={`${e.organization}-${e.start}`}>
                    <p className="story-timeline__when">{e.period}</p>
                    <h3>{e.title}</h3>
                    <p className="story-meta">
                      {e.organization} · {e.location}
                    </p>
                    <ul>
                      {e.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Panel>
      );
    case 'journal':
      return (
        <Panel variant="journal" title={t(lang, 'about.title')} lang={lang} onClose={onClose}>
          <p className="story-journal__lead">{data.profile.summary}</p>
          <h3>{t(lang, 'about.skills')}</h3>
          <dl className="story-skills">
            {data.profile.skills.map((s) => (
              <div key={s.group}>
                <dt>{s.group}</dt>
                <dd>
                  {s.items.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <h3>{t(lang, 'about.education')}</h3>
          <ul className="story-schools">
            {data.profile.education.map((e) => (
              <li key={e.program}>
                <strong>{e.program}</strong>, {e.school}, {e.start}–{e.end}
                {e.status && <span className="story-badge">{e.status}</span>}
                {e.note && <p className="story-meta">{e.note}</p>}
              </li>
            ))}
          </ul>
          <h3>{t(lang, 'home.testimonials')}</h3>
          <div className="story-notes">
            {data.testimonials.map((x) => (
              <blockquote key={x.name} className="story-quote">
                <p>{x.quote}</p>
                <footer>{x.name}</footer>
              </blockquote>
            ))}
          </div>
        </Panel>
      );
    case 'phone':
      return (
        <Panel variant="phone" title={t(lang, 'contact.title')} lang={lang} onClose={onClose}>
          <Contact data={data} lang={lang} siteKey={siteKey} />
        </Panel>
      );
    case 'corkboard':
      return (
        <Panel variant="cork" title={t(lang, 'about.certifications')} lang={lang} onClose={onClose}>
          <ul className="story-pins">
            {data.profile.certifications.map((c) => (
              <li key={c.name}>
                <strong>{c.name}</strong>
                <span>{c.issuer}</span>
              </li>
            ))}
          </ul>
        </Panel>
      );
    case 'recordPlayer':
      return (
        <Panel variant="record" title={ui.music} lang={lang} onClose={onClose}>
          <RecordPlayer data={data} lang={lang} />
        </Panel>
      );
    case 'window':
      return (
        <Panel variant="window" title={ui.timeOfDay} lang={lang} onClose={onClose}>
          <fieldset className="story-skies">
            <legend className="visually-hidden">{ui.timeOfDay}</legend>
            {(['dawn', 'day', 'golden', 'night', 'auto'] as const).map((choice) => (
              <label key={choice} className={`story-sky story-sky--${choice}`}>
                <input type="radio" name="phase" checked={phaseChoice === choice} onChange={() => onPhase(choice)} />
                <span>{choice === 'auto' ? ui.auto : ui.phases[choice]}</span>
              </label>
            ))}
          </fieldset>
        </Panel>
      );
  }
}

/**
 * A native modal dialog: the browser traps focus, closes on Esc and puts
 * focus back where it was. Esc and backdrop clicks go through onClose so the
 * camera can move back first. `variant` gives each object its own page.
 */
function Panel({
  variant,
  title,
  lang,
  onClose,
  closeButton = true,
  children,
}: {
  variant: string;
  title: string;
  lang: Locale;
  onClose: () => void;
  /** False when the page brings its own Close (the laptop's window button). */
  closeButton?: boolean;
  children: ReactNode;
}) {
  const ref = useModal();
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      className={`story-panel story-panel--${variant}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="story-panel__page">
        <header className="story-panel__head">
          <h2 id={titleId}>{title}</h2>
          {closeButton && (
            <button type="button" className="button story-panel__close" onClick={onClose}>
              {LINES[lang].ui.close}
            </button>
          )}
        </header>
        {children}
      </div>
    </dialog>
  );
}

/** Opens a dialog as modal on mount and closes it on unmount. */
function useModal() {
  const ref = useRef<HTMLDialogElement>(null);
  // A layout effect, so close() runs before React removes the element and focus is restored.
  useLayoutEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return ref;
}

/** "Who's visiting?" on the first visit. Esc counts as just looking around. */
export function Choice({ lang, onChoose }: { lang: Locale; onChoose: (visitor: Visitor) => void }) {
  const ui = LINES[lang].ui;
  const ref = useModal();
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      className="story-panel story-choice"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onChoose('explorer');
      }}
    >
      <div className="story-panel__page">
        <h2 id={titleId}>{ui.who}</h2>
        <div className="story-actions">
          {VISITORS.map((visitor, i) => (
            <button key={visitor} type="button" className={i === 0 ? 'button button--primary' : 'button'} onClick={() => onChoose(visitor)}>
              {ui.visitors[visitor]}
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}

/** A polaroid's photo: the project's first image, or a little sunset in its palette. */
function Photo({ project, index }: { project: Project; index: number }) {
  const image = project.images[0];
  const [sky, sun, sea] = PALETTES[index % PALETTES.length] ?? PALETTES[0];
  return (
    <span className="story-photo" aria-hidden="true">
      {image ? (
        <img src={image.src} alt="" width={image.width} height={image.height} loading="lazy" />
      ) : (
        <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
          <rect width="320" height="200" fill={sky} />
          <circle cx={110 + ((index * 47) % 110)} cy="128" r="34" fill={sun} />
          <rect y="132" width="320" height="68" fill={sea} />
        </svg>
      )}
    </span>
  );
}

/** Now playing on a record that turns while music plays, the controls, the playlist, the three volumes and the credits. */
function RecordPlayer({ data, lang }: { data: StoryData; lang: Locale }) {
  const audio = LINES[lang].ui.audio;
  const state = useSyncExternalStore(engine.subscribe, engine.snapshot);
  const current = data.music[state.index];
  const buses: Bus[] = data.music.length > 0 ? ['music', 'effects', 'ambience'] : ['effects', 'ambience'];
  return (
    <>
      <div className="story-deck">
        <div className={state.playing ? 'story-vinyl is-playing' : 'story-vinyl'} aria-hidden="true">
          <span />
        </div>
        <div className="story-deck__now">
          {data.music.length > 0 && current ? (
            <>
              <p className="story-meta">{audio.nowPlaying}</p>
              <p className="hand story-hook">
                {current.title} · {current.artist}
              </p>
              <div className="story-actions">
                <button type="button" className="button" onClick={() => engine.prev()}>
                  {audio.prev}
                </button>
                <button type="button" className="button button--primary" onClick={() => engine.toggle()}>
                  {state.playing ? audio.pause : audio.play}
                </button>
                <button type="button" className="button" onClick={() => engine.next()}>
                  {audio.next}
                </button>
              </div>
            </>
          ) : (
            <p className="hand story-soon">{audio.noTracks}</p>
          )}
        </div>
      </div>
      {data.music.length > 0 && (
        <>
          <h3>{audio.tracks}</h3>
          <ol className="story-tracks">
            {data.music.map((track, i) => (
              <li key={track.url}>
                <button type="button" aria-current={i === state.index ? 'true' : undefined} onClick={() => engine.select(i)}>
                  {track.title} · {track.artist}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
      <h3>{audio.volume}</h3>
      <div className="story-sliders">
        {buses.map((bus) => (
          <label key={bus}>
            <span>{audio[bus]}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state[bus]}
              onChange={(event) => engine.setVolume(bus, Number(event.currentTarget.value))}
            />
          </label>
        ))}
      </div>
      <h3>{audio.credits}</h3>
      {data.music.length > 0 && (
        <ul className="story-credits">
          {data.music.map((track) => (
            <li key={track.url}>
              {track.title} · {track.artist} · {audio.license}: {track.license} ·{' '}
              <a href={track.sourceUrl} target="_blank" rel="noopener noreferrer">
                {audio.source}
              </a>
              {track.credit && <p className="story-meta">{track.credit}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="story-meta">{audio.inspired}</p>
    </>
  );
}

const LINK_KEYS = ['appStore', 'googlePlay', 'website', 'repository'] as const;

/** One project as a big polaroid over a journal page. */
function CaseStudy({ project, index, lang, onAll }: { project: Project; index: number; lang: Locale; onAll: () => void }) {
  const ui = LINES[lang].ui;
  return (
    <article className="story-case">
      <figure className="story-case__polaroid">
        <Photo project={project} index={index} />
        <figcaption className="hand">{project.hook}</figcaption>
      </figure>
      <dl className="story-facts">
        <div>
          <dt>{t(lang, 'project.role')}</dt>
          <dd>{project.role}</dd>
        </div>
        {project.period && (
          <div>
            <dt>{t(lang, 'project.period')}</dt>
            <dd>{project.period}</dd>
          </div>
        )}
      </dl>
      {project.story.split(/\n{2,}/).map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {project.highlights.length > 0 && (
        <ul className="story-highlights">
          {project.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
      <ul className="story-chips">
        {project.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      {project.images.slice(1).map((image) => (
        <img key={image.src} src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" />
      ))}
      <p className="story-links">
        {LINK_KEYS.flatMap((key) => {
          const href = project.links[key];
          return href ? [<a key={key} href={href} target="_blank" rel="noopener noreferrer">{t(lang, `link.${key}`)}</a>] : [];
        })}
      </p>
      <div className="story-actions">
        <a className="button button--primary" href={localizePath(`/projects/${project.slug}`, lang)}>
          {ui.readOnJournal}
        </a>
        <button type="button" className="button" onClick={onAll}>
          {ui.allProjects}
        </button>
      </div>
    </article>
  );
}

const SEEN_KEY = 'story-phone-seen';

/** The visitor's own time, for the phone's status bar. */
function useClock(lang: Locale) {
  const time = () => new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  const [now, setNow] = useState(time);
  useEffect(() => {
    const timer = setInterval(() => setNow(time()), 30_000);
    return () => clearInterval(timer);
  }, [lang]);
  return now;
}

/** The home page's contact phone (styles/phone.css): the same frame, chat bubble, form and contact list. */
function Contact({ data, lang, siteKey }: { data: StoryData; lang: Locale; siteKey: string | undefined }) {
  const form = useRef<HTMLFormElement>(null);
  const [toast, setToast] = useState(false);
  const clock = useClock(lang);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        localStorage.setItem(SEEN_KEY, '1');
        setToast(true);
      }
    } catch {
      // Storage can be blocked; the toast is only a joke.
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(false), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // The same form logic as the home page; Turnstile loads only on Send.
  useEffect(() => {
    const element = form.current;
    if (element) void import('@/scripts/contact-form').then(({ setUpContactForm }) => setUpContactForm(element));
  }, []);

  const phone = data.contact.phone.replace(/^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/, '+90 $1 $2 $3 $4');
  return (
    <div className="phone">
      <div className="phone__screen">
        <div className="phone__status" aria-hidden="true">
          <span>{clock}</span>
          <span className="phone__icons">
            <svg viewBox="0 0 18 12">
              <rect x="0" y="8" width="3" height="4" rx="1" />
              <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
              <rect x="10" y="3" width="3" height="9" rx="1" />
              <rect x="15" y="0" width="3" height="12" rx="1" />
            </svg>
            <svg viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1 4.5a10 10 0 0 1 14 0M3.6 7.2a6.2 6.2 0 0 1 8.8 0" />
              <circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            <svg viewBox="0 0 26 12">
              <rect x="0.75" y="0.75" width="21.5" height="10.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <rect x="3" y="3" width="13" height="6" rx="1.5" />
              <rect x="23.5" y="4" width="2" height="4" rx="1" />
            </svg>
          </span>
        </div>
        {toast && (
          <p className="story-notification" role="status">
            {LINES[lang].ui.consequences}
          </p>
        )}
        <div className="phone__bar">
          <svg width="22" height="18" viewBox="-22 -18 44 36" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BUTTERFLY_ART }} />
          <span>{data.profile.name}</span>
        </div>
        <div className="phone__chat">
          <p className="phone__bubble">
            {t(lang, 'contact.intro')} {data.profile.availability}
          </p>
          {siteKey && (
            <form ref={form} className="contact-form" data-contact noValidate>
              <h3>{t(lang, 'contact.formTitle')}</h3>
              <div className="contact-form__row">
                <label>
                  <span>{t(lang, 'contact.name')}</span>
                  <input name="name" autoComplete="name" required maxLength={80} />
                  <small data-error-for="name" />
                </label>
                <label>
                  <span>{t(lang, 'contact.yourEmail')}</span>
                  <input name="email" type="email" autoComplete="email" required maxLength={120} />
                  <small data-error-for="email" />
                </label>
              </div>
              <label>
                <span>{t(lang, 'contact.message')}</span>
                <textarea name="message" rows={2} required minLength={10} maxLength={4000} />
                <small data-error-for="message" />
              </label>
              <label className="visually-hidden" aria-hidden="true">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              <input type="hidden" name="lang" value={lang} />
              <div data-turnstile data-sitekey={siteKey} />
              <p className="contact-form__note">{t(lang, 'contact.privacy')}</p>
              <p role="status" aria-live="polite" />
              <div>
                <button type="submit" className="button button--primary">
                  {t(lang, 'contact.send')}
                </button>
              </div>
              <div data-messages hidden>
                <span data-key="sending">{t(lang, 'contact.sending')}</span>
                <span data-key="sent">{t(lang, 'contact.sent')}</span>
                <span data-key="human">{t(lang, 'contact.humanWait')}</span>
                <span data-key="human-failed">{t(lang, 'contact.humanFailed')}</span>
                <span data-key="failed">{t(lang, 'contact.failed')}</span>
                <span data-key="field-name">{t(lang, 'contact.errName')}</span>
                <span data-key="field-email">{t(lang, 'contact.errEmail')}</span>
                <span data-key="field-message">{t(lang, 'contact.errMessage')}</span>
              </div>
            </form>
          )}
        </div>
        <div className="phone__contacts">
          <dl>
            <div>
              <dt>{t(lang, 'contact.email')}</dt>
              <dd>
                <a href={`mailto:${data.contact.email}`}>{data.contact.email}</a>
              </dd>
            </div>
            <div>
              <dt>{t(lang, 'contact.phone')}</dt>
              <dd>
                <a href={`tel:${data.contact.phone}`}>{phone}</a>
              </dd>
            </div>
            <div>
              <dt>LinkedIn</dt>
              <dd>
                <a href={data.profile.links.linkedin} target="_blank" rel="noopener noreferrer">
                  linkedin.com/in/resulcay
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
