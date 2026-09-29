import type { TimeOfDay } from './time';

/**
 * Scene colors per time of day. Paint is applied as SVG attributes (never CSS classes) so any
 * layer can be serialized on its own, e.g. by photo mode.
 */
export interface ScenePalette {
  time: TimeOfDay;
  /** Sky gradient: top, middle, horizon. */
  sky: readonly [string, string, string];
  /** Sun (or moon) disc and the soft halo around it. */
  orb: string;
  halo: string;
  cloud: string;
  cloudShade: string;
  cloudLine: string;
  hillFar: string;
  hillFarDetail: string;
  hillNear: string;
  hillNearShade: string;
  hillLine: string;
  /** Meadow floor: the far field and the near field (top → bottom gradient). */
  meadowBack: string;
  meadowNear: string;
  meadowFront: string;
  grass: string;
  grassLine: string;
  leaf: string;
  leafShade: string;
  leafLight: string;
  trunk: string;
  trunkShade: string;
  wood: string;
  woodShade: string;
  /** Outline for mid-ground objects (tree, fence, cottage). */
  line: string;
  /** Opacity of wildflower petals (dimmed at night). */
  bloom: number;
  /** Long shadows cast by the low sun: color, opacity, and which way they fall (-1 left, 1 right, 0 none). */
  shadow: { color: string; opacity: number; toward: -1 | 0 | 1 };
  /** Warm or cool light washed over the far meadow (null for none). */
  wash: { color: string; opacity: number } | null;
  night: boolean;
}

const COCOA = '#5A3E45';

const DAY: ScenePalette = {
  time: 'day',
  sky: ['#9FCFF3', '#C6E5FA', '#EEF8FB'],
  orb: '#FFE27F',
  halo: '#FFF6C9',
  cloud: '#FFFFFF',
  cloudShade: '#DDEEFB',
  cloudLine: '#AFCDEB',
  hillFar: '#C6E1DC',
  hillFarDetail: '#AFD3C9',
  hillNear: '#AEDA9F',
  hillNearShade: '#98CB89',
  hillLine: '#7DB36B',
  meadowBack: '#B7DE9E',
  meadowNear: '#C4E6AC',
  meadowFront: '#A9D58F',
  grass: '#93C57F',
  grassLine: '#6E9F5E',
  leaf: '#A5D48E',
  leafShade: '#86BF72',
  leafLight: '#CBEAB6',
  trunk: '#CFA27F',
  trunkShade: '#B98A68',
  wood: '#FFF1DE',
  woodShade: '#EED8BA',
  line: COCOA,
  bloom: 1,
  shadow: { color: '#6E9F5E', opacity: 0.22, toward: 0 },
  wash: null,
  night: false,
};

/** Dawn: cool and dewy. A periwinkle-to-blush sky, a pale sun rising on the left, misty minty greens. */
const DAWN: ScenePalette = {
  ...DAY,
  time: 'dawn',
  sky: ['#C3CBF0', '#F6D3E4', '#FFEBD8'],
  orb: '#FFE6B8',
  halo: '#FFF3E0',
  cloud: '#FFF7FA',
  cloudShade: '#F2DDEF',
  cloudLine: '#D9BCDD',
  hillFar: '#D9D6EE',
  hillFarDetail: '#C8C4E4',
  hillNear: '#B4DAB8',
  hillNearShade: '#A0CDA6',
  hillLine: '#86B990',
  meadowBack: '#BCE0BC',
  meadowNear: '#C9E8C3',
  meadowFront: '#AED6AA',
  grass: '#94C795',
  grassLine: '#6C9F72',
  leaf: '#A6D59A',
  leafShade: '#88C080',
  leafLight: '#CDEBC4',
  shadow: { color: '#8F9BD0', opacity: 0.22, toward: 1 },
  wash: { color: '#FFFFFF', opacity: 0.4 },
};

/** Golden hour: warm and glowing. A big apricot sun setting on the right, honeyed greens, long lavender shadows. */
const GOLDEN: ScenePalette = {
  ...DAY,
  time: 'golden',
  sky: ['#B7A2E4', '#F6B3C7', '#FFCB92'],
  orb: '#FFB978',
  halo: '#FFD7A6',
  cloud: '#FFE3D6',
  cloudShade: '#F8BCC6',
  cloudLine: '#E3A1B4',
  hillFar: '#EDBFCB',
  hillFarDetail: '#DFAABB',
  hillNear: '#C3D899',
  hillNearShade: '#B1CA86',
  hillLine: '#94AF6C',
  meadowBack: '#C6DC98',
  meadowNear: '#D1E4A3',
  meadowFront: '#B5D08B',
  grass: '#A2C27A',
  grassLine: '#809B58',
  leaf: '#B2D185',
  leafShade: '#96BB6D',
  leafLight: '#D9EBAE',
  trunk: '#D6A27E',
  wood: '#FFE9D2',
  woodShade: '#F2CFAE',
  shadow: { color: '#9A7FC6', opacity: 0.3, toward: -1 },
  wash: { color: '#FFC49A', opacity: 0.3 },
};

/** Night: moonlit and magical. Deep indigo sky, sage-lavender meadow, warm lights in the dark. */
const NIGHT: ScenePalette = {
  time: 'night',
  sky: ['#272151', '#3F3679', '#7464AA'],
  orb: '#FFF1C4',
  halo: '#B7A8F0',
  cloud: '#7168A8',
  cloudShade: '#5E5594',
  cloudLine: '#4E4684',
  hillFar: '#58528F',
  hillFarDetail: '#4C4684',
  hillNear: '#4B6588',
  hillNearShade: '#435C7E',
  hillLine: '#36496C',
  meadowBack: '#50707E',
  meadowNear: '#586E8E',
  meadowFront: '#4B5F84',
  grass: '#5F7E92',
  grassLine: '#34496A',
  leaf: '#4F7A7C',
  leafShade: '#42686D',
  leafLight: '#6A9496',
  trunk: '#86696E',
  trunkShade: '#6F555B',
  wood: '#BCADCB',
  woodShade: '#A091B5',
  line: '#3B2B3F',
  bloom: 0.85,
  shadow: { color: '#241E48', opacity: 0.25, toward: 0 },
  wash: null,
  night: true,
};

export const PALETTES: Record<TimeOfDay, ScenePalette> = { dawn: DAWN, day: DAY, golden: GOLDEN, night: NIGHT };
