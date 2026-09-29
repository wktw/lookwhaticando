/**
 * Baked treats: biscuits, cookies, a steamed bun, a slice of shortcake, honey toast, and the
 * lavender shortbread baked with flowers from her own lavender. On the 100×100 canvas, standing on
 * y = 86. No chocolate anywhere: the dark heart is carob.
 */
import type { ItemRenderer } from './types';
import { contact, flat, paint, shapes, solid, thin, type ShapeDef } from '@/art/scene/decor/kit';
import { ell, ellPts, heart, n, poly, rect, rotate, smooth, star, type Pt } from '@/art/scene/decor/geo';
import { bakingPaper, saucer } from './tableware';

/* ---------------- Oat biscuit: a small plain biscuit ---------------- */

const OAT = { face: '#E8C790', edge: '#D6AE72', dock: '#C99E65', flake: '#F4E3BF' };

const oatBiscuit_ = shapes('treat-oat-biscuit', {
  flatEdge: `M8 70.6V74.6C8 80.6 21.6 85.4 38 85.4C54.4 85.4 68 80.6 68 74.6V70.6Z`,
  flatTop: { d: ell(38, 70.6, 30, 9.4), k: 0 },
  standing: ell(62, 50, 27, 27),
  rim: { d: ell(62, 50, 27, 27), k: 0 },
});

const FLAKES: readonly Pt[] = [
  [52, 38],
  [70, 44],
  [60, 62],
  [74, 58],
  [48, 54],
  [64, 30],
];
const DOCK: readonly Pt[] = [
  [56, 44],
  [66, 40],
  [62, 52],
  [72, 52],
  [54, 58],
  [66, 62],
];

const oatBiscuit: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 50, 85.8, 40, 2.4)}
      {solid(p, oatBiscuit_.standing, OAT.face, [
        <path d={ell(62, 50, 22.6, 22.6)} fill={p.c('#EDD09F')} />,
        ...DOCK.map(([x, y], i) => <circle key={`d${i}`} cx={x} cy={y} r={1.2} fill={p.c(OAT.dock)} />),
        ...FLAKES.map(([x, y], i) => <ellipse key={`f${i}`} cx={x} cy={y} rx={2.2} ry={1.2} transform={`rotate(${i * 50} ${x} ${y})`} fill={p.c(OAT.flake)} />),
      ])}
      {solid(p, oatBiscuit_.flatEdge, OAT.edge)}
      {flat(p, oatBiscuit_.flatTop, OAT.face)}
      <path d={ell(38, 70.6, 25, 7.6)} fill={p.c('#EDD09F')} />
      {[
        [30, 69],
        [40, 67],
        [48, 71],
        [34, 73.4],
        [44, 74],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.1} fill={p.c(OAT.dock)} />
      ))}
    </g>
  );
};

/* ---------------- Lavender shortbread: baked with a few flowers from her lavender ---------------- */

const SHORT = { top: '#F6E2AE', edge: '#E6C684', dot: '#D9B874', bud: '#A895D2' };

/** One finger lying flat, seen from a little above: its pricked top, its front edge and its end. */
function shortFinger(x: number, y: number, w: number, lean: number): { top: string; front: string; end: string } {
  const d = 11;
  const top: Pt[] = [
    [x, y],
    [x + w, y - lean],
    [x + w + 6, y - lean - d],
    [x + 6, y - d],
  ];
  return {
    top: poly(top, 1.6),
    front: poly(
      [
        [x, y],
        [x + w, y - lean],
        [x + w, y - lean + 7],
        [x, y + 7],
      ],
      1.2,
    ),
    end: poly(
      [
        [x + w, y - lean],
        [x + w + 6, y - lean - d],
        [x + w + 6, y - lean - d + 7],
        [x + w, y - lean + 7],
      ],
      1,
    ),
  };
}

const LOW = shortFinger(10, 76, 62, 0);
const HIGH = shortFinger(24, 60, 58, 6);

const short = shapes('treat-lavender-shortbread', {
  lowEnd: { d: LOW.end, k: 0.5 },
  lowFront: { d: LOW.front, k: 0.6 },
  lowTop: { d: LOW.top, k: 0 },
  highEnd: { d: HIGH.end, k: 0.5 },
  highFront: { d: HIGH.front, k: 0.6 },
  highTop: { d: HIGH.top, k: 0 },
});

