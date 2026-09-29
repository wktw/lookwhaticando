/**
 * Exclusive decor, earned rather than pulled: the Window Seat (a year of showing up), the Tiny
 * Cake (birthdays), and the Field Guide rewards: a Reading Chair (Cats), a Pasture Fence (Cows) and
 * Stepping Stones (Pond Club). Standing on y = 92 of the 100×100 canvas.
 */
import { Glow, cast, contact, flat, lit, paint, shapes, solid, thin, type DecorRenderer } from './kit';
import { ell, ellPts, leaf, n, poly, rect, smooth, trap, type Pt } from './geo';

/* ---------------- The Window Seat: a cushioned seat built into the window ---------------- */

const SEAT = {
  wall: '#F7F0E6',
  recess: '#EBE1D3',
  frame: '#FDFAF4',
  sky: '#D6E8F4',
  skyLow: '#E8F1F3',
  tree: '#B9D0A6',
  nightSky: '#3A3760',
  star: '#FFE7B0',
  curtain: '#F3E7D6',
  tie: '#E3A083',
  wood: '#F4ECDF',
  panel: '#EADFCE',
  cushion: '#EFB4C1',
  piping: '#F8D3DB',
  button: '#DC97A8',
  sage: '#B5CC9C',
  throw: '#CDBFE6',
  stripe: '#F1ECF8',
  pot: '#DE9C7C',
  potRim: '#E8AE90',
  leaf: '#8DB57A',
  leafDeep: '#79A467',
  vine: '#7FA26C',
};

const ARCH = (x0: number, x1: number, top: number, spring: number, bottom: number) => {
  const cx = (x0 + x1) / 2;
  const rise = spring - top;
  return `M${x0} ${bottom}V${spring}C${x0} ${n(spring - rise * 0.85)} ${n(cx - (cx - x0) * 0.55)} ${top} ${cx} ${top}C${n(cx + (x1 - cx) * 0.55)} ${top} ${x1} ${n(spring - rise * 0.85)} ${x1} ${spring}V${bottom}Z`;
};

const seat = shapes('decor-window-seat', {
  wall: ARCH(5, 95, 5, 36, 92),
  recess: { d: ARCH(13, 87, 13.5, 39, 92), k: 0 },
  frame: { d: ARCH(22, 78, 20, 42, 71), k: 0.4 },
  glass: { d: ARCH(25, 75, 23.2, 43, 68.6), k: 0 },
  tree: {
    d: `${smooth(
      [
        [25, 62],
        [30, 54],
        [38, 51.6],
        [45, 55],
        [48, 62],
        [48, 69],
        [25, 69],
      ],
      false,
    )}Z`,
    k: 0,
    clip: 'glass',
  },
  curtainL: {
    d: smooth([
      [14, 22],
      [24, 20],
      [25, 38],
      [21, 52],
      [26, 66],
      [16, 68],
      [13.6, 52],
    ]),
    k: 0.5,
  },
  curtainR: {
    d: smooth([
      [86, 22],
      [76, 20],
      [75, 38],
      [79, 52],
      [74, 66],
      [84, 68],
      [86.4, 52],
    ]),
    k: 0.5,
  },
  base: rect(13, 72, 74, 20),
  cushion: { d: rect(13.5, 63, 73, 10, [4, 4, 2, 2]), k: 0.8 },
  pillowL: {
    d: poly(
      [
        [17, 49],
        [33, 46.6],
        [35.4, 63],
        [19, 65],
      ],
      5,
    ),
    k: 0.7,
  },
  pot: { d: trap(76, 54.6, 63.4, 11.6, 8.8, 1), k: 0.8 },
  potRim: { d: rect(69.4, 52.4, 13.2, 3.6, 1), k: 0.6 },
  leafA: { d: leaf([75, 53], [68, 42.6], 4), k: 0.6 },
  leafB: { d: leaf([76.6, 53], [80, 40.4], 4.2), k: 0.6 },
  leafC: { d: leaf([77.4, 53.4], [87, 47], 3.4), k: 0.6 },
  throw: {
    d: smooth([
      [40, 62.4],
      [58, 62],
      [60.6, 66],
      [59, 84],
      [52, 85.6],
      [44, 84],
      [41, 66],
    ]),
    k: 0.7,
  },
  stripes: { d: 'M30 70H70V72H30ZM30 76H70V78H30Z', k: 0, clip: 'throw' },
});

