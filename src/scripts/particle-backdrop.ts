// The home page's backdrop: a few thousand glowing particles behind everything that tell
// the story as you scroll, after the particle hero on motion.dev. At the top they are
// scattered starlight; scrolling gathers them into the storm's turning funnel; the
// storm settles into the sunset over the sea; and at the end they are a night sky of stars.
// Every particle morphs on its own slight delay. Scroll progress comes from Motion's
// scroll(); drawing is plain WebGL points. Not with reduced motion; it pauses with the tab.

const VERTEX = `
attribute vec3 aStorm; // radius, height, angle
attribute vec3 aSunset;
attribute vec3 aStars;
attribute vec2 aSeed; // delay, tone
uniform float uMorph; // 0 scattered, 1 storm, 2 sunset, 3 scattered again
uniform float uTime;
uniform vec2 uView;
uniform float uScale;
uniform float uShift; // px right of centre for the storm and sunset
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

  // The storm: a funnel wide at the top, turning faster near the ground.
  float a = aStorm.z + uTime * (1.6 - aStorm.y * 0.9);
  vec3 storm = vec3(cos(a) * aStorm.x, aStorm.y * 1.7 - 0.95, sin(a) * aStorm.x);
  // The sunset: a sun over the sea, its glints shimmering.
  vec3 sunset = aSunset + vec3(sin(uTime * 1.3 + aSeed.y * 30.0) * 0.012 * step(aSunset.y, -0.2), 0.0, 0.0);
  // Scattered, at the start and the end: stars drifting very slowly.
  vec3 stars = aStars + vec3(sin(uTime * 0.05) * 0.05, 0.0, 0.0);

  float scattered = w.x + w.w;
  vec3 p = stars * scattered + storm * w.y + sunset * w.z;
  float depth = 1.0 + p.z * 0.35;
  // The storm and sunset keep to the right side of the window; the scattered stars fill it.
  vec2 screen = p.xy / depth * uScale + vec2(uShift * (w.y + w.z), 0.0);
  gl_Position = vec4(screen.x / uView.x * 2.0, screen.y / uView.y * 2.0, 0.0, 1.0);
  float twinkle = scattered * (0.6 + 0.4 * sin(uTime * 2.0 + aSeed.y * 40.0));
  gl_PointSize = uPoint * (0.6 + aSeed.y * 0.9) / depth * (1.0 + twinkle * 0.6);
  vec3 tint = uColors[0] * w.x + uColors[1] * w.y + uColors[2] * w.z + uColors[3] * w.w;
  vColor = mix(tint, uGlow, aSeed.y * 0.45);
  vAlpha = 0.55 + aSeed.y * 0.45 - twinkle * 0.3;
  // At the very start only one in twenty shows; the rest join as the storm gathers.
  float sparse = step(fract(aSeed.x * 13.7 + aSeed.y * 7.1), 0.95);
  vAlpha *= 1.0 - w.x * sparse;
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

/** Colours per stage (scattered, storm, sunset, scattered again) and a glow mixed in, for light and dark pages. */
const PALETTES = {
  dark: { shapes: ['#f4ebdd', '#cfd6e2', '#e8a657', '#f4ebdd'], glow: '#fbf6ee', opacity: 1 },
  light: { shapes: ['#4a4350', '#2f6f73', '#c8803a', '#4a4350'], glow: '#5b4b8a', opacity: 0.85 },
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
  const shapes = { aStorm: new Float32Array(count * 3), aSunset: new Float32Array(count * 3), aStars: new Float32Array(count * 3) };
  const seeds = new Float32Array(count * 2);
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
  const uniforms = { shift: u('uShift'), morph: u('uMorph'), time: u('uTime'), view: u('uView'), scale: u('uScale'), point: u('uPoint'), colors: u('uColors'), glow: u('uGlow'), opacity: u('uOpacity') };
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
    gl.uniform1f(uniforms.shift, innerWidth * (innerWidth < 760 ? 0.15 : 0.3));
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