/** Fork pricks in two rows along a finger's top, and a few lavender buds baked in. */
function pricks(x: number, y: number, w: number, lean: number): Pt[] {
  const out: Pt[] = [];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.7) / 5.4;
      out.push([x + 3 + row * 3 + w * t, y - 3.4 - row * 4 - lean * t]);
    }
  }
  return out;
}

const lavenderShortbread: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  const dots = (pts: readonly Pt[]) => pts.map(([x, y], i) => <circle key={`d${i}`} cx={n(x)} cy={n(y)} r={1} fill={p.c(SHORT.dot)} />);
  const buds = (pts: readonly Pt[]) =>
    pts.map(([x, y], i) => <ellipse key={`b${i}`} cx={x} cy={y} rx={1.7} ry={1} transform={`rotate(-25 ${x} ${y})`} fill={p.c(SHORT.bud)} />);
  return (
    <g>
      {contact(p, 46, 84, 38, 2.4)}
      {solid(p, short.lowEnd, SHORT.edge)}
      {solid(p, short.lowFront, SHORT.edge)}
      {solid(p, short.lowTop, SHORT.top, [
        ...dots(pricks(10, 76, 62, 0)),
        ...buds([
          [30, 69],
          [50, 72],
          [62, 67],
        ]),
      ])}
      {solid(p, short.highEnd, SHORT.edge)}
      {solid(p, short.highFront, SHORT.edge)}
      {solid(p, short.highTop, SHORT.top, [
        ...dots(pricks(24, 60, 58, 6)),
        ...buds([
          [36, 55],
          [52, 51],
          [66, 50],
          [44, 50.4],
        ]),
      ])}
    </g>
  );
};

/* ---------------- Fish crackers: a handful of tiny fish-shaped crackers ---------------- */

const FISH = { cracker: '#EEAA5C', deep: '#DD9447', eye: '#C07A38' };
const fishSaucer = saucer('treat-fish-crackers', 50, 72, 44);

/** One cracker: an oval body and a tail, facing `dir`, turned by `rot`. */
function fish(cx: number, cy: number, s: number, rot: number, dir: 1 | -1): string {
  const pts: Pt[] = [
    [cx - 9 * dir * s, cy],
    [cx - 4 * dir * s, cy - 5 * s],
    [cx + 4 * dir * s, cy - 4.6 * s],
    [cx + 8 * dir * s, cy - 1 * s],
    [cx + 13 * dir * s, cy - 5 * s],
    [cx + 12 * dir * s, cy],
    [cx + 13 * dir * s, cy + 5 * s],
    [cx + 8 * dir * s, cy + 1 * s],
    [cx + 4 * dir * s, cy + 4.6 * s],
    [cx - 4 * dir * s, cy + 5 * s],
  ];
  return poly(rotate(pts, rot, cx, cy), 2.2 * s);
}

const CRACKERS: readonly (readonly [number, number, number, 1 | -1])[] = [
  [32, 62, -8, 1],
  [66, 59, 12, -1],
  [48, 48, -20, 1],
  [68, 71, -6, 1],
  [30, 73, 10, -1],
  [50, 64, 4, 1],
];
const FISH_SIZE = 1.3;

const fishShapes = shapes('treat-fish-crackers', Object.fromEntries(CRACKERS.map(([x, y, r, d], i) => [`f${i}`, { d: fish(x, y, FISH_SIZE, r, d), k: 0.5 }])));

const fishCrackers: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {fishSaucer(p)}
      {CRACKERS.map(([x, y, r, d], i) => {
        const [ex, ey] = rotate([[x - 4.6 * d * FISH_SIZE, y - 0.8]], r, x, y)[0]!;
        return <g key={i}>{solid(p, fishShapes[`f${i}`]!, i % 2 ? FISH.deep : FISH.cracker, <circle cx={n(ex)} cy={n(ey)} r={1.3} fill={p.c(FISH.eye)} />)}</g>;
      })}
    </g>
  );
};

/* ---------------- Bone biscuit: snapped in half to share ---------------- */

const BONE = { face: '#E5BA80', dock: '#C99A62', crumb: '#D9A96C' };

