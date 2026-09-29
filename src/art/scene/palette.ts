/**
 * The room's colours by time of day, and the view through the glass by time and season
 * (DESIGN §10.1, §10.4). Warm paper walls and a pale painted sill by day; Lamplight indigo at night.
 * Paint goes on as SVG attributes so any layer can be serialised on its own (photo mode).
 */
import { mix } from './color';
import type { Season, TimeOfDay } from './time';

export interface RoomPalette {
  time: TimeOfDay;
  night: boolean;
  wall: string;
  /** The wall below the sill, a touch deeper. */
  wallLow: string;
  frame: string;
  /** The frame's shaded edges (the side of each bar away from the room light). */
  frameShade: string;
  /** Painted sill: its top, the seam against the window rail, the front face and the shadow under it. */
  sill: string;
  sillSeam: string;
  nosing: string;
  underNosing: string;
  /** Floorboards (the Saucer Pond) and the plank seams. */
  floor: string;
  floorSeam: string;
  /** The sunbeam on the sill (null at night: the lamp takes over). */
  beam: { color: string; opacity: number } | null;
  /** Values for the art tokens inside the scene, so every child is lit alike whatever the page theme. */
  tokens: { shade: string; contact: string; sun: string };
}

const DAY: RoomPalette = {
  time: 'day',
  night: false,
  wall: '#EFE5D8',
  wallLow: '#E9DDCD',
  frame: '#FFFBF5',
  frameShade: '#E9DFD2',
  sill: '#E7DAC8',
  sillSeam: '#DCCDB9',
  nosing: '#DFD0BB',
  underNosing: '#D9C9B3',
  floor: '#E3D0B6',
  floorSeam: '#D6C0A3',
  beam: { color: '#FFF0C6', opacity: 0.95 },
  tokens: { shade: 'rgba(94, 76, 154, 0.16)', contact: 'rgba(59, 50, 54, 0.08)', sun: 'rgba(255, 231, 168, 0.55)' },
};

/** Morning: cooler and softer, the beam pale. */
const DAWN: RoomPalette = {
  ...DAY,
  time: 'dawn',
  wall: '#ECE4DC',
  wallLow: '#E6DCD1',
  frame: '#FFFBF8',
  frameShade: '#E6DED6',
  sill: '#E5DBCF',
  sillSeam: '#D9CEC1',
  nosing: '#DCD1C4',
  underNosing: '#D5C9BB',
  floor: '#E1D1BE',
  floorSeam: '#D3C2AD',
  beam: { color: '#FFF4DA', opacity: 0.95 },
};

/** Evening: the room glows apricot and the beam turns honey. */
const GOLDEN: RoomPalette = {
  ...DAY,
  time: 'golden',
  wall: '#F1DECB',
  wallLow: '#EAD3BD',
  frame: '#FFF6EA',
  frameShade: '#EBD5BF',
  sill: '#EAD5BE',
  sillSeam: '#DFC6AB',
  nosing: '#E2CAB1',
  underNosing: '#D9BEA2',
  floor: '#E6CCAE',
  floorSeam: '#D8BA98',
  beam: { color: '#FFDCA8', opacity: 0.86 },
};

/** Lamplight: indigo walls and one warm pool from the lamp on the right. */
const NIGHT: RoomPalette = {
  time: 'night',
  night: true,
  wall: '#34304A',
  wallLow: '#2E2A42',
  frame: '#4B4569',
  frameShade: '#403B5E',
  sill: '#433D5C',
  sillSeam: '#3A3553',
  nosing: '#3A3552',
  underNosing: '#2A2640',
  floor: '#3E3852',
  floorSeam: '#353049',
  beam: null,
  tokens: { shade: 'rgba(10, 8, 22, 0.3)', contact: 'rgba(0, 0, 0, 0.22)', sun: 'rgba(255, 201, 138, 0.18)' },
};

export const ROOM: Record<TimeOfDay, RoomPalette> = { dawn: DAWN, day: DAY, golden: GOLDEN, night: NIGHT };

/** The lamp: a glazed clay base, a brass stem, a paper shade that glows after dark. */
export const LAMP_COLORS = {
  base: '#F0B9AE',
  stem: '#C9A052',
  shade: '#FBF1DE',
  pleat: '#F0E2C8',
  rim: '#EADAC0',
  shadeLit: '#FFE3A8',
  pleatLit: '#FFD690',
  rimLit: '#FFF4D6',
  pool: '#FFC98A',
} as const;

/** The coin jar: clear glass, a scrap of strawberry-milk gingham, brass coins with a pressed leaf. */
export const JAR_COLORS = {
  glass: '#E8F0F3',
  glassEdge: '#D3E1E9',
  gingham: '#F4C3CD',
  check: '#E59CAE',
  twine: '#C49E74',
  coin: '#EDCB72',
  coinEdge: '#D2A24B',
  coinDeep: '#B98B3C',
} as const;

