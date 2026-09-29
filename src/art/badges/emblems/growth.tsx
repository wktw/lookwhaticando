/** Emblems for check-in, consistency and plant-growth badges. */
import { crescentPath, flowerPath, heartPath, scallopPath } from '@/art/icons/shapes';
import { Blush, Dots, EF, Gleam, Spark, type Emblem } from './kit';

const DAISY = flowerPath(20, 20, 7.5, 17, 8);
const SUNFLOWER = flowerPath(20, 20, 10, 17.6, 9);
const ROSETTE_OUT = flowerPath(20, 20, 12.6, 18.4, 7);
const ROSETTE_MID = flowerPath(20, 20, 7.6, 12.6, 7, 180 / 7);
const GARDEN_BLOOM = flowerPath(20, 10.4, 2.4, 6, 5);
const MOON = crescentPath(17, 21.5, 12.5, 24.8, 13.6, 10.6);
const CANOPY = scallopPath(20, 15.4, 9.8, 7);
const MONTH_HEART = heartPath(28, 28.2, 5.6);
const BOUQUET = {
  top: flowerPath(20, 10.2, 2.8, 7, 5),
  left: flowerPath(12.2, 16, 2.6, 6.6, 5, 20),
  right: flowerPath(27.8, 16, 2.6, 6.6, 5, -20),
};

/** A rainbow band between two radii, as one closed shape. */
const band = (ro: number, ri: number, cy = 23) => `M${20 - ro} ${cy}A${ro} ${ro} 0 0 1 ${20 + ro} ${cy}H${20 + ri}A${ri} ${ri} 0 0 0 ${20 - ri} ${cy}Z`;
/** A puffy cloud sitting on (x, y). */
const cloud = (x: number, y: number) =>
  `M${x - 6} ${y}h12a2.6 2.6 0 0 0 .2-5.2 3.6 3.6 0 0 0-6.6-1.6 3 3 0 0 0-5 2.4A2.2 2.2 0 0 0 ${x - 6} ${y}z`;

/** A paw print centered on its main pad. */
const PAW_TOES: [number, number, number][] = [
  [-4.6, -2.6, -25],
  [-1.7, -5.6, -8],
  [1.7, -5.6, 8],
  [4.6, -2.6, 25],
];

/** One leaf pointing up from its base, used to fan leaves out of a pot. */
const LEAF_UP = 'M0 0C-3.2-3-3.4-8.6 0-12 3.4-8.6 3.2-3 0 0z';

/** A cherry-blossom petal (notched tip) pointing up from the flower center. */
const BLOSSOM_PETAL = 'M0-2C-5-4.5-7.5-10-4-14.2c1.4-1.4 3-.8 4 1 1-1.8 2.6-2.4 4-1 3.5 4.2 1 9.7-4 12.2z';
const BLOSSOM_ANGLES = [0, 72, 144, 216, 288];
/** Stamen dots between the blossom's petals. */
const BLOSSOM_STAMENS = BLOSSOM_ANGLES.map((a) => {
  const rad = (a * Math.PI) / 180;
  return { key: a, cx: 20 + 6.2 * Math.sin(rad), cy: 20.6 - 6.2 * Math.cos(rad) };
});