/** Half a bone biscuit lying along y = cy: two knobs at `knobX` and a jagged break at `breakX`. */
function halfBone(knobX: number, breakX: number, cy: number): Pt[] {
  const d = Math.sign(breakX - knobX);
  return [
    [knobX + 3 * d, cy - 6.4],
    [breakX, cy - 6.4],
    [breakX - 2.2 * d, cy - 2.6],
    [breakX + 1.4 * d, cy + 0.4],
    [breakX - 1.2 * d, cy + 3.6],
    [breakX + 0.6 * d, cy + 6.4],
    [knobX + 3 * d, cy + 6.4],
  ];
}

/** The right half leans against the left one, its knobs on the sill. */
const LEAN = 26;
const PIVOT: Pt = [80, 70.6];
const leanPts = (pts: readonly Pt[]) => rotate(pts, LEAN, ...PIVOT);

const bone = shapes('treat-bone-biscuit', {
  rightBody: poly(leanPts(halfBone(80, 54, 70.6)), [0, 0.6, 0.6, 0.6, 0.6, 0.6, 0]),
  rightKnobA: ell(...leanPts([[80, 63]])[0]!, 8, 8),
  rightKnobB: ell(...leanPts([[80, 78.2]])[0]!, 8, 8),
  leftBody: poly(halfBone(18, 50, 70), [0, 0.6, 0.6, 0.6, 0.6, 0.6, 0]),
  leftKnobA: ell(18, 62.4, 8, 8),
  leftKnobB: ell(18, 77.6, 8, 8),
});

const boneBiscuit: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  const docks = (pts: readonly Pt[]) => pts.map(([x, y], i) => <circle key={i} cx={n(x)} cy={n(y)} r={1.1} fill={p.c(BONE.dock)} />);
  return (
    <g>
      {contact(p, 50, 85.8, 40, 2.4)}
      {solid(p, bone.rightKnobA, BONE.face)}
      {solid(p, bone.rightKnobB, BONE.face)}
      {solid(
        p,
        bone.rightBody,
        BONE.face,
        docks(
          leanPts([
            [60, 68],
            [67, 68],
            [74, 68],
            [60, 73.4],
            [67, 73.4],
            [74, 73.4],
          ]),
        ),
      )}
      {solid(p, bone.leftKnobA, BONE.face)}
      {solid(p, bone.leftKnobB, BONE.face)}
      {solid(
        p,
        bone.leftBody,
        BONE.face,
        docks([
          [26, 67.4],
          [33, 67.4],
          [40, 67.4],
          [26, 72.8],
          [33, 72.8],
          [40, 72.8],
        ]),
      )}
      {[
        [53, 85],
        [57.6, 85.6],
        [48, 85.4],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i ? 0.9 : 1.3} fill={p.c(BONE.crumb)} />
      ))}
    </g>
  );
};

/* ---------------- Peanut butter cookie: forked, nothing else in it ---------------- */

const PB = { face: '#DDA66A', light: '#E7B97F', fork: '#C88E52', edge: '#C98F55' };

const pb = shapes('treat-pb-cookie', {
  flatEdge: 'M12 72V75.6C12 81 24 85.6 40 85.6C56 85.6 68 81 68 75.6V72Z',
  flatTop: { d: ell(40, 72, 28, 8.6), k: 0 },
  standing: ell(60, 48, 28, 27.6),
});

const pbCookie: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  const hatch = 'M44 40L72 34M46 48L76 42M47 56L77 50M49 63L74 58M50 30L58 66M58 28L66 68M66 27L73 64M74 30L78 50';
  return (
    <g>
      {contact(p, 50, 85.8, 40, 2.4)}
      {solid(p, pb.standing, PB.face, [<path d={ell(60, 48, 24.4, 24)} fill={p.c(PB.light)} />, thin(p, hatch, PB.fork, 1.6)])}
      {solid(p, pb.flatEdge, PB.edge)}
      {flat(p, pb.flatTop, PB.face)}
      <path d={ell(40, 72, 24, 7)} fill={p.c(PB.light)} />
      {thin(p, 'M24 70.6L50 67.4M26 74.6L56 70.8M32 66.6L38 77.6M42 66L48 77', PB.fork, 1.3)}
    </g>
  );
};

/* ---------------- Oat cookie: chewy in the middle ---------------- */

const OATC = { face: '#D9A86A', light: '#E4BB84', oat: '#F3E0BC', raisin: '#7C5147' };

