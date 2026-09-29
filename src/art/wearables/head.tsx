import { C, Shade, item, shadeDir } from './kit';
import type { WearCtx } from '../pets/types';
import { circle, ellipse, fmt, scallop, tube } from '../pets/shape';

/**
 * Head wear. Hats are drawn for a 20-unit crown, origin where the brim meets the head, rising
 * toward −y. Clips and sprigs sit by the far ear, origin at the clip. Every item is a small real
 * thing: knit caps, a sou'wester, a thimble, a leaf held as an umbrella.
 */

/** Five rounded petals round a centre. */
function flower(x: number, y: number, r: number, petal: string, centre: string, n = 5, rot = 0) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    d += ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.46, r * 0.46);
  }
  return (
    <g>
      <path d={d} fill={petal} />
      <circle cx={x} cy={y} r={fmt(r * 0.34)} fill={centre} />
    </g>
  );
}

/** A small leaf pointing along `a` degrees. */
const leafAt = (x: number, y: number, len: number, a: number, fill: string) => (
  <path d={`M0 0C${fmt(len * 0.3)} ${fmt(-len * 0.28)} ${fmt(len * 0.78)} ${fmt(-len * 0.24)} ${fmt(len)} 0C${fmt(len * 0.78)} ${fmt(len * 0.24)} ${fmt(len * 0.3)} ${fmt(len * 0.28)} 0 0Z`} transform={`translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(a)})`} fill={fill} />
);

/** Points along the crown's arc, for wreaths and chains. */
const arc = (n: number, w = 11, lift = 3.4): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const x = -w + (2 * w * i) / (n - 1);
    return [x, -0.6 - lift * (1 - (x / w) ** 2)];
  });

const DOME = 'M-10.6 1C-11 -8.2 -6 -13.4 0 -13.4C6 -13.4 11 -8.2 10.6 1Z';
const DOME_SHADE = 'M3.6 -12.6C8.6 -10.8 11.2 -6 10.6 1H6.4C7.2 -4.2 6.4 -9.4 3.6 -12.6Z';

export const knitCap = item({
  slot: 'head',
  draw: (ctx) => (
    <g>
      <path d={DOME} fill={C.sage} />
      <Shade ctx={ctx} d={DOME_SHADE} under="M-10.8 -2H10.8V1H-10.8Z" />
      <path d="M-11.4 -1.6C-4 -3.4 4 -3.4 11.4 -1.6V2.2C4 0.6 -4 0.6 -11.4 2.2Z" fill={C.sageDeep} />
      <path d="M-7 -2.6V1.4M-3.5 -3V1M0 -3.1V0.9M3.5 -3V1M7 -2.6V1.4" class="pet-line" stroke={C.sage} stroke-width="0.7" fill="none" />
      <path d={scallop(0, -15, 3.8, 3.6, 7, 0.14)} fill={C.cream} />
    </g>
  ),
  icon: 'translate(50 66) scale(2.9)',
});

export const pompomHat = item({
  slot: 'head',
  draw: (ctx) => (
    <g>
      <path d="M-10.4 0C-11 -9 -6.4 -15 0.6 -15C7.4 -15 11 -9 10.4 0Z" fill={C.red} />
      <Shade ctx={ctx} d="M4 -14C9 -11.6 11.2 -6.4 10.4 0H6.4C7 -5 6.6 -10.4 4 -14Z" />
      <path d="M-11.6 -2.6C-4 -4.6 4 -4.6 11.6 -2.6V2C4 0.2 -4 0.2 -11.6 2Z" fill={C.cream} />
      <path d={scallop(0.8, -16.4, 4.4, 4.2, 8, 0.14)} fill={C.cream} />
    </g>
  ),
  icon: 'translate(50 68) scale(2.8)',
});

export const rainHat = item({
  slot: 'head',
  draw: (ctx) => (
    <g>
      <path d="M-8.4 -0.6C-8.4 -8 -4.8 -11.8 0 -11.8C4.8 -11.8 8.4 -8 8.4 -0.6Z" fill={C.butter} />
      <Shade ctx={ctx} d="M3 -11C6.6 -9.4 8.4 -5.6 8.4 -0.6H5.4C5.8 -4.8 5 -8.6 3 -11Z" />
      <path d="M-17 2.4C-15 -1.4 13 -1.8 14.6 1.6C15.4 4 13.4 5.4 10.6 4.6C5 3 -5 3 -11 5.4C-14.4 6.6 -18 5.6 -17 2.4Z" fill={C.mustard} />
      <path d="M-8.4 -2.6H8.4V-0.8H-8.4Z" fill={C.mustard} opacity={0.7} />
    </g>
  ),
  icon: 'translate(52 64) scale(2.7)',
});

