/**
 * No. 06 Pantry decor: a teacup bath, a jam-jar lantern (glows at night), a cloth-lined bread
 * basket and a copper kettle. Standing on y = 92 of the 100×100 canvas.
 */
import { Glow, cast, contact, crescentOf, flat, lit, paint, shapes, solid, thin, type DecorRenderer } from './kit';
import { ell, n, poly, rect, smooth } from './geo';

/* ---------------- Teacup bath: a teacup of warm water, hamster-sized ---------------- */

const CUP = { china: '#FBF6EE', rimIn: '#F1E9DC', band: '#EFB4C1', water: '#CFE3EA', saucer: '#F6EFE3', well: '#EDE3D4', steam: '#FFFFFF' };

const tea = shapes('decor-teacup-bath', {
  saucer: 'M8 85.6C8 89.2 27 92.2 50 92.2C73 92.2 92 89.2 92 85.6V84.6H8Z',
  saucerTop: { d: ell(50, 84.6, 42, 5.4), k: 0 },
  handle: { d: 'M76 58.5C88 55.2 94.6 66 84.6 72.6C81.6 74.6 78 75.2 74.6 75L75.4 70.4C78 70.6 80.6 70 82.4 68.8C87.4 65.4 84.4 60.8 77.6 62.8Z', k: 0.5 },
  body: 'M17 52C17.6 67 26 80.6 38 83.4C40.6 84 59.4 84 62 83.4C74 80.6 82.4 67 83 52Z',
  band: { d: rect(10, 55.5, 80, 4.2), k: 0, clip: 'body' },
  rim: { d: ell(50, 52, 33, 7.4), k: 0 },
});

export const teacupBath: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92, 42, 2)}
      {solid(p, tea.saucer, CUP.saucer)}
      {flat(p, tea.saucerTop, CUP.saucer)}
      <path d={ell(50, 84.2, 24, 3)} fill={p.c(CUP.well)} />
      {solid(p, tea.handle, CUP.china)}
      {solid(p, tea.body, CUP.china, flat(p, tea.band, CUP.band))}
      {flat(p, tea.rim, CUP.china)}
      <path d={ell(50, 52.8, 29.6, 5.6)} fill={p.c(CUP.rimIn)} />
      <path d={ell(50, 53.8, 28.4, 4.8)} fill={p.c(CUP.water)} />
      {thin(p, 'M40 44C36.6 39.4 42.4 36.4 39.4 31M52.6 45C49.4 40 55.6 37 52.4 30.4', CUP.steam, 2.2, p.night ? 0.25 : 0.7)}
    </g>
  );
};

/* ---------------- Jam jar lantern: a tea light inside a jam jar ---------------- */

const JAR = {
  glass: '#E3EDF0',
  glassNight: '#FFD9A6',
  neck: '#D2DFE4',
  thread: '#C1D1D8',
  wire: '#8C8790',
  twine: '#C9A270',
  tin: '#D6DCE0',
  wax: '#FBF4E6',
  flame: '#FFD27A',
  core: '#FFF1C8',
};

const jar = shapes('decor-jam-jar', {
  body: rect(27, 41, 46, 51, [6, 6, 7, 7]),
  neck: { d: rect(30, 29, 40, 13, 2.4), k: 0.6 },
  tin: { d: rect(38.5, 77, 23, 11, [1, 1, 2, 2]), k: 0.5 },
});

