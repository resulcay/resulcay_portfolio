// The mouse cursor as a live butterfly: it flies after the pointer with its
// wings beating, turning to face where it's going. When the pointer rests it
// lands where it is; over something clickable for a couple of seconds, it settles in the
// middle of it. Landed, it slowly opens and closes its wings; a click makes it
// flutter. Only for a mouse or pen without reduced motion or high contrast;
// elsewhere cursors.css keeps a still butterfly. Text fields, open dialogs and
// Story mode's room get the system cursors back.
import { BODY, WING } from '@/components/butterfly-art';

const FITS = '(pointer: fine) and (not (prefers-contrast: more)) and (not (forced-colors: active)) and (not (prefers-reduced-motion: reduce))';
const CLICKABLE = ':is(a[href], button, summary, select, label[for], [role="button"], .button):not(:disabled, [aria-disabled="true"])';
const NATIVE = 'input:not([type="checkbox"], [type="radio"], [type="range"], [type="submit"], [type="button"]), textarea, [contenteditable="true"], iframe';
const WIDTH = 34;
const HEIGHT = 28;
/** How long the pointer stays on something clickable before the butterfly goes to it. */
const NOTICE_MS = 2200;

export function mountButterflyCursor(): void {
  if (!matchMedia(FITS).matches) return;
  const root = document.documentElement;
  const el = document.createElement('div');
  el.className = 'bf-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="-22 -18 44 36"><g transform="scale(0.88)"><g data-wing>${WING}</g><g transform="scale(-1 1)"><g data-wing>${WING}</g></g>${BODY}</g></svg>`;
  document.body.appendChild(el);
  const wings = [...el.querySelectorAll('[data-wing]')];

  let pointerX = 0;
  let pointerY = 0;
  let x = 0;
  let y = 0;
  let seen = false;
  let away = false;
  let lastMove = 0;
  let over: Element | null = null; // the clickable under the pointer, and since when
  let overSince = 0;
  let angle = 0;
  let phase = 0;
  let beat = 4; // wingbeats a second, eased between flying and resting
  let rest = 0; // 0 flying, 1 landed, eased
  let flutter = 0;

  const native = (target: EventTarget | null) =>
    root.classList.contains('story-open') || document.querySelector('dialog:modal') !== null || (target instanceof Element && target.closest(NATIVE) !== null);

  const move = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    lastMove = performance.now();
    away = false;
    if (!seen) {
      // The system cursor hides only once the butterfly is there to replace it.
      seen = true;
      x = pointerX;
      y = pointerY;
      root.classList.add('butterfly-cursor');
    }
    const off = native(event.target);
    root.classList.toggle('butterfly-off', off);
    const clickable = off || !(event.target instanceof Element) ? null : event.target.closest(CLICKABLE);
    if (clickable !== over) {
      over = clickable;
      overSince = lastMove;
    }
  };
  addEventListener('pointermove', move, { passive: true });
  // Entering an iframe (Turnstile) fires no moves here, only this.
  addEventListener('pointerover', move, { passive: true });
  addEventListener('pointerdown', () => (flutter = 1), { passive: true });
  document.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) away = true;
  });

  let last = performance.now();
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const shown = seen && !away && !root.classList.contains('butterfly-off') && !root.classList.contains('story-open');
    el.classList.toggle('is-shown', shown);
    if (!shown) return;

    // Where to be: on the pointer, or in the middle of what it has been over for a while.
    const perch = over && now - overSince > NOTICE_MS ? over : null;
    let targetX = pointerX;
    let targetY = pointerY;
    if (perch) {
      const box = perch.getBoundingClientRect();
      targetX = box.left + box.width / 2;
      targetY = box.top + box.height / 2;
    }
    const prevX = x;
    const prevY = y;
    const follow = 1 - Math.exp(-dt * (perch ? 4 : 5));
    x += (targetX - x) * follow;
    y += (targetY - y) * follow;
    const speed = Math.hypot(x - prevX, y - prevY) / Math.max(dt, 1e-3);
    const landed = perch ? Math.hypot(targetX - x, targetY - y) < 3 : now - lastMove > 900;

    // Face the way it flies; settle upright when it lands.
    const want = !landed && speed > 80 ? Math.atan2(y - prevY, x - prevX) + Math.PI / 2 : landed ? 0 : angle;
    const turn = Math.atan2(Math.sin(want - angle), Math.cos(want - angle));
    angle += turn * (1 - Math.exp(-dt * 8));

    // Wingbeats: unhurried in flight, slow and half-closed at rest, a burst on click.
    const ease = 1 - Math.exp(-dt * 4);
    beat += ((landed ? 0.3 : 4) - beat) * ease;
    rest += ((landed ? 1 : 0) - rest) * ease;
    flutter = Math.max(0, flutter - dt * 1.6);
    phase += (beat + flutter * 8) * Math.PI * 2 * dt;
    const open = 0.55 - 0.2 * rest + (0.45 - 0.15 * rest) * Math.sin(phase);
    for (const wing of wings) wing.setAttribute('transform', `scale(${open.toFixed(3)} 1)`);
    el.style.transform = `translate3d(${x - WIDTH / 2}px, ${y - HEIGHT / 2}px, 0) rotate(${angle}rad)`;
  };
  requestAnimationFrame(frame);
}
