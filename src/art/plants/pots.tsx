/**
 * Pots (DESIGN §8, §10.4), one per PotId, drawn exactly: flat matte fills, no outlines, a hard shade crescent on the
 * side away from the light (precomputed per light position in `geom.ts`) and the soil showing at the mouth.
 * Every pot stands on the 100-unit canvas with its foot on y = 95, centred on x = 50, so any plant fits any pot.
 */
import type { JSX } from 'preact';
import type { PotId } from '@/catalog/types';
import type { LightFrom } from '../light';
import { bandCrescents, ell, rr, smooth, taperCrescents, taperD, underRim, type ByLight, type Pt, type Taper } from './geom';
import { RIM_LIGHT, SHADE, type Kit } from './kit';
import { f, mix, rng } from './math';
import type { Mouth } from './types';

export const FOOT_Y = 95;
const SOIL = '#9C7C62';
const SOIL_DAMP = '#5F4738';

export interface PotDef {
  /** The soil line and the half-width of the opening: plants stand here. */
  mouth: Mouth;
  /** Half-width of the foot (for the contact shadow). */
  foot: number;
  /** Where the Evergreen charm hangs from the rim. */
  charm: Pt;
  render: (k: Kit, damp: boolean) => JSX.Element;
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

const opposite: Record<LightFrom, LightFrom> = { left: 'right', right: 'left', top: 'top' };

/** The soil at the mouth: a flat lens, darker when watered today. */
function Soil({ m, damp, ry = 1.5 }: { m: Mouth; damp: boolean; ry?: number }) {
  return <path class="plant-soil" d={ell(50, m.y, m.hw, ry)} fill={damp ? SOIL_DAMP : SOIL} />;
}

/** A crescent for the current light. */
const Shade = ({ k, c }: { k: Kit; c: ByLight }) => <path d={c[k.light.from]} class={SHADE} />;

/** At night, a dark glaze gets a thin rim of lamplight on the lamp side (a crescent for the opposite light). */
const LampRim = ({ k, c }: { k: Kit; c: ByLight }) => (k.night && k.away !== 0 ? <path d={c[opposite[k.light.from]]} class={RIM_LIGHT} /> : null);

/** A rim band: a rounded rectangle across the top of the pot. */
interface Rim {
  x: number;
  y: number;
  w: number;
  h: number;
  d: string;
  cres: ByLight;
}

function rim(y: number, hw: number, h: number, r = 1.8, shade = 4.4): Rim {
  const x = 50 - hw;
  return { x, y, w: hw * 2, h, d: rr(x, y, hw * 2, h, r), cres: bandCrescents(x, y, hw * 2, h, r, shade) };
}

/** A tapered body with its crescents, the rim's shadow on it, and (for dark glazes) a lamp rim. */
function body(t: Taper, shade = 5) {
  const cres = taperCrescents(t, shade);
  // The side crescents also carry a sliver along the foot, as the reference pots do.
  const foot = taperCrescents(t, 1.3).top;
  return {
    t,
    d: taperD(t),
    cres: { left: `${cres.left}${foot}`, right: `${cres.right}${foot}`, top: cres.top } as ByLight,
    under: underRim(t, 1.8),
    lamp: taperCrescents(t, 1.1),
  };
}

/** Deterministic points inside a taper (flecks, speckles), kept clear of the edges. */
function scatter(t: Taper, n: number, seed: number, margin = 2): Pt[] {
  const r = rng(seed);
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const y = t.top + margin + r() * (t.bottom - t.top - margin * 2);
    const hw = t.a + ((t.b - t.a) * (y - t.top)) / (t.bottom - t.top) - margin;
    out.push([50 + (r() * 2 - 1) * hw, y]);
  }
  return out;
}

const dots = (pts: readonly Pt[], r: number, jitter = 0.35, seed = 3) => {
  const rand = rng(seed);
  return pts.map(([x, y]) => ell(x, y, r * (1 - jitter + rand() * jitter * 2))).join('');
};

/** A smooth side from a half-width profile, as curve commands only (no leading move). */
const curve = (pts: Pt[]) => smooth(pts, false).replace(/^M[^C]*/, '');

/* ------------------------------------------------------------------ */
/* The classic tapered pot: terracotta, blush, ticking, rosy           */
/* ------------------------------------------------------------------ */

