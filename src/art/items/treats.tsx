/**
 * Treat art, keyed by collectible id (100×100 canvas, no <svg> wrapper). Owned by the garden module.
 * Same outline language as the pets: cocoa outline, round joins, pastel fills, one soft top-left
 * highlight and a soft ground shadow. Saturated color only for tiny accents (a berry, a cherry).
 */
import type { JSX } from 'preact';
import type { ItemRenderer } from './types';
import { OUTLINE, STROKE } from '../pets/geometry';
import { Blob, Merged, SPARKLE_D, circleD, leafD, type Circle } from '../plants/parts';
import { f } from '../plants/math';

const FINE = 2;
const EYE = '#4A3540';
const BLUSH = '#FF9FB8';
const LEAF = '#9CCB86';
const BERRY = '#FF7F93';
const SEED = '#FFE9A8';
const CREAM = '#FFFDF7';
const COOKIE = '#F2C48D';
const COOKIE_DARK = '#D9A06E';
const CHOCO = '#8F5E4C';
const CARAMEL = '#E8A45C';
const PINK = '#FFB3C7';
const SPRINKLES = ['#FFE593', '#BBDCF6', '#B3E6D6', '#D6C8F8', '#FFFFFF', '#FF9FB8'];

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Shadow({ cx = 50, cy = 89, rx = 28 }: { cx?: number; cy?: number; rx?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={3.4} fill={OUTLINE} opacity={0.12} />;
}

function Shine({ d, w = 2.2, opacity = 0.75 }: { d: string; w?: number; opacity?: number }) {
  return <path d={d} fill="none" stroke="#fff" stroke-width={w} stroke-linecap="round" opacity={opacity} />;
}

/** A tiny kawaii face: glossy eyes, blush and a little mouth. */
function Face({ x, y, s = 1, gap = 6 }: { x: number; y: number; s?: number; gap?: number }) {
  const eye = (ex: number) => (
    <g>
      <ellipse cx={f(ex)} cy={f(y)} rx={f(2.3 * s)} ry={f(2.8 * s)} fill={EYE} />
      <circle cx={f(ex + 0.8 * s)} cy={f(y - 1.1 * s)} r={f(0.9 * s)} fill="#fff" />
    </g>
  );
  return (
    <g>
      <g fill={BLUSH} opacity={0.6}>
        <ellipse cx={f(x - (gap + 4) * s)} cy={f(y + 3.2 * s)} rx={f(3 * s)} ry={f(1.8 * s)} />
        <ellipse cx={f(x + (gap + 4) * s)} cy={f(y + 3.2 * s)} rx={f(3 * s)} ry={f(1.8 * s)} />
      </g>
      {eye(x - gap * s)}
      {eye(x + gap * s)}
      <path d={`M${f(x - 1.8 * s)} ${f(y + 2 * s)} Q${f(x)} ${f(y + 4.2 * s)} ${f(x + 1.8 * s)} ${f(y + 2 * s)}`} fill="none" stroke={OUTLINE} stroke-width={f(1.4 * s)} stroke-linecap="round" />
    </g>
  );
}

/** Rounded sprinkles: [x, y, rotation]; colors cycle through the pastel set. */
function Sprinkles({ at, offset = 0 }: { at: [number, number, number][]; offset?: number }) {
  return (
    <g>
      {at.map(([x, y, rot], i) => (
        <rect
          key={i}
          x={-2.4}
          y={-0.9}
          width={4.8}
          height={1.8}
          rx={0.9}
          transform={`translate(${x} ${y}) rotate(${rot})`}
          fill={SPRINKLES[(i + offset) % SPRINKLES.length]}
          stroke={OUTLINE}
          stroke-width={0.6}
        />
      ))}
    </g>
  );
}

/** Strawberry seeds as tiny teardrops. */
function Seeds({ at, fill = SEED }: { at: [number, number][]; fill?: string }) {
  return (
    <g fill={fill}>
      {at.map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={0.95} ry={1.5} />
      ))}
    </g>
  );
}

/** A leafy strawberry calyx centered at (x, y). */
function Calyx({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const leaf = (rot: number, L: number) => ({ d: leafD('lance', L, 3.6), transform: `translate(${x} ${y}) rotate(${rot}) scale(${s})` });
  return (
    <g>
      <Merged shapes={[leaf(-112, 11), leaf(-58, 10), leaf(0, 8), leaf(58, 10), leaf(112, 11)]} fill={LEAF} line={FINE / s} />
      <path d={`M${x} ${y - 1} C${x} ${f(y - 5 * s)} ${f(x + 2 * s)} ${f(y - 8 * s)} ${f(x + 4 * s)} ${f(y - 10 * s)}`} fill="none" stroke={OUTLINE} stroke-width={2.2} stroke-linecap="round" />
    </g>
  );
}

const HEART = 'M0 12 C-4 8 -16 1 -16 -8 C-16 -14 -11 -17 -7 -17 C-3.6 -17 -1.2 -15 0 -12.6 C1.2 -15 3.6 -17 7 -17 C11 -17 16 -14 16 -8 C16 1 4 8 0 12 Z';

/**
 * A slice (cheese, pie, cake) seen from the front-left: a triangular top face and the cut face
 * below it. `bands` split the cut face top-to-bottom as [fromFraction, toFraction, fill].
 */
interface Wedge {
  tip: [number, number];
  back: [number, number];
  side: [number, number];
  depth: number;
}

function wedgeFaces({ tip, back, side, depth }: Wedge) {
  const top = `M${tip[0]} ${tip[1]} L${back[0]} ${back[1]} L${side[0]} ${side[1]} Z`;
  const band = (a: number, b: number) =>
    `M${tip[0]} ${f(tip[1] + depth * a)} L${side[0]} ${f(side[1] + depth * a)} L${side[0]} ${f(side[1] + depth * b)} L${tip[0]} ${f(tip[1] + depth * b)} Z`;
  return { top, band, front: band(0, 1) };
}

/* ------------------------------------------------------------------ */
/* Fruit & fresh                                                       */
/* ------------------------------------------------------------------ */

const strawberry: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={24} />
    <path d="M50 88 C36 86 20 71 21 53 C22 40 34 34 50 38 C66 34 78 40 79 53 C80 71 64 86 50 88 Z" fill={BERRY} stroke={OUTLINE} stroke-width={STROKE} />
    <Seeds at={[[32, 51], [44, 46], [57, 46], [68, 51], [27, 63], [73, 63], [40, 77], [60, 77], [50, 82]]} />
    <Shine d="M27 49 Q28 44 33 42" />
    <Face x={50} y={61} />
    <Calyx x={50} y={39} />
  </g>
);

const blueberries: ItemRenderer = () => {
  const berry = (x: number, y: number, r: number) => (
    <g>
      <circle cx={x} cy={y} r={r} fill="#98ABEC" stroke={OUTLINE} stroke-width={STROKE} />
      <ellipse cx={f(x - r * 0.35)} cy={f(y - r * 0.2)} rx={f(r * 0.42)} ry={f(r * 0.3)} fill="#C6D3F8" opacity={0.8} />
      <path
        d={`M${f(x - 2.8)} ${f(y - r * 0.55)} L${x} ${f(y - r * 0.35)} L${f(x + 2.8)} ${f(y - r * 0.55)} M${x} ${f(y - r * 0.35)} L${x} ${f(y - r * 0.62)}`}
        fill="none"
        stroke="#5F6FB6"
        stroke-width={1.6}
      />
      <circle cx={x} cy={f(y - r * 0.4)} r={1.2} fill="#5F6FB6" />
    </g>
  );
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <Shadow rx={30} />
      <g stroke={OUTLINE} stroke-width={FINE}>
        <path d={leafD('oval', 20, 6.4)} transform="translate(56 42) rotate(38)" fill={LEAF} />
        <path d={leafD('oval', 16, 5.4)} transform="translate(54 42) rotate(-18)" fill="#B5DB9E" />
      </g>
      {berry(50, 47, 12)}
      {berry(71, 58, 11)}
      {berry(35, 66, 13.5)}
      {berry(59, 74, 13)}
      <Shine d="M26 61 Q27 57 30 55.4" w={1.8} />
    </g>
  );
};