/* ── The view through the glass ─────────────────────────────────────────────────────────── */

export interface OutsidePalette {
  sky: readonly [string, string];
  cloud: string | null;
  /** Far rooftops and walls across the street, then the street trees. */
  roof: string;
  house: string;
  tree: string;
  treeDeep: string;
  /** Blossom (spring), snow on roofs (winter), lit windows (night). */
  accent: string | null;
  snow: boolean;
  moon: string | null;
  star: string | null;
  litWindow: string | null;
  /** The terrace across the road (the Sill's window): facade paints, cornices, panes, a shop awning. */
  facades: readonly string[];
  cornice: string;
  pane: string;
  awning: string;
  stripe: string;
}

const SKY: Record<TimeOfDay, readonly [string, string]> = {
  dawn: ['#B9D1F2', '#FCE7DA'],
  day: ['#A9CFEE', '#EEF4EF'],
  golden: ['#E3C4C4', '#FADDB6'],
  night: ['#23213D', '#3A3558'],
};

const SEASON_HAZE: Record<Season, readonly [string, number]> = {
  spring: ['#F4D8E0', 0.12],
  summer: ['#A9CDEB', 0.12],
  autumn: ['#F2D2B0', 0.1],
  winter: ['#DCE2EA', 0.3],
};

const TREES: Record<Season, readonly [string, string, string | null]> = {
  spring: ['#BCD3A0', '#A5C48E', '#F2C4D0'],
  summer: ['#A5C68F', '#8FB47C', null],
  autumn: ['#E9BF84', '#D9A66F', null],
  winter: ['#CFC9D8', '#C2BBCD', null],
};

/** Apartment pastels for the facades across the road (DESIGN §10.1): peach, butter, strawberry milk, linen. */
const FACADES = ['#F0CFBA', '#F1E0BA', '#EFCDCB', '#E9DFD2'] as const;
const NIGHT_FACADES = ['#312A48', '#2D2843', '#342B49', '#2B2741'] as const;

function outside(time: TimeOfDay, season: Season): OutsidePalette {
  const night = time === 'night';
  const [haze, t] = SEASON_HAZE[season];
  const sky: readonly [string, string] = night ? SKY.night : [mix(SKY[time][0], haze, t), mix(SKY[time][1], haze, t * 0.8)];
  const far = (c: string, k = 0.45) => (night ? c : mix(c, sky[1], k));
  const [tree, treeDeep, accent] = TREES[season];
  if (night) {
    return {
      sky,
      cloud: null,
      roof: '#2E2842',
      house: '#322B47',
      tree: '#2A3146',
      treeDeep: '#262C40',
      accent: season === 'winter' ? '#4A4566' : null,
      snow: season === 'winter',
      moon: '#F6E7B6',
      star: '#F2D98A',
      litWindow: '#F2CF86',
      facades: NIGHT_FACADES,
      cornice: '#3A3451',
      pane: '#28243B',
      awning: '#3B3450',
      stripe: '#4A3E58',
    };
  }
  return {
    sky,
    cloud: time === 'golden' ? '#FFEBDD' : time === 'dawn' ? '#FFF7F5' : '#FFFFFF',
    roof: far('#B9ACD0', 0.38),
    house: far('#DCC8C0', 0.46),
    tree: far(tree, 0.3),
    treeDeep: far(treeDeep, 0.3),
    accent: accent ? far(accent, 0.3) : season === 'winter' ? '#FFFFFF' : null,
    snow: season === 'winter',
    moon: null,
    star: null,
    litWindow: null,
    facades: FACADES.map((c) => far(c, 0.22)),
    cornice: far('#FFF8EF', 0.15),
    pane: far('#D5DAE3', 0.25),
    awning: far('#FFF6EC', 0.15),
    stripe: far('#F2B9C3', 0.15),
  };
}

const OUTSIDE = new Map<string, OutsidePalette>();

export function outsidePalette(time: TimeOfDay, season: Season): OutsidePalette {
  const key = `${time}|${season}`;
  let p = OUTSIDE.get(key);
  if (!p) OUTSIDE.set(key, (p = outside(time, season)));
  return p;
}

/* ── Toning objects for the hour ─────────────────────────────────────────────────────────── */

/** Objects in the room take on the hour: a cool morning, an apricot evening, indigo lamplight. */
const TONE: Record<TimeOfDay, readonly [string, number] | null> = {
  dawn: ['#DCE0F0', 0.08],
  day: null,
  golden: ['#F7C9A2', 0.12],
  night: ['#2E2850', 0.6],
};

const toned = new Map<string, string>();

/** `hex` as it looks at this time of day (memoised). */
export function tone(time: TimeOfDay, hex: string): string {
  const t = TONE[time];
  if (!t) return hex;
  const key = `${time}${hex}`;
  let out = toned.get(key);
  if (!out) toned.set(key, (out = mix(hex, t[0], t[1])));
  return out;
}