export const strawHat = item({
  slot: 'head',
  draw: (ctx) => (
    <g>
      <path d={ellipse(0, 0.4, 16, 3.6)} fill={C.straw} />
      <path d="M-7.6 0.4C-7.6 -7 -4 -10.4 0 -10.4C4 -10.4 7.6 -7 7.6 0.4Z" fill={C.straw} />
      <Shade ctx={ctx} d="M2.6 -9.8C6 -8.4 7.6 -4.6 7.6 0.4H4.8C5.2 -3.6 4.6 -7.4 2.6 -9.8Z" under={ellipse(0, 2, 15, 2)} />
      <path d="M-7.6 -3.4H7.6V-0.8H-7.6Z" fill={C.strawDeep} />
      <path class="pet-line" d="M-13 1.6Q0 3.4 13 1.6M-5 -6.4Q0 -7.6 5 -6.4" fill="none" stroke={C.strawDeep} stroke-width="0.5" />
    </g>
  ),
  icon: 'translate(50 62) scale(2.6)',
});

export const sunHat = item({
  slot: 'head',
  // A wide, soft linen brim, a shade darker underneath, with a strawberry-milk ribbon.
  draw: (ctx) => (
    <g>
      <path d={ellipse(0, 1.2, 19, 4.2)} fill={C.linenDeep} />
      <path d={ellipse(0, 0.2, 19, 4)} fill={C.linen} />
      <path d="M-7 0.4C-7 -6.6 -3.6 -9.8 0 -9.8C3.6 -9.8 7 -6.6 7 0.4Z" fill={C.linen} />
      <Shade ctx={ctx} d="M2.4 -9.2C5.6 -7.8 7 -4.2 7 0.4H4.4C4.8 -3.4 4.2 -7 2.4 -9.2Z" under={ellipse(0, 2.4, 18, 2.4)} />
      <path d="M-7 -3.2H7V-0.6H-7Z" fill={C.blush} />
      <path d="M-7 -1.8C-10 0 -12.6 3 -13.4 6.4L-11.4 6.8C-10.6 4 -8.8 1.6 -6.4 0Z" fill={C.blushDeep} />
      <path d="M-6.6 -1.4C-8.2 1.4 -9 4.6 -8.6 7.6L-6.8 7.4C-7 4.6 -6.6 2 -5.4 -0.2Z" fill={C.blush} />
    </g>
  ),
  icon: 'translate(50 60) scale(2.3)',
});

export const partyHat = item({
  slot: 'head',
  draw: (ctx) => (
    <g transform="rotate(-12)">
      <path d="M-7.2 0.8L-0.6 -16.6C-0.4 -17.2 0.4 -17.2 0.6 -16.6L7.2 0.8C2.6 2.4 -2.6 2.4 -7.2 0.8Z" fill={C.butter} />
      <path d="M-5.6 -3.4L-4.4 -6.6C-1.4 -5.4 2 -5.2 5 -6.2L6.1 -3.2C2.4 -1.8 -1.8 -2 -5.6 -3.4ZM-3.2 -9.8L-2 -12.8C-0.4 -12.2 1.2 -12.2 2.6 -12.8L3.6 -9.8C1.2 -9 -1 -9 -3.2 -9.8Z" fill={C.blush} />
      <Shade ctx={ctx} d="M0.6 -16.6L7.2 0.8C5.8 1.3 4.4 1.6 3 1.8Z" />
      <path d={scallop(0, -17.8, 2.6, 2.4, 6, 0.16)} fill={C.blushDeep} />
    </g>
  ),
  icon: 'translate(52 70) scale(2.6)',
});