const watermelon: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={32} />
    <g transform="rotate(-6 50 56)">
      <path d="M50 14 L87 72 Q50 97 13 72 Z" fill="#8EC07C" />
      <path d="M50 14 L84.6 68.6 Q50 91 15.4 68.6 Z" fill="#EDF7E0" />
      <path d="M50 14 L81.8 64.2 Q50 84 18.2 64.2 Z" fill="#FF8FA3" />
      <path d="M18.2 64.2 Q50 84 81.8 64.2" fill="none" stroke={OUTLINE} stroke-width={1.3} opacity={0.5} />
      <path d="M50 14 L87 72 Q50 97 13 72 Z" fill="none" stroke={OUTLINE} stroke-width={STROKE} />
      <g fill={OUTLINE}>
        {[
          [50, 34],
          [42, 48],
          [58, 48],
          [34, 60],
          [50, 62],
          [66, 60],
        ].map(([x, y]) => (
          <path key={`${x}${y}`} d={`M${x} ${y! - 2.6} C${x! + 1.6} ${y! - 0.6} ${x! + 1.5} ${y! + 1.8} ${x} ${y! + 1.8} C${x! - 1.5} ${y! + 1.8} ${x! - 1.6} ${y! - 0.6} ${x} ${y! - 2.6} Z`} />
        ))}
      </g>
      <Shine d="M44 26 Q40 32 37 38" />
    </g>
  </g>
);

const lettuce: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={32} />
    <Blob
      circles={[
        [22, 66, 11],
        [30, 54, 12],
        [42, 46, 12],
        [58, 46, 12],
        [70, 54, 12],
        [78, 66, 11],
        [34, 76, 12],
        [50, 72, 16],
        [66, 76, 12],
      ]}
      fill="#A8D38F"
    />
    <Blob
      circles={[
        [34, 60, 9],
        [42, 50, 9.5],
        [58, 50, 9.5],
        [66, 60, 9],
        [50, 64, 13],
      ]}
      fill="#C4E4A4"
      line={FINE}
    />
    <Blob
      circles={[
        [45, 55, 7],
        [55, 55, 7],
        [50, 50, 7.4],
        [50, 61, 7.6],
      ]}
      fill="#E2F3CC"
      line={FINE}
    />
    <g fill="none" stroke="#F4FBEC" stroke-width={2} opacity={0.95}>
      <path d="M50 84 L50 62" />
      <path d="M46 84 Q38 74 30 64" />
      <path d="M54 84 Q62 74 70 64" />
    </g>
    <path d="M70 38 C72 41 73.6 43 73.6 44.8 A3.6 3.6 0 0 1 66.4 44.8 C66.4 43 68 41 70 38 Z" fill="#BBDCF6" stroke={OUTLINE} stroke-width={1.5} />
    <circle cx={68.8} cy={44.6} r={0.9} fill="#fff" />
    <Shine d="M24 60 Q26 55 30 52" />
  </g>
);

const clover: ItemRenderer = () => {
  const leaf = (rot: number, fill: string) => (
    <g transform={`translate(50 44) rotate(${rot})`}>
      <path d="M0 0 C-3 -3 -13 -8 -13 -16 C-13 -21 -9 -23.4 -5.6 -23.4 C-2.6 -23.4 -0.7 -21.4 0 -19.2 C0.7 -21.4 2.6 -23.4 5.6 -23.4 C9 -23.4 13 -21 13 -16 C13 -8 3 -3 0 0 Z" fill={fill} stroke={OUTLINE} stroke-width={STROKE} />
      <path d="M0 -3 L0 -15" fill="none" stroke="#6FA35C" stroke-width={1.4} />
    </g>
  );
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <Shadow cx={58} rx={18} />
      <path d="M50 46 C52 60 50 74 60 86" fill="none" stroke={OUTLINE} stroke-width={7.6} />
      <path d="M50 46 C52 60 50 74 60 86" fill="none" stroke={LEAF} stroke-width={3.2} />
      {leaf(-45, '#A4D18E')}
      {leaf(45, '#B8DDA2')}
      {leaf(135, '#A4D18E')}
      {leaf(-135, '#B8DDA2')}
      <circle cx={50} cy={44} r={3} fill="#8EC07C" stroke={OUTLINE} stroke-width={1.6} />
      <path d="M31 22 C32.8 24.6 34 26.4 34 28 A3 3 0 0 1 28 28 C28 26.4 29.2 24.6 31 22 Z" fill="#BBDCF6" stroke={OUTLINE} stroke-width={1.4} />
      <Shine d="M64 22 Q68 20 71 22" w={1.8} />
    </g>
  );
};

const daifuku: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={30} />
    <path d="M50 21 C57 21 61.6 29 61.6 39 C61.6 47 57 51 50 51 C43 51 38.4 47 38.4 39 C38.4 29 43 21 50 21 Z" fill={BERRY} stroke={OUTLINE} stroke-width={STROKE} />
    <Seeds at={[[45, 31], [54, 29], [50, 37], [56.6, 37]]} />
    <path d="M21 76 C17 60 29 40 50 40 C71 40 83 60 79 76 C77 84 65 87 50 87 C35 87 23 84 21 76 Z" fill="#FFF6F4" stroke={OUTLINE} stroke-width={STROKE} />
    <path d="M36 43.6 Q43 47.4 50 47.4 Q57 47.4 64 43.6" fill="none" stroke="#F4DCDF" stroke-width={1.6} />
    <Shine d="M28 60 Q29 52 35 48" w={2.4} />
    <Face x={50} y={66} s={1.05} gap={7} />
    <g fill="#fff" stroke="#EBDCDD" stroke-width={0.8}>
      <circle cx={71} cy={58} r={1.2} />
      <circle cx={68} cy={51} r={0.9} />
    </g>
  </g>
);

const chocoStrawberry: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={24} />
    <g transform="translate(50 52) rotate(18)">
      <path d="M0 36 C-13 34 -27 17 -26 -2 C-25 -16 -13 -22 0 -18 C13 -22 25 -16 26 -2 C27 17 13 34 0 36 Z" fill={BERRY} />
      <Seeds at={[[-16, -7], [-5, -12], [8, -12], [18, -6]]} />
      <path d="M-26.4 1.4 Q-19 7 -12 3 Q-5 -0.6 1 4 Q8 8.6 14 4 Q20 -0.4 26.2 2.2 C26.4 18 13 34 0 36 C-13 34 -26.8 18 -26.4 1.4 Z" fill={CHOCO} />
      <path d="M-26.4 1.4 Q-19 7 -12 3 Q-5 -0.6 1 4 Q8 8.6 14 4 Q20 -0.4 26.2 2.2" fill="none" stroke={OUTLINE} stroke-width={FINE} />
      <path d="M-20 12 L-12 18 L-6 10 L2 18 L8 10 L16 17" fill="none" stroke={CREAM} stroke-width={2} />
      <path d="M-12 25 L-4 29 L4 23 L10 27" fill="none" stroke={CREAM} stroke-width={1.8} />
      <Sprinkles at={[[-16, 5, 30], [20, 10, -20], [6, 30, 60]]} offset={5} />
      <path d="M0 36 C-13 34 -27 17 -26 -2 C-25 -16 -13 -22 0 -18 C13 -22 25 -16 26 -2 C27 17 13 34 0 36 Z" fill="none" stroke={OUTLINE} stroke-width={STROKE} />
      <Shine d="M-21 -6 Q-20 -12 -14 -15" />
      <Calyx x={0} y={-18} s={1.05} />
    </g>
  </g>
);