const OAT_EDGE: Pt[] = ellPts(52, 50, 33, 32, 0, 360, 22)
  .slice(0, -1)
  .map(([x, y], i) => {
    const k = 1 + (i % 3 === 0 ? 0.045 : i % 3 === 1 ? -0.03 : 0.01);
    return [52 + (x - 52) * k, 50 + (y - 50) * k];
  });

const oatc = shapes('treat-oat-cookie', {
  cookie: smooth(OAT_EDGE),
  crumbA: { d: ell(20, 82, 4, 3), k: 0.5 },
  crumbB: { d: ell(84, 83, 3, 2.4), k: 0.5 },
});

const OATS: readonly Pt[] = [
  [40, 34],
  [60, 30],
  [70, 44],
  [44, 52],
  [58, 58],
  [36, 64],
  [66, 66],
  [50, 42],
];
const RAISINS: readonly Pt[] = [
  [50, 30],
  [34, 46],
  [66, 54],
  [48, 66],
  [72, 36],
];

const oatCookie: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 52, 84.4, 32, 2.4)}
      {solid(p, oatc.cookie, OATC.face, [
        <path d={smooth(OAT_EDGE.map(([x, y]) => [52 + (x - 52) * 0.84, 50 + (y - 50) * 0.84] as const))} fill={p.c(OATC.light)} />,
        ...OATS.map(([x, y], i) => <ellipse key={`o${i}`} cx={x} cy={y} rx={3} ry={1.7} transform={`rotate(${i * 41} ${x} ${y})`} fill={p.c(OATC.oat)} />),
        ...RAISINS.map(([x, y], i) => (
          <ellipse key={`r${i}`} cx={x} cy={y} rx={2.4} ry={1.9} transform={`rotate(${i * 30} ${x} ${y})`} fill={p.c(OATC.raisin)} />
        )),
      ])}
      {solid(p, oatc.crumbA, OATC.face)}
      {solid(p, oatc.crumbB, OATC.face)}
    </g>
  );
};

/* ---------------- Steamed bun: soft and warm, with a little pleat on top ---------------- */

const BUN = { dough: '#FBF6EE', pleat: '#E6DACB', bamboo: '#DDBB82', inside: '#B99260', weave: '#C9A267' };

/** The bun sits in a small bamboo steamer, which is what makes a white dome read as a bun. */
const bun = shapes('treat-steamed-bun', {
  steamerBack: { d: ell(50, 64, 40, 8.4), k: 0 },
  bun: 'M17 70C15 47 31 30 50 30C69 30 85 47 83 70C76 73 64 74.4 50 74.4C36 74.4 24 73 17 70Z',
  steamer: 'M10 64C10 68.6 28 72.4 50 72.4C72 72.4 90 68.6 90 64V79.6C90 84.2 72 88 50 88C28 88 10 84.2 10 79.6Z',
});

const steamedBun: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 50, 87.4, 40, 2.6)}
      {flat(p, bun.steamerBack, BUN.inside)}
      {solid(p, bun.bun, BUN.dough, [
        thin(p, 'M50 34C44 38 38 40 30 40M50 34C46 40 42 46 37 50M50 34C50 40 50 46 48.6 52M50 34C54 39 58 44 62.4 49M50 34C56 37 62 39 70 39', BUN.pleat, 1.5),
        <path d={ell(50, 34, 3.2, 2.4)} fill={p.c(BUN.pleat)} />,
      ])}
      {solid(p, bun.steamer, BUN.bamboo, [
        thin(p, 'M10.6 70C16 75 32 78.2 50 78.2C68 78.2 84 75 89.4 70M10.6 75.4C16 80.4 32 83.6 50 83.6C68 83.6 84 80.4 89.4 75.4', BUN.weave, 1.1, 0.9),
      ])}
      {thin(p, 'M40 24C37 20 42 17 39.6 12.6M58 25C55 21 60 18 57.6 13.6', '#FFFFFF', 2, p.night ? 0.2 : 0.7)}
    </g>
  );
};

/* ---------------- Strawberry shortcake: cream, sponge, and one strawberry ---------------- */

const CAKE = { sponge: '#F4DDA4', cream: '#FFF8F0', side: '#FBF1E6', berry: '#E4717B', seed: '#F7DC8C', leaf: '#8DB57A' };
const cakePlate = saucer('treat-shortcake', 50, 78, 43);