/** Sun through the two lower panes, landing on the cushion either side of the bar's shadow. Its slant follows the light. */
function beam(from: 'left' | 'top' | 'right'): string {
  const s = from === 'left' ? 6 : from === 'right' ? -6 : 0;
  const pane = (x0: number, x1: number) =>
    poly([
      [x0, 63.4],
      [x1, 63.4],
      [x1 + s, 72.6],
      [x0 + s, 72.6],
    ]);
  return pane(29, 48.6) + pane(51.4, 71);
}

/** The pothos trails two vines over the cushion's edge, its leaves hanging off alternate sides. */
const VINES = 'M71.4 55C66.6 59 64.4 64.6 65 70.6C65.4 76 64 80.4 62.4 85M80.6 55.4C84 60.4 85.4 66 84.6 73';
/** Leaf base on the vine, then where its tip hangs to. */
const HANGING: readonly (readonly [Pt, Pt])[] = [
  [[67.4, 60], [62, 64.6]],
  [[65, 67], [69.4, 72]],
  [[65, 74.4], [60.4, 78.6]],
  [[63.6, 81], [67.6, 85.6]],
  [[84, 60.6], [89, 65]],
  [[85.2, 68], [80.8, 72.6]],
];

export const windowSeat: DecorRenderer = (o) => {
  const p = paint(o);
  const reveal = p.from === 'left' ? rect(13, 39, 3.4, 53) : p.from === 'right' ? rect(83.6, 39, 3.4, 53) : ARCH(13, 87, 13.5, 39, 18);
  return (
    <g>
      {contact(p, 50, 92.4, 46, 1.8)}
      {solid(p, seat.wall, SEAT.wall)}
      {flat(p, seat.recess, SEAT.recess)}
      {cast(p, reveal, 0.8)}
      {solid(p, seat.frame, SEAT.frame)}
      {flat(p, seat.glass, p.night ? SEAT.nightSky : SEAT.sky)}
      {p.night ? (
        <g fill={SEAT.star}>
          <path d="M62 30.4a6 6 0 1 0 4.6 9.6a4.8 4.8 0 1 1 -4.6 -9.6Z" />
          <circle cx={36} cy={34} r={0.9} />
          <circle cx={44} cy={29} r={0.7} />
          <circle cx={58} cy={52} r={0.8} />
        </g>
      ) : (
        [<path d={rect(25, 58, 50, 10.6)} fill={p.c(SEAT.skyLow)} />, flat(p, seat.tree, SEAT.tree)]
      )}
      {thin(p, 'M50 22.6V69M24 45.6H76', SEAT.frame, 2.2)}
      {solid(p, seat.curtainL, SEAT.curtain, thin(p, 'M18.4 52.4L25 50.6', SEAT.tie, 1.6))}
      {solid(p, seat.curtainR, SEAT.curtain, thin(p, 'M81.6 52.4L75 50.6', SEAT.tie, 1.6))}
      {solid(p, seat.base, SEAT.wood, [
        <path d={rect(18, 76.4, 29, 11.6, 1)} fill={p.c(SEAT.panel)} />,
        <path d={rect(53, 76.4, 29, 11.6, 1)} fill={p.c(SEAT.panel)} />,
        cast(p, rect(13, 72, 74, 2.4)),
      ])}
      {solid(p, seat.pillowL, SEAT.sage)}
      {solid(p, seat.cushion, SEAT.cushion, [
        thin(p, 'M16 71H84', SEAT.piping, 1.1),
        ...[28, 50, 72].map((x) => <circle key={x} cx={x} cy={67} r={1.1} fill={p.c(SEAT.button)} />),
      ])}
      {!p.night && <path d={beam(p.from)} fill="var(--sun)" />}
      {solid(p, seat.leafB, SEAT.leafDeep)}
      {solid(p, seat.leafA, SEAT.leaf)}
      {solid(p, seat.leafC, SEAT.leaf)}
      {solid(p, seat.pot, SEAT.pot)}
      {solid(p, seat.potRim, SEAT.potRim)}
      {thin(p, VINES, SEAT.vine, 0.9)}
      {HANGING.map(([base, tip], i) => (
        <path key={i} d={leaf(base, tip, 3.4)} fill={p.c(i % 2 ? SEAT.leafDeep : SEAT.leaf)} />
      ))}
      {solid(p, seat.throw, SEAT.throw, flat(p, seat.stripes, SEAT.stripe))}
    </g>
  );
};

/* ---------------- Tiny Cake: three layers and one candle ---------------- */

