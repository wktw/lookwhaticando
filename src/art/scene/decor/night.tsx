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

/* ---------------- Reading lamp: the Sill's own lamp shade on a brass reading stand ---------------- */

/** The house lamp's paper (DESIGN §10.4: one lamp design in the whole room), on a brass stand. */
const LAMPART = {
  shade: '#FBF1DE',
  pleat: '#F0E2C8',
  rim: '#EADAC0',
  shadeLit: '#FFE3A8',
  pleatLit: '#FFD690',
  rimLit: '#FFF4D6',
  brass: '#D9B45A',
  brassTop: '#E8CB82',
  chain: '#B89A52',
};

/**
 * A pleated cream paper shade, the same as the table lamp's, hung from the arm of a brass reading stand that rises
 * from a low brass plinth. The pull chain hangs from the shade's rim.
 */
const lamp = shapes('decor-reading-lamp', {
  base: 'M38 85V89.2C38 90.8 39.2 92 40.8 92H83.2C84.8 92 86 90.8 86 89.2V85Z',
  baseTop: { d: rect(39, 81.6, 46, 4, 1.6), k: 0 },
  stem: { d: rect(62.2, 30, 4.2, 52.4), k: 0.5 },
  arm: { d: rect(44, 26.6, 22.4, 3.6, 1.2), k: 0.4 },
  shade: 'M34 30L58 30L68.6 52.4Q69.4 54 67.6 54L24.4 54Q22.6 54 23.4 52.4Z',
  collar: { d: rect(41.6, 26, 8.8, 5.2, 1.6), k: 0.5 },
});

const PLEATS = 'M40 30.6L33.4 53.4M46 30.6L44.6 53.4M52 30.6L55.4 53.4M57.4 31L65 53.2';

export const readingLamp: DecorRenderer = (o) => {
  const p = paint(o);
  const on = p.night;
  return (
    <g>
      {on && <Glow cx={46} cy={46} r={48} strength={0.55} />}
      {contact(p, 62, 92.2, 26, 2.4)}
      {solid(p, lamp.base, LAMPART.brass)}
      {flat(p, lamp.baseTop, LAMPART.brassTop)}
      {solid(p, lamp.stem, LAMPART.brass)}
      {solid(p, lamp.arm, LAMPART.brass)}
      {on && <path d={ell(46, 54.4, 21, 2.2)} fill={LAMPART.rimLit} opacity={0.7} />}
      {on ? (
        <>
          {/* lit from within: no shade crescent on the paper */}
          <path d={lamp.shade.d} fill={LAMPART.shadeLit} />
          {thin(p, PLEATS, LAMPART.pleatLit, 1.1, undefined, true)}
        </>
      ) : (
        solid(p, lamp.shade, LAMPART.shade, thin(p, PLEATS, LAMPART.pleat, 1.1))
      )}
      <path d={ell(46, 53.8, 22.6, 1.6)} fill={on ? LAMPART.rimLit : p.c(LAMPART.rim)} />
      {solid(p, lamp.collar, LAMPART.brass)}
      {thin(p, 'M28 54.6V66', LAMPART.chain, 0.9)}
      <circle cx={28} cy={67.4} r={1.7} fill={p.c(LAMPART.chain)} />
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
