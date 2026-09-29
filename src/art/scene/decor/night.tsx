/**
 * No. 07 Night decor: a hot water bottle in a knitted cover, a green-shaded reading lamp (glows)
 * and a paper moon night-light that hangs from the window (glows).
 */
import { Glow, LAMP, contact, flat, lit, paint, shapes, solid, thin, type DecorRenderer } from './kit';
import { ell, n, poly, rect, rotate, smooth, type Pt } from './geo';

/* ---------------- Hot water bottle: in a knitted cover, still warm ---------------- */

const KNIT = { cover: '#DDB6DA', rib: '#CDA0CA', cuff: '#EBD0E8', rubber: '#E3977F', cap: '#6F6269' };
/** The bottle leans back a little against nothing in particular, the way they do. */
const HWB_TILT = 6;
const tiltHwb = (pts: readonly Pt[]) => rotate(pts, HWB_TILT, 50, 92);

const bottle = shapes('decor-hot-water-bottle', {
  neck: {
    d: poly(
      tiltHwb([
        [42, 30],
        [58, 30],
        [58, 16],
        [42, 16],
      ]),
      1.4,
    ),
    k: 0.5,
  },
  cap: {
    d: poly(
      tiltHwb([
        [39, 18],
        [61, 18],
        [61, 9],
        [39, 9],
      ]),
      2.6,
    ),
    k: 0.5,
    rim: true,
  },
  cover: smooth(
    tiltHwb([
      [36, 33],
      [50, 30],
      [64, 33],
      [70, 42],
      [74, 62],
      [74, 82],
      [68, 91.4],
      [50, 92],
      [32, 91.4],
      [26, 82],
      [26, 62],
      [30, 42],
    ]),
  ),
  cuff: {
    d: smooth(
      tiltHwb([
        [35, 30],
        [50, 27.4],
        [65, 30],
        [67, 36],
        [50, 34.4],
        [33, 36],
      ]),
    ),
    k: 0.4,
  },
});

/** Knitted ribs down the cover: pairs of thin lines that follow its lean. */
const RIB_LINES = [34, 42, 50, 58, 66]
  .map((x) => {
    const [a, b] = tiltHwb([
      [x, 40],
      [x, 88],
    ]);
    return `M${n(a![0])} ${n(a![1])}L${n(b![0])} ${n(b![1])}`;
  })
  .join('');

export const hotWaterBottle: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 26, 2.4)}
      {solid(p, bottle.neck, KNIT.rubber)}
      {solid(p, bottle.cap, KNIT.cap)}
      {solid(p, bottle.cover, KNIT.cover, [thin(p, RIB_LINES, KNIT.rib, 2.2), thin(p, RIB_LINES, KNIT.cuff, 0.8, 0.8)])}
      {solid(p, bottle.cuff, KNIT.cuff)}
      {thin(p, 'M76 34C73 30 78 27 75.6 22.6M84 38C81 34 86 31 83.6 26.6', '#FFFFFF', 1.8, p.night ? 0.2 : 0.55)}
    </g>
  );
};

/* ---------------- Reading lamp: green-shaded, makes a small warm room anywhere ---------------- */

const LAMPART = { shade: '#6E9C74', brass: '#D9B45A', brassTop: '#E6C87E', opal: '#EFE9DA', chain: '#B89A52' };

const lamp = shapes('decor-reading-lamp', {
  base: 'M26 86V88.6C26 90.4 36.8 91.8 50 91.8C63.2 91.8 74 90.4 74 88.6V86Z',
  baseTop: { d: ell(50, 86, 24, 4.4), k: 0 },
  stem: { d: rect(47.8, 44, 4.4, 42), k: 0.5 },
  yoke: { d: 'M30 48.6H70V51.2C62 53 38 53 30 51.2Z', k: 0.4 },
  shade: 'M15 47C15 33 29 24.6 50 24.6C71 24.6 85 33 85 47Z',
});

export const readingLamp: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {p.night && <Glow cx={50} cy={58} r={50} strength={0.55} />}
      {contact(p, 50, 92.2, 27, 2.4)}
      {solid(p, lamp.base, LAMPART.brass)}
      {flat(p, lamp.baseTop, LAMPART.brassTop)}
      {solid(p, lamp.stem, LAMPART.brass)}
      {solid(p, lamp.yoke, LAMPART.brass)}
      <path d={ell(50, 47, 35, 3.6)} fill={lit(p, p.c(LAMPART.opal), '#FFEBC2')} />
      {solid(p, lamp.shade, LAMPART.shade, thin(p, 'M18 44.6C30 42.6 70 42.6 82 44.6', '#8DB592', 1.2, 0.8))}
      {thin(p, 'M72 49V63', LAMPART.chain, 0.9)}
      <circle cx={72} cy={64.4} r={1.6} fill={p.c(LAMPART.chain)} />
    </g>
  );
};

/* ---------------- Moon night-light: a paper moon that glows the colour of honey ---------------- */

const MOON = { day: '#F4E4B4', night: '#FFD58A', crease: '#E9D39A', string: '#8C7F86' };

/** A crescent: a circle (cx, cy, r) with a smaller circle (ox, oy, or) taken out of it. */
function crescentMoon(cx: number, cy: number, r: number, ox: number, oy: number, or: number): string {
  const dx = ox - cx;
  const dy = oy - cy;
  const d = Math.hypot(dx, dy);
  const a = (r * r - or * or + d * d) / (2 * d);
  const h = Math.sqrt(r * r - a * a);
  const mx = cx + (a * dx) / d;
  const my = cy + (a * dy) / d;
  const p1 = [mx + (h * dy) / d, my - (h * dx) / d] as const;
  const p2 = [mx - (h * dy) / d, my + (h * dx) / d] as const;
  return `M${n(p1[0])} ${n(p1[1])}A${r} ${r} 0 1 0 ${n(p2[0])} ${n(p2[1])}A${or} ${or} 0 0 1 ${n(p1[0])} ${n(p1[1])}Z`;
}

const moon = shapes('decor-moon-nightlight', {
  moon: crescentMoon(46, 56, 31, 62, 47, 26),
});

export const moonNightlight: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {p.night && <Glow cx={44} cy={58} r={46} color={LAMP} strength={0.6} />}
      {thin(p, 'M52 0.6V26.6', MOON.string, 1)}
      {solid(
        p,
        moon.moon,
        p.night ? MOON.night : p.c(MOON.day),
        thin(p, 'M22 42C28 50 30 62 26 72M34 30C36 40 36 46 32 56M30 80C38 78 46 80 52 84', p.night ? '#F2B865' : MOON.crease, 1.1, 0.9, p.night),
        true,
      )}
    </g>
  );
};
