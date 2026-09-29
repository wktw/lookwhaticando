/** Emblems for showing up, plants and the time of day. Real things: a sprout, a can, a sill, a lamp. */
import { circlePath } from '@/art/icons/shapes';
import { E, shade } from '../palette';
import { Detail, Flower, Leaf, Paw, Pot, type Emblem } from './kit';

/** The moon: a disc with a disc bitten out (computed offline, committed). */
const MOON = 'M19.11 9.14A13 13 0 1 0 33.4 25.9A11.2 11.2 0 0 1 19.11 9.14Z';

/** Heart-shaped pothos leaf with its base at the origin. */
const POTHOS = 'M0 0C-3-1.2-6-.6-6.8-4.6-7.6-8.8-3.8-12.2 0-14.6 3.8-12.2 7.6-8.8 6.8-4.6 6-.6 3-1.2 0 0Z';
const POTHOS_HALF = 'M0 0C3-1.2 6-.6 6.8-4.6 7.6-8.8 3.8-12.2 0-14.6 .8-9.6.8-4.8 0 0Z';
function Pothos({ x, y, a, s = 1, color = E.leaf }: { x: number; y: number; a: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d={POTHOS} fill={color} />
      <Detail>
        <path d={POTHOS_HALF} fill={shade(color)} />
      </Detail>
    </g>
  );
}

/** Points along the week garland (a quadratic from (4, 28) over (32, 6) to (60, 28)). */
const GARLAND = Array.from({ length: 7 }, (_, i) => {
  const t = i / 6;
  return { x: 4 + 56 * t, y: 28 - 44 * t + 44 * t * t };
});
const GARLAND_COLORS = [E.blush, E.paper, E.butter, E.blush, E.paper, E.butter, E.blush];

