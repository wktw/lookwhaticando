/**
 * Tulip, forced: a bulb sitting in the cup of an hourglass forcing glass, its roots reaching down into the water
 * below. It lives its whole life in the glass (DESIGN §5.5): roots, then a shoot, broad grey-green leaves, a bud and
 * one cup-shaped flower. The pot the habit was given only chooses the colour of the glass, as forcing glasses come
 * in amber, rose, blue and green as well as clear.
 */
import type { JSX } from 'preact';
import type { PotId } from '@/catalog/types';
import { ell, smooth, type ByLight, type Pt } from '../geom';
import { inks, SHADE, type Kit } from '../kit';
import { grown, place } from '../leaves';
import { f, lerp, mix, ramp } from '../math';
import { GLASS, rootsD } from '../vessels';
import type { Composed, Growth, SpeciesArt } from '../types';

const GREENS = inks('#A3BE95', '#809F77');
const TUNIC = '#CE9F77';
const RIDGE = '#B7875F';
const PETAL = ['#F3A8B8', '#E58CA1'];
const STEM = '#8FAE7E';
/** The dark heart of an opened tulip, seen between the parted petals. */
const CENTRE = '#A5627B';

/** Forcing glasses come in colours; each pot choice maps to a glass tint. */
const GLASS_TINT: Record<PotId, string> = {
  terracotta: '#F2D3AA',
  cream: GLASS.pane,
  blush: '#F4CFD8',
  speckled: GLASS.pane,
  ticking: '#C6DAEE',
  mug: '#C6DAEE',
  teacup: '#F4CFD8',
  midnight: '#B9C7E8',
  gourd: '#F2D3AA',
  rosy: '#F1C3CF',
  eggshell: GLASS.pane,
  tincan: '#D2E6CC',
};

/** The hourglass, right half from the foot up to the rim: [half-width, y]. */
const SIDE_DRAWN: Pt[] = [
  [9.6, 95],
  [12.6, 92.4],
  [13.4, 86.4],
  [12, 80.6],
  [8.2, 76.4],
  [4.6, 73.8],
  [4.8, 71.4],
  [7.6, 67.8],
  [10, 64.2],
  [10.8, 61.6],
];
/** Widened so the glass stands about as broad as a classic pot (half-width 15 at the belly). */
const SIDE = SIDE_DRAWN.map(([x, y]) => [x * 1.12, y] as Pt);
const RIGHT = SIDE.map(([x, y]) => [50 + x, y] as Pt);
const LEFT = SIDE.map(([x, y]) => [50 - x, y] as Pt).reverse();
const curve = (pts: Pt[]) => smooth(pts, false).replace(/^M[^C]*/, '');
const VASE = `M${f(50 - SIDE[0]![0])} 95H${f(50 + SIDE[0]![0])}${curve(RIGHT)}L${f(50 - SIDE[9]![0])} 61.6${curve(LEFT)}Z`;
/** The water fills the lower bulb, up to just under the waist where the bulb's base sits. */
const WATER = (() => {
  const low = SIDE.slice(0, 5);
  const r = low.map(([x, y]) => [50 + x - 1, y] as Pt);
  const l = low.map(([x, y]) => [50 - x + 1, y] as Pt).reverse();
  return `M${f(50 - SIDE[0]![0] + 1)} 93.8H${f(50 + SIDE[0]![0] - 1)}${curve(r)}L${f(50 - SIDE[4]![0] + 1)} 76.4${curve(l)}Z`;
})();
/** A glass wall: a thin band just inside the outline on one side. */
const WALL = (s: 1 | -1, w: number) => {
  const outer = SIDE.map(([x, y]) => [50 + s * x, y] as Pt);
  const inner = SIDE.map(([x, y]) => [50 + s * (x - w), y] as Pt).reverse();
  return `M${f(outer[0]![0])} 95${curve(outer)}L${f(inner[0]![0])} ${f(inner[0]![1])}${curve(inner)}Z`;
};
const WALLS = { right: WALL(1, 1), left: WALL(-1, 1) };

/** The bulb: a papery teardrop in the cup, base at the waist. */
const BULB = 'M50 72.6C54.4 72.6 56.2 70 55.8 67C55.4 63.4 52.6 60 50.6 56.6C48.8 60 45 63.2 44.4 66.8C44 70 45.6 72.6 50 72.6Z';
/** Fine ridges in the papery tunic. */
const BULB_RIDGES = 'M48.4 71.6C47.4 68.4 48 64.6 50 60.2M52 71.8C53 68.6 52.8 64.8 51.2 60.4';
const BULB_SHADE: ByLight = {
  left: 'M53.4 62C54.8 63.8 55.6 65.4 55.8 67C56.2 70 54.4 72.6 50 72.6C52.4 71.8 53.8 70 53.8 67.4C53.8 65.4 53.8 63.8 53.4 62Z',
  right: 'M47 61.4C45.6 63.2 44.6 65 44.4 66.8C44 70 45.6 72.6 50 72.6C47.6 71.8 46.4 70 46.4 67.4C46.4 65.4 46.6 63.4 47 61.4Z',
  top: 'M44.6 69.4C45.4 71.4 47.2 72.6 50 72.6C54.4 72.6 56 70.8 55.8 68.4C55 70 52.6 70.8 50 70.8C47.4 70.8 45.6 70.4 44.6 69.4Z',
};