const CLASSIC_RIM = rim(62, 22, 7.2);
const CLASSIC = body({ top: 69.2, bottom: FOOT_Y, a: 19.6, b: 15.4, r: 2.2 });
const CLASSIC_MOUTH: Mouth = { y: 62.4, hw: 20.2 };

interface ClassicStyle {
  fill: string;
  rimFill: string;
  bodyDecor?: JSX.Element;
  rimDecor?: JSX.Element;
  rimShape?: Rim;
  /** A body that starts higher, tucked under a rim whose lower edge is not straight. */
  bodyShape?: Body;
}

type Body = ReturnType<typeof body>;

function Classic({ k, damp, fill, rimFill, bodyDecor, rimDecor, rimShape = CLASSIC_RIM, bodyShape = CLASSIC }: ClassicStyle & { k: Kit; damp: boolean }) {
  return (
    <g>
      <path d={bodyShape.d} fill={k.lit(fill)} />
      {bodyDecor}
      <path d={CLASSIC.under} class={SHADE} />
      <Shade k={k} c={bodyShape.cres} />
      <path d={rimShape.d} fill={k.lit(rimFill)} />
      {rimDecor}
      <Shade k={k} c={rimShape.cres} />
      <Soil m={CLASSIC_MOUTH} damp={damp} />
    </g>
  );
}

const classicPot = (style: ClassicStyle): PotDef => ({
  mouth: CLASSIC_MOUTH,
  foot: CLASSIC.t.b,
  charm: [38, 69.4],
  render: (k, damp) => <Classic k={k} damp={damp} {...style} />,
});

/* Blue-and-cream mattress ticking: stripes wrap the round body, so they narrow toward the edges. */
const TICK_BLUE = '#8DAFD2';
const TICKING_STRIPES = (() => {
  const t = CLASSIC.t;
  const bottom = t.bottom - 1.8;
  let d = '';
  // A broad stripe and a fine one, repeated around the pot: [angle around the pot, width at the front].
  for (let i = -2; i <= 2; i++) {
    for (const [th, w] of [
      [i * 0.52 - 0.1, 2.6],
      [i * 0.52 + 0.12, 0.7],
    ] as const) {
      if (Math.abs(th) > 1.3) continue;
      const u = Math.sin(th);
      const half = (w / 2) * Math.cos(th);
      const at = (hw: number, y: number, s: number) => `${f(50 + u * hw + s * half * (hw / t.a))} ${f(y)}`;
      d += `M${at(t.a, t.top, -1)}L${at(t.a, t.top, 1)}L${at(t.b, bottom, 1)}L${at(t.b, bottom, -1)}Z`;
    }
  }
  return d;
})();
/** The ticking rim is plain cream with one fine blue line, like a selvedge. */
const TICKING_RIM_LINE = rr(50 - 21.2, 66.6, 42.4, 0.8, 0.4);

/* A scalloped collar: the rim's lower edge falls in soft scallops over a body tucked up under it. */
const ROSY_BODY = body({ top: 64, bottom: FOOT_Y, a: 20.4, b: 15.4, r: 2.2 });
const ROSY_RIM: Rim = (() => {
  const base = rim(61.6, 22.4, 6.4, 1.8, 4.4);
  const n = 9;
  const { x: x0, w, y: top } = base;
  const y1 = top + base.h;
  let d = `M${f(x0 + 1.8)} ${f(top)}H${f(x0 + w - 1.8)}Q${f(x0 + w)} ${f(top)} ${f(x0 + w)} ${f(top + 1.8)}V${f(y1 - 1)}`;
  for (let i = n; i > 0; i--) {
    const xa = x0 + (w * i) / n;
    const xb = x0 + (w * (i - 1)) / n;
    d += `Q${f((xa + xb) / 2)} ${f(y1 + 3.6)} ${f(xb)} ${f(y1 - 1)}`;
  }
  d += `V${f(top + 1.8)}Q${f(x0)} ${f(top)} ${f(x0 + 1.8)} ${f(top)}Z`;
  // The crescent follows the last scallop at the far end.
  const s = w / n;
  const end = (e: number, dir: 1 | -1) =>
    `M${f(e - dir * 4.4)} ${f(top)}H${f(e - dir * 1.8)}Q${f(e)} ${f(top)} ${f(e)} ${f(top + 1.8)}V${f(y1 - 1)}Q${f(e - (dir * s) / 2)} ${f(y1 + 3.6)} ${f(e - dir * s)} ${f(y1 - 1)}L${f(e - dir * 4.4)} ${f(y1 - 1)}Z`;
  const bottom = `M${f(x0)} ${f(y1 - 2.2)}H${f(x0 + w)}V${f(y1 - 1)}H${f(x0)}Z`;
  return { ...base, d, cres: { left: end(x0 + w, 1), right: end(x0, -1), top: bottom } };
})();