const caramelApple: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={28} />
    <path d="M51 44 L52 9" fill="none" stroke={OUTLINE} stroke-width={8.6} />
    <path d="M51 44 L52 9" fill="none" stroke="#F4DDBB" stroke-width={4.2} />
    <path d="M50 40 C58 34 77 36 78.6 54 C80 72 66 88 56 86 C53 85.5 51 85 50 85 C49 85 47 85.5 44 86 C34 88 20 72 21.4 54 C23 36 42 34 50 40 Z" fill="#FF9AA6" stroke={OUTLINE} stroke-width={STROKE} />
    <path
      d="M50 40 C58 34 77 36 78.6 54 C79 58 78.6 61 77.4 63.4 C76 66 73.2 65.2 72.8 62.6 C72.2 60 69.6 60 69 63 C68.2 68.4 63.4 68.4 63 64 C62.6 60.8 59.6 60.4 58.8 63.2 C57.8 67.4 53 67.8 52.4 63.4 C52 60.4 48.8 60 48 62.8 C47 66.6 42.4 66.4 42 62.8 C41.6 60 38.6 59.8 37.6 62.6 C36.6 65.6 32.2 66 31.8 62.6 C31.2 60 28.4 59.6 27.2 61.4 C25.4 64 22 62.6 21.8 59 C21.6 57.4 21.4 55.6 21.4 54 C23 36 42 34 50 40 Z"
      fill={CARAMEL}
      stroke={OUTLINE}
      stroke-width={FINE}
    />
    <g fill="#FFE7C2">
      <circle cx={38} cy={50} r={1.2} />
      <circle cx={60} cy={46} r={1.1} />
      <circle cx={68} cy={54} r={1.3} />
      <circle cx={47} cy={55} r={1} />
    </g>
    <Shine d="M28 52 Q30 44 37 41" />
    <Shine d="M30 72 Q31 76 34 79" w={1.8} opacity={0.5} />
    <g transform="translate(52 25)" fill={PINK} stroke={OUTLINE} stroke-width={1.6}>
      <path d="M0 0 C-3 -5 -10 -5 -10 -0.5 C-10 3.6 -3 3.4 0 0 Z" />
      <path d="M0 0 C3 -5 10 -5 10 -0.5 C10 3.6 3 3.4 0 0 Z" />
      <path d="M-1 1 L-4 7 M1 1 L4 7" fill="none" />
      <circle r={2.2} />
    </g>
  </g>
);

/* ------------------------------------------------------------------ */
/* Baked                                                               */
/* ------------------------------------------------------------------ */

const pawBiscuit: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={30} />
    <g transform="rotate(-8 50 56)">
      <Merged
        shapes={[
          { d: 'M50 45 C63 45 72 53 72 63 C72 73 62 79 50 79 C38 79 28 73 28 63 C28 53 37 45 50 45 Z' },
          { d: circleD(28, 45, 9) },
          { d: circleD(40.5, 32.5, 9.6) },
          { d: circleD(59.5, 32.5, 9.6) },
          { d: circleD(72, 45, 9) },
        ]}
        fill={COOKIE}
        line={STROKE}
      />
      <g fill={PINK} stroke={OUTLINE} stroke-width={1.5}>
        <path d="M50 54 C58 54 63 59 63 64.6 C63 70 57 72 50 72 C43 72 37 70 37 64.6 C37 59 42 54 50 54 Z" />
        <ellipse cx={28.4} cy={45.4} rx={4} ry={4.6} />
        <ellipse cx={40.8} cy={33} rx={4.2} ry={4.8} />
        <ellipse cx={59.2} cy={33} rx={4.2} ry={4.8} />
        <ellipse cx={71.6} cy={45.4} rx={4} ry={4.6} />
      </g>
      <g fill={COOKIE_DARK}>
        <circle cx={33} cy={62} r={1} />
        <circle cx={67} cy={62} r={1} />
        <circle cx={50} cy={48.6} r={1} />
      </g>
      <Shine d="M33.6 29.4 Q35.4 26.4 38.6 25.6" w={1.8} />
      <Shine d="M42 57.6 Q45 56 48 55.8" w={1.6} />
    </g>
  </g>
);

const boneBiscuit: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={32} />
    <g transform="translate(50 54) rotate(-22)">
      <Merged
        shapes={[{ d: 'M-22 -7 L22 -7 L22 7 L-22 7 Z' }, { d: circleD(-24, -7.6, 8) }, { d: circleD(-24, 7.6, 8) }, { d: circleD(24, -7.6, 8) }, { d: circleD(24, 7.6, 8) }]}
        fill="#F4CB94"
        line={STROKE}
      />
      <g fill={COOKIE_DARK}>
        <circle cx={-10} cy={0} r={1.3} />
        <circle cx={0} cy={0} r={1.3} />
        <circle cx={10} cy={0} r={1.3} />
      </g>
      <Shine d="M-15 -4 L6 -4" w={2} />
      <Shine d="M-29 -11 Q-28 -14 -25 -15" w={1.8} />
    </g>
  </g>
);

const pbCookie: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={30} />
    <Blob
      circles={[[46, 50, 28], ...Array.from({ length: 10 }, (_, i): Circle => [46 + Math.cos((i / 10) * Math.PI * 2) * 25, 50 + Math.sin((i / 10) * Math.PI * 2) * 25, 6.4])]}
      fill="#EBB77A"
    />
    <g fill="none" stroke="#C98E52" stroke-width={2.4}>
      <path d="M31 43 L53 65 M36 37 L59 60 M42 32 L64 54" />
      <path d="M34 58 L56 35 M40 64 L62 41 M29 51 L48 32" opacity={0.75} />
    </g>
    <Shine d="M25 40 Q28 32 36 28" />
    <g transform="translate(79 79) rotate(-28)">
      <path d="M-10 0 C-10 -5 -6 -6.4 -3.4 -5 C-1.6 -4 1.6 -4 3.4 -5 C6 -6.4 10 -5 10 0 C10 5 6 6.4 3.4 5 C1.6 4 -1.6 4 -3.4 5 C-6 6.4 -10 5 -10 0 Z" fill="#F3D7A8" stroke={OUTLINE} stroke-width={FINE} />
      <g fill="none" stroke="#D9B07A" stroke-width={1.2}>
        <path d="M-6.6 -2.4 L-5.4 2.4 M5.4 -2.4 L6.6 2.4 M-1 -1.6 L1 1.6" />
      </g>
    </g>
  </g>
);

const cookie: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={30} />
    <path
      d="M78.98 47.24 A30 30 0 1 1 57.76 26.02 A7 7 0 0 0 62.4 35.2 A6.4 6.4 0 0 0 70.8 39.6 A7 7 0 0 0 78.98 47.24 Z"
      fill={COOKIE}
      stroke={OUTLINE}
      stroke-width={STROKE}
    />
    <g fill={CHOCO} stroke={OUTLINE} stroke-width={1.2}>
      <path d="M36 38 C39 36 42 38 42 41 C42 44 38 45 36 43.6 C34 42.4 33.6 39.6 36 38 Z" />
      <path d="M55 48 C58.6 46.6 61.6 49 61 52 C60.4 55 56.4 55.6 54.4 53.6 C52.6 51.8 53 49 55 48 Z" />
      <path d="M31 58 C33.6 56.6 36.4 58.4 36 61 C35.6 63.6 32.4 64 30.8 62.4 C29.4 61 29.4 58.8 31 58 Z" />
      <path d="M45 67 C48 65.4 51.6 67.4 51 70.6 C50.4 73.4 46.4 74 44.6 71.8 C43.2 70 43.4 67.8 45 67 Z" />
      <path d="M64 64 C66.6 62.8 69 64.6 68.6 67 C68.2 69.4 65.2 69.8 63.8 68.2 C62.6 66.8 62.6 64.8 64 64 Z" />
      <path d="M46 44 C47.8 43.2 49.6 44.4 49.2 46.2 C48.8 47.8 46.8 48.2 45.8 47 C45 46 45 44.6 46 44 Z" />
    </g>
    <g fill="#E3A96A">
      <circle cx={40} cy={52} r={0.9} />
      <circle cx={57} cy={62} r={0.9} />
      <circle cx={37} cy={72} r={0.8} />
      <circle cx={70} cy={55} r={0.8} />
    </g>
    <g fill={COOKIE} stroke={OUTLINE} stroke-width={1.3}>
      <circle cx={82} cy={33} r={2.2} />
      <circle cx={86.6} cy={40} r={1.5} />
    </g>
    <Shine d="M25 50 Q27 40 35 34" />
  </g>
);

