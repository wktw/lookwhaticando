import type { JSX } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import { DAY_LIGHT, type Light } from '../light';
import { ell } from './geom';
import { CONTACT, kitFor, type Kit } from './kit';
import { clamp01, f, hash01 } from './math';
import { useInView, useUid, useWaterings } from './hooks';
import { FOOT_Y, POTS } from './pots';
import { PLANT_SPECIES } from './species';
import { waterGlass } from './vessels';
import { WateringCanCharm } from './charm';
import type { Composed, Growth } from './types';
import './plant.css';

export interface PlantArtProps {
  species: PlantSpeciesId;
  /** 0 Cutting … 7 Evergreen (DESIGN §5.5). */
  stage: number;
  /** 0..1 progress within the current stage: drives continuous detail (a leaf growing in, roots lengthening). */
  progress?: number;
  /**
   * How many flowers or berries are showing from Blooming on (0..MAX_BLOOMS); foliage plants show their peak
   * instead (longer vines, pups, split leaves). Left out, it follows the stage.
   */
  blooms?: number;
  pot: PotId;
  size?: number | string;
  /** Windowlight: where the light comes from, and whether the lamp is on. Defaults to the morning window. */
  light?: Light;
  /** Watered today: the soil is dark and damp. */
  damp?: boolean;
  /** Gentle idle sway (paused automatically while the plant is off screen). */
  animated?: boolean;
  /** Plays a one-shot watering (a leaf lift and a glint on the soil) each time this number goes up. */
  pulse?: number;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export const PLANT_STAGE_NAMES = ['Cutting', 'Rooting', 'Potted', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen'] as const;

/** Blooms beyond this are not drawn. */
export const MAX_BLOOMS = 6;

function sizePx(size: number | string): string {
  return typeof size === 'number' ? `${size}px` : size;
}

/** Whole blooms in 0..MAX_BLOOMS from Blooming on; left out (or not a number), they follow the stage. */
export function bloomCount(stage: number, progress: number, blooms: number | undefined): number {
  if (stage < 5) return 0;
  if (blooms === undefined || Number.isNaN(blooms)) return stage === 5 ? 2 + Math.round(progress) : stage === 6 ? 4 : 5;
  const b = Math.floor(blooms);
  return b > 0 ? Math.min(MAX_BLOOMS, b) : 0;
}

/** Normalises stage, progress and blooms so bad input can never reach path data. */
export function growthOf(stage: number, progress: number | undefined, blooms: number | undefined): Growth {
  const s = Math.max(0, Math.min(7, Math.floor(stage) || 0));
  const p = clamp01(progress ?? 0);
  return { stage: s, progress: p, t: s + p, blooms: bloomCount(s, p, blooms) };
}

/** Lays out one plant: its vessel (a glass, a dish or a pot) and the plant in and around it. */
export function composePlant(species: PlantSpeciesId, g: Growth, pot: PotId, k: Kit, damp: boolean): Composed {
  const art = PLANT_SPECIES[species] ?? PLANT_SPECIES.pothos;
  const potDef = POTS[pot] ?? POTS.terracotta;
  if (art.own) return art.own(g, k, pot);
  if (g.stage <= 1) {
    if (art.start) return art.start(g, k);
    if (art.cutting) return waterGlass(art.cutting, g, k);
  }
  const layers = art.potted ? art.potted(g, k, potDef.mouth) : {};
  return {
    back: layers.back,
    vessel: (
      <g data-vessel="pot" data-pot={pot}>
        {potDef.render(k, damp)}
        {g.stage === 7 && <WateringCanCharm at={potDef.charm} k={k} />}
      </g>
    ),
    front: layers.front,
    foot: potDef.foot,
    pivot: [50, potDef.mouth.y],
    surface: potDef.mouth.hw,
    kind: 'pot',
  };
}

/** The flat contact shadow, nudged away from the light. */
function contactD(foot: number, k: Kit): string {
  return ell(50 + k.away * 2.2, FOOT_Y + 0.4, foot + 5.5, 2.3);
}

/** A habit's plant at any moment of its life (DESIGN §5.5, §10.4). */
export function PlantArt(props: PlantArtProps) {
  const { species, pot, size = 64, animated = false, pulse, title } = props;
  const uid = useUid('plant');
  const svg = useRef<SVGSVGElement>(null);
  const waterings = useWaterings(pulse);
  const onScreen = useInView(svg, animated);
  const light = props.light ?? DAY_LIGHT;
  const k = kitFor(light);
  const g = growthOf(props.stage, props.progress, props.blooms);
  const damp = !!props.damp || waterings > 0;

  const c = useMemo(() => composePlant(species, g, pot, k, damp), [species, g.stage, g.progress, g.blooms, pot, k, damp]);

  const r = hash01(uid);
  const origin = `${f(c.pivot[0])}px ${f(c.pivot[1])}px`;
  const timing = {
    '--plant-sway-dur': `${(4.2 + r * 1.6).toFixed(2)}s`,
    '--plant-sway-delay': `${(-r * 4).toFixed(2)}s`,
  } as JSX.CSSProperties;

  // Swapping between two identical keyframes restarts the lift on every watering without remounting the art.
  const lift = waterings > 0 ? `plant-lift-${waterings % 2}` : undefined;
  const sway = (layer: JSX.Element | null | undefined) =>
    layer && (
      <g class="plant-sway" style={{ transformOrigin: origin }}>
        <g class={lift} style={{ transformOrigin: origin }}>
          {layer}
        </g>
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
      <path d={contactD(c.foot, k)} class={CONTACT} />
      {sway(c.back)}
      {c.vessel}
      {sway(c.front)}
      {waterings > 0 && <path key={waterings} class="plant-glint" d={ell(c.pivot[0] - c.surface * 0.34, c.pivot[1] + 0.2, Math.max(2.4, c.surface * 0.3), 0.8)} fill="#FFFFFF" />}
    </svg>
  );
}

/** A lone pot is cropped to this square so it fills the icon like other collectibles. */
const POT_CROP = { x: 20, y: 47, size: 60 };

export interface PotArtProps {
  pot: PotId;
  size?: number | string;
  light?: Light;
  damp?: boolean;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

/** A standalone pot with its soil (collection book, pot picker, the empty pot beside a cutting). */
export function PotArt({ pot, size = 64, light, damp = false, title, class: cls, style }: PotArtProps) {
  const k = kitFor(light ?? DAY_LIGHT);
  const def = POTS[pot] ?? POTS.terracotta;
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
      <path d={contactD(def.foot, k)} class={CONTACT} />
      <g data-vessel="pot" data-pot={pot}>
        {def.render(k, damp)}
      </g>
    </svg>
  );
}