/* ------------------------------------------------------------------ */
/* Cream glaze: straight sides, a rounded lip and a thin unglazed foot  */
/* ------------------------------------------------------------------ */

const CREAM_BODY = body({ top: 62.6, bottom: FOOT_Y, a: 20.2, b: 17.6, r: 2.6 }, 5.2);
const CREAM_LIP = rim(61.6, 20.9, 3.2, 1.6, 4.6);
const CREAM_FOOT = (() => {
  const t = CREAM_BODY.t;
  const y = FOOT_Y - 2.4;
  const w = t.a + ((t.b - t.a) * (y - t.top)) / (t.bottom - t.top);
  return `M${f(50 - w)} ${f(y)}H${f(50 + w)}L${f(50 + t.b)} ${f(FOOT_Y - t.r)}Q${f(50 + t.b)} ${FOOT_Y} ${f(50 + t.b - t.r)} ${FOOT_Y}H${f(50 - t.b + t.r)}Q${f(50 - t.b)} ${FOOT_Y} ${f(50 - t.b)} ${f(FOOT_Y - t.r)}Z`;
})();
const CREAM_MOUTH: Mouth = { y: 62.2, hw: 19.6 };

const cream: PotDef = {
  mouth: CREAM_MOUTH,
  foot: 17.6,
  charm: [38, 64.4],
  render: (k, damp) => (
    <g>
      <path d={CREAM_BODY.d} fill={k.lit('#F6EEE1')} />
      <path d={CREAM_FOOT} fill={k.lit('#E2C3A6')} />
      <Shade k={k} c={CREAM_BODY.cres} />
      <path d={CREAM_LIP.d} fill={k.lit('#FAF4EA')} />
      <Shade k={k} c={CREAM_LIP.cres} />
      <Soil m={CREAM_MOUTH} damp={damp} />
    </g>
  ),
};

/* ------------------------------------------------------------------ */
/* Speckled oatmeal stoneware: a softly bellied pot with a lip          */
/* ------------------------------------------------------------------ */

/** Right-hand profile from the lip to the foot (half-widths); the body is this and its mirror. */
const BELLY: Pt[] = [
  [19.4, 64.8],
  [21.2, 72],
  [21.4, 80],
  [19.6, 88],
  [16.8, 93.6],
  [15, FOOT_Y],
];
const SPECKLED = (() => {
  const right = BELLY.map(([x, y]) => [50 + x, y] as Pt);
  const left = BELLY.map(([x, y]) => [50 - x, y] as Pt).reverse();
  const d = `M${f(50 - 19.4)} 64.8H${f(50 + 19.4)}${curve(right)}L${f(50 - 15)} ${FOOT_Y}${curve(left)}Z`;
  const band = (s: 1 | -1, w: number) => {
    const outer = BELLY.map(([x, y]) => [50 + s * x, y] as Pt);
    const inner = BELLY.map(([x, y]) => [50 + s * (x - w), y] as Pt).reverse();
    return `M${f(outer[0]![0])} ${f(outer[0]![1])}${curve(outer)}L${f(inner[0]![0])} ${FOOT_Y}${curve(inner)}Z`;
  };
  const foot = `M${f(50 - 16.6)} ${FOOT_Y - 1.4}H${f(50 + 16.6)}L${f(50 + 15)} ${FOOT_Y}H${f(50 - 15)}Z`;
  const t: Taper = { top: 65.5, bottom: 92, a: 18.5, b: 17, r: 0 };
  return {
    d,
    cres: {
      left: band(1, 5.2) + foot,
      right: band(-1, 5.2) + foot,
      top: `M${f(50 - 17.8)} ${FOOT_Y - 3.2}H${f(50 + 17.8)}L${f(50 + 15)} ${FOOT_Y}H${f(50 - 15)}Z`,
    } as ByLight,
    under: `M${f(50 - 19.4)} 64.8H${f(50 + 19.4)}L${f(50 + 20)} 66.8H${f(50 - 20)}Z`,
    flecks: dots(scatter(t, 26, 11, 1.2), 0.42, 0.45, 5),
    rimFlecks: dots(
      Array.from({ length: 7 }, (_, i) => [30.6 + i * 6.1 + (i % 2) * 1.3, 62.9 + (i % 3) * 0.7] as Pt),
      0.36,
    ),
  };
})();
const SPECKLED_RIM = rim(61.8, 20.8, 3.4, 1.6, 4.6);
const SPECKLED_MOUTH: Mouth = { y: 62.3, hw: 19.4 };