const gingerbread: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={28} />
    <Merged
      shapes={[
        { d: circleD(50, 29, 14) },
        { d: 'M50 40 C60 40 64.6 47 64.6 57 C64.6 67 60 72 50 72 C40 72 35.4 67 35.4 57 C35.4 47 40 40 50 40 Z' },
        { d: 'M38 46 C31 45 22 48 20 53 C18.6 57 22 60 26 58.6 C30 57.4 34 55 38 54 Z' },
        { d: 'M62 46 C69 45 78 48 80 53 C81.4 57 78 60 74 58.6 C70 57.4 66 55 62 54 Z' },
        { d: 'M41 66 C37 72 33 79 34 84 C35 88 40.6 88.6 42.6 85 C44.6 81 46 75 48 70 Z' },
        { d: 'M59 66 C63 72 67 79 66 84 C65 88 59.4 88.6 57.4 85 C55.4 81 54 75 52 70 Z' },
      ]}
      fill="#D9A06E"
      line={STROKE}
    />
    <g fill="none" stroke={CREAM} stroke-width={1.8}>
      <path d="M23 51 L25 55 L27 51.4 L29 55.4" />
      <path d="M77 51 L75 55 L73 51.4 L71 55.4" />
      <path d="M35.6 81.6 L38 84.6 L40.2 81.8 L42.4 84.8" />
      <path d="M64.4 81.6 L62 84.6 L59.8 81.8 L57.6 84.8" />
      <path d="M44.4 33.6 Q50 38 55.6 33.6" />
    </g>
    <g fill={EYE}>
      <ellipse cx={44.6} cy={26.4} rx={2} ry={2.5} />
      <ellipse cx={55.4} cy={26.4} rx={2} ry={2.5} />
    </g>
    <g fill="#fff">
      <circle cx={45.3} cy={25.4} r={0.8} />
      <circle cx={56.1} cy={25.4} r={0.8} />
    </g>
    <g fill={BLUSH} opacity={0.7}>
      <ellipse cx={40.4} cy={31.6} rx={2.6} ry={1.6} />
      <ellipse cx={59.6} cy={31.6} rx={2.6} ry={1.6} />
    </g>
    <g stroke={OUTLINE} stroke-width={1.4}>
      <circle cx={50} cy={50} r={3} fill={PINK} />
      <circle cx={50} cy={60} r={3} fill="#B3E6D6" />
    </g>
    <Shine d="M39.6 21.6 Q42 17.6 46 16.6" w={2} />
  </g>
);

const heartCookies: ItemRenderer = () => {
  const cookie = (x: number, y: number, rot: number, s: number, icing: string, piping: string) => (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d={HEART} fill={COOKIE} stroke={OUTLINE} stroke-width={f(STROKE / s)} stroke-linejoin="round" />
      <path d={HEART} transform="translate(0 -0.6) scale(0.76)" fill={icing} stroke={OUTLINE} stroke-width={f(1.2 / s)} stroke-linejoin="round" />
      <path d={HEART} transform="translate(0 -0.6) scale(0.6)" fill="none" stroke={piping} stroke-width={f(1.6 / s)} stroke-dasharray="0.1 2.6" stroke-linecap="round" />
    </g>
  );
  return (
    <g stroke-linecap="round">
      <Shadow rx={32} />
      {cookie(63, 44, 16, 1.25, PINK, '#FFFFFF')}
      {cookie(39, 62, -12, 1.45, CREAM, '#FF9FB8')}
      <path d={HEART} transform="translate(39 61) rotate(-12) scale(0.26)" fill="#FF9FB8" />
      <Sprinkles at={[[58, 36, 30], [69, 42, -20], [62, 50, 70]]} offset={4} />
      <Shine d="M23.4 51 Q24.6 46.6 28.6 45.2" w={1.8} />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Sweets                                                              */
/* ------------------------------------------------------------------ */

const donut: ItemRenderer = () => {
  const n = 64;
  const icing = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 25.6 + 2.4 * Math.sin(a * 7) + (Math.sin(a * 7) > 0.6 ? 1.6 : 0);
    return `${f(50 + Math.cos(a) * r)} ${f(52 + Math.sin(a) * r)}`;
  });
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <Shadow rx={30} />
      <path d={`${circleD(50, 55, 31)} ${circleD(50, 55, 9)}`} fill={COOKIE} fill-rule="evenodd" stroke={OUTLINE} stroke-width={STROKE} />
      <path d={`M${icing.join(' L')} Z ${circleD(50, 52, 12)}`} fill={PINK} fill-rule="evenodd" stroke={OUTLINE} stroke-width={FINE} />
      <Sprinkles
        at={[
          [50, 33, 10],
          [63, 37, -40],
          [70, 48, 80],
          [68, 61, 20],
          [58, 70, -60],
          [44, 71, 30],
          [33, 64, -20],
          [30, 51, 70],
          [36, 39, -30],
          [42, 32, 60],
        ]}
      />
      <Shine d="M29 44 Q32 36 39 32" />
    </g>
  );
};

const macarons: ItemRenderer = () => {
  const macaron = (x: number, y: number, shell: string, filling: string, s = 1, face = false) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
      <path d="M-19 3 C-19 9 -10 12 0 12 C10 12 19 9 19 3 Z" fill={shell} stroke-width={f(STROKE / s)} />
      <rect x={-18} y={-3.6} width={36} height={7.4} rx={3.6} fill={filling} stroke-width={f(FINE / s)} />
      <path d="M-19 -2.4 C-19 -10 -10 -14.6 0 -14.6 C10 -14.6 19 -10 19 -2.4 Z" fill={shell} stroke-width={f(STROKE / s)} />
      <path d="M-16.6 -3.6 Q-15 -5 -13.4 -3.6 Q-11.8 -5 -10.2 -3.6 M10.2 -3.6 Q11.8 -5 13.4 -3.6 Q15 -5 16.6 -3.6" fill="none" stroke-width={1} opacity={0.5} />
      <Shine d="M-12 -9.6 Q-8.6 -12.2 -4 -12.6" w={f(1.8 / s)} />
      {face && <Face x={0} y={-6.6} s={0.75} gap={6} />}
    </g>
  );
  return (
    <g>
      <Shadow rx={26} />
      {macaron(50, 74, '#B3E6D6', CREAM, 1.12)}
      {macaron(48, 53, PINK, '#FF9FB8', 1.06)}
      {macaron(52, 33, '#D6C8F8', CREAM, 1, true)}
    </g>
  );
};

const candyCorn: ItemRenderer = () => {
  /** A kernel: white tip, peach middle, butter base, with straight sides so the bands line up. */
  const kernel = (x: number, y: number, rot: number, s: number, face = false) => {
    const half = (yy: number) => 1.6 + (18.4 * (yy + 27)) / 51;
    const band = (a: number, b: number) => `M${f(-half(a))} ${a} L${f(half(a))} ${a} L${f(half(b))} ${b} L${f(-half(b))} ${b} Z`;
    const outline = 'M-1.6 -27 Q0 -31 1.6 -27 L20 24 Q21 33 0 33 Q-21 33 -20 24 Z';
    return (
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} stroke-linejoin="round" stroke-linecap="round">
        <path d={outline} fill="#FFE08A" />
        <path d={band(-8, 10)} fill="#FFB27A" />
        <path d={band(-31, -8)} fill="#FFFDF7" />
        <path d="M-1.6 -27 Q0 -31 1.6 -27" fill="#FFFDF7" />
        <path d={outline} fill="none" stroke={OUTLINE} stroke-width={f(STROKE / s)} />
        <Shine d="M-6 -12 Q-7.4 -6 -8.4 -1" w={f(2 / s)} />
        {face && <Face x={0} y={16} s={0.85} gap={5.6} />}
      </g>
    );
  };
  return (
    <g>
      <Shadow rx={32} />
      {kernel(71, 62, 24, 0.7)}
      {kernel(43, 54, -10, 1, true)}
    </g>
  );
};

