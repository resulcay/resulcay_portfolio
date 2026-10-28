// The home page's backdrop: a few thousand glowing particles behind everything that tell
// the story as you scroll, after the particle hero on motion.dev. At the top they are the
// site's blue butterfly beating its wings; then it scatters into the storm's turning funnel; the
// storm settles into the sunset over the sea; and at the end they are a night sky of stars.
// Every particle morphs on its own slight delay. Scroll progress comes from Motion's
// scroll(); drawing is plain WebGL points. Not with reduced motion; it pauses with the tab.

import { WING } from '@/components/butterfly-art';

const VERTEX = `
attribute vec3 aButterfly;
attribute vec3 aStorm; // radius, height, angle
attribute vec3 aSunset;
attribute vec3 aStars;
attribute vec2 aSeed; // delay, tone
uniform float uMorph; // 0 butterfly, 1 storm, 2 sunset, 3 stars
uniform float uTime;
uniform vec2 uView;
uniform float uScale;
uniform float uPoint;
uniform vec3 uColors[4];
uniform vec3 uGlow;
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Each particle takes its own moment to cross from one shape to the next.
  float stage = floor(min(uMorph, 2.999));
  float t = smoothstep(aSeed.x * 0.45, aSeed.x * 0.45 + 0.55, uMorph - stage);
  vec4 w = vec4(0.0);
  if (stage < 0.5) w = vec4(1.0 - t, t, 0.0, 0.0);
  else if (stage < 1.5) w = vec4(0.0, 1.0 - t, t, 0.0);
  else w = vec4(0.0, 0.0, 1.0 - t, t);

  // The butterfly, its wings beating about its body.
  float flap = sin(uTime * 5.0) * 0.85;
  vec3 butterfly = vec3(aButterfly.x * cos(flap), aButterfly.y, abs(aButterfly.x) * sin(flap)) + vec3(0.72, 0.0, 0.0);
  // The storm: a funnel wide at the top, turning faster near the ground.
  float a = aStorm.z + uTime * (1.6 - aStorm.y * 0.9);
  vec3 storm = vec3(cos(a) * aStorm.x, aStorm.y * 1.7 - 0.95, sin(a) * aStorm.x) + vec3(0.3, 0.0, 0.0);
  // The sunset: a sun over the sea, its glints shimmering.
  vec3 sunset = aSunset + vec3(sin(uTime * 1.3 + aSeed.y * 30.0) * 0.012 * step(aSunset.y, -0.2), 0.0, 0.0);
  // The stars drift very slowly.
  vec3 stars = aStars + vec3(sin(uTime * 0.05) * 0.05, 0.0, 0.0);

  vec3 p = butterfly * w.x + storm * w.y + sunset * w.z + stars * w.w;
  float depth = 1.0 + p.z * 0.35;
  vec2 screen = p.xy / depth * uScale;
  gl_Position = vec4(screen.x / uView.x * 2.0, screen.y / uView.y * 2.0, 0.0, 1.0);
  float twinkle = w.w * (0.6 + 0.4 * sin(uTime * 2.0 + aSeed.y * 40.0));
  gl_PointSize = uPoint * (0.6 + aSeed.y * 0.9) / depth * (1.0 + twinkle * 0.6);
  vec3 tint = uColors[0] * w.x + uColors[1] * w.y + uColors[2] * w.z + uColors[3] * w.w;
  vColor = mix(tint, uGlow, aSeed.y * 0.45);
  vAlpha = 0.55 + aSeed.y * 0.45 - twinkle * 0.3;
}`;

const FRAGMENT = `
precision mediump float;
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor, a * a * vAlpha * uOpacity);
}`;

/** Points filling the site's own butterfly (butterfly-art.ts): both wings, mirrored about its body. */
function butterflyPoints(count: number, random: () => number): Float32Array {
  // The near-black edge paths are each wing's whole outline.
  const outlines = [...WING.matchAll(/fill="#16141c" d="([^"]+)"/g)].map(([, d = '']) => new Path2D(d));
  const probe = document.createElement('canvas').getContext('2d')!;
  const points = new Float32Array(count * 3);
  for (let i = 0, tries = 0; i < count && tries < count * 50; tries++) {
    const x = random() * 22;
    const y = random() * 34 - 18;
    if (!outlines.some((path) => probe.isPointInPath(path, x, y))) continue;
    // Halves on each side; units of about a third of the screen's height.
    points.set([((i % 2 ? 1 : -1) * x) / 36, -y / 36, 0], i * 3);
    i++;
  }
  return points;
}

