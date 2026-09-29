import type { Growth, PlantSpeciesArt } from '../types';
import { FINE, OUTLINE, Shine, Stems, stemD } from '../parts';
import { f, lerp, mix } from '../math';
import { sprout } from '../early';

const LEAF = '#92C97E';
const LEAF_BACK = '#7DBA6C';
const LEAF_NEW = '#B6DD9C';
const VEIN = '#5F9850';
const SPATHE = '#FFF6E0';

type Pt = [number, number];
type Cubic = [Pt, Pt, Pt, Pt];
/** Path ops after a start point: a cubic (two controls + end) or a straight line. */
type Op = { c: [Pt, Pt, Pt] } | { l: Pt };

const at = (p: Pt, q: Pt, k: number): Pt => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];

/** De Casteljau split of a cubic at t. */
function split([p0, p1, p2, p3]: Cubic, t: number): [Cubic, Cubic] {
  const a = at(p0, p1, t);
  const b = at(p1, p2, t);
  const c = at(p2, p3, t);
  const d = at(a, b, t);
  const e = at(b, c, t);
  const m = at(d, e, t);
  return [
    [p0, a, d, m],
    [m, e, c, p3],
  ];
}

/** The piece of a cubic between parameters a < b. */
function piece(c: Cubic, a: number, b: number): Cubic {
  const tail = a > 0 ? split(c, a)[1] : c;
  return b < 1 ? split(tail, (b - a) / (1 - a))[0] : tail;
}

const point = (c: Cubic, t: number): Pt => split(c, t)[0][3];
const dist = (p: Pt, q: Pt) => Math.hypot(p[0] - q[0], p[1] - q[1]);

/** The parameter between t0 and `to` whose point lies `r` away from the point at t0. */
function paramAt(c: Cubic, t0: number, to: number, r: number): number {
  const e = point(c, t0);
  let near = t0;
  let far = to;
  for (let i = 0; i < 24; i++) {
    const mid = (near + far) / 2;
    if (dist(point(c, mid), e) < r) near = mid;
    else far = mid;
  }
  return (near + far) / 2;
}

const KAPPA = 0.5523;

/**
 * A rounded slot cut into the edge of cubic `c` at parameter t0, running in toward the midrib like a
 * vein: straight sides and a round end, `w` half-wide, reaching `depth` of the way to the midrib.
 * Returns where the slot leaves the edge (a, b) and the ops from the lower lip to the upper one.
 */
function slot(c: Cubic, t0: number, w: number, depth: number, L: number): { a: number; b: number; ops: Op[] } {
  const e = point(c, t0);
  const target: Pt = [0, e[1] + 0.24 * L];
  const len = dist(e, target);
  const d: Pt = [(target[0] - e[0]) / len, (target[1] - e[1]) / len];
  const a = paramAt(c, t0, Math.max(0, t0 - 0.4), w);
  const b = paramAt(c, t0, Math.min(1, t0 + 0.4), w);
  const lipA = point(c, a);
  // The normal that points toward the lower lip.
  let n: Pt = [-d[1], d[0]];
  if ((lipA[0] - e[0]) * n[0] + (lipA[1] - e[1]) * n[1] < 0) n = [-n[0], -n[1]];
  const off = (p: Pt, v: Pt, k: number): Pt => [p[0] + v[0] * k, p[1] + v[1] * k];
  const end = off(e, d, depth * len);
  const s0 = off(end, n, w);
  const tip = off(end, d, w);
  const s1 = off(end, n, -w);
  return {
    a,
    b,
    ops: [
      { l: s0 },
      { c: [off(s0, d, w * KAPPA), off(tip, n, w * KAPPA), tip] },
      { c: [off(tip, n, -w * KAPPA), off(s1, d, w * KAPPA), s1] },
      { l: point(c, b) },
    ],
  };
}

/** Where the slots sit on the right edge, as [edge segment, t]: two at most per side, spaced like veins. */
const SLOTS: [number, number][][] = [
  [],
  [[1, 0.5]],
  [
    [1, 0.3],
    [2, 0.22],
  ],
];

const leafCache = new Map<string, string>();

/**
 * A heart-shaped monstera leaf built from smooth cubics (sinus at the origin, tip at −L), with up to
 * two rounded slots per side. `bend` sweeps the tip sideways.
 */
