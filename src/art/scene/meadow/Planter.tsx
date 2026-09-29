import { PlantArt } from '@/art/plants';
import { OUTLINE } from '@/art/pets/geometry';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import type { ScenePalette } from '../palette';
import { HEART } from '../decor/kit';
import s from './meadow.module.css';

/** A plant for the planter box (the MeadowScene contract keeps ids as plain strings). */
export interface PlanterPlant {
  species: string;
  stage: number;
  pot: string;
  /** 0..1 within the stage (see PlantArt). */
  progress?: number;
  /** Extra blooms after Evergreen (see PlantArt). */
  blooms?: number;
}

/** The planter shows at most this many plants. */
export const MAX_PLANTERS = 5;
/** Height of one plant canvas, in meadow units. */
const PLANT_UNITS = 11.5;
/** Layout in plant-canvas units (one plant canvas = 100). */
const PITCH = 54;
const PAD = 22;
const BELOW = 24;
/** The box's top rim, in plant-canvas units from the top. */
const RIM = 84;
/** Where the box stands: meadow units in from the left edge and down past the bottom edge. */
const LEFT_U = 3;
const DROP_U = 1;

/** The planter box's size and place, in meadow units, for `count` plants. */
export function planterBox(count: number) {
  const n = Math.max(1, Math.min(count, MAX_PLANTERS));
  const w = PAD * 2 + (n - 1) * PITCH + 100;
  const h = 100 + BELOW;
  const k = PLANT_UNITS / 100;
  return {
    /** Canvas width and height (plant-canvas units). */
    w,
    h,
    left: LEFT_U,
    width: w * k,
    height: h * k,
    /** Height of the rim above the scene's bottom edge. */
    rim: (h - RIM) * k - DROP_U,
  };
}

/**
 * A wooden planter box in the front-left corner, holding the top habit plants.
 * Pots sit in the box; its rim hides only their bases. The plants hold still here (the scene
 * is scenery): only the Today sill animates them.
 */
export function Planter({ plants, palette, zIndex }: { plants: readonly PlanterPlant[]; palette: ScenePalette; zIndex: number }) {
  const shown = plants.slice(0, MAX_PLANTERS);
  if (shown.length === 0) return null;
  const { w, h, left, height } = planterBox(shown.length);
  const wood = palette.night ? '#B99A92' : '#F4CFA0';
  const woodLight = palette.night ? '#C9AEA4' : '#FBE0BA';
  const woodShade = palette.night ? '#9E817F' : '#E4B785';
  return (
    <div
      class={s.planter}
      style={{ left: `calc(${left} * var(--u))`, bottom: `calc(${-DROP_U} * var(--u))`, height: `calc(${height.toFixed(2)} * var(--u))`, aspectRatio: `${w} / ${h}`, zIndex }}
    >
      <svg class={s.fill} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
        {/* back board and soil, seen between the pots */}
        <rect x={10} y={80} width={w - 20} height={16} rx={5} fill={woodShade} stroke={OUTLINE} stroke-width={2.4} />
        <rect x={16} y={86} width={w - 32} height={8} rx={4} fill="#8F6B5E" />
      </svg>
      {shown.map((p, i) => (
        <div key={i} class={s.plant} style={{ left: `${((PAD + i * PITCH) / w) * 100}%`, width: `${(100 / w) * 100}%`, height: `${(100 / h) * 100}%` }}>
          <PlantArt species={p.species as PlantSpeciesId} stage={p.stage} progress={p.progress} blooms={p.blooms} pot={p.pot as PotId} size="100%" />
        </div>
      ))}
      <svg class={s.fill} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
        <g stroke={OUTLINE} stroke-width={2.4} stroke-linejoin="round">
          <rect x={18} y={h - 9} width={14} height={8} rx={3} fill={woodShade} />
          <rect x={w - 32} y={h - 9} width={14} height={8} rx={3} fill={woodShade} />
          <path d={`M9 90 L${w - 9} 90 L${w - 15} ${h - 6} Q${w - 15.5} ${h - 3} ${w - 19} ${h - 3} L19 ${h - 3} Q15.5 ${h - 3} 15 ${h - 6} Z`} fill={wood} />
          <rect x={4} y={RIM} width={w - 8} height={10} rx={5} fill={woodLight} />
        </g>
        <path d={`M13 ${h - 16} L${w - 13} ${h - 16}`} stroke={woodShade} stroke-width={2.2} stroke-linecap="round" />
        <rect x={10} y={RIM + 2.4} width={w * 0.28} height={3} rx={1.5} fill="#fff" opacity={palette.night ? 0.3 : 0.6} />
        <path
          transform={`translate(${w / 2} ${h - 22}) scale(0.9)`}
          d={HEART}
          fill={palette.night ? '#D7839F' : '#F58CAA'}
          stroke={OUTLINE}
          stroke-width={1.6}
          stroke-linejoin="round"
        />
      </svg>
    </div>
  );
}