const CAKE = {
  doily: '#FFFBF4',
  doilyEdge: '#F3EADF',
  sponge: '#F4DDA4',
  cream: '#FFF8F0',
  jam: '#F2B6C2',
  top: '#FFF6EC',
  candle: '#F4BFC6',
  candleStripe: '#FFF8F0',
  flame: '#FFD27A',
  core: '#FFF1C8',
};

const DOILY: Pt[] = ellPts(50, 86.4, 44, 7, 0, 360, 36)
  .slice(0, -1)
  .map(([x, y], i) => (i % 2 ? [50 + (x - 50) * 0.94, 86.4 + (y - 86.4) * 0.9] : [x, y]));

const cake = shapes('decor-birthday-cake', {
  doily: { d: smooth(DOILY), k: 0 },
  side: 'M20 50V82.6C20 86 33.4 88.6 50 88.6C66.6 88.6 80 86 80 82.6V50Z',
  layers: { d: 'M10 59.6H90V63.6H10ZM10 70.4H90V74.4H10Z', k: 0, clip: 'side' },
  jam: { d: 'M10 63.6H90V66H10ZM10 74.4H90V76.8H10Z', k: 0, clip: 'side' },
  top: { d: `${ell(50, 50, 30, 6.4)}`, k: 0 },
  drips: {
    d: 'M20 50.4C20 55 21.6 56.6 23 56.6C24.4 56.6 25.4 55 25.8 53.6C27 57.6 28.4 59.8 30.2 59.8C32 59.8 33 57.4 33.6 55C35 56.8 36.6 57.8 38 57.2C39.8 56.4 40.2 54.6 40.6 56C42 60.6 44.4 61.6 46 61C47.6 60.4 48.4 58.6 49 56.4C50.6 58.4 52.4 58.6 54 58.2C56 57.6 56.6 55.6 57 57.2C58 60 60.4 60.8 62 60C63.6 59.2 64.2 57 64.8 55.4C66.4 57.8 68.4 58.2 69.8 57.4C71.2 56.6 71.4 55.2 72.4 56C74.2 57.2 76.6 56.2 78 54.2C79 53 80 51.6 80 50.4Z',
    k: 0,
  },
  candle: { d: rect(47.6, 28, 4.8, 22, [1.2, 1.2, 0, 0]), k: 0.6 },
});

export const birthdayCake: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {p.night && <Glow cx={50} cy={22} r={30} strength={0.55} />}
      {contact(p, 50, 92, 44, 2)}
      {flat(p, cake.doily, CAKE.doily)}
      <path d={ell(50, 86, 34, 4.6)} fill={p.c(CAKE.doilyEdge)} />
      {solid(p, cake.side, CAKE.sponge, [flat(p, cake.layers, CAKE.cream), flat(p, cake.jam, CAKE.jam)])}
      {flat(p, cake.top, CAKE.top)}
      {flat(p, cake.drips, CAKE.top)}
      {solid(p, cake.candle, CAKE.candle, thin(p, 'M47.8 32.6L52.2 29.8M47.8 38.6L52.2 35.8M47.8 44.6L52.2 41.8', CAKE.candleStripe, 1.4))}
      {thin(p, 'M50 28V25', '#6B5D5A', 0.9)}
      <path
        d="M50 14.4C52.4 18.2 53.8 20.8 53.8 22.8C53.8 25 52.2 26.4 50 26.4C47.8 26.4 46.2 25 46.2 22.8C46.2 20.8 47.6 18.2 50 14.4Z"
        fill={lit(p, CAKE.flame, '#FFD27A')}
      />
      <path d="M50 19.4C51 21 51.6 22.2 51.6 23.2C51.6 24.2 50.9 24.8 50 24.8C49.1 24.8 48.4 24.2 48.4 23.2C48.4 22.2 49 21 50 19.4Z" fill={CAKE.core} />
    </g>
  );
};

/* ---------------- Reading Chair: for completing the Cats page ---------------- */

const CHAIR = { fabric: '#AFC79A', deep: '#9DB888', seat: '#C0D4AC', button: '#8FAA7C', leg: '#A98262', cushion: '#F2D98A', knit: '#F5EEE2', rib: '#E6DCCB' };