export const thimbleHat = item({
  slot: 'head',
  draw: (ctx) => (
    <g transform="rotate(10)">
      <path d="M-6.4 0.6C-6.6 -6 -5.6 -10.6 0 -10.8C5.6 -10.6 6.6 -6 6.4 0.6Z" fill={C.silver} />
      <Shade ctx={ctx} d="M2.6 -10.4C5.4 -9.2 6.6 -5.6 6.4 0.6H4C4.4 -4 4 -8 2.6 -10.4Z" />
      <path d="M-6.8 -1.2H6.8V1.2C2.4 2 -2.4 2 -6.8 1.2Z" fill={C.silverDeep} />
      <path d={[-3.6, 0, 3.6].flatMap((x) => [-3.6, -6.4].map((y) => circle(x + (y < -5 ? 1.8 : 0), y, 0.55))).join('') + circle(0, -8.8, 0.55)} fill={C.silverDeep} />
    </g>
  ),
  icon: 'translate(50 68) scale(3.2)',
});

export const knitBeret = item({
  slot: 'head',
  draw: (ctx) => (
    <g transform="rotate(-8)">
      <path d="M-12.6 -1.4C-13 -6.6 -6 -9.4 1 -9.2C8 -9 13.4 -6 12.8 -1.8C12.4 0.8 6 1.8 0 1.8C-6.2 1.8 -12.4 1 -12.6 -1.4Z" fill={C.oat} />
      <Shade ctx={ctx} d="M4 -9C9.4 -8 13.4 -5.4 12.8 -1.8C12.4 0.4 8.6 1.4 5 1.7C8.4 0 9.4 -5.4 4 -9Z" under="M-12.4 -1C-8 1.6 8 1.8 12.6 -1.2C12 1 6 1.8 0 1.8C-6 1.8 -12 1.2 -12.4 -1Z" />
      <path d="M-0.6 -9.4C-0.4 -10.8 0.6 -11.6 1.6 -11.4L1.8 -9.2Z" fill={C.linen} />
    </g>
  ),
  icon: 'translate(50 62) scale(2.8)',
});

export const nightcap = item({
  slot: 'head',
  draw: (ctx) => (
    <g>
      <path d="M10.6 1C11 -7 7 -12.4 1 -12.8C-5 -13.2 -10 -10.6 -14 -5C-16.4 -1.6 -18.4 3.6 -19 7.6C-19.2 9.2 -17.6 9.8 -16.8 8.4C-15 5 -12.6 2 -10.2 0.4C-10.6 0.6 -10.8 0.8 -10.8 1Z" fill={C.lavender} />
      <path d="M-6 -11.4C-4.4 -8.6 -4 -4 -5 1H-8.2C-7 -3.4 -7.6 -7.6 -9.6 -9.6ZM2.4 -12.8C4 -9 4.4 -4 3.8 1H0.8C1.4 -3.6 0.8 -8.4 -1 -12.4Z" fill={C.cream} opacity={0.85} />
      <Shade ctx={ctx} d="M4 -12C8.8 -10 11 -5.4 10.6 1H7.2C7.8 -4 6.8 -8.8 4 -12Z" />
      <path d="M-11.4 -1.6C-4 -3.4 4 -3.4 11.4 -1.6V2.2C4 0.6 -4 0.6 -11.4 2.2Z" fill={C.lavenderDeep} />
      <path d={scallop(-18, 9.4, 2.8, 2.7, 6, 0.15)} fill={C.cream} />
    </g>
  ),
  icon: 'translate(58 58) scale(2.4)',
});

export const witchHat = item({
  slot: 'head',
  draw: (ctx) => (
    <g transform="rotate(-6)">
      <path d="M-15.4 1.8L15 0L15.6 2.6L-14.8 4.2Z" fill="#4A4146" />
      <path d="M-7 1.4C-5.4 -6 -2.4 -13 1 -17.4L4.4 -20.2C3.6 -16.4 4.6 -8 7.4 0.8Z" fill="#524950" />
      <path d="M1 -17.4L4.4 -20.2C3.6 -16.4 4.6 -8 7.4 0.8L4 1Z" fill="#3E363B" opacity={ctx && ctx.light.from === 'right' ? 0 : 1} />
      <path d="M-6.2 -1.4L6.8 -2.2L7.2 0.6L-6.6 1.4Z" fill={C.lavenderDeep} />
    </g>
  ),
  icon: 'translate(50 70) scale(2.6)',
});

