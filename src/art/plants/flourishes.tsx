/**
 * Flourishes (DESIGN §5.5): after Evergreen, every +60 sunshine brings one permanent visitor, in this order: a
 * ladybird, a bee, a snail, a butterfly, a hanging trail, a moss collar, a second shoot and a ribbon. They are small,
 * flat and matte like everything else in the room, each with its hard shade on the side away from the light, and
 * they stand where the pot and the plant's painted frame say (so they fit any species in any pot).
 */
import type { JSX } from 'preact';
import { FLOURISHES, type Flourish, type PlantSpeciesId, type PotId } from '@/catalog/types';
import { ICON_FRAMES } from './iconFrames';
import type { Kit } from './kit';
import { SHADE } from './kit';
import { f } from './math';
import { POTS, FOOT_Y } from './pots';
import { Bee } from './looks';

export { FLOURISHES, type Flourish } from '@/catalog/types';

/** At most this many visitors (DESIGN §5.5). */
export const MAX_FLOURISHES = FLOURISHES.length;

const ell = (cx: number, cy: number, rx: number, ry = rx) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0Z`;

/** A hard crescent on the shade side of an ellipse: its far half minus a slimmer ellipse (away: +1 right, -1 left, 0 under). */
function crescent(cx: number, cy: number, rx: number, ry: number, away: -1 | 0 | 1, depth = 0.45): string {
  if (away === 0) return `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry * (1 - depth))} 0 0 1 ${f(cx - rx)} ${f(cy)}Z`;
  return `M${f(cx)} ${f(cy - ry)}A${f(rx)} ${f(ry)} 0 0 ${away > 0 ? 1 : 0} ${f(cx)} ${f(cy + ry)}A${f(rx * (1 - depth))} ${f(ry)} 0 0 ${away > 0 ? 0 : 1} ${f(cx)} ${f(cy - ry)}Z`;
}

interface Frame {
  /** The plant's painted frame on the canvas: left, top and side of a square. */
  x: number;
  y: number;
  side: number;
  mouth: { y: number; hw: number };
  foot: number;
}

function Ladybird({ at, k }: { at: readonly [number, number]; k: Kit }) {
  const [x, y] = at;
  return (
    <g data-flourish="ladybird">
      <path d={ell(x, y, 1.6, 1.25)} fill={k.lit('#E36A5E')} />
      <path d={ell(x + 1.3, y - 0.2, 0.7, 0.6)} fill="#4A3F3C" />
      <path d={`${ell(x - 0.6, y - 0.3, 0.32)}${ell(x + 0.2, y + 0.45, 0.3)}${ell(x - 0.4, y + 0.6, 0.26)}`} fill="#4A3F3C" />
      <path d={crescent(x, y, 1.6, 1.25, k.away)} class={SHADE} />
    </g>
  );
}

function Snail({ at, k }: { at: readonly [number, number]; k: Kit }) {
  const [x, y] = at;
  const dir = k.away === 0 ? 1 : -k.away;
  return (
    <g data-flourish="snail" transform={`translate(${f(x)} ${f(y)}) scale(${dir} 1)`}>
      <path d="M-3.2 0.9C-3.4 -0.2 -2.2 -0.5 -1 -0.4L2.4 -0.4C3.4 -0.4 3.8 -1.8 3.9 -2.6C4.3 -2.4 4.5 -1.4 4.2 -0.4C3.9 0.6 3.2 1.1 2.2 1.1L-2.6 1.1Z" fill={k.lit('#D9C4B0')} />
      <path d="M3.9 -2.6L4.4 -3.8M3.7 -2.5L3.6 -3.7" stroke={k.lit('#C9B29C')} stroke-width={0.35} stroke-linecap="round" />
      <path d={ell(-0.2, -1.6, 2.2, 2)} fill={k.lit('#C89A6F')} />
      <path d="M-0.2 -1.6m-1.1 0a1.1 1 0 1 0 2.2 0a0.5 0.45 0 1 0 -1 0" fill="none" stroke={k.lit('#A87C56')} stroke-width={0.45} stroke-linecap="round" />
      <path d={crescent(-0.2, -1.6, 2.2, 2, 1)} class={SHADE} />
    </g>
  );
}

function Butterfly({ at, k }: { at: readonly [number, number]; k: Kit }) {
  const [x, y] = at;
  // Resting with its wings up and closed, side-on: one pale wing, the far one showing a sliver behind it.
  return (
    <g data-flourish="butterfly" transform={`translate(${f(x)} ${f(y)})`}>
      <path d="M0 0C-0.4 -2 0.4 -4.8 2.6 -5.4C3.6 -3.6 3 -1.2 0.6 0.2Z" fill={k.lit('#9BB5DC')} />
      <path d="M0 0C-1.4 -1.6 -1.6 -4.6 0.2 -5.8C2.4 -5 2.6 -2 0.6 0.2Z" fill={k.lit('#BCD0EC')} />
      <path d="M0.2 -5.8C-0.4 -4.6 -0.4 -3 0 -1.6" fill="none" stroke={k.lit('#8AA3CB')} stroke-width={0.3} />
      <path d="M0 0.4L0.6 -0.6" stroke="#4A3F3C" stroke-width={0.55} stroke-linecap="round" />
      <path d={k.away >= 0 ? 'M2.6 -5.4C3.6 -3.6 3 -1.2 0.6 0.2C1.8 -1.4 2.4 -3.4 2.6 -5.4Z' : 'M0.2 -5.8C-1.6 -4.6 -1.4 -1.6 0 0C-0.8 -1.8 -0.8 -4 0.2 -5.8Z'} class={SHADE} />
    </g>
  );
}

function Trail({ fr, k }: { fr: Frame; k: Kit }) {
  // A strand spills over the rim on the lit side and hangs down the pot, three small leaves along it.
  const side = k.away === 0 ? -1 : -k.away;
  const x0 = 50 + side * (fr.mouth.hw - 1.5);
  const y0 = fr.mouth.y - 0.6;
  const x1 = 50 + side * (fr.mouth.hw + 2.4);
  const y1 = Math.min(FOOT_Y - 6, fr.mouth.y + 16);
  const leaves = [0.3, 0.6, 0.9].map((t, i) => {
    const lx = x0 + (x1 - x0) * Math.min(1, t * 1.6) + side * (i % 2 ? 1.2 : -0.4);
    const ly = y0 + (y1 - y0) * t;
    return <path key={i} d={ell(lx, ly, 1.7, 1.1)} transform={`rotate(${side * (i % 2 ? 30 : -24)} ${f(lx)} ${f(ly)})`} fill={k.tone(['#A9C98E', '#86AE77', '#6F9A63'], i % 2, lx, ly)} />;
  });
  return (
    <g data-flourish="trail">
      <path d={`M${f(x0)} ${f(y0)}C${f(x0 + side * 3)} ${f(y0 - 1)} ${f(x1)} ${f(y0 + 4)} ${f(x1)} ${f(y1)}`} fill="none" stroke={k.lit('#8FAF78')} stroke-width={0.7} stroke-linecap="round" />
      {leaves}
    </g>
  );
}

function Moss({ fr, k }: { fr: Frame; k: Kit }) {
  // Soft cushions of moss round the front of the soil, just inside the rim.
  const n = 7;
  const bumps = Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    const x = 50 - fr.mouth.hw * 0.92 + t * fr.mouth.hw * 1.84;
    const y = fr.mouth.y + Math.sin(t * Math.PI) * 1.1 - 0.2;
    return ell(x, y, 1.9 - (i % 2) * 0.4, 1.2);
  });
  return (
    <g data-flourish="moss">
      <path d={bumps.join('')} fill={k.lit('#A3BD74')} />
      <path d={bumps.filter((_, i) => i % 2).join('')} fill={k.lit('#8DAA63')} />
    </g>
  );
}

function Shoot({ fr, k }: { fr: Frame; k: Kit }) {
  // A second shoot coming up in the soil on the shade side: a short stem and two new leaves.
  const side = k.away === 0 ? 1 : k.away;
  const x = 50 + side * fr.mouth.hw * 0.62;
  const y = fr.mouth.y;
  return (
    <g data-flourish="shoot">
      <path d={`M${f(x)} ${f(y)}Q${f(x + side * 0.6)} ${f(y - 3)} ${f(x + side * 0.2)} ${f(y - 5.6)}`} fill="none" stroke={k.lit('#86AE74')} stroke-width={0.6} stroke-linecap="round" />
      <path d={ell(x - 1.6, y - 5.4, 1.8, 1)} transform={`rotate(-28 ${f(x - 1.6)} ${f(y - 5.4)})`} fill={k.lit('#B5D29A')} />
      <path d={ell(x + 1.8, y - 4.4, 1.7, 0.95)} transform={`rotate(24 ${f(x + 1.8)} ${f(y - 4.4)})`} fill={k.lit('#9CC285')} />
    </g>
  );
}

function Ribbon({ fr, k }: { fr: Frame; k: Kit }) {
  // A ribbon round the pot just under the rim, tied in a small bow on the lit side.
  const y = fr.mouth.y + 5.4;
  const hw = fr.mouth.hw + 0.6;
  const side = k.away === 0 ? -1 : -k.away;
  const bx = 50 + side * hw * 0.55;
  return (
    <g data-flourish="ribbon">
      <path d={`M${f(50 - hw)} ${f(y - 1)}Q50 ${f(y + 0.6)} ${f(50 + hw)} ${f(y - 1)}L${f(50 + hw - 0.3)} ${f(y + 0.8)}Q50 ${f(y + 2.4)} ${f(50 - hw + 0.3)} ${f(y + 0.8)}Z`} fill={k.lit('#E9A5B6')} />
      <path d={`M${f(bx)} ${f(y)}l-3 -1.8l0.2 3.4Z M${f(bx)} ${f(y)}l3 -1.8l-0.2 3.4Z`} fill={k.lit('#F0B8C5')} />
      <path d={`M${f(bx)} ${f(y)}l-1.2 4.2l1 -0.4Z M${f(bx)} ${f(y)}l1.4 4l-1 -0.2Z`} fill={k.lit('#E29AAD')} />
      <path d={ell(bx, y, 0.8, 0.7)} fill={k.lit('#DD8FA3')} />
    </g>
  );
}

/** The first `n` visitors for a plant in a pot. Behind the plant (moss, shoot) and in front of it (the rest). */
export function flourishLayers(n: number, species: PlantSpeciesId, pot: PotId, k: Kit): { back: JSX.Element | null; front: JSX.Element | null } {
  const count = Math.max(0, Math.min(MAX_FLOURISHES, Math.floor(n) || 0));
  if (!count) return { back: null, front: null };
  const def = POTS[pot] ?? POTS.terracotta;
  const [x, y, side] = ICON_FRAMES[species]?.[7] ?? [10, 10, 80];
  const fr: Frame = { x, y, side, mouth: def.mouth, foot: FOOT_Y };
  const lit = k.away === 0 ? -1 : -k.away;
  const crownMid = 50 + lit * side * 0.26;
  const has = (fl: Flourish) => FLOURISHES.indexOf(fl) < count;
  const back = (
    <g data-flourishes="back">
      {has('shoot') && <Shoot fr={fr} k={k} />}
      {has('moss') && <Moss fr={fr} k={k} />}
    </g>
  );
  const front = (
    <g data-flourishes="front">
      {has('ribbon') && <Ribbon fr={fr} k={k} />}
      {has('trail') && <Trail fr={fr} k={k} />}
      {has('snail') && <Snail at={[50 - lit * (def.mouth.hw - 2), FOOT_Y - 3.4]} k={k} />}
      {has('ladybird') && <Ladybird at={[crownMid, y + side * 0.42]} k={k} />}
      {has('butterfly') && <Butterfly at={[50 - lit * side * 0.12, y + side * 0.1]} k={k} />}
      {has('bee') && <Bee x={50 + lit * side * 0.42} y={y + side * 0.22} k={k} s={0.9} />}
    </g>
  );
  return { back, front };
}