const chair = shapes('decor-reading-chair', {
  back: 'M21 58V25C21 13.4 34 7 50 7C66 7 79 13.4 79 25V58Z',
  cushion: {
    d: poly(
      [
        [37, 41],
        [58, 38.6],
        [60.4, 58],
        [39, 60],
      ],
      5,
    ),
    k: 0.7,
  },
  seat: { d: rect(22, 57, 56, 10, [4, 4, 0, 0]), k: 0.5 },
  front: rect(21, 66, 58, 18, [0, 0, 2, 2]),
  armL: 'M8 83V56C8 48.6 12.4 44 18.6 44C24.8 44 28 48.6 28 55V83Z',
  armR: 'M92 83V56C92 48.6 87.6 44 81.4 44C75.2 44 72 48.6 72 55V83Z',
  scrollL: { d: ell(18.2, 54.4, 7.6, 7.4), k: 0.6 },
  scrollR: { d: ell(81.8, 54.4, 7.6, 7.4), k: 0.6 },
  throw: {
    d: smooth([
      [73, 47],
      [86, 45.6],
      [92.6, 52],
      [91, 70],
      [86.6, 80],
      [80, 78],
      [79, 62],
      [74, 56],
    ]),
    k: 0.6,
  },
});

export const readingChair: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 44, 2.2)}
      {[16, 84].map((x) => (
        <path
          key={x}
          d={poly(
            [
              [x - 3, 82],
              [x + 3, 82],
              [x + 1.8, 91.6],
              [x - 1.8, 91.6],
            ],
            0.8,
          )}
          fill={p.c(CHAIR.leg)}
        />
      ))}
      {solid(p, chair.back, CHAIR.fabric, [
        ...[
          [38, 22],
          [50, 19],
          [62, 22],
          [44, 33],
          [56, 33],
        ].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={1.2} fill={p.c(CHAIR.button)} />),
      ])}
      {solid(p, chair.cushion, CHAIR.cushion)}
      {solid(p, chair.seat, CHAIR.seat)}
      {solid(p, chair.front, CHAIR.fabric, [cast(p, rect(21, 66, 58, 2.2)), thin(p, 'M23 80.6H77', CHAIR.seat, 1, 0.9)])}
      {solid(p, chair.armL, CHAIR.deep)}
      {solid(p, chair.scrollL, CHAIR.fabric, <circle cx={18.2} cy={54.4} r={2.4} fill={p.c(CHAIR.deep)} />)}
      {solid(p, chair.armR, CHAIR.deep)}
      {solid(p, chair.scrollR, CHAIR.fabric, <circle cx={81.8} cy={54.4} r={2.4} fill={p.c(CHAIR.deep)} />)}
      {solid(p, chair.throw, CHAIR.knit, thin(p, 'M81 48.6C83 58 83 68 82.6 77M85.6 47.4C88 56 88.6 66 87.6 76M77 50.6C78.6 56 80 60 80.6 66', CHAIR.rib, 1.2))}
    </g>
  );
};

/* ---------------- Pasture Fence: for completing the Cows page ---------------- */

const FENCE = { post: '#CDAE86', rail: '#DDC19A', grain: '#C4A279', nail: '#6F6269', grass: '#9CBF8A', grassLight: '#B5CC9C', clover: '#FBF6EE' };
const POSTS = [15, 50, 85];

const fence = shapes('decor-pasture-fence', {
  ...Object.fromEntries(
    POSTS.map((x, i) => [
      `post${i}`,
      poly(
        [
          [x - 4, 34],
          [x, 28.6],
          [x + 4, 34],
          [x + 4, 92],
          [x - 4, 92],
        ],
        1,
      ),
    ]),
  ),
  rail1: poly(
    [
      [4, 42.6],
      [96, 40.6],
      [96, 49.4],
      [4, 51],
    ],
    1,
  ),
  rail2: poly(
    [
      [4, 63],
      [96, 64.6],
      [96, 73.2],
      [4, 71.6],
    ],
    1,
  ),
} as Record<string, string>);

