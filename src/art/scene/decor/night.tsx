/**
 * No. 07 Night decor: a hot water bottle in a knitted cover, a green-shaded reading lamp (glows)
 * and a paper moon night-light that hangs from the window (glows).
 */
import { Glow, LAMP, contact, flat, lit, paint, shapes, solid, thin, type DecorRenderer } from './kit';
import { ell, n, poly, rect, rotate, smooth, type Pt } from './geo';

/* ---------------- Hot water bottle: in a knitted cover ---------------- */

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
    </g>
  );
};

/* ---------------- Reading lamp: a green-shaded banker's lamp, makes a small warm room anywhere ---------------- */

const LAMPART = {
  shade: '#5E9467',
  shadeTop: '#77AC7F',
  lip: '#4B7D54',
  brass: '#D9B45A',
  brassTop: '#E8CB82',
  opal: '#EFE9DA',
  chain: '#B89A52',
};

/**
 * A long, shallow half-cylinder of green glass seen from the front, held at one end by a brass
 * stem that rises from the middle of a low brass plinth. The pull chain hangs from the far end.
 */
const lamp = shapes('decor-reading-lamp', {
  base: 'M38 85V89.2C38 90.8 39.2 92 40.8 92H83.2C84.8 92 86 90.8 86 89.2V85Z',
  baseTop: { d: rect(39, 81.6, 46, 4, 1.6), k: 0 },
  stem: { d: rect(60.2, 44, 4.2, 38.4), k: 0.5 },
  collar: { d: rect(57.4, 43, 9.8, 4.4, 1.6), k: 0.5 },
  shade: rect(10, 29, 66, 16, [8, 8, 1.4, 1.4]),
  top: { d: rect(8, 26, 70, 8.4), k: 0, clip: 'shade' },
  lip: { d: rect(8, 42, 70, 4), k: 0, clip: 'shade' },
  finial: { d: ell(43, 28.6, 3.2, 2), k: 0.5 },
});

export const readingLamp: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {p.night && <Glow cx={43} cy={56} r={48} strength={0.55} />}
      {contact(p, 62, 92.2, 26, 2.4)}
      {solid(p, lamp.base, LAMPART.brass)}
      {flat(p, lamp.baseTop, LAMPART.brassTop)}
      {solid(p, lamp.stem, LAMPART.brass)}
      <path d={ell(43, 45.4, 30, 2.6)} fill={lit(p, p.c(LAMPART.opal), '#FFEBC2')} />
      {solid(p, lamp.collar, LAMPART.brass)}
      {solid(p, lamp.finial, LAMPART.brass)}
      {solid(p, lamp.shade, LAMPART.shade, [flat(p, lamp.top, LAMPART.shadeTop), flat(p, lamp.lip, LAMPART.lip)])}
      {thin(p, 'M20 46V59', LAMPART.chain, 0.9)}
      <circle cx={20} cy={60.4} r={1.7} fill={p.c(LAMPART.chain)} />
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