export const GROWTH_EMBLEMS: Record<string, Emblem> = {
  /** A first sprout: two seed leaves out of a mound of soil. */
  'first-checkin': () => (
    <g>
      <path d="M7 37c3.4-6 26.6-6 30 0z" fill={E.soil} />
      <path d="M22 34V21.6" fill="none" stroke={E.leafDeep} stroke-width={2.4} stroke-linecap="round" />
      <path d="M21.6 25.4C16.6 27.2 10.6 25 9 18.2c6.6-1.6 11.6 1.4 12.6 7.2z" fill={E.leaf} />
      <path d="M22.4 22.2C22.4 15 27.2 10 34.8 10.2c.2 7.4-4.8 12.2-12.4 12z" fill={E.leafLight} />
      <Detail>
        <path d="M21.6 25.4C16.6 27.2 10.6 25 9 18.2 13.4 20 17.6 22.4 21.6 25.4z" fill={shade(E.leaf)} />
        <path d="M22.4 22.2C26 17.6 30 13.6 34.8 10.2c.2 7.4-4.8 12.2-12.4 12z" fill={shade(E.leafLight)} />
      </Detail>
    </g>
  ),
  /** A perfect day: a full watering can, pouring. */
  'first-perfect-day': () => (
    <g>
      <path d="M11.4 21.4c0-7.8 13.2-7.8 13.2 0" fill="none" stroke={E.skyDeep} stroke-width={2.6} stroke-linecap="round" />
      <path d="M26 30.6l9.4-11.2 2.8 2.4-10 12.6z" fill={E.sky} />
      <rect x={33.8} y={15.4} width={7.4} height={3.8} rx={1.4} transform="rotate(40 37.5 17.3)" fill={E.skyDeep} />
      <path d="M8 21h19v10.2a4.4 4.4 0 0 1-4.4 4.4H12.4A4.4 4.4 0 0 1 8 31.2z" fill={E.sky} />
      <ellipse cx={17.5} cy={21} rx={9.5} ry={1.6} fill={E.skyDeep} />
      <Detail>
        <path d="M23 22.6h4v8.6a4.4 4.4 0 0 1-4 4.38z" fill={shade(E.sky)} />
        <g fill={E.skyDeep}>
          <ellipse cx={39.8} cy={24.2} rx={1.1} ry={1.7} />
          <ellipse cx={41.4} cy={29.6} rx={1.1} ry={1.7} />
          <ellipse cx={37.2} cy={29} rx={1.1} ry={1.7} />
        </g>
      </Detail>
    </g>
  ),
  /** A perfect week: seven day-flowers on one garland (a 64 × 40 box). */
  'perfect-week': () => (
    <g>
      <path d="M4 28Q32 6 60 28" fill="none" stroke={E.leafDeep} stroke-width={1.8} stroke-linecap="round" />
      <Detail>
        {GARLAND.slice(0, 6).map((p, i) => {
          const q = GARLAND[i + 1]!;
          const mx = (p.x + q.x) / 2;
          const my = (p.y + q.y) / 2 - 1.6;
          return <Leaf key={i} x={mx} y={my} a={i < 3 ? -40 : 40} len={5.4} width={2.4} />;
        })}
      </Detail>
      {GARLAND.map((p, i) => (
        <Flower key={i} x={p.x} y={p.y} r={4.8} color={GARLAND_COLORS[i]!} centre={GARLAND_COLORS[i] === E.butter ? E.blushDeep : E.butterDeep} />
      ))}
    </g>
  ),
  /** Ten tiny steps: two paw prints, walking up. */
  'checkins-10': () => (
    <g>
      <Paw x={14.4} y={30} a={-14} color={E.peachInk} />
      <Paw x={29.2} y={16.4} a={16} color={E.peachInk} />
    </g>
  ),
  /** Fifty: a pothos in a terracotta pot, one vine over the rim. */
  'checkins-50': () => (
    <g>
      <path d="M21 26L12.4 17.6M21.6 26l-3.2-12.4M22.4 26l4-13.6M23 26l8.4-8.6" fill="none" stroke={E.stem} stroke-width={1.4} stroke-linecap="round" />
      <Pothos x={12.8} y={18} a={-58} s={0.72} color={E.leafDeep} />
      <Pothos x={18.4} y={14} a={-18} s={0.8} color={E.leaf} />
      <Pothos x={26.2} y={13.2} a={18} s={0.84} color={E.leafLight} />
      <Pothos x={31} y={18} a={56} s={0.72} color={E.leaf} />
      <path d="M33.4 26.8c3.2 1.8 4.4 5.2 3.6 9.6" fill="none" stroke={E.stem} stroke-width={1.3} stroke-linecap="round" />
      <Pothos x={36.6} y={31.4} a={150} s={0.46} color={E.leafDeep} />
      <Pothos x={36.8} y={36.6} a={196} s={0.44} color={E.leafLight} />
      <Pot x={9.6} y={24.6} w={24.8} h={16} />
    </g>
  ),
  /** A hundred: three pots in a row on the sill (a 64 × 40 box). */
  'checkins-100': () => (
    <g>
      {/* pilea: round leaves on fine stems */}
      <path d="M12 21v-6M12 20l-4-7M12 20l4.4-6.4" fill="none" stroke={E.stem} stroke-width={1.2} stroke-linecap="round" />
      <circle cx={7.6} cy={12.4} r={3.2} fill={E.leaf} />
      <circle cx={12} cy={9.8} r={3.4} fill={E.leafLight} />
      <circle cx={16.8} cy={12.6} r={3.1} fill={E.leafDeep} />
      <Pot x={5} y={20} w={14} h={12} />
      {/* snake plant */}
      <path d="M28 20c-1.2-5-.8-10 1.4-14.4 1 4.6 1.2 9.4.4 14.4zM32 20c.4-6 1.6-11 4.2-15.2.6 5.2 0 10.2-1.8 15.2zM30.4 20c-1.4-3.6-3.2-6.4-5.6-8.4.2 3.2 1.4 6 3 8.4z" fill={E.leafDeep} />
      <Pot x={25} y={19.6} w={14} h={12.4} color={E.cream} rim={E.paper} />
      <rect x={26.6} y={25.6} width={10.8} height={1.6} fill={E.blush} />
      {/* a small flowering plant */}
      <Leaf x={50} y={22} a={-50} len={7} width={3} color={E.leaf} />
      <Leaf x={52.6} y={22} a={46} len={7} width={3} color={E.leafDeep} />
      <path d="M51.4 21.6V14" fill="none" stroke={E.stem} stroke-width={1.2} stroke-linecap="round" />
      <Flower x={51.4} y={12.4} r={4} color={E.paper} />
      <Pot x={45} y={21.6} w={13} h={10.4} color={E.blush} rim={E.blushDeep} />
      <rect x={1} y={32} width={62} height={4.6} rx={1.4} fill={E.wood} />
      <Detail>
        <rect x={1} y={35} width={62} height={1.6} rx={0.8} fill={E.woodDeep} />
      </Detail>
    </g>
  ),
  /** Two hundred and fifty: an African violet in flower. */
  'checkins-250': () => (
    <g>
      <g>
        {[
          [9.6, 25.4, -70, E.leafDeep],
          [14.4, 21.4, -38, E.leaf],
          [34.4, 25.4, 70, E.leafDeep],
          [29.6, 21.4, 38, E.leaf],
          [22, 20, 0, E.leafLight],
        ].map(([x, y, a, c]) => (
          <ellipse key={a} cx={x} cy={y} rx={4.6} ry={6} transform={`rotate(${a} ${x} ${y})`} fill={c as string} />
        ))}
      </g>
      <Flower x={15.4} y={15} r={4.6} color={E.lavender} />
      <Flower x={22.6} y={10.6} r={4.8} color={E.lavender} />
      <Flower x={29.4} y={15.6} r={4.6} color={E.lavender} />
      <Flower x={22.4} y={19.4} r={4.2} color={E.lavender} />
      <Pot x={11.5} y={26} w={21} h={13.4} color={E.lavender} rim={E.lavenderDeep} />
    </g>
  ),
  /** Five hundred: this month's flowers in a glass jar. */
  'checkins-500': () => (
    <g>
      <path d="M19.4 37L15.4 13M22 37V9M24.6 37l5.2-22" fill="none" stroke={E.stem} stroke-width={1.5} stroke-linecap="round" />
      <Leaf x={17} y={24} a={-42} len={7} width={2.8} />
      <Leaf x={26.4} y={25} a={42} len={7} width={2.8} color={E.leafDeep} />
      <Flower x={15} y={11.4} r={5} color={E.blush} />
      <Flower x={22} y={7.4} r={4.8} color={E.butter} centre={E.blushDeep} />
      <Flower x={30.2} y={13} r={4.8} color={E.paper} />
      <path d="M13 21h18v14.4a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z" fill={E.glass} fill-opacity={0.9} />
      <path d="M13 29.4h18v6a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z" fill={E.sky} fill-opacity={0.75} />
      <rect x={12} y={18.8} width={20} height={3} rx={1.4} fill={E.paper} />
      <Detail>
        <path d="M27.6 21H31v14.4a4 4 0 0 1-3.4 3.96z" fill={E.lavender} fill-opacity={0.5} />
      </Detail>
    </g>
  ),
  /** A thousand: the window, framed all round by the pothos that grew from one cutting. */
  'checkins-1000': () => (
    <g>
      <path d="M9 38V20a13 13 0 0 1 26 0v18z" fill={E.paper} />
      <path d="M12 37V20.4a10 10 0 0 1 20 0V37z" fill={E.sky} />
      <rect x={21} y={9.6} width={2} height={28} fill={E.paper} />
      <rect x={12} y={24} width={20} height={2} fill={E.paper} />
      <rect x={6} y={37} width={32} height={3.6} rx={1.4} fill={E.wood} />
      <path d="M9.4 36.4C5.6 28 7.2 15.4 15.4 9.6S31.8 5.8 35.6 14.2" fill="none" stroke={E.stem} stroke-width={1.5} stroke-linecap="round" />
      {[
        [8.2, 31, -70, E.leaf],
        [7.6, 22.4, -40, E.leafLight],
        [11.2, 13.6, -24, E.leaf],
        [18.4, 8.4, 4, E.leafDeep],
        [26.2, 7.6, 30, E.leafLight],
        [33, 10.6, 56, E.leaf],
        [36, 18, 100, E.leafDeep],
      ].map(([x, y, a, c]) => (
        <Pothos key={a} x={x as number} y={y as number} a={a as number} s={0.46} color={c as string} />
      ))}
    </g>
  ),
  /** The first rest day: a moon, and a small cloud. */
  'first-rest': () => (
    <g>
      <path d={MOON} fill={E.butter} />
      <path d="M24.6 37h12.2a3.2 3.2 0 0 0 .2-6.4 4.2 4.2 0 0 0-7.8-1.8 3.4 3.4 0 0 0-5.2 3A2.6 2.6 0 0 0 24.6 37z" fill={E.paper} />
    </g>
  ),
  /** Coming back: a house key on its ring, with a paper tag. */
  comeback: () => (
    <g>
      <path d="M13.2 20.6c-3 3.6-5.4 7-6.4 10.4" fill="none" stroke={E.woodDeep} stroke-width={1.2} stroke-linecap="round" />
      <g transform="rotate(-14 9 34)">
        <path d={`M4.2 29.6h8.6a1.6 1.6 0 0 1 1.6 1.6v7.2a1.6 1.6 0 0 1-1.6 1.6H4.2L1.4 36.4v-3.6z${circlePath(4.4, 34.8, 0.9)}`} fill={E.paper} fill-rule="evenodd" />
        <rect x={6.8} y={33} width={5.6} height={1.4} rx={0.7} fill={E.blushDeep} />
        <rect x={6.8} y={35.8} width={3.8} height={1.4} rx={0.7} fill={E.blushDeep} />
      </g>
      <g transform="translate(15.6 15.6) rotate(42)">
        <path d={`${circlePath(0, 0, 7.4)}${circlePath(0, 0, 3.2)}`} fill={E.brass} fill-rule="evenodd" />
        <path d="M6.6-2.4H26a1.6 1.6 0 0 1 1.6 1.6v1.6a1.6 1.6 0 0 1-1.6 1.6h-.8v3.4h-3V2.4h-2v2.4h-3V2.4H6.6z" fill={E.brass} />
        <Detail>
          <path d="M6.6.6H27.4v.2a1.6 1.6 0 0 1-1.6 1.6H6.6z" fill={E.brassDeep} />
        </Detail>
      </g>
    </g>
  ),
  /** The first bloom: one begonia flower, open. */
  'first-bloom': () => (
    <g>
      <path d="M22 28v11" fill="none" stroke={E.leafDeep} stroke-width={2.2} stroke-linecap="round" />
      <Leaf x={21.6} y={37.4} a={-58} len={10} width={4.2} />
      <Leaf x={22.4} y={35.4} a={54} len={9} width={3.8} color={E.leafDeep} />
      <Flower x={22} y={18.6} r={13.2} color={E.paper} centre={E.butter} />
      <Detail>
        <Flower x={22} y={18.6} r={7.6} color={E.blush} centre={E.butter} />
        <g fill={E.butterDeep}>
          <circle cx={20.6} cy={17.6} r={0.9} />
          <circle cx={23.4} cy={17.8} r={0.9} />
          <circle cx={22} cy={20} r={0.9} />
        </g>
      </Detail>
    </g>
  ),
  /** Evergreen: a laurel sprig (the Laurel Sprig is the first Evergreen's reward). */
  'first-evergreen': () => (
    <g>
      <path d="M12.6 39C17.6 30.6 21.8 20.8 29.4 7.6" fill="none" stroke={E.stem} stroke-width={2} stroke-linecap="round" />
      {[
        [15.2, 34.2],
        [18.4, 27.6],
        [21.8, 20.8],
        [25.4, 14],
      ].map(([x, y]) => (
        <g key={y}>
          <Leaf x={x!} y={y!} a={-36} len={10} width={3.8} color={E.leaf} />
          <Leaf x={x!} y={y!} a={82} len={10} width={3.8} color={E.leafDeep} />
        </g>
      ))}
      <Leaf x={29.2} y={8} a={26} len={9} width={3.6} color={E.leafLight} />
    </g>
  ),
  /** A steady month: a herbarium page with one pressed leaf, taped down (a 64 × 40 box). */
  'steady-month': () => (
    <g transform="rotate(-4 32 20)">
      <rect x={14} y={1.6} width={36} height={37} rx={1.6} fill={E.paper} />
      <Detail>
        <rect x={46.6} y={1.6} width={3.4} height={37} fill={shade(E.paper)} />
      </Detail>
      <g transform="translate(29.6 30) rotate(24)">
        <path d="M0 0C-7.4-3-8.8-12.6-4.6-19.4-2.8-22.4-.8-24.4 0-25.6c.8 1.2 2.8 3.2 4.6 6.2C8.8-12.6 7.4-3 0 0z" fill={E.leaf} />
        <Detail>
          <path d="M0 0C7.4-3 8.8-12.6 4.6-19.4 2.8-22.4.8-24.4 0-25.6c.6 8.4.6 17 0 25.6z" fill={E.leafDeep} />
        </Detail>
        <path d="M0 4V-22" fill="none" stroke={E.stem} stroke-width={1.2} stroke-linecap="round" />
      </g>
      <rect x={23.4} y={30.6} width={9} height={3.4} rx={0.6} transform="rotate(-18 27.9 32.3)" fill={E.cream} />
      <rect x={33.4} y={8} width={8} height={3.2} rx={0.6} transform="rotate(30 37.4 9.6)" fill={E.cream} />
      <rect x={36} y={33.6} width={10} height={1.6} rx={0.8} fill={E.mintDeep} />
    </g>
  ),
  /** Early bird: the sun coming up behind the sill, a sparrow already on it. */
  'early-bird': () => (
    <g>
      <g stroke={E.peach} stroke-width={2.2} stroke-linecap="round" fill="none">
        <path d="M18 6.4v3.4M7.6 11.2l2.4 2.4M28.4 11.2L26 13.6M3.6 21.4h3.2M29.2 21.4h3.2" />
      </g>
      <path d="M6.8 29a11.2 11.2 0 0 1 22.4 0z" fill={E.peach} />
      <rect x={3} y={28.4} width={38} height={4.8} rx={1.6} fill={E.wood} />
      <Detail>
        <rect x={3} y={31.6} width={38} height={1.6} rx={0.8} fill={E.woodDeep} />
      </Detail>
      {/* a sparrow on the sill, facing the sun */}
      <path d="M40.6 20.6l-4.4 3.6 1.2-4.8z" fill={E.soil} />
      <path d="M26 21.4c0-3.6 3.4-5.4 6.6-4.2 3.2 1.2 4.4 4.6 3.4 7.4-.9 2.6-3.6 3.8-6.2 3.6-2.4-.2-3.8-2.4-3.8-6.8z" fill={E.soil} />
      <circle cx={27.8} cy={18.8} r={3.4} fill={E.soil} />
      <path d="M24.6 18.4l-2.4.8 2.4.9z" fill={E.butterDeep} />
      <circle cx={26.9} cy={18.2} r={0.75} fill={E.ink} />
      <Detail>
        <path d="M30.6 21.6c2.2-.8 4.2 0 5.2 1.8-1.6 2-4.4 2.2-5.2-1.8z" fill={shade(E.soil)} />
      </Detail>
      <path d="M29.8 28.2v-1.8M32.2 28.2v-1.8" fill="none" stroke={E.woodDeep} stroke-width={0.9} stroke-linecap="round" />
    </g>
  ),
  /** Winding down: the lamp on, its warm pool on the table. */
  'wind-down': () => (
    <g>
      <ellipse cx={22} cy={37.4} rx={15} ry={3.4} fill={E.lamp} fill-opacity={0.55} />
      <rect x={21} y={20} width={2} height={13} fill={E.brass} />
      <path d="M15.4 33h13.2a2.2 2.2 0 0 1 2.2 2.2v1.4H13.2v-1.4a2.2 2.2 0 0 1 2.2-2.2z" fill={E.blush} />
      <path d="M15.6 8.6h12.8l5.2 12.2H10.4z" fill="#FFE8BE" />
      <Detail>
        <path d="M24.8 8.6h3.6l5.2 12.2h-5.4z" fill="#F4CF94" />
        <path d="M24.2 33h4.4a2.2 2.2 0 0 1 2.2 2.2v1.4h-6.6z" fill={E.blushDeep} />
      </Detail>
    </g>
  ),
};