function monsteraLeafD(L: number, slits: number, bend: number): string {
  const key = `${f(L)}|${slits}|${f(bend)}`;
  const cached = leafCache.get(key);
  if (cached) return cached;
  const W = L * 0.68;
  const edge: Cubic[] = [
    [
      [0, 0],
      [0.18 * W, 0.16 * L],
      [0.82 * W, 0.16 * L],
      [0.95 * W, -0.12 * L],
    ],
    [
      [0.95 * W, -0.12 * L],
      [1.05 * W, -0.34 * L],
      [0.98 * W, -0.5 * L],
      [0.7 * W, -0.66 * L],
    ],
    [
      [0.7 * W, -0.66 * L],
      [0.42 * W, -0.82 * L],
      [0.16 * W, -0.94 * L],
      [0, -L],
    ],
  ];
  const right: Op[] = [];
  edge.forEach((seg, i) => {
    let from = 0;
    for (const [si, t] of SLOTS[slits] ?? []) {
      if (si !== i) continue;
      const cut = slot(seg, t, L * 0.1, 0.46, L);
      const [, c1, c2, p] = piece(seg, from, cut.a);
      right.push({ c: [c1, c2, p] }, ...cut.ops);
      from = cut.b;
    }
    const [, c1, c2, p] = piece(seg, from, 1);
    right.push({ c: [c1, c2, p] });
  });
  // Left half: the right half mirrored and walked back from the tip to the sinus.
  const ends: Pt[] = [[0, 0], ...right.map((op) => ('c' in op ? op.c[2] : op.l))];
  const mirror = ([x, y]: Pt): Pt => [-x, y];
  const left: Op[] = right
    .map((op, i): Op => {
      const back = mirror(ends[i]!);
      return 'c' in op ? { c: [mirror(op.c[1]), mirror(op.c[0]), back] } : { l: back };
    })
    .reverse();
  const bent = ([x, y]: Pt) => `${f(x + bend * L * (y / L) ** 2)} ${f(y)}`;
  const d = `M0 0 ${[...right, ...left].map((op) => ('c' in op ? `C${op.c.map(bent).join(' ')}` : `L${bent(op.l)}`)).join(' ')} Z`;
  leafCache.set(key, d);
  return d;
}

interface LeafSpec {
  x0: number;
  x: number;
  y: number;
  rot: number;
  L: number;
  slits: number;
  fill?: string;
}

function MonsteraLeaf({ x, y, rot, L, slits, fill = LEAF }: LeafSpec) {
  const W = L * 0.68;
  const bend = rot > 0 ? 0.1 : -0.1;
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)})`} stroke-linejoin="round" stroke-linecap="round">
      <path d={monsteraLeafD(L, slits, bend)} fill={fill} stroke={OUTLINE} stroke-width={FINE} />
      <path d={`M0 ${f(-L * 0.02)} Q${f(bend * L * 0.2)} ${f(-L * 0.5)} ${f(bend * L * 0.66)} ${f(-L * 0.84)}`} fill="none" stroke={VEIN} stroke-width={1.2} />
      <Shine d={`M${f(-W * 0.62)} ${f(-L * 0.3)} Q${f(-W * 0.6)} ${f(-L * 0.52)} ${f(-W * 0.36)} ${f(-L * 0.68)}`} w={1.3} opacity={0.5} />
    </g>
  );
}

/** The monstera "flower": a cream spathe hood around a butter spadix; `k` < 1 is a closed green bud. */
function Spathe({ x, y, s = 1, rot = 0, k = 1 }: { x: number; y: number; s?: number; rot?: number; k?: number }) {
  const line = f((s < 0.8 ? 1.6 : FINE) / s);
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})`} stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
      {k < 1 ? (
        <path d="M0 0 C-4 -2 -4 -10 0 -16 C4 -10 4 -2 0 0 Z" fill={mix('#CDE7B2', SPATHE, k)} stroke-width={line} />
      ) : (
        <g stroke-width={line}>
          <path d="M0 0.4 C-6.4 -1.6 -8 -10 -1.6 -18 C1 -13 6.4 -8.4 5.2 -2 C4.4 0.4 2 1 0 0.4 Z" fill={SPATHE} />
          <path d="M-1.6 -1.2 L-1.9 -10 Q-0.3 -12.6 1.3 -10.2 L1.4 -1.4 Q0 -0.4 -1.6 -1.2 Z" fill="#FFE08A" stroke-width={f(1.4 / s)} />
          <Shine d="M-4.6 -4 Q-5.6 -8.8 -3 -12.6" w={1.3 / s} opacity={0.9} />
        </g>
      )}
    </g>
  );
}

interface SpatheSpec {
  x0: number;
  x: number;
  y: number;
  rot: number;
  s: number;
  k: number;
}

interface Layout {
  leaves: LeafSpec[];
  spathes: SpatheSpec[];
}

/** Extra spathes after Evergreen, peeking up along the top edge of the leaf mass where they read. */
const EXTRA_SPATHES: SpatheSpec[] = [
  { x0: 48, x: 37, y: 25, rot: -14, s: 0.7, k: 1 },
  { x0: 52, x: 66, y: 25, rot: 16, s: 0.7, k: 1 },
  { x0: 47, x: 22, y: 36, rot: -34, s: 0.66, k: 1 },
  { x0: 53, x: 79, y: 35, rot: 34, s: 0.66, k: 1 },
  { x0: 49, x: 46, y: 20, rot: -4, s: 0.62, k: 1 },
  { x0: 52, x: 58, y: 19, rot: 8, s: 0.6, k: 1 },
];

