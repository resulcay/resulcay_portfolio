// The hero's name as letters that peel off the page: near the pointer they stretch up and
// a soft shadow appears beneath them, easing back when it leaves. After Paola Demichelis'
// "Animating Letters with Shaders" (Codrops, 2025): text drawn into a texture on a finely
// divided plane, vertices lifted within a radius of the pointer with a cubic ease, and a
// blurred copy of the text as the shadow. Plain WebGL instead of three.js, to keep the home
// page light. The real heading stays in the page (transparent) for screen readers, search
// and selection; the canvas only draws it. Mouse only, with motion allowed and WebGL working.

const VERTEX = `
attribute vec2 aPos;
attribute vec2 aUv;
uniform vec2 uSize;
uniform vec2 uPointer;
uniform float uStrength;
uniform float uRadius;
uniform float uLift;
uniform float uShadow;
varying vec2 vUv;
varying float vLift;
varying float vShadow;

float easeInOutCubic(float x) {
  return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
}

void main() {
  vUv = aUv;
  vShadow = uShadow;
  float near = 1.0 - clamp(distance(aPos, uPointer) / uRadius, 0.0, 1.0);
  vLift = easeInOutCubic(near) * uStrength;
  // The letters rise up and a little left; their shadow stays on the page.
  vec2 p = aPos + vec2(-0.22, -1.0) * vLift * uLift * (1.0 - uShadow);
  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D uTexture;
varying vec2 vUv;
varying float vLift;
// A varying, not the uniform: uniform precisions must match across the two shaders.
varying float vShadow;

void main() {
  vec4 color = texture2D(uTexture, vUv);
  // The shadow only shows where letters have lifted off it.
  gl_FragColor = vShadow > 0.5 ? color * vLift : color;
}`;

const COLUMNS = 160;
const ROWS = 40;