/** A broad tulip leaf, 24 long: strap-shaped, pointed, a little cupped. */
const LEAF = 'M0 0C2.8 -1.6 4 -7 3.8 -12.6C3.6 -17.6 1.8 -21.6 0 -24C-1.6 -21.6 -3.4 -17.6 -3.6 -12.6C-3.8 -7 -2.8 -1.6 0 0Z';

/** The cup: a front petal between two side petals, all rounded to a soft point. */
const SIDE_PETALS = 'M-4.6 0C-6.2 -2.6 -6 -6.8 -4.4 -10.2C-3.4 -8.6 -1.8 -7.6 0 -7.2C1.8 -7.6 3.4 -8.6 4.4 -10.2C6 -6.8 6.2 -2.6 4.6 0C2.4 1.4 -2.4 1.4 -4.6 0Z';
const FRONT_PETAL = 'M0 1.2C-3.2 1.2 -4.4 -2 -4 -5.4C-3.6 -8.2 -1.6 -10.4 0 -11.4C1.6 -10.4 3.6 -8.2 4 -5.4C4.4 -2 3.2 1.2 0 1.2Z';

function bloom(k: Kit, top: Pt, open: number, bud: number) {
  const [x, y] = top;
  const s = lerp(0.55, 1, bud) * k.bloom;
  // A bud is green, blushing pink from the tip; open, the cup widens a little.
  const pink = ramp(bud, 0.4, 1);
  const front = open > 0 ? k.lit(PETAL[0]!) : mix('#B9CF9F', PETAL[0]!, pink);
  const side = open > 0 ? (k.away === 0 ? PETAL[1]! : k.lit(PETAL[1]!)) : mix('#A3BE8E', PETAL[1]!, pink);
  // A mature flower parts its petals: the side petals lean out and the front one drops, showing the dark centre.
  const part = ramp(open, 0.6, 0.95);
  return (
    <g transform={`translate(${f(x)} ${f(y)}) scale(${f(s * lerp(0.82, 1.08, open))} ${f(s)})`}>
      {part > 0 && <path d={FRONT_PETAL} transform={`translate(0 ${f(-1.6 * part)}) scale(${f(lerp(1, 0.92, part))})`} fill={side} />}
      <path d={SIDE_PETALS} transform={part > 0 ? `scale(${f(1 + 0.22 * part)} 1)` : undefined} fill={side} />
      {part > 0.5 && <path d={ell(0, -8.8, 3.1 * part, 1.3 * (part - 0.3))} fill={CENTRE} />}
      <path d={FRONT_PETAL} transform={part > 0 ? `scale(${f(1 - 0.22 * part)} ${f(1 - 0.3 * part)})` : undefined} fill={front} />
      {open > 0 && <path d={k.away >= 0 ? 'M1.2 0.8C3 0.4 4 -2 3.9 -5C3.8 -7.6 2.6 -9.6 1.2 -10.8C2.4 -8 2.8 -4.4 1.2 0.8Z' : 'M-1.2 0.8C-3 0.4 -4 -2 -3.9 -5C-3.8 -7.6 -2.6 -9.6 -1.2 -10.8C-2.4 -8 -2.8 -4.4 -1.2 0.8Z'} transform={part > 0 ? `scale(${f(1 - 0.22 * part)} ${f(1 - 0.3 * part)})` : undefined} class={SHADE} />}
    </g>
  );
}

