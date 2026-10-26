import { CanvasTexture, PlaneGeometry, RepeatWrapping, SRGBColorSpace } from 'three';

export interface Cell {
  x: number;
  y: number;
}

const CELL = 256;

/**
 * One canvas holds every painted surface (photos, cards, screens, the sky),
 * so they share a single texture and merge into few draw calls.
 */
export class Atlas {
  readonly canvas = document.createElement('canvas');
  readonly texture: CanvasTexture;
  #next = 0;

  constructor(
    readonly cols = 8,
    readonly rows = 4,
  ) {
    this.canvas.width = cols * CELL;
    this.canvas.height = rows * CELL;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.anisotropy = 4;
  }

  /** Reserves the next free cell, or undefined when the atlas is full. */
  alloc(): Cell | undefined {
    if (this.#next >= this.cols * this.rows) return undefined;
    const i = this.#next++;
    return { x: (i % this.cols) * CELL, y: Math.floor(i / this.cols) * CELL };
  }

  /** Paints a cell as if it were vw × vh, so a non-square surface keeps its proportions. */
  paint(cell: Cell, vw: number, vh: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.save();
    ctx.translate(cell.x, cell.y);
    ctx.scale(CELL / vw, CELL / vh);
    ctx.beginPath();
    ctx.rect(0, 0, vw, vh);
    ctx.clip();
    draw(ctx);
    ctx.restore();
    this.texture.needsUpdate = true;
  }

  /** A width × height plane that shows one cell. */
  quad(cell: Cell, width: number, height: number): PlaneGeometry {
    const geometry = new PlaneGeometry(width, height);
    const W = this.canvas.width;
    const H = this.canvas.height;
    // Inset a little so mipmaps don't bleed in the neighbouring cell.
    const u0 = (cell.x + 2) / W;
    const u1 = (cell.x + CELL - 2) / W;
    const v0 = 1 - (cell.y + CELL - 2) / H;
    const v1 = 1 - (cell.y + 2) / H;
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    return geometry;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

/** Soft paper grain, tiled over walls and floor. */
export function grainTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(128, 128);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 226 + Math.random() * 29;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Wraps text into lines that fit maxWidth with the context's current font. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