const speckled: PotDef = {
  mouth: SPECKLED_MOUTH,
  foot: 15.4,
  charm: [38, 65.2],
  render: (k, damp) => (
    <g>
      <path d={SPECKLED.d} fill={k.lit('#EADCC6')} />
      <path d={SPECKLED.flecks} fill="#8C6B55" />
      <path d={SPECKLED.under} class={SHADE} />
      <Shade k={k} c={SPECKLED.cres} />
      <path d={SPECKLED_RIM.d} fill={k.lit('#EFE4D2')} />
      <path d={SPECKLED.rimFlecks} fill="#8C6B55" />
      <Shade k={k} c={SPECKLED_RIM.cres} />
      <Soil m={SPECKLED_MOUTH} damp={damp} />
    </g>
  ),
};

/* ------------------------------------------------------------------ */
/* Midnight glaze: tall, deep blue, flecked with gold                   */
/* ------------------------------------------------------------------ */

const MIDNIGHT = body({ top: 62.4, bottom: FOOT_Y, a: 18.8, b: 16.2, r: 2.8 }, 5);
const MIDNIGHT_LIP = rim(61.4, 19.4, 3, 1.5, 4.4);
const MIDNIGHT_LIP_LAMP = bandCrescents(MIDNIGHT_LIP.x, MIDNIGHT_LIP.y, MIDNIGHT_LIP.w, MIDNIGHT_LIP.h, 1.5, 1.1);
const MIDNIGHT_FLECKS = dots(scatter(MIDNIGHT.t, 22, 29, 1.6), 0.4, 0.5, 9);
const MIDNIGHT_MOUTH: Mouth = { y: 61.9, hw: 18.2 };

const midnight: PotDef = {
  mouth: MIDNIGHT_MOUTH,
  foot: 16.2,
  charm: [39, 64.2],
  render: (k, damp) => (
    <g>
      <path d={MIDNIGHT.d} fill={k.lit('#34406E')} />
      <path d={MIDNIGHT_FLECKS} fill={k.lit('#DCBC6E')} />
      <Shade k={k} c={MIDNIGHT.cres} />
      <LampRim k={k} c={MIDNIGHT.lamp} />
      <path d={MIDNIGHT_LIP.d} fill={k.lit('#3D4A7C')} />
      <Shade k={k} c={MIDNIGHT_LIP.cres} />
      <LampRim k={k} c={MIDNIGHT_LIP_LAMP} />
      <Soil m={MIDNIGHT_MOUTH} damp={damp} />
    </g>
  ),
};

/* ------------------------------------------------------------------ */
/* A chipped mug                                                       */
/* ------------------------------------------------------------------ */

const MUG = body({ top: 63.6, bottom: FOOT_Y, a: 17.8, b: 17, r: 3.2 }, 4.8);
/** The mug's silhouette with the chip bitten out of the rim, front left. */
const MUG_D = (() => {
  const { a, b, r } = MUG.t;
  return `M${f(50 - a)} 63.6H39.4L40.8 66.2L42.6 65.4L44 66.4L45.6 63.6H${f(50 + a)}L${f(50 + b)} ${f(FOOT_Y - r)}Q${f(50 + b)} ${FOOT_Y} ${f(50 + b - r)} ${FOOT_Y}H${f(50 - b + r)}Q${f(50 - b)} ${FOOT_Y} ${f(50 - b)} ${f(FOOT_Y - r)}Z`;
})();
const MUG_HANDLE = 'M66.8 69.2C74.6 68.2 78.8 71.6 78.6 77.4C78.4 83.6 73.8 86.4 66.6 86.2L66.6 82.4C71.4 82.6 74.4 80.8 74.4 77.4C74.4 73.8 71.6 72.4 66.8 73Z';
/** The handle's inner half, shaded when the light comes from the handle's side. */
const MUG_HANDLE_SHADE = 'M66.8 71C72.8 70.4 76.4 72.6 76.2 77.4C76 82 72.2 84.4 66.6 84.4L66.6 82.4C71.4 82.6 74.4 80.8 74.4 77.4C74.4 73.8 71.6 72.4 66.8 73Z';
const MUG_MOUTH: Mouth = { y: 63.9, hw: 16.8 };

