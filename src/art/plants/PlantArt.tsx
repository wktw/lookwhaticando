import type { JSX } from 'preact';
import { useRef } from 'preact/hooks';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import type { Growth } from './types';
import { OUTLINE, STROKE } from './parts';
import { clamp01, f, hash01 } from './math';
import { useInView, useUid, useWaterings } from './hooks';
import { seed } from './early';
import { POTS, Soil } from './pots';
import { PLANT_SPECIES } from './species';
import { EvergreenGlow, EvergreenSparkles, Ribbon, WaterFx, WateringCanCharm } from './extras';
import './plant.css';

export interface PlantArtProps {
  species: PlantSpeciesId;
  /** 0 Seed … 7 Evergreen */
  stage: number;
  /** 0..1 progress within the current stage: drives continuous detail (an extra leaf, a fattening bud). */
  progress?: number;
  /** Extra blooms/fruit earned after Evergreen (keeps growing forever, capped visually). */
  blooms?: number;
  pot: PotId;
  size?: number | string;
  /** Gentle idle sway (paused automatically while the plant is off screen). */
  animated?: boolean;
  /** Plays a one-shot "watered" wiggle each time this number goes up (e.g. a check-in counter). */
  pulse?: number;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export const PLANT_STAGE_NAMES = ['Seed', 'Sprout', 'Seedling', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen'] as const;

/** Blooms beyond this are not drawn (the plant gets a golden sparkle instead). */
export const MAX_BLOOMS = 6;

/** Roughly the highest point of the plant per stage, for aiming the watering droplets. */
const TOP_Y = [46, 38, 30, 26, 22, 16, 12, 8];

/** Below this rendered size, rewards and reactions are drawn larger and idle extras stay still. */
const SMALL_PX = 64;

function sizePx(size: number | string): string {
  return typeof size === 'number' ? `${size}px` : size;
}

/** Whole blooms in 0..MAX_BLOOMS; anything non-numeric counts as none. */
function bloomCount(blooms: number | undefined): number {
  const b = Math.floor(blooms ?? 0);
  return b > 0 ? Math.min(MAX_BLOOMS, b) : 0;
}

/** A habit's potted plant at any growth moment (DESIGN §5.5, §13.1). */
export function PlantArt(props: PlantArtProps) {
  const { species, pot, size = 64, animated = false, pulse, title } = props;
  const uid = useUid('plant');
  const svg = useRef<SVGSVGElement>(null);
  const waterings = useWaterings(pulse);
  const onScreen = useInView(svg, animated);

  const stage = Math.max(0, Math.min(7, Math.floor(props.stage) || 0));
  const progress = clamp01(props.progress ?? 0);
  const blooms = stage === 7 ? bloomCount(props.blooms) : 0;
  const g: Growth = { stage, progress, t: stage + progress, blooms };

  const art = PLANT_SPECIES[species];
  const layers = stage === 0 ? seed(g, art.seed, art.seedStripes) : art.render(g);
  const potDef = POTS[pot];
  const evergreen = stage === 7;
  const capped = blooms >= MAX_BLOOMS;
  const small = (typeof size === 'number' ? size : parseFloat(size)) < SMALL_PX;

  const r = hash01(uid);
  const timing = {
    '--plant-sway-dur': `${(3.4 + r * 1.4).toFixed(2)}s`,
    '--plant-sway-delay': `${(-r * 4).toFixed(2)}s`,
  } as JSX.CSSProperties;

  // Swapping between two identical keyframes restarts the wiggle on every watering without remounting the art.
  const wiggle = waterings > 0 ? `plant-wiggle plant-wiggle-${waterings % 2}` : undefined;
  const sway = (layer: JSX.Element | null | undefined) =>
    layer && (
      <g class="plant-sway">
        <g class={wiggle}>{layer}</g>
      </g>
    );

  const classes = ['plant-art', animated && onScreen ? 'is-animated' : '', props.class ?? ''].filter(Boolean).join(' ');
  return (
    <svg
      ref={svg}
      class={classes}
      viewBox="0 0 100 100"
      width={sizePx(size)}
      height={sizePx(size)}
      style={{ ...timing, ...props.style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <ellipse cx={50} cy={95.8} rx={25} ry={2.8} fill={OUTLINE} opacity={0.12} />
      {evergreen && <EvergreenGlow uid={uid} gold={capped} />}
      {sway(layers.back)}
      <Soil sw={STROKE} />
      {layers.ground}
      {potDef.render(uid, STROKE)}
      {sway(layers.front)}
      {evergreen && potDef.ribbon && <Ribbon d={potDef.ribbon} />}
      {evergreen && <WateringCanCharm {...potDef.charm} s={small ? 1.45 : 1.3} swing={!small} />}
      {evergreen && <EvergreenSparkles gold={capped} twinkle={!small} s={small ? 1.3 : 1} />}
      {waterings > 0 && <WaterFx key={waterings} top={TOP_Y[stage]!} s={small ? 1.6 : 1} />}
    </svg>
  );
}

/** The pot view is cropped to this square so a lone pot fills the icon like other collectibles. */
const POT_CROP = { x: 14, y: 41, size: 72 };

/** Standalone pot with a little soil (collection book, pot picker). */
export function PotArt({ pot, size = 64, title, class: cls, style }: { pot: PotId; size?: number | string; title?: string; class?: string; style?: JSX.CSSProperties }) {
  const uid = useUid('pot');
  // Thinner lines in pot units so the zoomed-in pot keeps the shared 2.4 outline on screen.
  const sw = f((STROKE * POT_CROP.size) / 100);
  return (
    <svg
      class={['plant-art', cls].filter(Boolean).join(' ')}
      viewBox={`${POT_CROP.x} ${POT_CROP.y} ${POT_CROP.size} ${POT_CROP.size}`}
      width={sizePx(size)}
      height={sizePx(size)}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <ellipse cx={50} cy={95.8} rx={25} ry={2.8} fill={OUTLINE} opacity={0.12} />
      <Soil sw={sw} />
      {POTS[pot].render(uid, sw)}
    </svg>
  );
}
