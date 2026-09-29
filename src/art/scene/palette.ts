import type { TimeOfDay } from './time';

/**
 * Scene colors per time of day. Paint is applied as SVG attributes (never CSS classes) so any
 * layer can be serialized on its own, e.g. by photo mode.
 */
export interface ScenePalette {
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
  night: boolean;
}

const COCOA = '#5A3E45';

const DAY: ScenePalette = {
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
  night: false,
};

const DAWN: ScenePalette = {
  ...DAY,
  sky: ['#E7CDEE', '#FFD6DE', '#FFEBD3'],
  orb: '#FFD9A3',
  halo: '#FFE9D2',
  cloud: '#FFF5F3',
  cloudShade: '#FFD8E1',
  cloudLine: '#EFB6C6',
  hillFar: '#E6D2E3',
  hillFarDetail: '#D8C1D6',
  hillNear: '#B9D6A7',
  hillNearShade: '#A8CB95',
  hillLine: '#8FB67D',
  meadowBack: '#BCDBA6',
  meadowNear: '#C9E3B1',
  meadowFront: '#AED496',
};

const GOLDEN: ScenePalette = {
  ...DAY,
  sky: ['#C5B3EC', '#F7C0CF', '#FFD9A8'],
  orb: '#FFC989',
  halo: '#FFE1B8',
  cloud: '#FFE9DE',
  cloudShade: '#F9C4C8',
  cloudLine: '#E6A6B6',
  hillFar: '#EACBD2',
  hillFarDetail: '#DDB9C3',
  hillNear: '#C3D89E',
  hillNearShade: '#B2CB8B',
  hillLine: '#97B377',
  meadowBack: '#C3DB9E',
  meadowNear: '#D0E3A9',
  meadowFront: '#B1D18F',
  grass: '#9CC47D',
  leaf: '#AFD28A',
  leafShade: '#92BC72',
  leafLight: '#D7EAB2',
  wood: '#FFEBD6',
};

const NIGHT: ScenePalette = {
  sky: ['#272151', '#3F3679', '#7464AA'],
  orb: '#FFF1C4',
  halo: '#B7A8F0',
  cloud: '#7168A8',
  cloudShade: '#5E5594',
  cloudLine: '#4E4684',
  hillFar: '#56508F',
  hillFarDetail: '#4A4482',
  hillNear: '#43698A',
  hillNearShade: '#3B5F7E',
  hillLine: '#314F6C',
  meadowBack: '#4E7C86',
  meadowNear: '#5A8A8E',
  meadowFront: '#46717C',
  grass: '#62938F',
  grassLine: '#335A63',
  leaf: '#4F8079',
  leafShade: '#416D69',
  leafLight: '#6D9E95',
  trunk: '#86696E',
  trunkShade: '#6F555B',
  wood: '#BCADCB',
  woodShade: '#A091B5',
  line: '#3B2B3F',
  bloom: 0.8,
  night: true,
};

export const PALETTES: Record<TimeOfDay, ScenePalette> = { dawn: DAWN, day: DAY, golden: GOLDEN, night: NIGHT };