const mug: PotDef = {
  mouth: MUG_MOUTH,
  foot: 17,
  charm: [36.5, 66],
  render: (k, damp) => {
    const glaze = '#AECBE4';
    // The handle is on the right: in shade when the window is on the left.
    const handleShaded = k.away > 0;
    return (
      <g>
        <path d={MUG_HANDLE} fill={handleShaded ? mix(glaze, '#6A5C99', 0.2) : k.lit(glaze)} />
        {!handleShaded && <path d={MUG_HANDLE_SHADE} class={SHADE} data-part="handle" />}
        <Soil m={MUG_MOUTH} damp={damp} />
        <path d={MUG_D} fill={k.lit(glaze)} />
        {/* A cream band near the top, and the bare stoneware where the chip is. */}
        <path d="M32.2 66.4H67.8V68.2H32.2Z" fill={k.lit('#F6F0E6')} />
        <path d="M39.4 63.6L40.8 66.2L42.6 65.4L44 66.4L45.6 63.6L46.4 64.8L45.2 67.6L43.4 68.6L41.2 68.4L39.6 66.4Z" fill={k.lit('#EADFCB')} />
        <Shade k={k} c={MUG.cres} />
      </g>
    );
  },
};

/* ------------------------------------------------------------------ */
/* A floral teacup on its saucer                                       */
/* ------------------------------------------------------------------ */

const CUP_SIDE: Pt[] = [
  [21.2, 69.4],
  [20.6, 75],
  [17.6, 82.4],
  [12.6, 87.6],
  [9.4, 89.4],
];
const TEACUP = (() => {
  const right = CUP_SIDE.map(([x, y]) => [50 + x, y] as Pt);
  const left = CUP_SIDE.map(([x, y]) => [50 - x, y] as Pt).reverse();
  const d = `M${f(50 - 21.2)} 69.4H${f(50 + 21.2)}${curve(right)}L${f(50 - 9.4)} 89.4${curve(left)}Z`;
  const band = (s: 1 | -1, w: number) => {
    const outer = CUP_SIDE.map(([x, y]) => [50 + s * x, y] as Pt);
    // The band thins toward the foot, where the bowl turns under.
    const inner = CUP_SIDE.map(([x, y]) => [50 + s * (x - w * (1 - (y - 69.4) / 40)), y] as Pt).reverse();
    return `M${f(outer[0]![0])} ${f(outer[0]![1])}${curve(outer)}L${f(inner[0]![0])} ${f(inner[0]![1])}${curve(inner)}Z`;
  };
  return {
    d,
    cres: {
      left: band(1, 5.4),
      right: band(-1, 5.4),
      top: `M${f(50 - 18.4)} 81.6Q50 86 ${f(50 + 18.4)} 81.6L${f(50 + 12.6)} 87.6L${f(50 + 9.4)} 89.4H${f(50 - 9.4)}L${f(50 - 12.6)} 87.6Z`,
    } as ByLight,
  };
})();
const SAUCER = 'M25.6 91.2Q25.6 89.6 27.4 89.6H72.6Q74.4 89.6 74.4 91.2Q73.6 95 68 95H32Q26.4 95 25.6 91.2Z';
const SAUCER_CRES: ByLight = {
  left: 'M69.4 89.6H72.6Q74.4 89.6 74.4 91.2Q73.6 95 68 95H65.2Q69.6 94.4 70.4 91.2Q70.6 89.6 69.4 89.6Z',
  right: 'M30.6 89.6H27.4Q25.6 89.6 25.6 91.2Q26.4 95 32 95H34.8Q30.4 94.4 29.6 91.2Q29.4 89.6 30.6 89.6Z',
  top: 'M25.9 92.6Q27.6 93.4 32 93.4H68Q72.4 93.4 74.1 92.6Q73 95 68 95H32Q27 95 25.9 92.6Z',
};
const CUP_FOOT = 'M40.6 89H59.4L60.4 91H39.6Z';
const TEACUP_HANDLE = 'M70.4 72.2C77.4 71 80 74.4 79 78.2C78.2 81.4 75 83 70 83L69 80.4C72.8 80.4 75 79.4 75.4 77.6C75.8 75.6 74.4 74.4 70.6 75Z';
/** Little roses on the cup: a pink bloom, a darker heart and two leaves each. */
const ROSES: [number, number, number][] = [
  [38.6, 76.2, 1],
  [50.6, 78.6, 1.15],
  [62, 75.6, 0.95],
];
const ROSE_PETALS = ROSES.map(([x, y, s]) => ell(x, y, 2 * s, 1.7 * s)).join('');
const ROSE_HEARTS = ROSES.map(([x, y, s]) => ell(x + 0.2 * s, y - 0.1 * s, 0.9 * s, 0.75 * s)).join('');
const ROSE_LEAVES = ROSES.map(
  ([x, y, s]) =>
    `M${f(x - 1.6 * s)} ${f(y + 1)}q${f(-2.4 * s)} ${f(0.2 * s)} ${f(-3.2 * s)} ${f(1.8 * s)}q${f(2 * s)} ${f(0.4 * s)} ${f(3.2 * s)} ${f(-1.8 * s)}ZM${f(x + 1.7 * s)} ${f(y + 1)}q${f(2.2 * s)} ${f(-0.2 * s)} ${f(3 * s)} ${f(1.6 * s)}q${f(-2 * s)} ${f(0.3 * s)} ${f(-3 * s)} ${f(-1.6 * s)}Z`,
).join('');
const TEACUP_MOUTH: Mouth = { y: 69.6, hw: 20 };