export const jamJar: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {p.night && <Glow cx={50} cy={66} r={46} strength={0.5} />}
      {contact(p, 50, 92.2, 26, 2.2)}
      {thin(p, 'M31.6 35C27.6 9.6 72.4 9.6 68.4 35', JAR.wire, 1.4)}
      <path d={jar.body.d} fill={lit(p, p.c(JAR.glass), JAR.glassNight)} />
      {solid(p, jar.tin, JAR.tin)}
      <path d={ell(50, 77, 11.5, 2)} fill={p.c(JAR.wax)} />
      {thin(p, 'M50 76.6V72.6', '#6B5D5A', 1)}
      <path
        d="M50 60.5C52.6 64.6 54.2 67.6 54.2 70C54.2 72.6 52.4 74.2 50 74.2C47.6 74.2 45.8 72.6 45.8 70C45.8 67.6 47.4 64.6 50 60.5Z"
        fill={lit(p, JAR.flame, '#FFD27A')}
      />
      <path d="M50 66.4C51.2 68.4 51.8 69.8 51.8 70.8C51.8 72 51 72.8 50 72.8C49 72.8 48.2 72 48.2 70.8C48.2 69.8 48.8 68.4 50 66.4Z" fill={JAR.core} />
      <path d={rect(31, 47, 4.4, 36, 2.2)} fill="#fff" opacity={p.night ? 0.3 : 0.75} />
      {crescentOf(p, jar.body)}
      {solid(p, jar.neck, JAR.neck, [thin(p, 'M31 33H69M31 37H69', JAR.thread, 1.2)])}
      {thin(p, 'M29.6 39.4H70.4', JAR.twine, 2)}
      {thin(p, 'M58 39.6C55.4 43.6 58.6 45.8 60.4 42.6M58 39.6C61.4 43 64.4 41.4 62.6 39.8M58 39.6L56.6 46.4M58 39.6L60.6 46.2', JAR.twine, 1.1)}
    </g>
  );
};

/* ---------------- Bread basket: cloth-lined, with room for a nap ---------------- */

const BASKET = { wicker: '#D8AE78', gap: '#B98C58', rim: '#E4BF8B', cloth: '#F6CBD4', clothShade: '#E7AFBD', check: '#FDEFF2' };

const basket = shapes('decor-bread-basket', {
  back: { d: ell(50, 58, 44, 12), k: 0 },
  cornerL: {
    d: poly(
      [
        [18, 57],
        [27, 41.6],
        [39, 53],
      ],
      [0, 2, 0],
    ),
    k: 0.5,
  },
  cornerR: {
    d: poly(
      [
        [62, 52.6],
        [75, 42.6],
        [82, 57],
      ],
      [0, 2, 0],
    ),
    k: 0.5,
  },
  front: 'M6 58C7.6 76 15 89.6 29 91.6H71C85 89.6 92.4 76 94 58C88 66 70 70 50 70C30 70 12 66 6 58Z',
  flapL: {
    d: smooth([
      [9, 60],
      [22, 65.6],
      [30, 67.2],
      [26, 76],
      [18.6, 81],
      [14, 74],
    ]),
    k: 0.5,
  },
  flapR: {
    d: smooth([
      [91, 60],
      [78, 65.6],
      [70, 67.2],
      [74, 76],
      [81.4, 81],
      [86, 74],
    ]),
    k: 0.5,
  },
  checksL: { d: 'M8 64.6H32V66.6H8ZM8 72H32V74H8ZM15.6 58V84H17.6V58ZM23 58V84H25V58Z', k: 0, clip: 'flapL' },
  checksR: { d: 'M68 64.6H92V66.6H68ZM68 72H92V74H68ZM82.4 58V84H84.4V58ZM75 58V84H77V58Z', k: 0, clip: 'flapR' },
  checksBack: { d: 'M10 47H90V49H10ZM26 30V60H28V30ZM72 30V60H74V30Z', k: 0, clip: 'cornerL' },
  checksBackR: { d: 'M10 48H90V50H10ZM72 30V60H74V30Z', k: 0, clip: 'cornerR' },
});

/** The weave: short dark gaps between the weavers, offset every other row like brickwork. */
const WEAVE = [67, 74, 81, 87.4].map((y, row) => {
  const half = [41, 40, 36, 28][row]!;
  let d = '';
  for (let x = 50 - half + (row % 2) * 4.5 + 3; x < 50 + half - 2; x += 9) d += `M${n(x)} ${n(y - 2.4)}v4.8`;
  return d;
});