export const earmuffs = item({
  slot: 'head',
  draw: () => (
    <g>
      <path d={tube([[-12.4, 4.4], [-10, -6], [0, -10.4], [10, -6], [12.4, 4.4]], 1.8, 1.8)} fill={C.silverDeep} />
      <path d={scallop(-12.4, 4.4, 5, 5, 8, 0.12)} fill={C.blush} />
      <path d={scallop(12.4, 4.4, 5, 5, 8, 0.12, 0.3)} fill={C.blush} />
      <path d={circle(-12.4, 4.4, 2.2) + circle(12.4, 4.4, 2.2)} fill={C.blushDeep} opacity={0.5} />
    </g>
  ),
  icon: 'translate(50 58) scale(2.8)',
});

export const leafUmbrella = item({
  slot: 'head',
  draw: (ctx) => (
    <g transform="translate(-2 -6)">
      <path d={tube([[1.4, -12], [0.4, -5], [-2.6, 3.4]], 1.1, 0.9)} fill={C.leafDeep} />
      <path d="M-19 -9C-14 -21 12 -23 20 -10C12 -12.8 -10 -13 -19 -9Z" fill={C.leaf} />
      <path d="M1 -19.8C8 -19.4 16 -16 20 -10C14 -12 8 -12.6 1.4 -12.6Z" fill={C.leafDeep} opacity={ctx && ctx.light.from === 'right' ? 0.3 : 0.8} />
      <path class="pet-line" d="M-18 -9.6Q0 -18 19 -10.4" fill="none" stroke={C.sage} stroke-width="0.6" />
    </g>
  ),
  icon: 'translate(50 76) scale(2.1)',
});

/** Daisy petals: a warm cream that still reads on a white coat, and their shade side. */
const DAISY = C.wool;
const DAISY_SHADE = '#D9CBD8';

/**
 * A daisy with its petals on the side away from the light in the lavender shade (a hard step,
 * no gradient), so it keeps its round form on a pale card or a white coat.
 */
function daisy(x: number, y: number, r: number, dir: number, rot: number) {
  const n = 8;
  let lit = '';
  let shade = '';
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const d = ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.42, r * 0.42);
    // From the side the light is not on (or underneath, with overhead light).
    const away = dir === 0 ? Math.sin(a) > 0.35 : Math.cos(a) * dir > 0.3;
    if (away) shade += d;
    else lit += d;
  }
  return (
    <g>
      <path d={lit} fill={DAISY} />
      <path d={shade} fill={DAISY_SHADE} />
      <circle cx={x} cy={y} r={fmt(r * 0.36)} fill={C.mustard} />
    </g>
  );
}

/** A wreath of flowers along the crown. A daisy chain is linked by its green stems. */
function wreath(kind: 'forget' | 'daisy' | 'blossom') {
  return (ctx: WearCtx | null) => {
    const pts = arc(kind === 'daisy' ? 6 : 7, 11.4, 3.6);
    const leaves = pts.slice(0, -1).map(([x, y], i) => leafAt(x + 1.6, y + 0.6, 3.4, i % 2 ? 30 : -30, C.sageDeep));
    const dir = ctx ? shadeDir(ctx) : 1;
    return (
      <g>
        {kind === 'daisy' && <path d={tube(pts.map(([x, y]) => [x, y + 1.2] as const), 1.1, 1.1)} fill={C.leafDeep} />}
        {leaves}
        {pts.map(([x, y], i) =>
          kind === 'daisy' ? (
            <g key={i}>{daisy(x, y, 2.9, dir, i * 0.4)}</g>
          ) : kind === 'blossom' ? (
            <g key={i}>{flower(x, y, 2.8, i % 2 ? '#F7D5DE' : '#F2C2CF', C.blushDeep, 5, i)}</g>
          ) : i === 3 ? (
            <g key={i}>
              <circle cx={x} cy={y} r={2.8} fill={C.blushDeep} />
              <path d={`M${fmt(x - 1.4)} ${fmt(y)}a1.4 1.4 0 1 1 2.8 0`} fill="none" class="pet-line" stroke={C.rose} stroke-width="0.6" />
            </g>
          ) : (
            <g key={i}>{flower(x, y, 2.3, C.sky, C.butter, 5, i)}</g>
          ),
        )}
      </g>
    );
  };
}