const teacup: PotDef = {
  mouth: TEACUP_MOUTH,
  foot: 22,
  charm: [36, 72.4],
  render: (k, damp) => {
    const china = k.lit('#FCF7EF');
    return (
      <g>
        <path d={SAUCER} fill={china} />
        <path d="M27.4 90.4H72.6V91.3H27.4Z" fill={k.lit('#EBB0BF')} />
        <Shade k={k} c={SAUCER_CRES} />
        <path d={CUP_FOOT} fill={china} />
        <path d={TEACUP_HANDLE} fill={k.away > 0 ? mix('#FCF7EF', '#6A5C99', 0.14) : china} />
        <path d={TEACUP.d} fill={china} />
        <path d="M28.8 70.2H71.2L71.1 71.6H28.9Z" fill={k.lit('#EFB4C1')} />
        <path d={ROSE_LEAVES} fill={k.lit('#A9C495')} />
        <path d={ROSE_PETALS} fill={k.lit('#F2B3C1')} />
        <path d={ROSE_HEARTS} fill="#DC8FA3" />
        <Shade k={k} c={TEACUP.cres} />
        <Soil m={TEACUP_MOUTH} damp={damp} ry={2.2} />
      </g>
    );
  },
};

/* ------------------------------------------------------------------ */
/* A dried gourd, hollowed out                                         */
/* ------------------------------------------------------------------ */