const candyCane: ItemRenderer = () => {
  const d = 'M58 86 L58 36 C58 23 49 17 41 17 C32 17 26 24 26 32';
  return (
    <g stroke-linecap="round" stroke-linejoin="round">
      <Shadow cx={58} rx={14} />
      <path d={d} fill="none" stroke={OUTLINE} stroke-width={16.8} />
      <path d={d} fill="none" stroke="#FFFFFF" stroke-width={12} />
      <path d={d} fill="none" stroke="#FF9FB8" stroke-width={12} stroke-dasharray="5.6 6.4" stroke-linecap="butt" />
      <path d="M54 80 L54 44" fill="none" stroke="#fff" stroke-width={2} opacity={0.8} />
      <g transform="translate(58 58)" stroke={OUTLINE} stroke-width={1.6}>
        <path d="M-2 2 L-7 12 L-3.6 11 L-2 14 Z M2 2 L7 12 L3.6 11 L2 14 Z" fill="#8FCFB6" />
        <path d="M0 0 C-4 -7 -14 -7 -14 -1 C-14 5 -4 4 0 0 Z" fill="#B3E6D6" />
        <path d="M0 0 C4 -7 14 -7 14 -1 C14 5 4 4 0 0 Z" fill="#B3E6D6" />
        <ellipse rx={3.4} ry={3.8} fill="#8FCFB6" />
      </g>
      <path d={SPARKLE_D} transform="translate(80 26) scale(1.3)" fill="#FFE593" stroke="#fff" stroke-width={0.6} />
    </g>
  );
};

const konpeito: ItemRenderer = () => {
  const star = 'M0 -5.4 L1.6 -2 L5.2 -1.6 L2.6 1 L3.3 4.8 L0 3 L-3.3 4.8 L-2.6 1 L-5.2 -1.6 L-1.6 -2 Z';
  const candies: [number, number, number, string][] = [
    [38, 80, 10, '#FFB3C7'],
    [50, 81, -14, '#FFE593'],
    [62, 79, 20, '#B3E6D6'],
    [44, 71, -8, '#D6C8F8'],
    [57, 70, 30, '#BBDCF6'],
    [37, 62, 18, '#FFE593'],
    [50, 61, -24, '#FFB3C7'],
    [63, 61, 6, '#D6C8F8'],
  ];
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <Shadow rx={30} />
      <path d="M30 45 Q28 45 28 49 L28 80 Q28 88 36 88 L64 88 Q72 88 72 80 L72 49 Q72 45 70 45 Z" fill="#F4F0FF" stroke={OUTLINE} stroke-width={STROKE} />
      {candies.map(([x, y, rot, fill], i) => (
        <path key={i} d={star} transform={`translate(${x} ${y}) rotate(${rot}) scale(1.2)`} fill={fill} stroke={OUTLINE} stroke-width={1.2} />
      ))}
      <path d="M30 45 Q28 45 28 49 L28 80 Q28 88 36 88 L64 88 Q72 88 72 80 L72 49 Q72 45 70 45 Z" fill="#FFFFFF" opacity={0.18} />
      <Shine d="M33 52 L33 74" w={2.6} opacity={0.8} />
      <Shine d="M67 56 L67 62" w={2} opacity={0.6} />
      <rect x={31} y={36} width={38} height={10} rx={3.4} fill={PINK} stroke={OUTLINE} stroke-width={STROKE} />
      <path d="M38 36.8 L38 45.2 M46 36.8 L46 45.2 M54 36.8 L54 45.2 M62 36.8 L62 45.2" stroke="#FF9FB8" stroke-width={2.4} />
      <rect x={31} y={36} width={38} height={10} rx={3.4} fill="none" stroke={OUTLINE} stroke-width={STROKE} />
      <path d={star} transform="translate(20 84) rotate(-18) scale(1.1)" fill="#FFE593" stroke={OUTLINE} stroke-width={1.2} />
      <path d={star} transform="translate(80 86) rotate(24)" fill="#FFB3C7" stroke={OUTLINE} stroke-width={1.2} />
      <path d={SPARKLE_D} transform="translate(78 30) scale(1.2)" fill="#FFE593" stroke="#fff" stroke-width={0.6} />
    </g>
  );
};

const chocolates: ItemRenderer = () => {
  const cup = (x: number, y: number) => <circle cx={x} cy={y} r={8} fill="#FFE3EA" stroke={OUTLINE} stroke-width={1.2} stroke-dasharray="1.6 1.2" />;
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <Shadow rx={34} />
      <path d={HEART} transform="translate(50 50) scale(2.3)" fill={PINK} stroke={OUTLINE} stroke-width={f(STROKE / 2.3)} />
      <path d={HEART} transform="translate(50 49) scale(1.9)" fill="#FFE3EA" stroke={OUTLINE} stroke-width={f(1.4 / 1.9)} />
      {cup(38, 36)}
      {cup(62, 36)}
      {cup(50, 52)}
      {cup(36, 55)}
      {cup(64, 55)}
      <circle cx={38} cy={36} r={6.2} fill={CHOCO} stroke={OUTLINE} stroke-width={FINE} />
      <path d="M34 35 Q36 33 38 35 Q40 37 42 35" fill="none" stroke="#C99A86" stroke-width={1.4} />
      <path d={HEART} transform="translate(62 37) scale(0.42)" fill="#FF9FB8" stroke={OUTLINE} stroke-width={f(FINE / 0.42)} />
      <circle cx={50} cy={52} r={6.2} fill="#FFF1DC" stroke={OUTLINE} stroke-width={FINE} />
      <path d="M46 51 L48 53.4 L50 51 L52 53.4 L54 51" fill="none" stroke={CHOCO} stroke-width={1.4} />
      <circle cx={36} cy={55} r={6} fill={CHOCO} stroke={OUTLINE} stroke-width={FINE} />
      <circle cx={36} cy={53.6} r={1.4} fill={PINK} />
      <circle cx={64} cy={55} r={6} fill="#B98A6E" stroke={OUTLINE} stroke-width={FINE} />
      <path d="M61 55 L67 55" stroke={CREAM} stroke-width={1.4} />
      <g fill="#fff" opacity={0.7}>
        <circle cx={35.6} cy={33.6} r={1.2} />
        <circle cx={47.6} cy={49.6} r={1.2} />
        <circle cx={33.6} cy={52.6} r={1.1} />
        <circle cx={61.6} cy={52.6} r={1.1} />
      </g>
      <Shine d="M19.6 26 Q20.8 18.6 27 16.6" />
      <path d={SPARKLE_D} transform="translate(84 18) scale(1.1)" fill="#FFE593" stroke="#fff" stroke-width={0.6} />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Desserts                                                            */
/* ------------------------------------------------------------------ */

const pudding: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx={50} cy={83} rx={37} ry={8.4} fill="#FFFFFF" stroke={OUTLINE} stroke-width={STROKE} />
    <ellipse cx={50} cy={82} rx={30} ry={5.4} fill="none" stroke="#E6E0EE" stroke-width={1.6} />
    <path d="M28 81 C28 70 31 53 36 45 Q38 42 42 42 L58 42 Q62 42 64 45 C69 53 72 70 72 81 C72 84.4 64 86 50 86 C36 86 28 84.4 28 81 Z" fill="#FFE08A" stroke={OUTLINE} stroke-width={STROKE} />
    <path
      d="M36 45 Q38 42 42 42 L58 42 Q62 42 64 45 C65.4 47.4 66 49.4 66.2 51 C66.4 53.8 63.2 54 62.6 51.4 C62 49.4 59.8 49.2 59.2 52 C58.6 56.2 54.8 56.2 54.4 52.2 C54.2 49.8 51.4 49.4 50.4 51 C49.4 52.6 46.4 52.8 45.6 50.6 C44.8 48.8 42.4 49 41.8 51.8 C41.2 55.4 37.4 55 37.2 51.4 C37.1 49.6 35.6 48.8 34.6 50 C34.8 48.2 35.3 46.5 36 45 Z"
      fill="#C98A56"
      stroke={OUTLINE}
      stroke-width={FINE}
    />
    <Blob
      circles={[
        [50, 39.4, 6],
        [44.6, 41.4, 4.4],
        [55.4, 41.4, 4.4],
        [50, 34, 3.6],
      ]}
      fill={CREAM}
      line={FINE}
    />
    <path d="M52 30 C52.4 24 56 20.6 60 19.8" fill="none" stroke={OUTLINE} stroke-width={1.8} />
    <circle cx={51.4} cy={29.4} r={4.4} fill={BERRY} stroke={OUTLINE} stroke-width={FINE} />
    <circle cx={50} cy={27.8} r={1.1} fill="#fff" />
    <Shine d="M32.6 72 Q33 62 35.6 56" />
    <Face x={50} y={66.6} />
  </g>
);