export function mountHeroLetters(heading: HTMLElement): void {
  if (!matchMedia('(pointer: fine) and (not (prefers-reduced-motion: reduce))').matches) return;
  const name = heading.textContent ?? '';
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-letters';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: true });
  if (!gl || !name.trim()) return;

  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  const uniform = (key: string) => gl.getUniformLocation(program, key);
  const u = { size: uniform('uSize'), pointer: uniform('uPointer'), strength: uniform('uStrength'), radius: uniform('uRadius'), lift: uniform('uLift'), shadow: uniform('uShadow'), texture: uniform('uTexture') };

  // A plane of COLUMNS × ROWS cells; positions are filled in CSS pixels on each layout.
  const indices = new Uint16Array(COLUMNS * ROWS * 6);
  for (let y = 0, i = 0; y < ROWS; y++) {
    for (let x = 0; x < COLUMNS; x++) {
      const a = y * (COLUMNS + 1) + x;
      const b = a + COLUMNS + 1;
      indices.set([a, b, a + 1, a + 1, b, b + 1], i);
      i += 6;
    }
  }
  const uvs = new Float32Array((COLUMNS + 1) * (ROWS + 1) * 2);
  for (let y = 0; y <= ROWS; y++) for (let x = 0; x <= COLUMNS; x++) uvs.set([x / COLUMNS, y / ROWS], (y * (COLUMNS + 1) + x) * 2);
  const positions = new Float32Array(uvs.length);
  const buffer = (data: BufferSource, attribute: string) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, attribute);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    return b;
  };
  const positionBuffer = buffer(positions, 'aPos');
  buffer(uvs, 'aUv');
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const textures = [gl.createTexture(), gl.createTexture()] as const; // shadow, letters

  let width = 0;
  let height = 0;
  let fontSize = 0;
  const target = { x: -1e4, y: -1e4, strength: 0 };
  const now = { x: -1e4, y: -1e4, strength: 0 };

  /** Sizes the canvas around the heading's text and redraws the letters and their shadow. */
  const layout = () => {
    const style = getComputedStyle(heading);
    fontSize = parseFloat(style.fontSize);
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.1;
    // One line only; a wrapped name is left to the page.
    if (heading.getBoundingClientRect().height > lineHeight * 1.5) return false;
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const padX = fontSize * 0.4;
    const padTop = fontSize * 0.6;
    const padBottom = fontSize * 0.3;
    const pen = document.createElement('canvas').getContext('2d')!;
    pen.font = font;
    if ('letterSpacing' in pen) pen.letterSpacing = style.letterSpacing;
    const metrics = pen.measureText(name);
    width = Math.ceil(metrics.width + padX * 2);
    height = Math.ceil(lineHeight + padTop + padBottom);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    Object.assign(canvas.style, { left: `${-padX}px`, top: `${-padTop}px`, width: `${width}px`, height: `${height}px` });
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    // Same baseline as the page's text: centred in its line box by the font's own metrics.
    const ascent = metrics.fontBoundingBoxAscent;
    const baseline = padTop + (lineHeight - ascent - metrics.fontBoundingBoxDescent) / 2 + ascent;

    const draw = (shadow: boolean) => {
      const page = document.createElement('canvas');
      page.width = canvas.width;
      page.height = canvas.height;
      const ctx = page.getContext('2d')!;
      ctx.scale(ratio, ratio);
      ctx.font = font;
      if ('letterSpacing' in ctx) ctx.letterSpacing = style.letterSpacing;
      if (shadow) {
        // Only the blurred shadow lands on the canvas: the text itself is drawn far off to the left.
        ctx.shadowColor = 'rgb(0 0 0 / 0.45)';
        ctx.shadowBlur = fontSize * 0.12;
        ctx.shadowOffsetX = width * 4;
        ctx.shadowOffsetY = fontSize * 0.04;
        ctx.fillText(name, padX - width * 4, baseline);
      } else {
        // The heading inherits its ink; its own colour is transparent while the canvas draws it.
        ctx.fillStyle = getComputedStyle(heading.parentElement ?? heading).color;
        ctx.fillText(name, padX, baseline);
      }
      return page;
    };
    for (const [i, shadow] of [true, false].entries()) {
      gl.bindTexture(gl.TEXTURE_2D, textures[i]!);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, draw(shadow));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    for (let i = 0; i < positions.length; i += 2) {
      positions[i] = uvs[i]! * width;
      positions[i + 1] = uvs[i + 1]! * height;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.viewport(0, 0, canvas.width, canvas.height);
    return true;
  };

  const render = () => {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.size, width, height);
    gl.uniform2f(u.pointer, now.x, now.y);
    gl.uniform1f(u.strength, now.strength);
    gl.uniform1f(u.radius, fontSize * 0.9);
    gl.uniform1f(u.lift, fontSize * 0.35);
    gl.uniform1i(u.texture, 0);
    gl.activeTexture(gl.TEXTURE0);
    for (const [i, shadow] of [1, 0].entries()) {
      gl.bindTexture(gl.TEXTURE_2D, textures[i]!);
      gl.uniform1f(u.shadow, shadow);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
  };

  // Draw only while something is moving.
  let running = false;
  let last = 0;
  const frame = (time: number) => {
    const dt = Math.min(0.05, (time - last) / 1000 || 0.016);
    last = time;
    const ease = 1 - Math.exp(-dt * 10);
    now.x += (target.x - now.x) * ease;
    now.y += (target.y - now.y) * ease;
    now.strength += (target.strength - now.strength) * (1 - Math.exp(-dt * 5));
    render();
    const settled = Math.abs(target.strength - now.strength) < 0.002 && Math.hypot(target.x - now.x, target.y - now.y) < 0.5;
    if (settled && target.strength === 0) {
      now.strength = 0;
      render();
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  };
  const wake = () => {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };

  addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse' || !width) return;
      const box = canvas.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const reach = fontSize * 0.9;
      const near = x > -reach && x < box.width + reach && y > -reach && y < box.height + reach;
      // Enter at the pointer, rather than sweeping in from wherever it last was.
      if (near && now.strength < 0.01) {
        now.x = x;
        now.y = y;
      }
      target.x = x;
      target.y = y;
      target.strength = near ? 1 : 0;
      if (near || now.strength > 0) wake();
    },
    { passive: true },
  );

  const relayout = () => {
    const ok = layout();
    heading.classList.toggle('is-warped', ok);
    canvas.hidden = !ok;
    if (ok) render();
  };
  heading.appendChild(canvas);
  void document.fonts.ready.then(relayout);
  new ResizeObserver(relayout).observe(heading);
  // The text colour follows the theme.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', relayout);
}
