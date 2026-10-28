// The home page as a show, told with three animation libraries, each where it's best:
//   GSAP (+ ScrollTrigger): the hero's "Episode 1" title card, the experience path
//     drawn as you scroll, and the lighthouse's lamp flaring when the Writing section arrives.
//   anime.js: the Story mode card's text, the "At a glance" notebook opening with its numbers counting up, and the featured
//     polaroids pinned one by one inside the cork board's wooden frame.
//   Motion: the Story mode card's watercolour diorama (a brush stroke painting the pencil sketch
//     in, layers moving with the pointer; components/SunsetScene.astro), springy entrances
//     for headings, the Writing charts, the sticky notes and the phone,
//     and the scroll progress that drives the particle backdrop (scripts/particle-backdrop.ts).
// Nothing runs with reduced motion. Starting poses are set while the page is still
// hidden behind the font veil (html.loading); if a library fails to load they are
// cleared again, so the page always ends up fully visible.

import { mountHeroLetters } from './hero-letters';
import { mountParticleBackdrop } from './particle-backdrop';

const root = document.documentElement;
const $ = <T extends Element = HTMLElement>(selector: string) => [...document.querySelectorAll<T & Element>(selector)] as T[];

/** Every element the show moves, with the pose it starts from. */
const posed: { el: HTMLElement | SVGElement; style: Partial<CSSStyleDeclaration> }[] = [];
const pose = (els: (HTMLElement | SVGElement)[], style: Partial<CSSStyleDeclaration>) => {
  for (const el of els) {
    posed.push({ el, style });
    Object.assign(el.style, style);
  }
};
const unpose = () => {
  for (const { el, style } of posed) for (const key of Object.keys(style)) el.style.removeProperty(key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
};

/** Resolves once the font veil is gone and the page is on screen. */
const shown = () =>
  new Promise<void>((resolve) => {
    if (!root.classList.contains('loading')) return resolve();
    const watch = new MutationObserver(() => {
      if (root.classList.contains('loading')) return;
      watch.disconnect();
      resolve();
    });
    watch.observe(root, { attributes: true, attributeFilter: ['class'] });
  });

export async function startHomeShow(): Promise<void> {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Hero: split the name into letters for the title card, keeping it readable as one word.
  const title = document.querySelector<HTMLElement>('.hero h1');
  if (title?.textContent) {
    const name = title.textContent;
    title.setAttribute('aria-label', name);
    title.replaceChildren(
      ...[...name].map((char) => {
        const span = document.createElement('span');
        span.className = 'show-letter';
        span.setAttribute('aria-hidden', 'true');
        // An inline-block space collapses, so keep it as a non-breaking one.
        span.textContent = char === ' ' ? ' ' : char;
        return span;
      }),
    );
  }
  const letters = $('.hero .show-letter');
  const heroBits = $('.hero__role, .hero__summary, .hero__actions > *');
  pose($('.hero__kicker'), { clipPath: 'inset(0 100% 0 0)' });
  pose(letters, { opacity: '0', display: 'inline-block' });
  pose(heroBits, { opacity: '0' });

  // Sunset card, notebook, cork board.
  // The diorama's brush stroke, undrawn: only the pencil sketch shows until it's painted in.
  const brush = document.querySelector<SVGPathElement>('#diorama-brush');
  const stroke = brush?.getTotalLength() ?? 0;
  if (brush) pose([brush], { strokeDasharray: `${stroke}`, strokeDashoffset: `${stroke}` });
  pose($('.teaser__text > *'), { opacity: '0' });
  pose($('.spread .page'), { opacity: '0' });
  pose($('.glance li'), { opacity: '0' });
  pose($('.corkboard'), { clipPath: 'inset(0 50% 0 50% round 14px)' });
  pose($('.corkboard .polaroid'), { opacity: '0' });

  // Timeline, lighthouse, notes, phone, headings.
  pose($('.timeline > li'), { opacity: '0' });
  pose($('.lighthouse .article'), { opacity: '0' });
  pose($('.quotes figure'), { opacity: '0' });
  pose($('.contact .phone'), { opacity: '0' });
  pose($('main .section h2:not(.lighthouse h2), .lighthouse__head'), { opacity: '0' });

  let libs;
  try {
    const [gsapModule, triggerModule, anime, motion] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('animejs'), import('motion')]);
    libs = { gsap: gsapModule.gsap, ScrollTrigger: triggerModule.ScrollTrigger, anime, motion };
  } catch (error) {
    console.error('Home show could not load', error);
    unpose();
    return;
  }
  const { gsap, ScrollTrigger, anime, motion } = libs;
  gsap.registerPlugin(ScrollTrigger);
  await shown();
  // Behind it all, the particles tell the story as the page scrolls (Motion's scroll progress).
  mountParticleBackdrop((onProgress) => motion.scroll(onProgress));

  /** Runs `play` once, the first time `el` scrolls into view. */
  const once = (el: Element | null | undefined, play: () => void, amount = 0.3) => {
    if (el) motion.inView(el, () => void play(), { amount });
  };

  // Once an animation ends, its targets' inline styles go entirely, so the page's own CSS (tilts,
  // hover lifts, the cork board's frame) takes over again. Not anime's cleanInlineStyles: that
  // restores the inline styles from before the animation, which here are the hidden starting poses.
  // The strict CSP allows no style attributes in the markup, so everything inline came from the show.
  const tidy = {
    onComplete: (done: { targets: unknown[] }) => {
      for (const target of done.targets) if (target instanceof Element) target.removeAttribute('style');
    },
  };

  // ── GSAP: the "Episode 1" title card ────────────────────────────────────────
  // Then the name becomes plain text again (true kerning) and its letters come alive under the pointer.
  void gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .to('.hero__kicker', { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'power2.inOut', clearProps: 'clipPath' })
    .fromTo(letters, { opacity: 0, y: 46, rotate: -8, filter: 'blur(6px)' }, { opacity: 1, y: 0, rotate: 0, filter: 'blur(0px)', duration: 0.9, stagger: 0.06, clearProps: 'opacity,transform,filter' }, '-=0.45')
    .fromTo(heroBits, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, clearProps: 'opacity,transform' }, '-=0.5')
    .then(() => {
      if (!title) return;
      title.textContent = title.getAttribute('aria-label');
      title.removeAttribute('aria-label');
      mountHeroLetters(title);
    });

  // ── Motion: the Story mode card's watercolour, painted over its sketch ───────
  once(document.querySelector('.teaser'), () => {
    // An even pace, so the brush is seen sweeping row by row.
    if (brush) motion.animate(brush, { strokeDashoffset: [stroke, 0] }, { duration: 3.2, ease: 'easeInOut', delay: 0.2 }).then(() => brush.removeAttribute('style'));
    anime.animate('.teaser__text > *', { opacity: [0, 1], translateY: [24, 0], duration: 800, delay: anime.stagger(120, { start: 2300 }), ease: 'outQuart', ...tidy });
  }, 0.6);
  // Its three layers shift with the pointer, each by its depth, on springs.
  const card = document.querySelector<HTMLElement>('.teaser__card');
  const layers = $<SVGSVGElement>('.diorama__layer');
  if (card && matchMedia('(pointer: fine)').matches) {
    const drift = (dx: number, dy: number) => {
      for (const layer of layers) {
        const depth = Number(layer.dataset['depth'] ?? 0);
        motion.animate(layer, { x: -dx * 32 * depth, y: -dy * 18 * depth }, { type: 'spring', stiffness: 90, damping: 18 });
      }
    };
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      drift((event.clientX - box.left) / box.width - 0.5, (event.clientY - box.top) / box.height - 0.5);
    });
    card.addEventListener('pointerleave', () => drift(0, 0));
  }

  // ── anime.js: the notebook opens, its numbers count up ──────────────────────
  once(document.querySelector('.spread'), () => {
    anime.animate('.spread .page--left', { opacity: [0, 1], rotateY: [-70, 0], transformOrigin: ['100% 50%', '100% 50%'], duration: 1100, ease: 'outBack(1.2)', ...tidy });
    anime.animate('.spread .page--right', { opacity: [0, 1], rotateY: [70, 0], transformOrigin: ['0% 50%', '0% 50%'], duration: 1100, delay: 150, ease: 'outBack(1.2)', ...tidy });
    anime.animate('.glance li', { opacity: [0, 1], translateY: [-30, 0], rotate: [-6, 0], duration: 900, delay: anime.stagger(140, { start: 600 }), ease: 'outElastic(1, 0.6)', ...tidy });
    for (const value of $('.glance__value')) {
      const [, digits = '', rest = ''] = value.textContent?.match(/^(\d+)(.*)$/) ?? [];
      if (!digits) continue;
      const count = { n: 0 };
      anime.animate(count, {
        n: Number(digits),
        duration: 1600,
        delay: 700,
        ease: 'outExpo',
        onUpdate: () => (value.textContent = `${Math.round(count.n)}${rest}`),
      });
    }
  });

  // ── anime.js: the cork board's frame opens, then the polaroids are pinned ────
  // Watched by its section: the board itself starts clipped to nothing, so it never counts as seen.
  once(document.querySelector('.corkboard')?.closest('section'), () => {
    anime.animate('.corkboard', { clipPath: ['inset(0 50% 0 50% round 14px)', 'inset(0 0% 0 0% round 14px)'], duration: 1000, ease: 'inOutQuart', ...tidy });
    // Each card lands on its own tilt (its --tilt), so nothing jumps when the inline styles go.
    anime.animate('.corkboard .polaroid', {
      opacity: [0, 1],
      translateY: [-90, 0],
      scale: [1.15, 1],
      rotate: (card?: unknown) => [-10, parseFloat(getComputedStyle(card as HTMLElement).getPropertyValue('--tilt')) || 0],
      duration: 900,
      delay: anime.stagger(160, { start: 650 }),
      ease: 'outBounce',
      ...tidy,
    });
  }, 0.2);

  // ── GSAP: the experience path draws as you scroll ───────────────────────────
  const timeline = document.querySelector<HTMLElement>('.timeline');
  if (timeline) {
    gsap.fromTo(timeline, { '--draw': 0 }, { '--draw': 1, ease: 'none', scrollTrigger: { trigger: timeline, start: 'top 80%', end: 'bottom 60%', scrub: 0.6 } });
    for (const entry of $('.timeline > li')) {
      gsap.fromTo(entry, { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: entry, start: 'top 85%' } });
    }
  }

  // ── GSAP + Motion: the lighthouse flares, the charts float up ──────────────
  once(document.querySelector('.lighthouse'), () => {
    gsap.fromTo('.lighthouse__glow', { attr: { r: 46 }, opacity: 0.3 }, { attr: { r: 130 }, opacity: 0.7, duration: 0.5, ease: 'power2.out', yoyo: true, repeat: 1 });
    motion.animate('.lighthouse__head', { opacity: [0, 1], y: [-16, 0] }, { duration: 0.6 });
    motion.animate('.lighthouse .article', { opacity: [0, 1], y: [60, 0], rotate: [-2, 0] }, { type: 'spring', bounce: 0.35, duration: 1, delay: motion.stagger(0.18, { startDelay: 0.3 }) });
  });

  // ── Motion: sticky notes, the phone, section headings ──────────────────────
  once(document.querySelector('.quotes'), () => {
    motion.animate('.quotes figure', { opacity: [0, 1], y: [-70, 0], rotate: [12, 0], scale: [1.1, 1] }, { type: 'spring', bounce: 0.45, duration: 1.1, delay: motion.stagger(0.15) });
  });
  once(document.querySelector('.contact .phone'), () => {
    motion.animate('.contact .phone', { opacity: [0, 1], y: [120, 0], rotate: [4, 0] }, { type: 'spring', bounce: 0.3, duration: 1.2 });
  }, 0.15);
  for (const heading of $('main .section h2')) {
    if (heading.closest('.lighthouse')) continue;
    once(heading, () => motion.animate(heading, { opacity: [0, 1], x: [-24, 0] }, { type: 'spring', bounce: 0.25, duration: 0.8 }), 0.6);
  }
}