export const pastureFence: DecorRenderer = (o) => {
  const p = paint(o);
  const tuft = (x: number) =>
    thin(
      p,
      `M${x - 6} 92C${x - 6} 88 ${x - 7.6} 85 ${x - 9.4} 83M${x - 2} 92C${x - 2} 87 ${x - 1.4} 83 ${x - 2.6} 80M${x + 2} 92C${x + 2.4} 87 ${x + 4} 84 ${x + 6.4} 82.4M${x + 6} 92C${x + 6.4} 89 ${x + 8} 87.4 ${x + 10} 86.6`,
      FENCE.grass,
      1.5,
    );
  return (
    <g>
      {contact(p, 50, 92.2, 47, 2)}
      {POSTS.map((_, i) => solid(p, fence[`post${i}`]!, FENCE.post, thin(p, `M${POSTS[i]! - 1.4} 38V86M${POSTS[i]! + 1.2} 56V78`, FENCE.grain, 0.8, 0.9)))}
      {solid(p, fence.rail1!, FENCE.rail, [
        thin(p, 'M8 45.6C30 44.6 50 45 70 44M60 47.4C74 46.8 84 46.4 92 46', FENCE.grain, 0.8, 0.9),
        <ellipse cx={34} cy={46.2} rx={1.6} ry={1} fill={p.c(FENCE.grain)} />,
      ])}
      {solid(p, fence.rail2!, FENCE.rail, thin(p, 'M8 66.6C30 67.4 50 67.6 70 68.6M20 69.4C40 70 52 70 66 71', FENCE.grain, 0.8, 0.9))}
      {POSTS.flatMap((x) => [
        <circle key={`a${x}`} cx={x} cy={45.8} r={0.8} fill={p.c(FENCE.nail)} />,
        <circle key={`b${x}`} cx={x} cy={68.2} r={0.8} fill={p.c(FENCE.nail)} />,
      ])}
      {POSTS.map((x) => tuft(x))}
      {thin(p, 'M31 92C31 88 30 85 28.6 83.4M66 92C66.4 89 67.6 87 69 86', FENCE.grassLight, 1.4)}
      <path d={leaf([66.6, 86.4], [63.4, 82.4], 1.8)} fill={p.c(FENCE.grass)} />
      <path d={leaf([66.6, 86.4], [70.8, 83.4], 1.8)} fill={p.c(FENCE.grass)} />
      <path d={leaf([66.6, 86.4], [67.4, 81.4], 1.8)} fill={p.c(FENCE.grassLight)} />
      <circle cx={28.4} cy={82.6} r={2.2} fill={p.c(FENCE.clover)} />
    </g>
  );
};

/* ---------------- Stepping Stones: for completing the Pond Club page ---------------- */

const STONE = { top: '#D3D1C7', edge: '#B9B6AA', moss: '#B5CC9C', mossDeep: '#9CBF8A' };
/** [cx, cy, rx, ry, wobble seed]: nearest first. */
const STONES: readonly (readonly [number, number, number, number, number])[] = [
  [68, 50.6, 12.6, 4, 1],
  [36, 61.6, 16.6, 5.2, 2],
  [65, 73.4, 20.6, 6.4, 3],
  [33, 85.4, 25, 7.2, 4],
];

function pebble(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  const pts = ellPts(cx, cy, rx, ry, 0, 360, 10)
    .slice(0, -1)
    .map(([x, y], i): Pt => {
      const k = 1 + Math.sin(i * 2.4 + seed * 1.7) * 0.06;
      return [cx + (x - cx) * k, cy + (y - cy) * k];
    });
  return smooth(pts);
}

const stones = shapes('decor-stepping-stones', {
  ...Object.fromEntries(STONES.map(([x, y, rx, ry, s], i) => [`edge${i}`, { d: pebble(x, y + 1.8, rx, ry, s), k: 0 }])),
  ...Object.fromEntries(STONES.map(([x, y, rx, ry, s], i) => [`top${i}`, { d: pebble(x, y, rx, ry, s), k: 0.3 }])),
  ...Object.fromEntries(STONES.map(([x, y, rx, ry], i) => [`moss${i}`, { d: ell(x - rx * 0.7, y - ry * 0.2, rx * 0.36, ry * 0.9), k: 0, clip: `top${i}` }])),
} as Record<string, { d: string; k: number; clip?: string }>);

export const steppingStones: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {STONES.map(([x, y, rx, ry], i) => (
        <g key={i}>
          {contact(p, x, y + 2.4, rx * 1.02, ry * 0.9)}
          {flat(p, stones[`edge${i}`]!, STONE.edge)}
          {solid(p, stones[`top${i}`]!, STONE.top, flat(p, stones[`moss${i}`]!, i % 2 ? STONE.moss : STONE.mossDeep))}
        </g>
      ))}
      {thin(
        p,
        'M50 72.6C50 70.4 49 69 48 68.2M52.4 72.4C52.6 70.8 53.6 69.6 55 69M80 86.6C80 84.6 79 83 77.6 82.2M82.6 86.4C83 84.8 84.2 83.6 85.6 83',
        STONE.mossDeep,
        1.2,
      )}
    </g>
  );
};