export const breadBasket: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {contact(p, 50, 92.2, 42, 2.4)}
      {flat(p, basket.back, BASKET.rim)}
      <path d={ell(50, 59, 38.6, 8.8)} fill={p.c(BASKET.clothShade)} />
      {solid(p, basket.cornerL, BASKET.cloth, flat(p, basket.checksBack, BASKET.check))}
      {solid(p, basket.cornerR, BASKET.cloth, flat(p, basket.checksBackR, BASKET.check))}
      {solid(p, basket.front, BASKET.wicker, [
        thin(
          p,
          'M9 70.6C20 75 36 77 50 77C64 77 80 75 91 70.6M12 77.6C24 82 38 84 50 84C62 84 76 82 88 77.6M18 84.6C28 88 40 89.6 50 89.6C60 89.6 72 88 82 84.6',
          BASKET.gap,
          1,
        ),
        ...WEAVE.map((d) => thin(p, d, BASKET.gap, 1.6)),
        thin(p, 'M7.4 60.4C14 67.8 32 71.8 50 71.8C68 71.8 86 67.8 92.6 60.4', BASKET.rim, 3.2),
      ])}
      {solid(p, basket.flapL, BASKET.cloth, flat(p, basket.checksL, BASKET.check))}
      {solid(p, basket.flapR, BASKET.cloth, flat(p, basket.checksR, BASKET.check))}
    </g>
  );
};

/* ---------------- Copper kettle: polished copper, a wooden handle ---------------- */

const KETTLE = { copper: '#DB8E62', band: '#C9774E', sheen: '#EAAA82', wood: '#9B7358', knob: '#8E6A52' };

const kettle = shapes('decor-copper-kettle', {
  spout: { d: 'M72 79C82 76 88.4 62 92 46.4C92.6 44.4 95.6 44.2 96.6 45.4C95.6 62 88.6 80.4 76.6 87Z', k: 0.6 },
  postL: {
    d: poly(
      [
        [35.4, 50],
        [33.8, 25],
        [37.8, 25],
        [39.8, 49],
      ],
      1,
    ),
    k: 0.5,
  },
  postR: {
    d: poly(
      [
        [64.6, 50],
        [66.2, 25],
        [62.2, 25],
        [60.2, 49],
      ],
      1,
    ),
    k: 0.5,
  },
  grip: { d: rect(28, 19, 44, 8, 4), k: 0.6, rim: true },
  body: 'M19 87C14.6 70 22 50 50 47.6C78 50 85.4 70 81 87C80.4 90 78.4 91.6 75.4 91.6H24.6C21.6 91.6 19.6 90 19 87Z',
  base: { d: rect(10, 84.6, 80, 10), k: 0, clip: 'body' },
  lid: { d: 'M36.4 49C36.4 42.6 42.6 39.6 50 39.6C57.4 39.6 63.6 42.6 63.6 49Z', k: 0.6 },
  knob: { d: ell(50, 37.4, 4.6, 3.6), k: 0.5, rim: true },
});

export const copperKettle: DecorRenderer = (o) => {
  const p = paint(o);
  const sheenX = p.from === 'right' ? 66 : p.from === 'top' ? 50 : 34;
  return (
    <g>
      {contact(p, 50, 92.4, 36, 2.6)}
      {solid(p, kettle.spout, KETTLE.copper)}
      {solid(p, kettle.postL, KETTLE.band)}
      {solid(p, kettle.postR, KETTLE.band)}
      {solid(p, kettle.grip, KETTLE.wood)}
      {solid(p, kettle.body, KETTLE.copper, [
        <path d={p.from === 'top' ? ell(50, 58, 12, 3.4) : ell(sheenX, 68, 3.6, 13, p.from === 'right' ? 12 : -12)} fill={p.c(KETTLE.sheen)} />,
        flat(p, kettle.base, KETTLE.band),
      ])}
      {solid(p, kettle.lid, KETTLE.copper, cast(p, 'M36.6 47.2H63.4V49H36.6Z', 0.8))}
      {solid(p, kettle.knob, KETTLE.knob)}
      <path
        d={poly(
          [
            [34, 49],
            [66, 49],
            [68, 51.6],
            [32, 51.6],
          ],
          1,
        )}
        fill={p.c(KETTLE.band)}
      />
    </g>
  );
};