const shortcake: ItemRenderer = () => {
  const w = wedgeFaces({ tip: [13, 54], back: [52, 30], side: [86, 42], depth: 32 });
  const slice = (x: number, y: number) => (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-4.6 0 C-4.6 -3.4 -2 -4.6 0 -4.6 C2 -4.6 4.6 -3.4 4.6 0 Z" fill={BERRY} stroke={OUTLINE} stroke-width={1.3} />
      <path d="M-2.4 -0.2 C-2.4 -1.8 -1 -2.4 0 -2.4 C1 -2.4 2.4 -1.8 2.4 -0.2 Z" fill="#FFD3DB" />
    </g>
  );
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <Shadow rx={36} />
      <path d={w.front} fill="#FFE3A8" />
      <path d={w.band(0, 0.16)} fill={CREAM} />
      <path d={w.band(0.44, 0.64)} fill={CREAM} />
      {slice(28, 71)}
      {slice(46, 68.4)}
      {slice(64, 65.8)}
      <path d={w.front} fill="none" stroke={OUTLINE} stroke-width={STROKE} />
      <path d={w.top} fill={CREAM} stroke={OUTLINE} stroke-width={STROKE} />
      <Blob
        circles={[
          [58, 33.6, 3.6],
          [65, 36, 3.6],
          [72, 38.4, 3.6],
          [79, 40.8, 3.6],
        ]}
        fill={CREAM}
        line={FINE}
      />
      <g transform="translate(46 30) rotate(-8)">
        <path d="M0 14 C-6 13 -11 6 -10.6 -1 C-10.2 -6 -5 -8.4 0 -7 C5 -8.4 10.2 -6 10.6 -1 C11 6 6 13 0 14 Z" fill={BERRY} stroke={OUTLINE} stroke-width={FINE} />
        <Seeds at={[[-5, 0], [4, -1], [0, 6], [-3, 9]]} />
        <Shine d="M-7.4 -1.4 Q-7 -4.4 -4 -5.4" w={1.6} />
        <Calyx x={0} y={-7} s={0.62} />
      </g>
      <Shine d="M18 58 L44 50" w={1.6} opacity={0.6} />
    </g>
  );
};

const pumpkinPie: ItemRenderer = () => {
  const w = wedgeFaces({ tip: [13, 58], back: [54, 34], side: [86, 46], depth: 20 });
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <Shadow rx={36} />
      <path d={w.front} fill="#FFA468" />
      <path d={w.band(0.62, 1)} fill={COOKIE} />
      <path d={w.front} fill="none" stroke={OUTLINE} stroke-width={STROKE} />
      <path d={w.band(0.62, 0.62)} fill="none" stroke={OUTLINE} stroke-width={1.4} />
      <path d={w.top} fill="#FFB27A" stroke={OUTLINE} stroke-width={STROKE} />
      <Blob
        circles={Array.from({ length: 6 }, (_, i): Circle => [54 + i * 6.4, 35 + i * 2.3, 4.4])}
        fill={COOKIE}
        line={FINE}
      />
      <Blob
        circles={[
          [52, 44, 7],
          [45.4, 46.4, 5],
          [58.6, 46.4, 5],
          [51, 37.6, 5],
          [53.4, 32, 3],
        ]}
        fill={CREAM}
        line={FINE}
      />
      <path d="M46 45 Q51 48 57 44.6 M48 40 Q52 42 55 39" fill="none" stroke="#EFE6DA" stroke-width={1.4} />
      <g fill="#C98A56">
        <circle cx={30} cy={52} r={0.9} />
        <circle cx={38} cy={55} r={0.9} />
        <circle cx={66} cy={51} r={0.8} />
        <circle cx={48} cy={43.4} r={0.7} />
        <circle cx={55} cy={40} r={0.7} />
      </g>
      <Shine d="M20 60 L38 55" w={1.8} opacity={0.6} />
    </g>
  );
};

const cheese: ItemRenderer = () => {
  const w = wedgeFaces({ tip: [13, 56], back: [56, 32], side: [87, 45], depth: 26 });
  const hole = (x: number, y: number, rx: number, ry: number) => (
    <g>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#F2BE3A" stroke={OUTLINE} stroke-width={1.4} />
      <path d={`M${f(x - rx * 0.6)} ${f(y + ry * 0.4)} Q${x} ${f(y + ry * 0.9)} ${f(x + rx * 0.6)} ${f(y + ry * 0.4)}`} fill="none" stroke="#FFE08A" stroke-width={1.2} />
    </g>
  );
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <Shadow rx={36} />
      <path d={w.front} fill="#FFD65C" stroke={OUTLINE} stroke-width={STROKE} />
      <path d={w.top} fill="#FFE9A0" stroke={OUTLINE} stroke-width={STROKE} />
      {hole(30, 66, 4.6, 3.8)}
      {hole(52, 67, 3.4, 2.8)}
      {hole(70, 58, 5.2, 4.2)}
      {hole(44, 77, 2.4, 2)}
      {hole(62, 42, 4.2, 2.2)}
      {hole(40, 48, 2.8, 1.5)}
      <Shine d="M20 56 L46 43" w={2} opacity={0.7} />
    </g>
  );
};

const iceCream: ItemRenderer = () => {
  /** A scoop with a drippy bottom edge, centered at (cx, cy). */
  const scoop = (cx: number, cy: number, r: number, fill: string) => (
    <path
      d={`M${f(cx - r)} ${cy} C${f(cx - r)} ${f(cy - r * 1.3)} ${f(cx + r)} ${f(cy - r * 1.3)} ${f(cx + r)} ${cy} Q${f(cx + r * 0.86)} ${f(cy + r * 0.34)} ${f(cx + r * 0.62)} ${f(cy + r * 0.2)} Q${f(cx + r * 0.5)} ${f(cy + r * 0.66)} ${f(cx + r * 0.26)} ${f(cy + r * 0.3)} Q${f(cx)} ${f(cy + r * 0.18)} ${f(cx - r * 0.18)} ${f(cy + r * 0.3)} Q${f(cx - r * 0.36)} ${f(cy + r * 0.8)} ${f(cx - r * 0.58)} ${f(cy + r * 0.3)} Q${f(cx - r * 0.82)} ${f(cy + r * 0.4)} ${f(cx - r)} ${cy} Z`}
      fill={fill}
      stroke={OUTLINE}
      stroke-width={STROKE}
    />
  );
  const L = (t: number) => [34 + 15 * t, 55 + 36 * t] as const;
  const R = (t: number) => [66 - 15 * t, 55 + 36 * t] as const;
  const lines = [0.12, 0.38, 0.64].flatMap((t) => [
    `M${f(L(t)[0])} ${f(L(t)[1])} L${f(R(t + 0.3)[0])} ${f(R(t + 0.3)[1])}`,
    `M${f(R(t)[0])} ${f(R(t)[1])} L${f(L(t + 0.3)[0])} ${f(L(t + 0.3)[1])}`,
  ]);
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <Shadow cx={50} cy={92} rx={12} />
      <path d="M33 55 L67 55 L52.4 90 Q50 94 47.6 90 Z" fill="#F4C991" stroke={OUTLINE} stroke-width={STROKE} />
      <path d={lines.join(' ')} fill="none" stroke="#DDA86C" stroke-width={1.6} />
      <path d="M33 55 L67 55 L52.4 90 Q50 94 47.6 90 Z" fill="none" stroke={OUTLINE} stroke-width={STROKE} />
      {scoop(50, 53, 19, PINK)}
      {scoop(50, 36, 15.4, '#B3E6D6')}
      <Sprinkles at={[[42, 28, 30], [50, 24, -20], [58, 29, 60], [46, 33, -50], [56, 35, 10]]} />
      <path d="M51 20 C51 14 54 10 58 9" fill="none" stroke={OUTLINE} stroke-width={1.8} />
      <circle cx={50} cy={19.6} r={4.6} fill={BERRY} stroke={OUTLINE} stroke-width={FINE} />
      <circle cx={48.6} cy={18} r={1.1} fill="#fff" />
      <Shine d="M36 32 Q37 26 41 23.6" w={2} />
      <Shine d="M33.4 48 Q34.4 42 38.6 39" w={2} />
    </g>
  );
};

