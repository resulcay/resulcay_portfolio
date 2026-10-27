import { useEffect, useMemo } from 'react';
import { BoxGeometry, CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { StoryData } from '@/application/story';
import { Hotspot, Merged, useInteraction, useKit, type Part, type Vec3 } from './kit';
import { wrapText, type Atlas, type Cell } from './atlas';

type Project = StoryData['projects'][number];

const W = 0.24;
const H = 0.29;
const WALL_X = -2.49;
const ROWS = [2.12, 1.7];
const PAINTS: [string, string][] = [
  ['#e8a657', '#5b4b8a'],
  ['#2f6f73', '#e8a657'],
  ['#5b4b8a', '#4fa3d9'],
  ['#4fa3d9', '#2f6f73'],
];

function paintFace(atlas: Atlas, cell: Cell, project: Project, index: number, photo?: HTMLImageElement) {
  atlas.paint(cell, 240, 290, (ctx) => {
    ctx.fillStyle = '#fbf8f2';
    ctx.fillRect(0, 0, 240, 290);
    if (photo) {
      const scale = Math.max(212 / photo.naturalWidth, 212 / photo.naturalHeight);
      const w = photo.naturalWidth * scale;
      const h = photo.naturalHeight * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(14, 14, 212, 212);
      ctx.clip();
      ctx.drawImage(photo, 14 + (212 - w) / 2, 14 + (212 - h) / 2, w, h);
      ctx.restore();
    } else {
      const [from, to] = PAINTS[index % PAINTS.length]!;
      const paint = ctx.createLinearGradient(14, 14, 226, 226);
      paint.addColorStop(0, from);
      paint.addColorStop(1, to);
      ctx.fillStyle = paint;
      ctx.fillRect(14, 14, 212, 212);
      ctx.fillStyle = '#fbf8f2';
      ctx.font = '500 26px "Dudu Calligraphy"';
      ctx.textAlign = 'center';
      const lines = wrapText(ctx, project.title, 180).slice(0, 3);
      lines.forEach((line, n) => ctx.fillText(line, 120, 120 - (lines.length - 1) * 15 + n * 30));
    }
    ctx.fillStyle = '#1e1b24';
    ctx.font = '500 26px "Dudu Calligraphy"';
    ctx.textAlign = 'center';
    ctx.fillText(photo ? project.title : (project.tags[0] ?? ''), 120, 266, 220);
  });
}

/** Polaroids on strings above the bed, one per public project. */
export function Polaroids({ projects }: { projects: Project[] }) {
  const { atlas, base, lit } = useKit();
  const { hovered } = useInteraction();
  const layout = useMemo(() => {
    // shortcut: shows the first 12 projects, about what the atlas has room for; a second atlas would lift that.
    const shown = projects.slice(0, 12);
    const cols = Math.ceil(shown.length / ROWS.length);
    const spacing = 1.65 / Math.max(cols, 1);
    return shown.flatMap((project, i) => {
      const cell = atlas.alloc();
      if (!cell) return [];
      paintFace(atlas, cell, project, i);
      const at: Vec3 = [WALL_X, ROWS[Math.floor(i / cols)]!, -1.85 + spacing * ((i % cols) + 0.5)];
      return [{ project, cell, at, tilt: (((i * 37) % 9) - 4) * 0.02 }];
    });
  }, [atlas, projects]);

  useEffect(() => {
    let live = true;
    layout.forEach(({ project, cell }, i) => {
      const src = project.images[0]?.src;
      if (!src) return;
      const photo = new Image();
      photo.src = src;
      photo.decode().then(
        () => live && paintFace(atlas, cell, project, i, photo),
        () => undefined,
      );
    });
    return () => {
      live = false;
    };
  }, [atlas, layout]);

  const facing = (tilt: number): Vec3 => [tilt, Math.PI / 2, 0];
  const lookedAt = layout.find(({ project }) => hovered === `polaroid:${project.slug}`);
  return (
    <>
      {/* The camera frames the whole wall from here. */}
      <group name="polaroids" position={[WALL_X, 1.9, -1.0]} userData={{ id: 'polaroids', anchor: [-0.5, 1.8, -1.0] }} />
      {lookedAt && (
        <mesh position={[WALL_X - 0.005, lookedAt.at[1], lookedAt.at[2]]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[W + 0.05, H + 0.05]} />
          <meshBasicMaterial color="#ffd59a" toneMapped={false} />
        </mesh>
      )}
      <Merged
        material={base}
        parts={() => [
          ...ROWS.map(
            (y): Part => ({
              geo: new TubeGeometry(
                new CatmullRomCurve3([new Vector3(-2.485, y + 0.17, -1.95), new Vector3(-2.485, y + 0.13, -1.0), new Vector3(-2.485, y + 0.17, -0.1)]),
                24,
                0.003,
                4,
              ),
              color: '#3a2c22',
            }),
          ),
          ...layout.flatMap(({ at, tilt }): Part[] => [
            { geo: new BoxGeometry(W, H, 0.008), color: '#f4efe6', at: [at[0] + 0.004, at[1], at[2]], rot: facing(tilt) },
            { geo: new BoxGeometry(0.016, 0.055, 0.014), color: '#c9a27a', at: [at[0] + 0.012, at[1] + 0.14, at[2]] },
          ]),
        ]}
      />
      <Merged
        material={lit}
        shadows={false}
        parts={() =>
          layout.map(({ cell, at, tilt }): Part => ({ geo: atlas.quad(cell, W, H), color: '#ffffff', at: [at[0] + 0.0095, at[1], at[2]], rot: facing(tilt) }))
        }
      />
      {layout.map(({ project, at }) => (
        <Hotspot key={project.slug} id={`polaroid:${project.slug}`} at={[at[0] + 0.03, at[1], at[2]]} size={[0.06, H, W]} anchor={[-0.5, 1.8, -1.0]} highlight={false} />
      ))}
    </>
  );
}