/** A wedge with its point to the left: the cut face shows the layers, the rounded back is frosted. */
const cake = shapes('treat-shortcake', {
  back: { d: 'M76 52L84 40C85.6 50 85.6 64 84 72L76 80Z', k: 0.6 },
  face: rect(14, 52, 62, 28, [0, 0, 1.4, 1.4]),
  cream: { d: 'M0 61H100V65H0ZM0 71H100V74.6H0Z', k: 0, clip: 'face' },
  slices: { d: `${ell(30, 63, 4.2, 3)}${ell(46, 63, 4.2, 3)}${ell(62, 63, 4.2, 3)}`, k: 0, clip: 'face' },
  top: {
    d: poly(
      [
        [14, 52],
        [76, 52],
        [84, 40],
      ],
      [0.6, 0.6, 0.6],
    ),
    k: 0,
  },
  dollop: smooth([
    [64, 46],
    [66, 38.6],
    [72, 35.6],
    [79, 37],
    [82, 42.6],
    [76, 47.6],
  ]),
  berry: 'M64 33C64 26 68 21.6 72.4 21.6C76.8 21.6 80.6 26 80.6 33C80.6 37 76.6 39.4 72.4 39.4C68 39.4 64 37 64 33Z',
});

const shortcake: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {cakePlate(p)}
      {solid(p, cake.back, CAKE.side)}
      {solid(p, cake.face, CAKE.sponge, [flat(p, cake.cream, CAKE.cream), flat(p, cake.slices, CAKE.berry)])}
      {flat(p, cake.top, CAKE.cream)}
      {solid(p, cake.dollop, CAKE.cream)}
      {solid(
        p,
        cake.berry,
        CAKE.berry,
        [
          [68, 27],
          [72.4, 25.4],
          [76.6, 27.6],
          [70, 32.6],
          [75, 33.4],
        ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.8} fill={p.c(CAKE.seed)} />),
      )}
      <path d="M66.6 23C68.6 19.4 71 21 72.4 22C74 20.6 76.6 19.4 78.4 23C75.4 24.4 69.6 24.4 66.6 23Z" fill={p.c(CAKE.leaf)} />
    </g>
  );
};

/* ---------------- Honey toast: cut into fingers ---------------- */

const TOAST = { crust: '#C98A56', crumb: '#F0D39C', honey: '#F2BF55' };

/** A slice of bread standing face-on (its domed top), moved `dx` sideways. */
function bread(dx: number, inset = 0): string {
  const x0 = 20 + dx + inset;
  const x1 = 80 + dx - inset;
  const t = 16 + inset;
  return (
    `M${n(x0)} 84V${n(42 + inset * 0.2)}C${n(x0 - 7 + inset)} ${n(40 + inset * 0.2)} ${n(x0 - 9 + inset * 1.4)} ${n(27 + inset)} ${n(x0)} ${n(t + 5)}` +
    `C${n(x0 + 9)} ${n(t - 3)} ${n(x1 - 9)} ${n(t - 3)} ${n(x1)} ${n(t + 5)}C${n(x1 + 9 - inset * 1.4)} ${n(27 + inset)} ${n(x1 + 7 - inset)} ${n(40 + inset * 0.2)} ${n(x1)} ${n(42 + inset * 0.2)}V84Z`
  );
}

/** The three fingers: which strip of the slice, and how far each has slid apart. */
const FINGERS = [
  { x0: 8, x1: 39.2, dx: -3 },
  { x0: 40.8, x1: 59.2, dx: 0 },
  { x0: 60.8, x1: 92, dx: 3 },
];

const toast = shapes(
  'treat-honey-toast',
  Object.fromEntries(
    FINGERS.flatMap(({ x0, x1, dx }, i) => [
      [`slice${i}`, { d: bread(dx), k: 0 }],
      [`crumbAll${i}`, { d: bread(dx, 4.4), k: 0 }],
      [`honeyAll${i}`, { d: bread(dx, 7.4), k: 0 }],
      [`finger${i}`, { d: rect(x0 + dx, 0, x1 - x0, 100), clip: `slice${i}` }],
      [`crumb${i}`, { d: rect(x0 + dx, 0, x1 - x0, 100), k: 0, clip: `crumbAll${i}` }],
      [`honey${i}`, { d: rect(x0 + dx, 0, x1 - x0, 100), k: 0, clip: `honeyAll${i}` }],
    ]),
  ) as Record<string, ShapeDef>,
);

