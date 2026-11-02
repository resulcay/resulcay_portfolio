// Bakes the Story mode card's watercolour diorama (components/SunsetScene.astro) into images.
// Its noise filters (paint bleeding, paper grain, pencil wobble) are far too costly to run live:
// phones re-ran them on every frame of the brush reveal. Here they run once, in Chromium, and
// each layer is saved as two WebP images, its pencil sketch and its painting, into src/assets/diorama.
// Run it after changing the art: node scripts/bake-diorama.mjs
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const OUT = new URL('../src/assets/diorama/', import.meta.url);
const WIDTH = 1920;
const HEIGHT = 1200;

const filters = `
  <filter id="wash" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="4" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G" result="bled"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9" result="grain"/>
    <feColorMatrix in="grain" type="matrix" values="0.22 0 0 0 0.78  0.22 0 0 0 0.78  0.22 0 0 0 0.78  0 0 0 0 1" result="paper"/>
    <feBlend in="bled" in2="paper" mode="multiply" result="painted"/>
    <feComposite in="painted" in2="bled" operator="in"/>
  </filter>
  <filter id="pencil">
    <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="2" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;

const sketch = (paths) =>
  `<g fill="none" stroke="#5a4a3c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.75" filter="url(#pencil)">${paths}</g>`;
const paint = (shapes) => `<g filter="url(#wash)">${shapes}</g>`;

// The three layers, back to front: sky and sun; sea; cliff and house.
const layers = {
  sky: {
    // The parchment under everything belongs to the back layer's sketch.
    sketch: `<rect x="-100" y="-100" width="1640" height="1100" fill="#efe3cc"/>` + sketch(`
      <path d="M-20 200H1460M-20 330H1460M-20 440H1460M-20 530H1460"/>
      <circle cx="1040" cy="560" r="96"/>
      <path d="M980 520l-30-30M1040 450v-40M1100 520l30-30M940 580h-40M1140 580h40"/>`),
    paint: paint(`
      <rect x="-100" y="-100" width="1640" height="300" fill="#3b3060"/>
      <rect x="-100" y="200" width="1640" height="130" fill="#5b4b8a"/>
      <rect x="-100" y="330" width="1640" height="110" fill="#9a6a86"/>
      <rect x="-100" y="440" width="1640" height="90" fill="#d98a62"/>
      <rect x="-100" y="530" width="1640" height="80" fill="#e8a657"/>
      <circle cx="1040" cy="560" r="96" fill="#f6c47e"/>`),
  },
  sea: {
    sketch: sketch(`
      <path d="M-20 580H1460"/>
      <path d="M900 600H1180M940 624H1140M980 648H1100M1000 676H1080"/>
      <path d="M80 640q40-12 80 0t80 0M420 700q40-12 80 0t80 0M760 760q40-12 80 0t80 0M1180 720q40-12 80 0t80 0M300 820q40-12 80 0t80 0M980 840q40-12 80 0t80 0"/>`),
    paint: paint(`
      <rect x="-100" y="580" width="1640" height="420" fill="#2f6f73"/>
      <path d="M900 600H1180M940 624H1140M980 648H1100M1000 676H1080" stroke="#f6c47e" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <path d="M80 640q40-12 80 0t80 0M420 700q40-12 80 0t80 0M760 760q40-12 80 0t80 0M1180 720q40-12 80 0t80 0M300 820q40-12 80 0t80 0M980 840q40-12 80 0t80 0" fill="none" stroke="#8fd0d4" stroke-width="4" stroke-linecap="round" opacity="0.35"/>`),
  },
  cliff: {
    sketch: sketch(`
      <path d="M-100 520C120 500 220 470 320 480 420 490 470 540 560 560 620 574 660 600 700 640V1000"/>
      <path d="M236 490V420h96v70M226 424 284 380 342 424M262 440h22v22h-22ZM296 440h22v22h-22Z"/>`),
    paint: paint(`
      <path d="M-100 520C120 500 220 470 320 480 420 490 470 540 560 560 620 574 660 600 700 640V1000H-100Z" fill="#1e1b24"/>
      <rect x="236" y="420" width="96" height="70" fill="#1e1b24"/>
      <path d="M226 424 284 380 342 424Z" fill="#1e1b24"/>
      <rect x="262" y="440" width="22" height="22" fill="#e8a657"/>
      <rect x="296" y="440" width="22" height="22" fill="#e8a657" opacity="0.6"/>`),
  },
};

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await mkdir(OUT, { recursive: true });
for (const [name, layer] of Object.entries(layers)) {
  for (const part of ['sketch', 'paint']) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 1440 900"><defs>${filters}</defs>${layer[part]}</svg>`;
    await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
    const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
    const file = new URL(`${name}-${part}.webp`, OUT);
    const info = await sharp(png).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(file.pathname);
    console.log(`${name}-${part}.webp`, `${Math.round(info.size / 1024)} KB`);
  }
}
await browser.close();
