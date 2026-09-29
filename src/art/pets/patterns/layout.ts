import type { ArtCtx } from '../types';

/** The face region (eyes, cheeks, mouth) that patterns keep clear so every face stays readable. */
export function faceZone({ anchors }: ArtCtx) {
  const { eyes, mouth } = anchors;
  return {
    cx: (eyes.left + eyes.right) / 2,
    cy: (eyes.y + mouth.y) / 2,
    rx: (eyes.right - eyes.left) / 2 + 9.5,
    ry: (mouth.y - eyes.y) / 2 + 8.5,
  };
}

export function inFace(ctx: ArtCtx, x: number, y: number, pad = 0): boolean {
  const z = faceZone(ctx);
  const dx = (x - z.cx) / (z.rx + pad);
  const dy = (y - z.cy) / (z.ry + pad);
  return dx * dx + dy * dy < 1;
}

/** Top of the body at the center line. */
export const bodyTop = (ctx: ArtCtx) => ctx.anchors.head.y - 1;

function jitter(i: number, seed: number): number {
  const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

export interface ScatterPoint {
  x: number;
  y: number;
  /** Stable per-point value in [0, 1) for rotation/size/color variety. */
  r: number;
  i: number;
}

/**
 * Evenly scattered points inside the body and outside the face: a jittered hex grid.
 * `spacing` sets density; `seed` changes the arrangement.
 */
export function scatter(ctx: ArtCtx, spacing: number, seed = 1, margin = 2): ScatterPoint[] {
  const out: ScatterPoint[] = [];
  const top = bodyTop(ctx);
  let i = 0;
  for (let row = 0; row * spacing * 0.86 < 100; row++) {
    const y0 = top + 3 + row * spacing * 0.86;
    for (let col = -1; col * spacing < 100; col++) {
      i++;
      const x = 6 + col * spacing + (row % 2 ? spacing / 2 : 0) + jitter(i, seed) * spacing * 0.5;
      const y = y0 + jitter(i + 97, seed) * spacing * 0.4;
      if (y > 91 || Math.abs(x - 50) > ctx.body.halfWidthAt(y) - margin) continue;
      if (inFace(ctx, x, y, margin)) continue;
      out.push({ x, y, r: jitter(i + 31, seed) + 0.5, i });
    }
  }
  return out;
}
