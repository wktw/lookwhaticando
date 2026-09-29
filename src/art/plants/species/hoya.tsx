/**
 * Hoya (Hoya carnosa): a vine with thick, waxy, pointed-oval leaves in pairs, flecked with silver, trained up a
 * small bamboo hoop the way hoyas are sold. It flowers in round clusters of star-shaped flowers, pink with a red
 * centre, and later trails a vine over the rim.
 */
import { Fragment, type JSX } from 'preact';
import { ell, smooth, type Pt } from '../geom';
import { inks, type Kit } from '../kit';
import { partial, place } from '../leaves';
import { f, lerp, ramp } from '../math';
import type { Growth, Mouth, SpeciesArt } from '../types';

const GREENS = inks('#8FB386', '#6C9365');
const VINE = '#8C9E72';
const HOOP = '#D2B98E';
const FLECK = '#E4EDDA';
const STAR = '#F5CCD6';
const CENTRE = '#C9546E';

/** A waxy leaf, 10 long, base at the origin, pointed tip. */
const LEAF = 'M0 0C3 -1 4 -4.6 3.4 -6.8C2.8 -8.6 1.4 -9.6 0 -10C-1.4 -9.6 -2.8 -8.6 -3.4 -6.8C-4 -4.6 -3 -1 0 0Z';
const FLECKS = `${ell(-1.2, -4.4, 0.35)}${ell(1, -6, 0.3)}${ell(-0.6, -7.2, 0.28)}${ell(1.4, -3.4, 0.3)}`;

function leaf(k: Kit, x: number, y: number, a: number, s: number, tone: number, key: string) {
  return (
    <g key={key} transform={place(x, y, a, s)}>
      <path d={LEAF} fill={k.tone(GREENS, tone, x + Math.sin((a * Math.PI) / 180) * 5 * s, y)} />
      <path d={FLECKS} fill={FLECK} opacity={0.7} />
    </g>
  );
}