const honeyToast: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 50, 85.4, 40, 2.4)}
      {FINGERS.map((_, i) => (
        <g key={i}>
          {solid(p, toast[`finger${i}`]!, TOAST.crust, [flat(p, toast[`crumb${i}`]!, TOAST.crumb), flat(p, toast[`honey${i}`]!, TOAST.honey, 0.55)])}
        </g>
      ))}
    </g>
  );
};

/* ---------------- Gingerbread: a small star with white icing ---------------- */

const GINGER = { dough: '#C98A56', icing: '#FFF8F0' };

const ginger = shapes('treat-gingerbread', {
  star: star(50, 50, 38, 18, 5, -90, 3),
});

const gingerbread: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 50, 86, 30, 2.4)}
      {solid(p, ginger.star, GINGER.dough, [
        <path
          d={star(50, 50, 31, 14.6, 5, -90, 2)}
          fill="none"
          stroke={p.c(GINGER.icing)}
          stroke-width={p.w(1.8)}
          stroke-linejoin="round"
          stroke-dasharray="0"
        />,
        ...[
          [50, 50],
          [44, 44],
          [56, 44],
          [50, 58],
        ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.8} fill={p.c(GINGER.icing)} />),
      ])}
    </g>
  );
};

/* ---------------- Heart cookie: iced pink, slightly lopsided ---------------- */

const HEARTC = { cookie: '#E8C38A', icing: '#F4B6C4' };

const heartCookie_ = shapes('treat-heart-cookie', {
  cookie: heart(50, 52, 72, 0.6),
  icing: { d: heart(49.6, 51, 60, 0.9), k: 0 },
});

const heartCookie: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {contact(p, 50, 86, 26, 2.4)}
      {solid(p, heartCookie_.cookie, HEARTC.cookie, flat(p, heartCookie_.icing, HEARTC.icing))}
    </g>
  );
};

/* ---------------- Carob heart: the colour of chocolate, but pet-safe ---------------- */

const CAROB = { heart: '#7A5646', bevel: '#8C6655', pod: '#6E4C3C', seed: '#86624F' };
const carobPaper = bakingPaper('treat-carob-heart', 48, 79, 84);

const carob = shapes('treat-carob-heart', {
  heart: { d: heart(42, 46, 60, -0.3), rim: true },
  pod: {
    d: smooth([
      [46, 82.6],
      [58, 76],
      [72, 71],
      [86, 69.6],
      [94, 72],
      [90, 76.6],
      [76, 78.6],
      [62, 82.4],
      [50, 86],
    ]),
    rim: true,
  },
});

const carobHeart: ItemRenderer = (o) => {
  const p = paint({ light: o?.light });
  return (
    <g>
      {carobPaper(p)}
      {solid(p, carob.heart, CAROB.heart, <path d={heart(41.4, 43.6, 45, -0.3)} fill={p.c(CAROB.bevel)} />)}
      {solid(
        p,
        carob.pod,
        CAROB.pod,
        [
          [56, 80.6],
          [64, 77.6],
          [72, 75.2],
          [80, 73.6],
          [87, 72.6],
        ].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={2.6} ry={1.6} transform={`rotate(-16 ${x} ${y})`} fill={p.c(CAROB.seed)} />),
      )}
      {thin(p, 'M93.4 72C95 70 96 68 95.6 66', CAROB.pod, 1.4)}
    </g>
  );
};

export const BAKED_TREATS: Record<string, ItemRenderer> = {
  'treat-oat-biscuit': oatBiscuit,
  'treat-lavender-shortbread': lavenderShortbread,
  'treat-fish-crackers': fishCrackers,
  'treat-bone-biscuit': boneBiscuit,
  'treat-pb-cookie': pbCookie,
  'treat-oat-cookie': oatCookie,
  'treat-steamed-bun': steamedBun,
  'treat-shortcake': shortcake,
  'treat-honey-toast': honeyToast,
  'treat-gingerbread': gingerbread,
  'treat-heart-cookie': heartCookie,
  'treat-carob-heart': carobHeart,
};