export const flowerCrown = item({ slot: 'head', front: true, draw: wreath('forget'), icon: 'translate(50 58) scale(3.2)' });
export const daisyChain = item({ slot: 'head', front: true, draw: wreath('daisy'), icon: 'translate(50 58) scale(3.2)' });
export const blossomCrown = item({ slot: 'head', front: true, draw: wreath('blossom'), icon: 'translate(50 58) scale(3.2)' });

export const laurelSprig = item({
  slot: 'head',
  at: 'ear',
  front: true,
  draw: () => (
    <g transform="rotate(-10)">
      <path d={tube([[2, 4], [-2, -3], [-4, -11]], 0.9, 0.7)} fill={C.leafDeep} />
      {[
        [0.6, 1.6, 150],
        [0, -1, 20],
        [-1.4, -4, 160],
        [-2, -6.6, 30],
        [-3, -9, 170],
        [-3.6, -11, 60],
      ].map(([x, y, a], i) => (
        <g key={i}>{leafAt(x!, y!, 5.4, a! - 90, i % 2 ? C.sageDeep : C.leaf)}</g>
      ))}
    </g>
  ),
  icon: 'translate(52 58) scale(4)',
});

export const ribbonBow = item({
  slot: 'head',
  at: 'ear',
  front: true,
  draw: () => (
    <g>
      <path d="M0 0C-3 -4.6 -8 -5 -8.4 -1.6C-8.8 1.8 -4 2.4 0 0ZM0 0C3 -4.6 8 -5 8.4 -1.6C8.8 1.8 4 2.4 0 0Z" fill={C.blush} />
      <path d="M-0.6 0.6L-4 7L-2 7.2L0 2ZM0.6 0.6L3.4 6.6L5.2 6.2L1.2 0.2Z" fill={C.blushDeep} />
      <circle cx={0} cy={0} r={1.8} fill={C.blushDeep} />
    </g>
  ),
  icon: 'translate(50 48) scale(4.4)',
});

export const roseClip = item({
  slot: 'head',
  at: 'ear',
  front: true,
  draw: () => (
    <g>
      {leafAt(-2, 2, 5, 150, C.leafDeep)}
      {leafAt(2, 2, 5, 30, C.leaf)}
      <circle cx={0} cy={0} r={3.6} fill={C.rose} />
      <path class="pet-line" d="M-1.8 0.4a1.8 1.8 0 1 1 3 1.2M-2.8 -1a3 3 0 0 1 4.6 -1.4" fill="none" stroke={C.redDeep} stroke-width="0.55" stroke-linecap="round" />
    </g>
  ),
  icon: 'translate(50 50) scale(5)',
});

export const blossomClip = item({
  slot: 'head',
  at: 'ear',
  front: true,
  draw: () => (
    <g>
      <path d={tube([[-6, 3], [0, 0], [6, -4]], 0.9, 0.7)} fill="#8C6A5C" />
      {flower(-3.4, 1.4, 2.6, '#F7D5DE', C.blushDeep, 5, 0.4)}
      {flower(2.4, -1.8, 2.8, '#F2C2CF', C.blushDeep, 5, 1)}
      <circle cx={6.4} cy={-4.4} r={1.2} fill={C.blush} />
    </g>
  ),
  icon: 'translate(50 52) scale(4.6)',
});

export const crescentPin = item({
  slot: 'head',
  at: 'ear',
  front: true,
  // A brass crescent, half as big again as a clip, with its shade on the side away from the light.
  draw: (ctx) => (
    <g transform="scale(1.5)">
      <path d="M1.6 -4C-1.6 -4.6 -4.4 -2 -4.4 1.2C-4.4 4.4 -1.6 6.6 1.6 6C-0.4 5 -1.8 3.2 -1.8 1C-1.8 -1.2 -0.4 -3.2 1.6 -4Z" fill={C.brass} />
      {ctx && ctx.light.from === 'right' ? (
        <path d="M1.6 -4C-1.6 -4.6 -4.4 -2 -4.4 1.2L-3.4 1C-3.2 -1.6 -1 -3.4 1.6 -4Z" fill={C.brassDeep} />
      ) : (
        <path d="M-4.2 0.4C-4 3.4 -1.6 6.2 1.6 6C-0.4 5 -1.8 3.2 -1.8 1Z" fill={C.brassDeep} />
      )}
    </g>
  ),
  icon: 'translate(50 50) scale(4)',
});