/** The gourd is an ellipse cut level at the top (the opening) and a little flattened where it sits. */
const G = { cx: 50, cy: 79.4, rx: 22.4, ry: 17, top: 67.2, bottom: FOOT_Y - 0.4 };
const gourdHw = (y: number) => G.rx * Math.sqrt(Math.max(0, 1 - ((y - G.cy) / G.ry) ** 2));
const GOURD = (() => {
  const { cx, rx, ry, top, bottom } = G;
  const wt = gourdHw(top);
  const wb = gourdHw(bottom);
  const d = `M${f(cx - wt)} ${f(top)}H${f(cx + wt)}A${rx} ${ry} 0 0 1 ${f(cx + wb)} ${f(bottom)}H${f(cx - wb)}A${rx} ${ry} 0 0 1 ${f(cx - wt)} ${f(top)}Z`;
  const side = (s: 1 | -1, dd: number) => {
    const sweep = s > 0 ? 1 : 0;
    return `M${f(cx + s * wt)} ${f(top)}A${rx} ${ry} 0 0 ${sweep} ${f(cx + s * wb)} ${f(bottom)}H${f(cx + s * (wb - dd))}A${rx} ${ry} 0 0 ${1 - sweep} ${f(cx + s * (wt - dd))} ${f(top)}Z`;
  };
  const wd = gourdHw(bottom - 3.4);
  // Ribs: slim lenses from the opening to the base, bunched toward the edges like meridians.
  const ribs = [-0.62, -0.2, 0.2, 0.62]
    .map((u) => {
      const xt = cx + u * wt;
      const xm = cx + u * rx * 0.98;
      const xb = cx + u * wb;
      const s = Math.sign(u);
      return `M${f(xt)} ${f(top + 0.6)}Q${f(xm - 0.9 * s)} ${f(G.cy)} ${f(xb)} ${f(bottom - 0.4)}Q${f(xm + 0.2 * s)} ${f(G.cy)} ${f(xt)} ${f(top + 0.6)}Z`;
    })
    .join('');
  return {
    d,
    ribs,
    cres: {
      left: side(1, 5.4),
      right: side(-1, 5.4),
      top: `M${f(cx - wd)} ${f(bottom - 3.4)}H${f(cx + wd)}A${rx} ${ry} 0 0 1 ${f(cx + wb)} ${f(bottom)}H${f(cx - wb)}A${rx} ${ry} 0 0 1 ${f(cx - wd)} ${f(bottom - 3.4)}Z`,
    } as ByLight,
    lip: ell(cx, top, wt, 2.6),
    wt,
  };
})();
const GOURD_MOUTH: Mouth = { y: 67, hw: GOURD.wt - 1.6 };

const gourd: PotDef = {
  mouth: GOURD_MOUTH,
  foot: 12,
  charm: [38, 70],
  render: (k, damp) => (
    <g>
      <path d={GOURD.d} fill={k.lit('#DDB77C')} />
      <path d={GOURD.ribs} fill={k.lit('#CDA266')} />
      <Shade k={k} c={GOURD.cres} />
      {/* The cut edge shows the dry, pale inside of the rind. */}
      <path d={GOURD.lip} fill={k.lit('#F1DFB8')} />
      <Soil m={GOURD_MOUTH} damp={damp} ry={1.8} />
    </g>
  ),
};

/* ------------------------------------------------------------------ */
/* Half an eggshell in an egg cup                                      */
/* ------------------------------------------------------------------ */

const EGG_CUP =
  'M36.6 76.6H63.4C63.4 83.6 58.6 88 53.2 88.8L53.4 90.6C58.8 91 62.2 92.4 62.2 94.2C62.2 94.8 61.6 95 60.6 95H39.4C38.4 95 37.8 94.8 37.8 94.2C37.8 92.4 41.2 91 46.6 90.6L46.8 88.8C41.4 88 36.6 83.6 36.6 76.6Z';
const EGG_CUP_CRES: ByLight = {
  left: 'M58.6 76.6H63.4C63.4 83.6 58.6 88 53.2 88.8L53.4 90.6C58.8 91 62.2 92.4 62.2 94.2C62.2 94.8 61.6 95 60.6 95H57.6C58.6 94.6 58.8 93.6 58 92.8C57 91.8 55 91.2 52.6 91V88.6C56.4 87.2 58.6 82.8 58.6 76.6Z',
  right: 'M41.4 76.6H36.6C36.6 83.6 41.4 88 46.8 88.8L46.6 90.6C41.2 91 37.8 92.4 37.8 94.2C37.8 94.8 38.4 95 39.4 95H42.4C41.4 94.6 41.2 93.6 42 92.8C43 91.8 45 91.2 47.4 91V88.6C43.6 87.2 41.4 82.8 41.4 76.6Z',
  top: 'M38.2 83.2C40.6 87 45 89 50 89C55 89 59.4 87 61.8 83.2C60.6 86.4 57.4 88.4 53.2 88.8L53.4 90.6C58.8 91 62.2 92.4 62.2 94.2C62.2 94.8 61.6 95 60.6 95H39.4C38.4 95 37.8 94.8 37.8 94.2C37.8 92.4 41.2 91 46.6 90.6L46.8 88.8C42.6 88.4 39.4 86.4 38.2 83.2Z',
};
/** The shell above the cup, with its broken top edge. */
const SHELL =
  'M37.8 63.2L40.2 64.6L42.2 62.8L44.8 64.8L47 63L49.6 65L52.2 63.2L54.4 64.6L56.8 62.6L59.4 64.4L62.2 63C63.4 66.4 64.6 71.6 63.8 77.8H36.2C35.4 71.6 36.6 66.4 37.8 63.2Z';