function own(g: Growth, k: Kit, pot: PotId): Composed {
  const t = g.t;
  const tint = GLASS_TINT[pot] ?? GLASS.pane;
  const tip: Pt = [50.6, 56.8];
  // Roots: nubs late in stage 0, then down through the water, filling the bulb of the glass by Leafy.
  const reach = ramp(t, 0.6, 3.2);
  const box = { x0: 38.6, x1: 61.4, y1: 92.4 };
  const roots = `${rootsD([50, 72.6], reach, box, 1.55)}${rootsD([50.8, 72.4], reach * 0.85, box, 1.3)}`;
  // Shoot and flower stalk.
  const stemH = lerp(0, 38, ramp(t, 1.4, 6.2)) + lerp(0, 4, ramp(t, 6.2, 7.6));
  const flowerAt: Pt = [tip[0] + 0.4, tip[1] - stemH];
  const shoot = ramp(t, 0.5, 2.6);
  const leaves: JSX.Element[] = [];
  const leafDefs: [number, number, number, number][] = [
    [-22, 0.9, 1, 2.2],
    [26, 0.95, 0, 2.7],
    [50, 0.78, 1, 5.7],
  ];
  leafDefs.forEach(([a, s, tone, birth], i) => {
    const gr = grown(t, birth, 1.2);
    if (gr <= 0) return;
    leaves.push(<path key={i} d={LEAF} transform={place(tip[0] + (a < 0 ? -0.6 : 0.6), tip[1] + 1.2, a * lerp(0.3, 1, gr), s * lerp(0.35, 1, gr))} fill={k.tone(GREENS, tone, 50 + Math.sign(a) * 6, 45)} />);
  });
  const budding = ramp(t, 3.8, 5);
  // One bulb, one flower: it opens once blooms are showing, and opens wider as the plant matures.
  const open = g.stage >= 5 && g.blooms > 0 ? lerp(0.5, 1, ramp(t, 5, 7.5)) * lerp(0.85, 1, Math.min(1, g.blooms / 4)) : 0;
  // Evergreen: the bulb pushes a daughter shoot, a smaller stalk with its own leaf and a green bud.
  const daughterG = grown(t, 6.8, 0.8);
  const dBase: Pt = [tip[0] - 1.6, tip[1] + 1.4];
  const dTop: Pt = [dBase[0] - 4 * daughterG, dBase[1] - 20 * daughterG];
  const daughter =
    daughterG > 0 ? (
      <g>
        <path d={`M${f(dBase[0])} ${f(dBase[1])}Q${f(dBase[0] - 0.4)} ${f(dBase[1] - 10 * daughterG)} ${f(dTop[0])} ${f(dTop[1])}`} fill="none" stroke={STEM} stroke-width={1.4} stroke-linecap="round" />
        <path d={LEAF} transform={place(dBase[0] - 0.4, dBase[1], -40, 0.62 * daughterG)} fill={k.tone(GREENS, 0, 40, 50)} />
        {bloom(k, dTop, 0, 0.35 * daughterG)}
      </g>
    ) : null;
  const back = (
    <g>
      {shoot > 0 && t < 2.6 && <path d={`M${f(tip[0])} ${f(tip[1] + 1)}Q${f(tip[0] - 1.2)} ${f(tip[1] - 4 * shoot)} ${f(tip[0] + 0.2)} ${f(tip[1] - 9 * shoot)}Q${f(tip[0] + 1.6)} ${f(tip[1] - 4 * shoot)} ${f(tip[0] + 1.2)} ${f(tip[1] + 1)}Z`} fill={k.lit('#B7CF9A')} />}
      {stemH > 6 && <path d={`M${f(tip[0])} ${f(tip[1] + 1)}Q${f(tip[0] - 1)} ${f(tip[1] - stemH * 0.5)} ${f(flowerAt[0])} ${f(flowerAt[1] + 2)}`} fill="none" stroke={STEM} stroke-width={1.8} stroke-linecap="round" />}
      {daughter}
      {leaves}
      {budding > 0 && bloom(k, flowerAt, open, budding)}
    </g>
  );
  const litX = 50 + (k.away < 0 ? 1 : -1) * (SIDE[2]![0] - 5);
  const highlight = k.night ? '#FFF3E2' : '#FFFFFF';
  const shadeWall = k.away < 0 ? WALLS.left : WALLS.right;
  const vessel = (
    <g data-vessel="forcing">
      <path d={VASE} fill={k.lit(tint)} opacity={0.45} />
      <path d={WATER} fill={k.lit('#BCD6E8')} opacity={0.85} />
      <path d={roots} fill="none" stroke={GLASS.root} stroke-width={0.8} stroke-linecap="round" />
      <path d={`M${f(50 - SIDE[4]![0] + 1)} 76.2H${f(50 + SIDE[4]![0] - 1)}V77.2H${f(50 - SIDE[4]![0] + 1)}Z`} fill={k.lit(GLASS.meniscus)} opacity={0.85} />
      <path d={BULB} fill={k.lit(TUNIC)} />
      <path d={BULB_RIDGES} fill="none" stroke={RIDGE} stroke-width={0.45} stroke-linecap="round" opacity={0.8} />
      <path d={BULB_SHADE[k.light.from]} class={SHADE} />
      {/* The glass in front: a pale wall on the lit side, a deeper one opposite, the rim and a highlight. */}
      <path d={shadeWall} fill={mix(tint, '#7E78A8', 0.3)} opacity={0.5} />
      <path d={`${ell(50, 61.6, SIDE[9]![0], 1.4)}${ell(50, 61.8, SIDE[9]![0] - 1, 0.9)}`} fill-rule="evenodd" fill={k.lit(mix(tint, GLASS.wall, 0.6))} />
      {k.away !== 0 ? (
        <>
          <path d={`M${f(litX)} 81Q${f(litX - k.away * 0.8)} 86 ${f(litX + k.away * 0.4)} 90.6`} fill="none" stroke={highlight} stroke-width={1.3} stroke-linecap="round" opacity={0.85} />
          <path d={`M${f(litX + k.away * 2.2)} 64.4L${f(litX + k.away * 3.8)} 68.2`} fill="none" stroke={highlight} stroke-width={1} stroke-linecap="round" opacity={0.8} />
        </>
      ) : (
        <path d="M43.4 60.6Q50 59.6 56.6 60.6" fill="none" stroke={highlight} stroke-width={0.9} stroke-linecap="round" opacity={0.9} />
      )}
    </g>
  );
  return { back, vessel, foot: 12.2, pivot: [50.6, 60], surface: 6, kind: 'forcing' };
}

export const tulip: SpeciesArt = { own };