const shaveIce: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={26} />
    <path d="M66 30 L78 8" fill="none" stroke={OUTLINE} stroke-width={7.4} />
    <path d="M66 30 L78 8" fill="none" stroke={PINK} stroke-width={3} />
    <path d="M24 61 A26 35 0 0 1 41 28.2 C43 38 39 50 41.4 61 Z" fill={PINK} />
    <path d="M41 28.2 A26 35 0 0 1 59 28.2 C57 38 61 50 58.6 61 L41.4 61 C39 50 43 38 41 28.2 Z" fill="#FFE593" />
    <path d="M59 28.2 A26 35 0 0 1 76 61 L58.6 61 C61 50 57 38 59 28.2 Z" fill="#BBDCF6" />
    <path d="M24 61 A26 35 0 0 1 76 61 Z" fill="none" stroke={OUTLINE} stroke-width={STROKE} />
    <g fill="#fff" opacity={0.85}>
      <circle cx={34} cy={42} r={1.4} />
      <circle cx={48} cy={34} r={1.2} />
      <circle cx={63} cy={40} r={1.4} />
      <circle cx={55} cy={50} r={1.1} />
      <circle cx={40} cy={54} r={1.2} />
      <circle cx={69} cy={53} r={1.1} />
    </g>
    <Shine d="M30 48 Q31 40 36 35" />
    <path d="M27 59 L73 59 L68 87 Q67.4 90.6 63.6 90.6 L36.4 90.6 Q32.6 90.6 32 87 Z" fill="#FFFFFF" stroke={OUTLINE} stroke-width={STROKE} />
    <path d="M28.6 67 L71.4 67 L70.4 73 L29.6 73 Z" fill="#BBDCF6" />
    <path d="M27 59 L73 59 L68 87 Q67.4 90.6 63.6 90.6 L36.4 90.6 Q32.6 90.6 32 87 Z" fill="none" stroke={OUTLINE} stroke-width={STROKE} />
    <g transform="translate(50 81)" fill="#FF9FB8" stroke={OUTLINE} stroke-width={1}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0} cy={-3} rx={2} ry={3} transform={`rotate(${a})`} />
      ))}
      <circle r={1.4} fill="#FFE593" />
    </g>
  </g>
);

const pupCup: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={24} />
    <path d="M31 60 L69 60 L64.6 86.4 Q64 90 60.4 90 L39.6 90 Q36 90 35.4 86.4 Z" fill="#BBDCF6" stroke={OUTLINE} stroke-width={STROKE} />
    <g fill="#fff">
      <ellipse cx={50} cy={78} rx={4.6} ry={3.8} />
      <circle cx={43.6} cy={72.4} r={1.9} />
      <circle cx={48} cy={69.6} r={1.9} />
      <circle cx={52} cy={69.6} r={1.9} />
      <circle cx={56.4} cy={72.4} r={1.9} />
    </g>
    <g transform="translate(67 35) rotate(38)">
      <Merged shapes={[{ d: 'M-8 -3 L8 -3 L8 3 L-8 3 Z' }, { d: circleD(-9, -3.2, 3.6) }, { d: circleD(-9, 3.2, 3.6) }, { d: circleD(9, -3.2, 3.6) }, { d: circleD(9, 3.2, 3.6) }]} fill="#F4CB94" line={FINE} />
    </g>
    <Blob
      circles={[
        [33, 56, 7],
        [42, 54, 8],
        [55, 54, 8],
        [66, 56, 7],
        [38, 45.6, 7],
        [50, 44, 8.2],
        [61, 46, 7],
        [44, 36, 6.2],
        [54, 35, 6.4],
        [49, 27.4, 4.8],
        [52.4, 22.4, 2.8],
      ]}
      fill={CREAM}
    />
    <path d="M37 50 Q50 55 63 50 M42 41 Q50 44 58 40.6 M46 32.6 Q50 34 53 32" fill="none" stroke="#EDE3D6" stroke-width={1.6} />
    <path d="M29 58 L71 58 L70.6 61.4 L29.4 61.4 Z" fill="#D8EBFB" stroke={OUTLINE} stroke-width={FINE} />
    <Shine d="M34 50 Q35 44 39 41" w={2} />
  </g>
);

/* ------------------------------------------------------------------ */
/* Drinks                                                              */
/* ------------------------------------------------------------------ */

const strawberryMilk: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={24} />
    <path d="M59 29 L67 9" fill="none" stroke={OUTLINE} stroke-width={7.6} />
    <path d="M59 29 L67 9" fill="none" stroke="#FFFFFF" stroke-width={3.2} />
    <path d="M59 29 L67 9" fill="none" stroke="#FF9FB8" stroke-width={3.2} stroke-dasharray="2.4 2.4" stroke-linecap="butt" />
    <rect x={36} y={23} width={28} height={7} rx={1.8} fill="#FFC4D3" stroke={OUTLINE} stroke-width={STROKE} />
    <path d="M31 46 L37.6 29.4 L62.4 29.4 L69 46 Z" fill="#FFDCE5" stroke={OUTLINE} stroke-width={STROKE} />
    <rect x={31} y={45} width={38} height={43} rx={3.6} fill="#FFC4D3" stroke={OUTLINE} stroke-width={STROKE} />
    <rect x={36} y={54} width={28} height={27} rx={6} fill="#FFFFFF" stroke={OUTLINE} stroke-width={FINE} />
    <g transform="translate(50 67.4) scale(0.34)">
      <path d="M0 26 C-12 25 -24 13 -23 -1 C-22 -11 -12 -16 0 -13 C12 -16 22 -11 23 -1 C24 13 12 25 0 26 Z" fill={BERRY} stroke={OUTLINE} stroke-width={f(FINE / 0.34)} />
      <Calyx x={0} y={-13} s={1} />
    </g>
    <Shine d="M34.6 50 L34.6 60" w={2} />
    <Shine d="M36 42 L39 34" w={1.6} opacity={0.6} />
  </g>
);

const boba: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={22} />
    <path d="M55 30 L62 6" fill="none" stroke={OUTLINE} stroke-width={10} />
    <path d="M55 30 L62 6" fill="none" stroke={PINK} stroke-width={5.4} />
    <path d="M29 37 L71 37 L66 86 Q65.6 90 61.6 90 L38.4 90 Q34.4 90 34 86 Z" fill="#EACDAE" stroke={OUTLINE} stroke-width={STROKE} />
    <g fill="none" stroke="#C99A74" stroke-width={3} opacity={0.75}>
      <path d="M31 44 Q36 52 32.6 62" />
      <path d="M69 45 Q64 53 67.2 62" />
      <path d="M44 38.6 Q46 44 43 50" stroke-width={2.4} />
    </g>
    <g fill="#6E4E44">
      {[
        [40, 84],
        [47, 85],
        [54, 85],
        [61, 84],
        [43.6, 79],
        [50.4, 79.6],
        [57.4, 79],
        [38.4, 78.4],
        [62.4, 78.4],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={3.2} />
      ))}
    </g>
    <g fill="#fff" opacity={0.7}>
      <circle cx={39} cy={83} r={0.8} />
      <circle cx={49.4} cy={78.4} r={0.8} />
      <circle cx={56.4} cy={77.8} r={0.8} />
    </g>
    <path d="M26 37.6 C26 26 36 20 50 20 C64 20 74 26 74 37.6 Z" fill="#F7FBFF" stroke={OUTLINE} stroke-width={STROKE} />
    <rect x={24.6} y={35} width={50.8} height={5.4} rx={2.7} fill="#FFFFFF" stroke={OUTLINE} stroke-width={FINE} />
    <Shine d="M32 32 Q34 26 40 24" w={2} />
    <Shine d="M33.6 46 L36 72" w={2} opacity={0.5} />
    <Face x={50} y={58} />
  </g>
);

