/**
 * Clear glass (DESIGN §5.5): every habit starts as a cutting standing in a glass of water. The glass is drawn as flat
 * translucent planes with a bright highlight on the lit side and a darker wall on the shade side; the stem bends at
 * the waterline (a small refraction offset) and fine white roots grow from the node as the cutting roots.
 */
import type { JSX } from 'preact';
import { ell, rr, type Pt } from './geom';
import { SHADE, type Kit } from './kit';
import { clamp01, f, lerp, mix, ramp } from './math';
import type { Composed, CuttingArt, Growth } from './types';

/** Glass and water inks. */
export const GLASS = {
  pane: '#E4EEF3',
  wall: '#C9D9E3',
  water: '#C4DAE8',
  meniscus: '#F4F9FB',
  root: '#FAF5EA',
};

/** How far the submerged stem appears to shift at the waterline. */
const REFRACT = 1.3;

/** The water glass on the 100-unit canvas. */
const W = { x0: 38, x1: 62, top: 59.4, bottom: 95, water: 70.4, node: 86.4 };

/** Fine roots: [start offset up the stem, angle from straight down (deg), full length, curl (deg)]. */
const ROOTS: readonly [number, number, number, number][] = [
  [0, 4, 11, 12],
  [0.6, -30, 12, -26],
  [1.2, 36, 12.5, 30],
  [2.6, -58, 10, -30],
  [3.2, 60, 10.5, 34],
  [4.8, -76, 8, -24],
  [5.6, 78, 8.5, 26],
];

/**
 * Roots from a node at `node`, each reaching `grow` (0..1) of its full length, kept inside the box:
 * roots that reach the glass run along its floor and walls, as they do.
 */
export function rootsD(node: Pt, grow: number, box: { x0: number; x1: number; y1: number }, scale = 1): string {
  if (grow <= 0) return '';
  const clampPt = ([x, y]: Pt): Pt => [Math.max(box.x0, Math.min(box.x1, x)), Math.min(box.y1, y)];
  let d = '';
  ROOTS.forEach(([up, angle, len, curl], i) => {
    // Later roots start later: the first appears first, the last only as the cutting finishes rooting.
    const own = clamp01(grow * 1.35 - i * 0.05);
    const L = len * scale * own;
    if (L < 0.6) return;
    const s: Pt = [node[0], node[1] - up * scale];
    const dir = (a: number, k: number): Pt => {
      const r = ((angle + a) * Math.PI) / 180;
      return [s[0] + Math.sin(r) * L * k, s[1] + Math.cos(r) * L * k];
    };
    const [c1, c2, e] = [dir(0, 0.4), dir(curl * 0.6, 0.75), dir(curl, 1)].map(clampPt) as [Pt, Pt, Pt];
    d += `M${f(s[0])} ${f(s[1])}C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(e[0])} ${f(e[1])}`;
  });
  return d;
}

/** The glass walls, rim and highlight, drawn over whatever stands inside. */
function GlassFront({ k, x0, x1, top, bottom, r = 3.2, wall = 1.4 }: { k: Kit; x0: number; x1: number; top: number; bottom: number; r?: number; wall?: number }) {
  // The bright highlight stripe sits just inside the lit wall; lit from above, it runs along the rim instead.
  const hx = k.away < 0 ? x1 - 3.2 : x0 + 3.2;
  const lit = k.away < 0 ? x1 : x0;
  const shade = k.away < 0 ? x0 : x1;
  const cx = (x0 + x1) / 2;
  const hw = (x1 - x0) / 2;
  const highlight = k.night ? '#FFF3E2' : '#FFFFFF';
  return (
    <g>
      {/* Walls: the lit one pale, the far one a shade darker; a thicker glass floor. */}
      <path d={rr(Math.min(lit, lit - Math.sign(lit - cx) * wall), top, wall, bottom - top - 0.2, Math.min(r, wall))} fill={k.lit(GLASS.wall)} opacity={0.75} />
      <path d={rr(Math.min(shade, shade - Math.sign(shade - cx) * wall), top, wall, bottom - top - 0.2, Math.min(r, wall))} fill={mix(GLASS.wall, '#8C88B0', 0.25)} opacity={0.85} />
      <path d={rr(x0 + 0.6, bottom - 2.6, x1 - x0 - 1.2, 2.6, r * 0.7)} fill={k.lit(GLASS.wall)} opacity={0.7} />
      {k.away === 0 && <path d={`M${f(x0 + 1.2)} ${f(bottom - 2.2)}H${f(x1 - 1.2)}V${f(bottom - 0.6)}H${f(x0 + 1.2)}Z`} class={SHADE} />}
      {/* The rim, seen a little from above. */}
      <path d={`${ell(cx, top, hw, 1.5)}${ell(cx, top + 0.2, hw - wall, 1.05)}`} fill-rule="evenodd" fill={k.lit(GLASS.wall)} opacity={k.away === 0 ? 1 : 0.8} />
      {k.away === 0 ? (
        <path d={`M${f(cx - hw * 0.7)} ${f(top - 0.9)}Q${f(cx)} ${f(top - 1.8)} ${f(cx + hw * 0.7)} ${f(top - 0.9)}`} stroke={highlight} stroke-width={0.9} stroke-linecap="round" fill="none" opacity={0.95} />
      ) : (
        <path d={rr(hx - 0.9, top + 4, 1.8, bottom - top - 11, 0.9)} fill={highlight} opacity={0.85} />
      )}
    </g>
  );
}

/** A glass of water with a cutting in it: stages 0 (Cutting) and 1 (Rooting). */
export function waterGlass(art: CuttingArt, g: Growth, k: Kit): Composed {
  const { x0, x1, top, bottom, water, node } = W;
  // Roots: a first nub late in stage 0, then growing through stage 1.
  const grow = g.stage === 0 ? ramp(g.progress, 0.55, 1) * 0.12 : lerp(0.18, 1, g.progress);
  const sx = 50 + REFRACT;
  const stemBelow = mix(art.stem.color, GLASS.water, 0.3);
  const vessel: JSX.Element = (
    <g data-vessel="glass">
      <path d={rr(x0, top, x1 - x0, bottom - top, 3.2)} fill={k.lit(GLASS.pane)} opacity={0.55} />
      <path d={`M${x0 + 1.2} ${water}H${x1 - 1.2}V${bottom - 3}Q${x1 - 1.2} ${bottom - 1.2} ${x1 - 4} ${bottom - 1.2}H${x0 + 4}Q${x0 + 1.2} ${bottom - 1.2} ${x0 + 1.2} ${bottom - 3}Z`} fill={k.lit(GLASS.water)} opacity={0.72} />
      {art.below ? art.below(k, sx, water, node) : <path d={`M${f(sx)} ${water}L${f(sx - 0.2)} ${node}`} stroke={stemBelow} stroke-width={art.stem.w} stroke-linecap="round" fill="none" />}
      <path d={rootsD([sx - 0.2, node], grow, { x0: x0 + 2, x1: x1 - 2, y1: bottom - 2.8 })} stroke={GLASS.root} stroke-width={0.8} stroke-linecap="round" fill="none" />
      <path d={`M${x0 + 1.2} ${water - 0.6}H${x1 - 1.2}V${water + 0.7}H${x0 + 1.2}Z`} fill={k.lit(GLASS.meniscus)} opacity={0.9} />
      <GlassFront k={k} x0={x0} x1={x1} top={top} bottom={bottom} />
    </g>
  );
  return {
    back: art.draw(g, k, [50, water]),
    vessel,
    foot: 12.4,
    pivot: [50, water],
    surface: 10,
    kind: 'glass',
  };
}