const SHELL_CRES: ByLight = {
  left: 'M59.4 64.4L62.2 63C63.4 66.4 64.6 71.6 63.8 77.8H59C59.8 72 59.8 67.6 59.4 64.4Z',
  right: 'M40.2 64.6L37.8 63.2C36.6 66.4 35.4 71.6 36.2 77.8H41C40.2 72 40.2 67.6 40.2 64.6Z',
  top: 'M36.2 74.6H63.8V77.8H36.2Z',
};
const EGG_MOUTH: Mouth = { y: 63.1, hw: 12.4 };

const eggshell: PotDef = {
  mouth: EGG_MOUTH,
  foot: 11.6,
  charm: [41, 78.6],
  render: (k, damp) => (
    <g>
      <Soil m={EGG_MOUTH} damp={damp} ry={1.9} />
      <path d={SHELL} fill={k.lit('#F7EFE4')} />
      <Shade k={k} c={SHELL_CRES} />
      <path d={EGG_CUP} fill={k.lit('#F2D98A')} />
      <path d="M36.7 78.2H63.3L63.1 79.6H36.9Z" fill={k.lit('#FBF3DA')} />
      <Shade k={k} c={EGG_CUP_CRES} />
    </g>
  ),
};

/* ------------------------------------------------------------------ */
/* A tomato tin with its paper label on                                */
/* ------------------------------------------------------------------ */

const TIN = body({ top: 63.2, bottom: FOOT_Y, a: 16.4, b: 16.4, r: 1.6 }, 4.6);
const TIN_LIP = rim(62.4, 16.9, 2.4, 1.1, 4.2);
const TIN_RIDGES = 'M33.6 66.8H66.4V67.5H33.6ZM33.6 91.4H66.4V92.1H33.6Z';
const TIN_LABEL = 'M33.6 69.6H66.4V89.6H33.6Z';
const TIN_PANEL = ell(50, 79.6, 8.8, 7.2);
const TOMATO = ell(50, 80.6, 3.9, 3.4);
const CALYX = 'M50 77.2L51 78.6L52.8 78.4L51.6 79.4L52 80.8L50.4 80L49 80.9L49.2 79.4L47.6 78.5L49.3 78.4Z';
const TIN_MOUTH: Mouth = { y: 62.8, hw: 15.8 };

const tincan: PotDef = {
  mouth: TIN_MOUTH,
  foot: 16.4,
  charm: [38.6, 64.8],
  render: (k, damp) => (
    <g>
      <path d={TIN.d} fill={k.lit('#CBC6CC')} />
      <path d={TIN_RIDGES} fill={k.lit('#E4E1E6')} />
      <path d={TIN_LABEL} fill={k.lit('#DE6F59')} />
      <path d="M33.6 69.6H66.4V71H33.6ZM33.6 88.2H66.4V89.6H33.6Z" fill={k.lit('#F4E6CE')} />
      <path d={TIN_PANEL} fill={k.lit('#F8EEDC')} />
      <path d={TOMATO} fill={k.lit('#E0674F')} />
      <path d={CALYX} fill="#7FA66A" />
      <Shade k={k} c={TIN.cres} />
      <path d={TIN_LIP.d} fill={k.lit('#DAD6DB')} />
      <Shade k={k} c={TIN_LIP.cres} />
      <Soil m={TIN_MOUTH} damp={damp} ry={1.9} />
    </g>
  ),
};

/* ------------------------------------------------------------------ */

export const POTS: Record<PotId, PotDef> = {
  terracotta: classicPot({ fill: '#DDA088', rimFill: '#CD8A70' }),
  cream,
  blush: classicPot({ fill: '#F1B9C5', rimFill: '#E9A7B7' }),
  speckled,
  ticking: classicPot({
    fill: '#F6EFE3',
    rimFill: '#F6EFE3',
    bodyDecor: <path d={TICKING_STRIPES} fill={TICK_BLUE} />,
    rimDecor: <path d={TICKING_RIM_LINE} fill={TICK_BLUE} />,
  }),
  mug,
  teacup,
  midnight,
  gourd,
  rosy: classicPot({ fill: '#D98497', rimFill: '#CC7288', rimShape: ROSY_RIM, bodyShape: ROSY_BODY }),
  eggshell,
  tincan,
};