function layout(g: Growth): Layout {
  const p = g.progress;
  const k = lerp(0.92, 1, p);
  switch (g.stage) {
    case 2:
      return {
        leaves: [
          { x0: 49, x: 45, y: 49, rot: -30, L: lerp(11.5, 13, p), slits: 0, fill: LEAF_NEW },
          { x0: 51, x: 55, y: 46, rot: 26, L: lerp(12.5, 14, p), slits: 0, fill: LEAF_NEW },
          ...(p >= 0.5 ? [{ x0: 50, x: 50, y: 43, rot: 2, L: lerp(6, 9, p), slits: 0, fill: LEAF_NEW }] : []),
        ],
        spathes: [],
      };
    case 3:
      return {
        leaves: [
          { x0: 50, x: 50, y: 42, rot: 2, L: 17 * k, slits: p >= 0.5 ? 1 : 0, fill: LEAF_BACK },
          { x0: 48, x: 37, y: 49, rot: -48, L: 15.5 * k, slits: 0 },
          { x0: 52, x: 63, y: 47, rot: 46, L: 16 * k, slits: 0 },
        ],
        spathes: [],
      };
    case 4:
      return {
        leaves: [
          { x0: 49, x: 43, y: 41, rot: -16, L: 19, slits: 1, fill: LEAF_BACK },
          { x0: 51, x: 58, y: 40, rot: 18, L: 19, slits: 1, fill: LEAF_BACK },
          { x0: 48, x: 34, y: 52, rot: -60, L: 16.5, slits: 1 },
          { x0: 52, x: 66, y: 51, rot: 58, L: 16.5, slits: 1 },
        ],
        spathes: [{ x0: 50, x: 51, y: lerp(34, 31, p), rot: 4, s: lerp(0.62, 0.86, p), k: p * 0.6 }],
      };
    case 5:
      return {
        leaves: [
          { x0: 49, x: 41, y: 38, rot: -20, L: 21, slits: 2, fill: LEAF_BACK },
          { x0: 51, x: 60, y: 37, rot: 21, L: 21, slits: 2, fill: LEAF_BACK },
          { x0: 48, x: 31, y: 52, rot: -64, L: 17.5, slits: 1 },
          { x0: 52, x: 69, y: 51, rot: 62, L: 17.5, slits: 2 },
        ],
        spathes: [{ x0: 50, x: 51, y: 30, rot: 4, s: lerp(0.86, 1, p), k: 1 }],
      };
    case 6:
      return {
        leaves: [
          { x0: 50, x: 50.5, y: 34, rot: 2, L: 21, slits: 2, fill: LEAF_BACK },
          { x0: 49, x: 36, y: 40, rot: -38, L: 21, slits: 2, fill: LEAF_BACK },
          { x0: 51, x: 65, y: 39, rot: 38, L: 21, slits: 2, fill: LEAF_BACK },
          { x0: 48, x: 29, y: 54, rot: -70, L: 17.5, slits: 2 },
          { x0: 52, x: 72, y: 53, rot: 68, L: 17.5, slits: 2 },
        ],
        spathes: [
          { x0: 51, x: 58, y: 31, rot: 12, s: 1, k: 1 },
          ...(p >= 0.5 ? [{ x0: 49, x: 38, y: 34, rot: -22, s: lerp(0.6, 0.78, p), k: lerp(0.5, 1, p) }] : []),
        ],
      };
    default:
      return {
        leaves: [
          { x0: 49, x: 42, y: 34, rot: -12, L: 22.5, slits: 2, fill: LEAF_BACK },
          { x0: 51, x: 59, y: 33, rot: 13, L: 22.5, slits: 2, fill: LEAF_BACK },
          { x0: 48, x: 31, y: 44, rot: -48, L: 20.5, slits: 2 },
          { x0: 52, x: 70, y: 43, rot: 48, L: 20.5, slits: 2 },
          { x0: 47, x: 30, y: 57, rot: -78, L: 17, slits: 2 },
          { x0: 53, x: 71, y: 56, rot: 76, L: 17, slits: 2 },
        ],
        spathes: [{ x0: 51, x: 58, y: 30, rot: 12, s: 1, k: 1 }, { x0: 49, x: 38, y: 33, rot: -22, s: 0.82, k: 1 }, ...EXTRA_SPATHES.slice(0, g.blooms)],
      };
  }
}

export const monstera: PlantSpeciesArt = {
  seed: '#CDB08F',
  render: (g) => {
    if (g.stage === 1) return sprout(g);
    const { leaves, spathes } = layout(g);
    return {
      back: (
        <g>
          {/* Spathe stalks hide behind the leaves; only the spathes sit on top. */}
          <Stems paths={[...leaves.map((l) => stemD(l.x0, l.x, l.y + 1, (l.x - l.x0) * -0.3)), ...spathes.map((s) => stemD(s.x0, s.x, s.y))]} w={2} />
          {leaves.map((l, i) => (
            <MonsteraLeaf key={i} {...l} />
          ))}
          {spathes.map((s, i) => (
            <Spathe key={i} x={s.x} y={s.y} s={s.s} rot={s.rot} k={s.k} />
          ))}
        </g>
      ),
    };
  },
};