/** A round umbel of star flowers, radius about 5: a dome of stars, each with a red centre. */
const UMBEL = (() => {
  const stars: Pt[] = [];
  for (let ring = 0; ring < 3; ring++) {
    const n = [1, 5, 8][ring]!;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.3;
      stars.push([Math.cos(a) * ring * 2.3, Math.sin(a) * ring * 2 - (2 - ring) * 0.7]);
    }
  }
  const star = (cx: number, cy: number, r: number) => {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`;
    }
    return `${d}Z`;
  };
  return {
    stars: stars.map(([x, y]) => star(x, y, 1.6)).join(''),
    centres: stars.map(([x, y]) => ell(x, y, 0.36)).join(''),
    buds: stars.map(([x, y]) => ell(x, y, 0.7)).join(''),
  };
})();

function umbel(k: Kit, at: Pt, drop: number, open: number, key: number) {
  const [x, y] = at;
  const c: Pt = [x, y + drop];
  return (
    <g key={key}>
      <path d={`M${f(x)} ${f(y)}Q${f(x + 1.4)} ${f(y + drop * 0.5)} ${f(c[0])} ${f(c[1] - 2)}`} fill="none" stroke={VINE} stroke-width={0.6} stroke-linecap="round" />
      <g transform={`translate(${f(c[0])} ${f(c[1])}) scale(${f(lerp(0.75, 1, open))})`}>
        {open > 0 ? (
          <>
            <path d={UMBEL.stars} fill={k.lit(STAR)} />
            <path d={UMBEL.centres} fill={CENTRE} />
          </>
        ) : (
          <path d={UMBEL.buds} fill={k.lit('#EDC3CF')} />
        )}
      </g>
    </g>
  );
}

/** Points up one side of the hoop and over the top: phi 0 at the soil, pi/2 at the top. */
const onHoop = (m: Mouth, rx: number, ry: number, side: 1 | -1, phi: number): Pt => [50 + side * rx * Math.cos(phi) + Math.sin(phi * 9) * 0.8, m.y - ry * Math.sin(phi)];

function vineUp(k: Kit, m: Mouth, rx: number, ry: number, side: 1 | -1, reach: number, key: string) {
  if (reach <= 0.02) return { el: null, nodes: [] as Pt[] };
  const steps = Math.max(2, Math.ceil(reach / 0.12));
  const pts: Pt[] = Array.from({ length: steps + 1 }, (_, i) => onHoop(m, rx, ry, side, 0.04 + (reach * i) / steps));
  const nodes: Pt[] = [];
  const leaves: JSX.Element[] = [];
  const pairs = Math.floor(reach / 0.34);
  for (let j = 1; j <= pairs; j++) {
    const phi = j * 0.34;
    const p = onHoop(m, rx, ry, side, phi);
    nodes.push(p);
    const g = ramp(reach, phi, phi + 0.5);
    // The pair opens away from the hoop: one leaf outward, one leaning in.
    const out = side * (90 - (phi * 180) / Math.PI) * 0.9;
    leaves.push(leaf(k, p[0], p[1], out - side * 12, lerp(0.4, 1, g), j % 2, `${key}${j}a`), leaf(k, p[0], p[1], out - side * 150, lerp(0.35, 0.85, g), (j + 1) % 2, `${key}${j}b`));
  }
  return {
    el: (
      <g key={key}>
        <path d={smooth(pts, false)} fill="none" stroke={VINE} stroke-width={1.1} stroke-linecap="round" />
        {leaves}
      </g>
    ),
    nodes,
  };
}

/** A vine trailing over the rim, leaves in pairs hanging down. */
function trailing(k: Kit, m: Mouth, s: 1 | -1, segs: number) {
  if (segs <= 0) return null;
  const all: Pt[] = [[50 + s * (m.hw - 4), m.y - 0.4], [50 + s * (m.hw + 1.6), m.y - 1.8]];
  const drop = Math.min(4.6, (87 - m.y) / 6);
  for (let i = 1; i <= 6; i++) all.push([50 + s * (m.hw + 2.6 + i * 0.9 + (i % 2) * 1.4), m.y + i * drop]);
  const pts = partial(all, segs);
  return (
    <g>
      <path d={smooth(pts, false)} fill="none" stroke={VINE} stroke-width={1} stroke-linecap="round" />
      {pts.slice(2).map(([x, y], i) => (
        <Fragment key={i}>
          {leaf(k, x, y, s * (i % 2 ? 118 : 100), 0.82, i % 2, 'a')}
          {i % 2 === 0 && leaf(k, x, y, s * 196, 0.66, (i + 1) % 2, 'b')}
        </Fragment>
      ))}
    </g>
  );
}

function potted(g: Growth, k: Kit, m: Mouth) {
  const spread = Math.min(1, m.hw / 18);
  const rx = 12 * spread;
  const ry = lerp(30, 40, ramp(g.t, 2, 6));
  const hoop = `M${f(50 - rx)} ${f(m.y + 1)}C${f(50 - rx)} ${f(m.y - ry * 1.33)} ${f(50 + rx)} ${f(m.y - ry * 1.33)} ${f(50 + rx)} ${f(m.y + 1)}`;
  const a = vineUp(k, m, rx, ry, -1, lerp(0.35, 2.9, ramp(g.t, 1.8, 7.6)), 'a');
  const b = vineUp(k, m, rx, ry, 1, lerp(0, 2.2, ramp(g.t, 3.2, 7.8)), 'b');
  const nodes = [...a.nodes.slice(2), ...b.nodes.slice(1)];
  const budding = g.stage === 4 ? 1 + Math.round(g.progress) : 0;
  const n = Math.min(nodes.length, budding || Math.min(4, g.blooms));
  const umbels = (n > 0 ? nodes.slice(-n) : []).map((p, j) => umbel(k, p, 5.4, budding ? 0 : 1, j));
  return {
    back: (
      <g>
        <path d={hoop} fill="none" stroke={k.lit(HOOP)} stroke-width={0.9} stroke-linecap="round" />
        {a.el}
        {b.el}
        {umbels}
      </g>
    ),
    front: <g>{trailing(k, m, 1, (g.t - 5.6) * 2.2 + g.blooms * 0.3)}</g>,
  };
}

export const hoya: SpeciesArt = {
  cutting: {
    stem: { color: VINE, w: 1.2 },
    draw: (g, k, [x, y]) => {
      const n1: Pt = [x - 0.4, 55];
      const n2: Pt = [x - 1.6, 46];
      const top = g.stage ? 1 : lerp(0.8, 1, g.progress);
      return (
        <g>
          <path d={`M${x} ${y}Q${x} ${n1[1] + 4} ${n1[0]} ${n1[1]}Q${n1[0] - 0.6} ${n2[1] + 4} ${n2[0]} ${n2[1]}`} fill="none" stroke={VINE} stroke-width={1.2} stroke-linecap="round" />
          {leaf(k, n1[0], n1[1], -62, 1, 1, 'a')}
          {leaf(k, n1[0], n1[1], 64, 1, 0, 'b')}
          {leaf(k, n2[0], n2[1], -30, 0.85 * top, 0, 'c')}
          {leaf(k, n2[0], n2[1], 34, 0.8 * top, 1, 'd')}
        </g>
      );
    },
  },
  potted,
};