function sunsetPoint(random: () => number, i: number): [number, number, number] {
  if (i % 3 !== 0) {
    // The sun's disc, low over the horizon.
    const a = random() * Math.PI * 2;
    const r = 0.42 * Math.sqrt(random());
    return [Math.cos(a) * r, Math.max(-0.18, Math.sin(a) * r + 0.12), 0];
  }
  // Glints on the sea, in lines that narrow towards the horizon.
  const row = Math.floor(random() * 5);
  const half = 0.7 - row * 0.12;
  return [(random() * 2 - 1) * half, -0.3 - row * 0.12, 0];
}

/** Colours per shape (butterfly, storm, sunset, stars) and a glow mixed in, for light and dark pages. */
const PALETTES = {
  dark: { shapes: ['#4fa3d9', '#cfd6e2', '#f6c47e', '#f4ebdd'], glow: '#fbf6ee', opacity: 1 },
  light: { shapes: ['#2f6fa8', '#5b4b8a', '#c8803a', '#4a4350'], glow: '#5b4b8a', opacity: 0.85 },
} as const;

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

export function mountParticleBackdrop(scroll: (onProgress: (progress: number) => void) => unknown): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'home-backdrop';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
  if (!gl) return;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  // Fewer particles on small screens.
  const count = innerWidth < 760 ? 1800 : 4200;
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const shapes = { aButterfly: new Float32Array(count * 3), aStorm: new Float32Array(count * 3), aSunset: new Float32Array(count * 3), aStars: new Float32Array(count * 3) };
  const seeds = new Float32Array(count * 2);
  shapes.aButterfly.set(butterflyPoints(count, random));
  for (let i = 0; i < count; i++) {
    const h = random();
    shapes.aStorm.set([(0.08 + 0.62 * h ** 1.4) * (0.85 + random() * 0.3), h, random() * Math.PI * 2], i * 3);
    shapes.aSunset.set(sunsetPoint(random, i), i * 3);
    shapes.aStars.set([(random() * 2 - 1) * 2.2, (random() * 2 - 1) * 1.3, random() * 1.2 - 0.6], i * 3);
    seeds.set([random(), random()], i * 2);
  }
  const attribute = (name: string, data: Float32Array, size: number) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  };
  for (const [name, data] of Object.entries(shapes)) attribute(name, data, 3);
  attribute('aSeed', seeds, 2);
  const u = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = { morph: u('uMorph'), time: u('uTime'), view: u('uView'), scale: u('uScale'), point: u('uPoint'), colors: u('uColors'), glow: u('uGlow'), opacity: u('uOpacity') };
  gl.enable(gl.BLEND);

  const dark = matchMedia('(prefers-color-scheme: dark)');
  const theme = () => {
    const palette = dark.matches ? PALETTES.dark : PALETTES.light;
    gl.uniform3fv(uniforms.colors, palette.shapes.flatMap(rgb));
    gl.uniform3fv(uniforms.glow, rgb(palette.glow));
    gl.uniform1f(uniforms.opacity, palette.opacity);
    // Glowing light on the dark page; plain soft dots on the light one.
    gl.blendFunc(gl.SRC_ALPHA, dark.matches ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
  };
  theme();
  dark.addEventListener('change', theme);

  const fit = () => {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(innerWidth * ratio);
    canvas.height = Math.round(innerHeight * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.view, innerWidth, innerHeight);
    gl.uniform1f(uniforms.scale, Math.min(innerWidth, innerHeight * 1.4) * 0.42);
    gl.uniform1f(uniforms.point, 4.2 * ratio);
  };
  fit();
  addEventListener('resize', fit);
  document.body.insertBefore(canvas, document.body.firstChild);

  // Scroll sets where the story should be; the particles ease after it.
  let target = 0;
  let morph = 0;
  scroll((progress) => (target = Math.min(3, Math.max(0, progress * 3.3 - 0.15))));
  let last = performance.now();
  const frame = (time: number) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (time - last) / 1000);
    last = time;
    morph += (target - morph) * (1 - Math.exp(-dt * 3));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.morph, morph);
    gl.uniform1f(uniforms.time, time / 1000);
    gl.drawArrays(gl.POINTS, 0, count);
  };
  requestAnimationFrame(frame);
}