export const GROWTH_EMBLEMS: Record<string, Emblem> = {
  'first-checkin': ({ p }) => (
    <g>
      <path d="M7 31.5c2.5-4.6 23.5-4.6 26 0z" fill={p.brown} />
      <path d="M20 29V17.5" fill="none" />
      <path d="M20 22c-4.2.9-9-1.4-10-6.8 5.3-.9 9.2 1.7 10 6.8z" fill={p.leaf} />
      <path d="M20 17.8c0-5.8 4-9.8 10.2-9.8.2 6-4 9.9-10.2 9.8z" fill={p.leaf} />
      <path d="M12.6 16.2c2.6 1 4.8 2.7 6.4 5M27.4 10.6c-2.8 1.4-5 3.6-6.4 6.2" fill="none" stroke-width={EF} />
      <Gleam d="M23.4 12.4c1-1.2 2.3-2 3.8-2.4" />
      <Spark x={9} y={9} r={2.8} fill={p.butter} />
    </g>
  ),
  'first-perfect-day': ({ p }) => (
    <g>
      <path d={DAISY} fill={p.white} />
      <circle cx={20} cy={20} r={7} fill={p.butter} />
      <Dots l={17.4} r={22.6} y={19.2} ink={p.ink} size={0.8} />
      <path d="M18.4 22q1.6 1.4 3.2 0" fill="none" stroke-width={EF} />
      <Blush l={15.6} r={24.4} y={22} color={p.cheek} />
    </g>
  ),
  'perfect-week': ({ p }) => (
    <g>
      <path d={band(15, 11.2)} fill={p.blush} />
      <path d={band(11.2, 7.4)} fill={p.butter} />
      <path d={band(7.4, 3.6)} fill={p.sky} />
      <path d={cloud(8.6, 28.5)} fill={p.white} />
      <path d={cloud(31.4, 28.5)} fill={p.white} />
      <Spark x={32} y={9} r={2.8} fill={p.butter} />
    </g>
  ),
  'checkins-10': ({ p }) => (
    <g fill={p.peach} stroke-width={EF}>
      {[
        [11.4, 29.2, 0.9],
        [26, 23.2, 0.9],
        [17.4, 11.8, 1],
      ].map(([x, y, s]) => (
        <g key={x} transform={`translate(${x} ${y}) rotate(18) scale(${s})`}>
          <path d="M0-.6c2.6 0 4.4 2.3 4.4 4.2 0 1.7-1.4 2.4-4.4 2.4s-4.4-.7-4.4-2.4c0-1.9 1.8-4.2 4.4-4.2z" />
          {PAW_TOES.map(([tx, ty, rot]) => (
            <ellipse key={tx} cx={tx} cy={ty} rx={1.6} ry={1.9} transform={`rotate(${rot} ${tx} ${ty})`} />
          ))}
        </g>
      ))}
    </g>
  ),
  'checkins-50': ({ p }) => (
    <g>
      {[-62, -31, 0, 31, 62].map((a, i) => (
        <path key={a} d={LEAF_UP} transform={`translate(20 22.5) rotate(${a}) scale(${i % 2 ? 1.1 : 1})`} fill={i % 2 ? p.leafDeep : p.leaf} />
      ))}
      <rect x={10} y={22.5} width={20} height={4} rx={1.6} fill={p.peachDeep} />
      <path d="M11.6 26.5h16.8l-1.8 8.2a2 2 0 0 1-2 1.6h-9.2a2 2 0 0 1-2-1.6z" fill={p.peach} />
      <Gleam d="M14.2 29.2l.6 3.4" width={1.6} />
    </g>
  ),
  'checkins-100': ({ p }) => (
    <g>
      {/* A little garden planter, labelled 100. */}
      <path d={LEAF_UP} transform="translate(12 23.4) rotate(-34) scale(.62)" fill={p.leaf} />
      <path d={LEAF_UP} transform="translate(12.6 23.4) rotate(8) scale(.72)" fill={p.leafDeep} />
      <path d={LEAF_UP} transform="translate(27.4 23.4) rotate(-8) scale(.72)" fill={p.leafDeep} />
      <path d={LEAF_UP} transform="translate(28 23.4) rotate(34) scale(.62)" fill={p.leaf} />
      <path d="M20 23V14" fill="none" />
      <path d="M20 20.2c-2.6.4-4.6-.8-5.2-3.2 2.6-.4 4.6.8 5.2 3.2z" fill={p.leaf} stroke-width={EF} />
      <path d={GARDEN_BLOOM} fill={p.blush} />
      <circle cx={20} cy={10.4} r={1.8} fill={p.gold} stroke-width={1.2} />
      <path d="M8 23.4h24l-1.8 10a2 2 0 0 1-2 1.6H11.8a2 2 0 0 1-2-1.6z" fill={p.wood} />
      <rect x={6.6} y={21.6} width={26.8} height={3.6} rx={1.6} fill={p.brown} />
      <rect x={13.4} y={26.8} width={13.2} height={5.8} rx={1.4} fill={p.white} stroke-width={EF} />
      <g fill="none" stroke={p.blushDeep} stroke-width={1.5}>
        <path d="M15.6 28.6l1-.7v3.4" />
        <ellipse cx={19.9} cy={29.6} rx={1.2} ry={1.7} />
        <ellipse cx={23.8} cy={29.6} rx={1.2} ry={1.7} />
      </g>
      <Spark x={32.6} y={10} r={2.6} fill={p.butter} />
    </g>
  ),
  'checkins-250': ({ p }) => (
    <g>
      <path d={SUNFLOWER} fill={p.butter} />
      <circle cx={20} cy={20} r={8.2} fill={p.brown} />
      <g fill={p.wood} stroke="none">
        {[
          [17.4, 17.2],
          [22.6, 17.2],
          [20, 20],
          [17.4, 22.8],
          [22.6, 22.8],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} />
        ))}
      </g>
      <Gleam d="M9 13.6a12 12 0 0 1 3.2-3.8" width={1.6} />
    </g>
  ),
  'checkins-500': ({ p }) => (
    <g>
      <path d="M13.4 23.4c-3.8.6-6.6-1.4-7.2-4.8 3.4-.4 6 1.4 7.2 4.8zM26.6 23.4c3.8.6 6.6-1.4 7.2-4.8-3.4-.4-6 1.4-7.2 4.8z" fill={p.leaf} />
      <path d={BOUQUET.top} fill={p.lavender} />
      <path d={BOUQUET.left} fill={p.blush} />
      <path d={BOUQUET.right} fill={p.butter} />
      <g fill={p.gold} stroke-width={1.2}>
        <circle cx={20} cy={10.4} r={1.6} />
        <circle cx={12.4} cy={16} r={1.5} />
        <circle cx={27.6} cy={16} r={1.5} />
      </g>
      <path d="M11 21.4h18L20.9 36.2a1 1 0 0 1-1.8 0z" fill={p.white} />
      <path d="M15.4 21.4l4.6 8.6" fill="none" stroke-width={EF} />
      <path d="M20 27.2c-2-1.8-4.6-2-4.8-.2-.2 1.6 2.6 1.4 4.8.2zm0 0c2-1.8 4.6-2 4.8-.2.2 1.6-2.6 1.4-4.8.2z" fill={p.blushDeep} stroke-width={1.3} />
    </g>
  ),
  'checkins-1000': ({ p }) => (
    <g>
      <path d={ROSETTE_OUT} fill={p.blush} />
      <path d={ROSETTE_MID} fill={p.peach} />
      <circle cx={20} cy={20} r={5.6} fill={p.butter} />
      <Spark x={20} y={20} r={3} fill={p.white} />
      <Gleam d="M6.8 15.2a14 14 0 0 1 3.6-5.4" width={1.6} />
    </g>
  ),
  'first-rest': ({ p }) => (
    <g>
      <path d={MOON} fill={p.butter} />
      <path d="M8.6 22.6q1.6 1.6 3.4.4M13.6 26.4q1.8 1.2 3.4-.4" fill="none" stroke-width={EF} />
      <Blush l={9.4} r={16.8} y={27.8} color={p.cheek} />
      <Gleam d="M8.2 15.4a11 11 0 0 1 3.6-5" />
      <path d="M24.6 6.6h4.6l-4.6 5h4.6M31 13.4h3l-3 3.4h3" fill="none" stroke-width={EF} />
      <Spark x={31} y={27.4} r={2.8} fill={p.white} />
    </g>
  ),
  comeback: ({ p }) => (
    <g>
      <path d="M20 26.5v10" fill="none" />
      <path d="M20 34.4c-4.5 0-8-3-8.5-7.6 4.5.3 7.9 3.3 8.5 7.6z" fill={p.leaf} />
      <path d="M20 31.4c3.5-.5 6-3 6.5-6.6-3.5.2-5.9 2.7-6.5 6.6z" fill={p.leaf} />
      <path d="M12.4 11.4c-.5 9.6 2 15.1 7.6 15.1s8.1-5.5 7.6-15.1l-3.6 3.8-4-5.6-4 5.6z" fill={p.blush} />
      <path d="M16 15.2q.8 6.6 4 11.3M24 15.2q-.8 6.6-4 11.3" fill="none" stroke-width={EF} />
      <Gleam d="M14.6 15.2c-.1 2.4.3 4.4 1.2 6.2" width={1.6} />
      <Spark x={31.6} y={10.4} r={2.8} fill={p.butter} />
    </g>
  ),
  'first-bloom': ({ p }) => (
    <g>
      {BLOSSOM_ANGLES.map((a) => (
        <path key={a} d={BLOSSOM_PETAL} transform={`translate(20 20.6) rotate(${a})`} fill={p.blush} />
      ))}
      <circle cx={20} cy={20.6} r={3.6} fill={p.blushDeep} stroke-width={EF} />
      <g fill={p.gold} stroke="none">
        {BLOSSOM_STAMENS.map(({ key, cx, cy }) => (
          <circle key={key} cx={cx} cy={cy} r={1.1} />
        ))}
      </g>
    </g>
  ),
  'first-evergreen': ({ p }) => (
    <g>
      <path d="M17.8 35.4l.9-10h2.6l.9 10z" fill={p.wood} />
      <path d={CANOPY} fill={p.leaf} />
      <ellipse cx={15.2} cy={11.6} rx={4.8} ry={3.3} transform="rotate(-32 15.2 11.6)" fill={p.sage} stroke="none" />
      <g fill={p.blushDeep} stroke-width={1.2}>
        <circle cx={24.4} cy={13.6} r={1.7} />
        <circle cx={15.4} cy={19.8} r={1.7} />
        <circle cx={25} cy={21.2} r={1.7} />
      </g>
      <Gleam d="M10.8 12.8a9.4 9.4 0 0 1 3.4-4.2" />
      <Spark x={31.8} y={7.4} r={3.2} fill={p.gold} />
      <Spark x={7.4} y={27.4} r={2.2} fill={p.butter} />
      <Spark x={33.2} y={27.8} r={1.8} fill={p.white} />
    </g>
  ),
  'steady-month': ({ p }) => (
    <g>
      <rect x={7} y={9} width={26} height={25} rx={4.2} fill={p.white} />
      <path d="M7 16v-2.8A4.2 4.2 0 0 1 11.2 9h17.6A4.2 4.2 0 0 1 33 13.2V16z" fill={p.mint} />
      <path d="M7 16h26M14 6.4v5M26 6.4v5" fill="none" />
      <g fill={p.mintDeep} stroke="none">
        {[
          [12.2, 21.4],
          [17.4, 21.4],
          [22.6, 21.4],
          [27.8, 21.4],
          [12.2, 28],
          [17.4, 28],
          [22.6, 28],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={2} />
        ))}
      </g>
      <path d={MONTH_HEART} fill={p.blushDeep} stroke-width={1.3} />
    </g>
  ),
};
