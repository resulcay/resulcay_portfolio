// Paints the Story mode card's diorama (components/SunsetScene.astro) in over its pencil sketch
// with one long brush stroke sweeping down in rows. Each layer's painting is drawn through the
// stroke on a canvas: an SVG mask did this before, but iOS WebKit didn't repaint it as it changed
// (the lower layers stayed as sketches), and re-ran the watercolour filters on every frame.

/** The brush's path in the art's 1440 × 900 units: rows sweeping left and right, top to bottom. */
export const BRUSH: readonly (readonly [number, number])[] = [
  [-260, 10], [1700, 110], [-260, 230], [1700, 340], [-260, 450], [1700, 560], [-260, 670], [1700, 780], [-260, 900],
];
export const BRUSH_WIDTH = 250;
export const ART = { width: 1440, height: 900 } as const;

export const brushLength = (points: readonly (readonly [number, number])[] = BRUSH): number =>
  points.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - points[i]![0], y - points[i]![1]), 0);

/** Where the art lands in a box it covers (like object-fit: cover), as a scale and an offset. */
export function cover(width: number, height: number): { scale: number; x: number; y: number } {
  const scale = Math.max(width / ART.width, height / ART.height);
  return { scale, x: (width - ART.width * scale) / 2, y: (height - ART.height * scale) / 2 };
}

/**
 * Hides each layer's painting behind a canvas that draws it through the brush stroke.
 * Returns `paint(progress)` (0 to 1) and `finish()`, which shows the paintings again and removes
 * the canvases. Returns null if the images can't be decoded or drawn; the card then simply stays painted.
 */
export async function prepareReveal(diorama: Element): Promise<{ paint: (progress: number) => void; finish: () => void } | null> {
  const layers = [...diorama.querySelectorAll<HTMLElement>('.diorama__layer')];
  const paintings = layers.map((layer) => layer.querySelector<HTMLImageElement>('.diorama__paint'));
  if (!paintings.length || paintings.some((img) => !img) || typeof DOMMatrix === 'undefined') return null;
  try {
    await Promise.all(paintings.map((img) => img!.decode()));
  } catch {
    return null;
  }

  const ratio = Math.min(devicePixelRatio || 1, 2);
  const length = brushLength();
  const stroke = new Path2D();
  BRUSH.forEach(([x, y], i) => (i ? stroke.lineTo(x, y) : stroke.moveTo(x, y)));

  // Each layer strokes its painting (as a pattern) along the brush; a frame only adds the stretch
  // the brush covered since the last one, so nothing is cleared or redrawn.
  const setups = layers.map((layer, i) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(layer.clientWidth * ratio));
    canvas.height = Math.max(1, Math.round(layer.clientHeight * ratio));
    const fit = cover(canvas.width, canvas.height);
    const image = paintings[i]!;
    const ctx = canvas.getContext('2d');
    const pattern = ctx?.createPattern(image, 'no-repeat');
    if (!ctx || !pattern) return null;
    pattern.setTransform(new DOMMatrix().scale(ART.width / image.naturalWidth, ART.height / image.naturalHeight));
    ctx.setTransform(fit.scale, 0, 0, fit.scale, fit.x, fit.y);
    Object.assign(ctx, { lineWidth: BRUSH_WIDTH, lineCap: 'round', lineJoin: 'round', strokeStyle: pattern });
    return { canvas, ctx };
  });
  if (setups.some((setup) => !setup)) return null;
  const canvases = setups.map((setup, i) => {
    layers[i]!.insertBefore(setup!.canvas, paintings[i]!);
    paintings[i]!.style.visibility = 'hidden';
    return setup!.canvas;
  });
  const brushes = setups.map((setup) => setup!.ctx);
  let painted = 0;
  const paint = (progress: number) => {
    const reached = length * Math.min(Math.max(progress, 0), 1);
    if (reached <= painted) return;
    for (const ctx of brushes) {
      // One dash, from where the brush was to where it is now.
      ctx.setLineDash([reached - painted, length * 2]);
      ctx.lineDashOffset = -painted;
      ctx.stroke(stroke);
    }
    painted = reached;
  };
  const finish = () => {
    for (const img of paintings) img!.style.removeProperty('visibility');
    for (const canvas of canvases) canvas.remove();
  };
  return { paint, finish };
}
