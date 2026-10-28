// The storm behind Story mode's title: a 2.5D tornado drawn on a canvas, with
// drifting clouds, orbiting debris, rain and lightning. Layers shift with the
// pointer at different depths for parallax. One still frame for reduced motion.

const TAU = Math.PI * 2;

interface Debris {
  height: number; // 0 (top) to 1 (ground), along the funnel
  angle: number;
  speed: number;
  out: number; // how far outside the funnel wall
  size: number;
  spin: number;
}

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
  shade: number;
}

/** A soft round puff in one colour, drawn once and stamped for every cloud. */
function puff(rgb: string): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 128;
  const ctx = sprite.getContext('2d')!;
  const glow = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  glow.addColorStop(0, `rgb(${rgb} / 1)`);
  glow.addColorStop(0.5, `rgb(${rgb} / 0.45)`);
  glow.addColorStop(1, `rgb(${rgb} / 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 128);
  return sprite;
}

export function mountStorm(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sprite = puff('225 230 240');
  const dark = puff('46 50 59');
  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  const debris: Debris[] = Array.from({ length: 70 }, () => ({
    height: Math.random() ** 0.8,
    angle: rand(0, TAU),
    speed: rand(0.6, 1.4),
    out: rand(1.0, 1.5),
    size: rand(2, 7),
    spin: rand(-6, 6),
  }));
  const clouds: Cloud[] = Array.from({ length: 26 }, () => ({
    x: Math.random(),
    y: rand(-0.1, 0.45),
    size: rand(0.25, 0.6),
    speed: rand(0.004, 0.012),
    shade: rand(0.35, 0.75),
  }));
  const drops = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), speed: rand(0.9, 1.5), length: rand(14, 34) }));

  let width = 0;
  let height = 0;
  let pointerX = 0;
  let pointerY = 0;
  let easedX = 0;
  let easedY = 0;
  let flash = 0;
  let nextBolt = 2.5;
  let bolt: [number, number][] = [];

  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (still) draw(4, 0);
  };

  /** The funnel's radius at a height from 0 (cloud base) to 1 (ground): wide on top, narrowing. */
  const radius = (h: number) => Math.min(width, height * 1.6) * (0.34 - 0.2 * h ** 0.8);

  const strike = () => {
    // A jagged bolt in the far sky to the right of the funnel.
    let x = width * rand(0.82, 0.95);
    let y = height * 0.15;
    bolt = [[x, y]];
    while (y < height * 0.85) {
      x += rand(-28, 28);
      y += rand(18, 42);
      bolt.push([x, y]);
    }
    flash = 1;
  };

  const draw = (t: number, dt: number) => {
    easedX += (pointerX - easedX) * Math.min(1, dt * 3);
    easedY += (pointerY - easedY) * Math.min(1, dt * 3);
    const shift = (depth: number): [number, number] => [-easedX * depth * 24, -easedY * depth * 14];
    const cx = width * 0.7;
    const top = height * 0.08;
    const ground = height * 1.02;
    /** The funnel's bent, slowly snaking centre line at a height from 0 to 1. */
    const axis = (h: number) =>
      cx - width * (0.1 * Math.sin(h * 2.4 - t * 0.5) * h + 0.05 * Math.sin(t * 0.23) * h * h + 0.08 * h * h);
    // Lightning flickers while it's bright.
    const lit = flash > 0.5 && Math.sin(t * 140) < -0.3 ? flash * 0.35 : flash;

    // Sky.
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0b0c10');
    sky.addColorStop(0.55, '#262a33');
    sky.addColorStop(1, '#15171c');
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Lightning, behind everything but the sky.
    if (lit > 0) {
      const glow = ctx.createRadialGradient(width * 0.9, height * 0.55, 0, width * 0.9, height * 0.55, width * 0.6);
      glow.addColorStop(0, `rgb(205 215 235 / ${0.8 * lit})`);
      glow.addColorStop(1, 'rgb(205 215 235 / 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      if (lit > 0.5) {
        const [bx, by] = shift(0.15);
        ctx.strokeStyle = `rgb(235 240 255 / ${lit})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        bolt.forEach(([x, y], i) => (i ? ctx.lineTo(x + bx, y + by) : ctx.moveTo(x + bx, y + by)));
        ctx.stroke();
      }
    }

    // Far clouds drifting round the top of the funnel.
    {
      const [ox, oy] = shift(0.25);
      for (const cloud of clouds) {
        const x = (((cloud.x + t * cloud.speed) % 1.4) - 0.2) * width + ox;
        const size = cloud.size * width;
        ctx.globalAlpha = 0.18 * cloud.shade + 0.1 * lit;
        ctx.drawImage(sprite, x - size / 2, cloud.y * height + oy - size / 4, size, size / 2);
      }
    }

    // Debris behind the funnel (the far half of each orbit).
    const debrisPass = (front: boolean) => {
      const [ox, oy] = shift(front ? 0.9 : 0.4);
      ctx.fillStyle = front ? '#0b0c10' : '#1c1f26';
      for (const piece of debris) {
        const angle = piece.angle + t * piece.speed * (1.6 - piece.height);
        const near = Math.sin(angle) > 0;
        if (near !== front) continue;
        const y = top + piece.height * (ground - top);
        const r = radius(piece.height) * piece.out;
        const scale = 0.7 + 0.5 * Math.sin(angle);
        ctx.save();
        ctx.globalAlpha = front ? 0.9 : 0.5;
        ctx.translate(axis(piece.height) + Math.cos(angle) * r + ox, y + Math.sin(angle) * r * 0.2 + oy);
        ctx.rotate(t * piece.spin);
        ctx.fillRect(-piece.size * scale, -piece.size * scale * 0.4, piece.size * scale * 2, piece.size * scale * 0.8);
        ctx.restore();
      }
    };
    debrisPass(false);

    // The funnel: a soft dark column of puffs, then streaks of cloud wrapping round it.
    {
      const [ox, oy] = shift(0.55);
      const rows = 30;
      const sway = (h: number) => axis(h) - cx + ox;
      const lean = (h: number) => -Math.atan((axis(h + 0.01) - axis(h)) / (0.01 * (ground - top)));
      for (let i = 0; i <= rows; i++) {
        const h = i / rows;
        const r = radius(h) * (1 + 0.12 * Math.sin(i * 2.7 + t * 0.9) + 0.07 * Math.sin(i * 5.3 - t * 1.7));
        const y = top + h * (ground - top) + oy;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(dark, cx + sway(h) - r * 1.35, y - r * 0.55, r * 2.7, r * 1.1);
        // Light catching the right-hand side, brighter in a lit.
        ctx.globalAlpha = 0.12 + 0.45 * lit;
        ctx.drawImage(sprite, cx + sway(h) - r * 0.2, y - r * 0.4, r * 1.3, r * 0.8);
      }

      ctx.lineCap = 'round';
      for (let i = 0; i < 44; i++) {
        // Uneven spacing so the bands don't read as a coil.
        const h = (i + 0.5 * Math.sin(i * 12.9898)) / 44;
        const r = radius(h) * (1 + 0.1 * Math.sin(i * 3.3 + t * 1.3));
        const y = top + h * (ground - top) + oy + Math.sin(i * 4.1 + t * 1.4) * 9;
        // Faster near the ground, like a real vortex.
        const turn = t * (1.1 + h * 1.6);
        for (let k = 0; k < 3; k++) {
          const start = turn + k * 2.1 + i * 1.3;
          const span = 0.6 + ((i * 7 + k * 3) % 5) * 0.3;
          // Arcs on the near side read brighter.
          const near = Math.max(0, Math.sin(start + span / 2));
          const light = 100 + 90 * near + 110 * lit;
          const tilt = lean(h) + Math.sin(i * 1.7 + t * 0.7) * 0.12;
          for (const [w, a] of [[9, 0.05], [2, 0.3]] as const) {
            ctx.globalAlpha = a * (0.4 + near);
            ctx.strokeStyle = `rgb(${light} ${light + 4} ${light + 12})`;
            ctx.lineWidth = w * (0.6 + (i % 3) * 0.4);
            ctx.beginPath();
            ctx.ellipse(cx + sway(h), y, r * (0.95 + 0.1 * Math.sin(i)), r * 0.18, tilt, start, start + span);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // The cloud base the funnel hangs from.
    {
      const [ox, oy] = shift(0.45);
      for (let i = 0; i < 14; i++) {
        const a = t * 0.12 + i * 0.45;
        const size = width * (0.45 + 0.12 * Math.sin(i * 2.1));
        const x = cx + Math.cos(a) * radius(0) * 1.6 - size / 2 + ox;
        const y = top - size * 0.16 + Math.sin(a) * 22 + oy;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(dark, x, y, size, size * 0.32);
        ctx.globalAlpha = 0.08 + 0.15 * lit;
        ctx.drawImage(sprite, x, y + size * 0.05, size, size * 0.22);
      }
      // Dust and haze where the funnel meets the ground.
      ctx.globalAlpha = 0.5;
      ctx.drawImage(dark, cx - width * 0.4 + ox, height * 0.82 + oy, width * 0.8, height * 0.35);
    }

    debrisPass(true);

    // Rain, slanting with the wind, closest to the viewer.
    {
      const [ox, oy] = shift(1.3);
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#aeb6c4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const drop of drops) {
        const y = ((drop.y + t * drop.speed * 3.5) % 1.1) * height - 20;
        const x = ((((drop.x - t * drop.speed) % 1) + 1) % 1) * width;
        ctx.moveTo(x + ox, y + oy);
        ctx.lineTo(x + ox - drop.length * 0.35, y + oy + drop.length);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  resize();
  new ResizeObserver(resize).observe(canvas);
  if (still) return;

  addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    pointerX = (event.clientX / innerWidth) * 2 - 1;
    pointerY = (event.clientY / innerHeight) * 2 - 1;
  });

  let last = performance.now();
  let t = 0;
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Nothing to see while Story mode's room covers the title.
    if (document.documentElement.classList.contains('story-open')) return;
    // The storm turns slowly; rain is sped back up where it's drawn.
    t += dt * 0.3;
    nextBolt -= dt;
    if (nextBolt <= 0) {
      strike();
      nextBolt = rand(4, 9);
    }
    flash = Math.max(0, flash - dt * 2.2);
    draw(t, dt);
  };
  requestAnimationFrame(frame);
}
