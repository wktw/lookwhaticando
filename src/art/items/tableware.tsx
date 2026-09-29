/**
 * Tableware the treats are served on: a saucer, a small plate, a square of baking paper. Each call
 * registers its shapes under the treat's id, so their crescents are precomputed with the treat's.
 * Treats stand on y = 86 of the 100×100 canvas.
 */
import type { JSX } from 'preact';
import { contact, flat, shapes, solid, type Paint } from '@/art/scene/decor/kit';
import { ell, n, poly } from '@/art/scene/decor/geo';

/** Where treats stand on the canvas. */
export const TREAT_GROUND = 86;

const CHINA = '#FBF6EE';
const CHINA_WELL = '#F1E8DC';
const PAPER = '#FBF3E4';
const PAPER_FOLD = '#F2E7D3';

/** A shallow saucer seen from a little above, rim at `cy`. */
export function saucer(id: string, cx: number, cy: number, rx: number, rim = CHINA): (p: Paint) => JSX.Element {
  const ry = rx * 0.22;
  const s = shapes(id, {
    saucerFoot: `M${n(cx - rx)} ${n(cy)}C${n(cx - rx)} ${n(cy + ry * 1.3)} ${n(cx - rx * 0.5)} ${n(cy + ry + 2.6)} ${n(cx)} ${n(cy + ry + 2.6)}C${n(cx + rx * 0.5)} ${n(cy + ry + 2.6)} ${n(cx + rx)} ${n(cy + ry * 1.3)} ${n(cx + rx)} ${n(cy)}Z`,
    saucerTop: { d: ell(cx, cy, rx, ry), k: 0 },
  });
  return (p) => (
    <>
      {contact(p, cx, cy + ry + 2.2, rx * 0.86, 2)}
      {solid(p, s.saucerFoot, rim)}
      {flat(p, s.saucerTop, rim)}
      <path d={ell(cx, cy + ry * 0.1, rx * 0.62, ry * 0.56)} fill={p.c(CHINA_WELL)} />
    </>
  );
}

/** A square of baking paper lying flat, a little turned. */
export function bakingPaper(id: string, cx: number, cy: number, w: number): (p: Paint) => JSX.Element {
  const h = w * 0.11;
  const s = shapes(id, {
    paper: {
      d: poly(
        [
          [cx - w / 2, cy + h * 0.2],
          [cx - w * 0.16, cy - h],
          [cx + w / 2, cy - h * 0.3],
          [cx + w * 0.14, cy + h],
        ],
        1,
      ),
      k: 0,
    },
  });
  return (p) => (
    <>
      {contact(p, cx + 1, cy + h * 0.4, w * 0.46, h * 0.9)}
      {flat(p, s.paper, PAPER)}
      <path
        d={poly([
          [cx - w * 0.16, cy - h],
          [cx + w * 0.5, cy - h * 0.3],
          [cx + w * 0.17, cy + h * 0.05],
        ])}
        fill={p.c(PAPER_FOLD)}
      />
    </>
  );
}

export { CHINA, CHINA_WELL, PAPER };
