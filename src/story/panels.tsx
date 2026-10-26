import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { StoryData } from '@/application/story';
import type { Locale } from '@/domain/schemas';
import { localizePath, t } from '@/i18n/ui';
import { LINES } from './lines';
import type { Route } from './route';
import type { Phase } from './scene/time';
import { VISITORS, type Visitor } from './visitor';

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

/** The paper-page dialog for whichever object is open. */
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
        <Panel title={project.title} lang={lang} onClose={onClose}>
          <CaseStudy project={project} lang={lang} onAll={() => onGo({ object: 'polaroids' })} />
        </Panel>
      ) : (
        <Panel title={route.paid ? ui.chips.paidWork : t(lang, 'projects.title')} lang={lang} onClose={onClose}>
          <ul className="story-grid">
            {shown.map((p) => (
              <li key={p.slug}>
                <button type="button" onClick={() => onGo({ object: 'polaroids', project: p.slug })}>
                  <strong>{p.title}</strong>
                  <span>{p.hook}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      );
    }
    case 'laptop':
      return (
        <Panel title={t(lang, 'home.experience')} lang={lang} onClose={onClose}>
          <ol className="story-timeline">
            {data.experience.map((e) => (
              <li key={`${e.organization}-${e.start}`}>
                <p className="story-meta">{e.period}</p>
                <h3>{e.title}</h3>
                <p>
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
        </Panel>
      );
    case 'journal':
      return (
        <Panel title={t(lang, 'about.title')} lang={lang} onClose={onClose}>
          <p>{data.profile.summary}</p>
          <h3>{t(lang, 'about.skills')}</h3>
          <dl className="story-skills">
            {data.profile.skills.map((s) => (
              <div key={s.group}>
                <dt>{s.group}</dt>
                <dd>{s.items.join(', ')}</dd>
              </div>
            ))}
          </dl>
          <h3>{t(lang, 'about.education')}</h3>
          <ul>
            {data.profile.education.map((e) => (
              <li key={e.program}>
                {e.program}, {e.school}, {e.start}–{e.end}
                {e.status && <span className="story-badge">{e.status}</span>}
                {e.note && <p className="story-meta">{e.note}</p>}
              </li>
            ))}
          </ul>
          <h3>{t(lang, 'home.testimonials')}</h3>
          {data.testimonials.map((x) => (
            <blockquote key={x.name} className="story-quote">
              <p>{x.quote}</p>
              <footer>{x.name}</footer>
            </blockquote>
          ))}
        </Panel>
      );
    case 'phone':
      return (
        <Panel title={t(lang, 'contact.title')} lang={lang} onClose={onClose}>
          <Contact data={data} lang={lang} siteKey={siteKey} />
        </Panel>
      );
    case 'corkboard':
      return (
        <Panel title={t(lang, 'about.certifications')} lang={lang} onClose={onClose}>
          <ul className="story-cards">
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
        <Panel title={ui.music} lang={lang} onClose={onClose}>
          <p className="hand story-soon">{ui.musicSoon}</p>
        </Panel>
      );
    case 'window':
      return (
        <Panel title={ui.timeOfDay} lang={lang} onClose={onClose}>
          <fieldset className="story-phases">
            <legend className="visually-hidden">{ui.timeOfDay}</legend>
            {(['auto', 'dawn', 'day', 'golden', 'night'] as const).map((choice) => (
              <label key={choice}>
                <input type="radio" name="phase" checked={phaseChoice === choice} onChange={() => onPhase(choice)} />
                {choice === 'auto' ? ui.auto : ui.phases[choice]}
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
 * camera can move back first.
 */
function Panel({ title, lang, onClose, children }: { title: string; lang: Locale; onClose: () => void; children: ReactNode }) {
  const ref = useModal();
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      className="story-panel"
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
          <button type="button" className="button story-panel__close" onClick={onClose}>
            {LINES[lang].ui.close}
          </button>
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

const LINK_KEYS = ['appStore', 'googlePlay', 'website', 'repository'] as const;

function CaseStudy({ project, lang, onAll }: { project: Project; lang: Locale; onAll: () => void }) {
  const ui = LINES[lang].ui;
  return (
    <article className="story-case">
      <p className="hand story-hook">{project.hook}</p>
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
        <ul>
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
      {project.images.map((image) => (
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

/** Contact as a text thread, plus the site's real contact form. */
function Contact({ data, lang, siteKey }: { data: StoryData; lang: Locale; siteKey: string | undefined }) {
  const chat = LINES[lang].ui.chat;
  const form = useRef<HTMLFormElement>(null);
  const [toast, setToast] = useState(false);

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

  // The form logic and Turnstile load only now that the phone is open.
  useEffect(() => {
    const element = form.current;
    if (element) void import('@/scripts/contact-form').then(({ setUpContactForm }) => setUpContactForm(element));
  }, []);

  const phone = data.contact.phone.replace(/^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/, '+90 $1 $2 $3 $4');
  return (
    <>
      {toast && (
        <p className="story-toast" role="status">
          {LINES[lang].ui.consequences}
        </p>
      )}
      <ol className="story-thread">
        <li>{chat.hello}</li>
        <li>{chat.email}</li>
        <li>
          <a href={`mailto:${data.contact.email}`}>{data.contact.email}</a>
        </li>
        <li>{chat.phone}</li>
        <li>
          <a href={`tel:${data.contact.phone}`}>{phone}</a>
        </li>
        <li>{chat.linkedin}</li>
        <li>
          <a href={data.profile.links.linkedin} target="_blank" rel="noopener noreferrer">
            linkedin.com/in/resulcay
          </a>
        </li>
      </ol>
      {siteKey && (
        <form ref={form} className="story-form" data-contact noValidate>
          <h3>{t(lang, 'contact.formTitle')}</h3>
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
          <label>
            <span>{t(lang, 'contact.message')}</span>
            <textarea name="message" rows={5} required minLength={10} maxLength={4000} />
            <small data-error-for="message" />
          </label>
          <label className="visually-hidden" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <input type="hidden" name="lang" value={lang} />
          <div data-turnstile data-sitekey={siteKey} />
          <p className="story-meta">{t(lang, 'contact.privacy')}</p>
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
            <span data-key="failed">{t(lang, 'contact.failed')}</span>
            <span data-key="field-name">{t(lang, 'contact.errName')}</span>
            <span data-key="field-email">{t(lang, 'contact.errEmail')}</span>
            <span data-key="field-message">{t(lang, 'contact.errMessage')}</span>
          </div>
        </form>
      )}
    </>
  );
}