/** A cozy mug body with a handle; `children` sit on the drink's surface. */
function Mug({ body, surface, children }: { body: string; surface: string; children?: JSX.Element | JSX.Element[] }) {
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <path d="M66 52 C80 51 81 74 64 74" fill="none" stroke={OUTLINE} stroke-width={10.8} />
      <path d="M66 52 C80 51 81 74 64 74" fill="none" stroke={body} stroke-width={6} />
      <path d="M24 44 L70 44 L68 80 Q67.4 88 59 88 L35 88 Q26.6 88 26 80 Z" fill={body} stroke={OUTLINE} stroke-width={STROKE} />
      <ellipse cx={47} cy={45} rx={21.4} ry={4.6} fill={surface} stroke={OUTLINE} stroke-width={FINE} />
      {children}
      <Shine d="M30 52 L31.4 76" w={2.4} opacity={0.6} />
    </g>
  );
}

function Steam() {
  return (
    <g fill="none" stroke="#D9CCE6" stroke-width={2.6} stroke-linecap="round">
      <path d="M38 36 C34 32 42 28 38 24 C35 21 39 18 38 15" />
      <path d="M50 34 C46 30 54 26 50 22 C47 19 51 16 50 13" />
    </g>
  );
}

const hotCocoa: ItemRenderer = () => (
  <g>
    <Shadow rx={30} />
    <Steam />
    <Mug body="#FFC4D3" surface="#B98A6E">
      <g fill="#fff" opacity={0.9}>
        <circle cx={36} cy={60} r={2} />
        <circle cx={48} cy={68} r={2} />
        <circle cx={60} cy={58} r={2} />
        <circle cx={40} cy={78} r={2} />
        <circle cx={58} cy={78} r={2} />
      </g>
      <g stroke={OUTLINE} stroke-width={FINE}>
        <rect x={-4.6} y={-4.6} width={9.2} height={9.2} rx={2.6} transform="translate(38 42) rotate(-14)" fill="#FFFFFF" />
        <rect x={-4.6} y={-4.6} width={9.2} height={9.2} rx={2.6} transform="translate(58 42) rotate(10)" fill="#FFE3EA" />
        <rect x={-4.6} y={-4.6} width={9.2} height={9.2} rx={2.6} transform="translate(48 38) rotate(22)" fill="#FFFFFF" />
      </g>
    </Mug>
  </g>
);

const honeyMilk: ItemRenderer = () => (
  <g>
    <Shadow rx={30} />
    <Steam />
    <Mug body="#D6C8F8" surface="#FFFAF0">
      <path d="M40 45 C40 43 44 42.4 47 43.4 C50 44.4 50 46.6 47 47" fill="none" stroke="#FFD65C" stroke-width={2} stroke-linecap="round" />
      <path d={HEART} transform="translate(47 66) scale(0.42)" fill={PINK} stroke={OUTLINE} stroke-width={f(1.6 / 0.42)} stroke-linejoin="round" />
    </Mug>
    <g stroke-linejoin="round" stroke-linecap="round">
      <path d="M62 36 L84 12" fill="none" stroke={OUTLINE} stroke-width={7} />
      <path d="M62 36 L84 12" fill="none" stroke="#F4DDBB" stroke-width={2.6} />
      <g transform="translate(62 36) rotate(-48)">
        <rect x={-9} y={-6.4} width={18} height={12.8} rx={6} fill={COOKIE} stroke={OUTLINE} stroke-width={FINE} />
        <path d="M-4 -6 L-4 6 M1 -6.4 L1 6.4 M6 -5.6 L6 5.6" stroke={COOKIE_DARK} stroke-width={1.6} />
      </g>
      <path d="M58.6 41 C60.4 43.6 61.4 45.2 61.4 46.8 A2.8 2.8 0 0 1 55.8 46.8 C55.8 45.2 56.8 43.6 58.6 41 Z" fill="#FFD65C" stroke={OUTLINE} stroke-width={1.4} />
    </g>
  </g>
);

/* ------------------------------------------------------------------ */
/* Savory                                                              */
/* ------------------------------------------------------------------ */

const fishCrackers: ItemRenderer = () => {
  const fish = (x: number, y: number, rot: number, s: number, flip = false) => (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`} stroke-linejoin="round" stroke-linecap="round">
      <Merged
        shapes={[{ d: 'M-12 0 C-12 -7 -4 -9.4 2 -9.4 C8.6 -9.4 13 -4.4 14 0 C13 4.4 8.6 9.4 2 9.4 C-4 9.4 -12 7 -12 0 Z' }, { d: 'M-9 0 L-20 -8 Q-22.6 0 -20 8 Z' }]}
        fill="#FFC47A"
        line={f(STROKE / s)}
      />
      <circle cx={6.4} cy={-2} r={1.5} fill={EYE} />
      <path d="M9.6 3 Q8 4.6 6 4" fill="none" stroke={OUTLINE} stroke-width={f(1.2 / s)} />
      <path d="M-3 -4 Q-0.6 0 -3 4 M1.4 -5 Q4 0 1.4 5" fill="none" stroke="#E9A15A" stroke-width={f(1.4 / s)} />
      <Shine d="M-6 -5.4 Q-2 -7.6 3 -7.6" w={f(1.6 / s)} />
    </g>
  );
  return (
    <g>
      <Shadow rx={32} />
      {fish(54, 44, -6, 1.05, true)}
      {fish(35, 66, -12, 1.1)}
      {fish(65, 72, 10, 1)}
    </g>
  );
};

const salmonSushi: ItemRenderer = () => (
  <g stroke-linejoin="round" stroke-linecap="round">
    <Shadow rx={34} />
    <path d="M19 66 C19 57 26 53 34 53 L66 53 C74 53 81 57 81 66 L81 73 C81 81 74 85 66 85 L34 85 C26 85 19 81 19 73 Z" fill={CREAM} stroke={OUTLINE} stroke-width={STROKE} />
    <g fill="none" stroke="#EDE5D8" stroke-width={1.4}>
      <path d="M27 76 q2 -1.6 4 0 M68 78 q2 -1.6 4 0 M72 68 q2 -1.6 4 0 M25 67 q2 -1.6 4 0" />
    </g>
    <path d="M15 57 C17 44 30 37 50 37 C70 37 83 44 85 55 C85.4 59.4 81.4 61.4 77.4 59.6 C66 55 34 55 24 61.4 C19.6 64 15 62 15 57 Z" fill="#FFA98C" stroke={OUTLINE} stroke-width={STROKE} />
    <g fill="none" stroke="#FFE3D6" stroke-width={2.6}>
      <path d="M28 44 Q34 50 32 56" />
      <path d="M44 39.6 Q50 46 48 54" />
      <path d="M60 39.6 Q66 46 64 54" />
      <path d="M74 44 Q79 49 78 55" />
    </g>
    <Shine d="M20 52 Q24 45 31 42" w={2} opacity={0.6} />
    <Face x={50} y={70} />
  </g>
);

/* ------------------------------------------------------------------ */

export const TREAT_ART: Record<string, ItemRenderer> = {
  'treat-strawberry': strawberry,
  'treat-biscuit': pawBiscuit,
  'treat-fish-crackers': fishCrackers,
  'treat-salmon-sushi': salmonSushi,
  'treat-strawberry-milk': strawberryMilk,
  'treat-clover': clover,
  'treat-cheese': cheese,
  'treat-bone-biscuit': boneBiscuit,
  'treat-pb-cookie': pbCookie,
  'treat-pup-cup': pupCup,
  'treat-cookie': cookie,
  'treat-pudding': pudding,
  'treat-donut': donut,
  'treat-boba': boba,
  'treat-daifuku': daifuku,
  'treat-macarons': macarons,
  'treat-shortcake': shortcake,
  'treat-honey-milk': honeyMilk,
  'treat-konpeito': konpeito,
  'treat-candy-corn': candyCorn,
  'treat-pumpkin-pie': pumpkinPie,
  'treat-caramel-apple': caramelApple,
  'treat-hot-cocoa': hotCocoa,
  'treat-gingerbread': gingerbread,
  'treat-candy-cane': candyCane,
  'treat-heart-cookies': heartCookies,
  'treat-chocolates': chocolates,
  'treat-choco-strawberry': chocoStrawberry,
  'treat-lettuce': lettuce,
  'treat-blueberries': blueberries,
  'treat-watermelon': watermelon,
  'treat-ice-cream': iceCream,
  'treat-shave-ice': shaveIce,
};
