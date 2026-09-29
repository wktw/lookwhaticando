import type { JSX } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import { DAY_LIGHT, type Light } from '../light';
import { ell } from './geom';
import { CONTACT, kitFor, kitWithBloom, type Kit } from './kit';
import { clamp01, f, hash01 } from './math';
import { useInView, useUid, useWaterings } from './hooks';
import { FOOT_Y, POTS } from './pots';
import { PLANT_SPECIES } from './species';
import { waterGlass } from './vessels';
import { ICON_FRAMES, iconFrame, SCENE_FRAME } from './iconFrames';
import { WateringCanCharm } from './charm';
import { Bee, petalMap, PETITE_BLOOM, repaint, type PlantLookArt } from './looks';
import { flourishLayers } from './flourishes';
import { keepPaint, muteTree } from '../muted';
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
  /**
   * How the drawing is framed. `scene` (the default) keeps every stage on the same 100-unit canvas, pot foot on one
   * line, so plants standing side by side on the sill match in scale. `icon` crops to the plant at this stage, so a
   * cutting in its glass fills a 40 px Today card as fully as an Evergreen does.
   */
  fit?: PlantFit;
  /**
   * Stages 0–1 (and the tulip): stand the habit's chosen pot, still empty, behind the glass on the shade side
   * (DESIGN §5.5, "a cutting in a water glass beside its empty pot"). With `icon`, the frame widens to hold both (a
   * habit card's cutting stands by its pot too).
   */
  withPot?: boolean;
  /**
   * Blooms Like You (DESIGN §14.2): the look she chose. Recolours the flowers (Dawn, Sunlit, Twilight, Wildflower),
   * draws them smaller (Petite), or takes the partner habit's card colour and brings a bee (Paired). Left out: Classic.
   */
  look?: PlantLookArt;
  /** Flourishes after Evergreen (0–8 permanent visitors, DESIGN §5.5): a ladybird, a bee, a snail… */
  flourishes?: number;
  /**
   * Which part to draw. `all` (default); a scene that seats a resident on the rim draws `back` (the vessel and the
   * foliage behind it) under the pet and `front` (the foliage that spills over the rim) over it. Both parts share one
   * canvas, so stacked at the same place they make the whole plant.
   */
  layer?: PlantLayer;
  /** Field Guide "not yet": the same drawing at 35% saturation (a repaint, never a CSS filter). */
  muted?: boolean;
  /** Desynchronises the idle sway; give both layers of one plant the same seed so they sway together. */
  seed?: string;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export type PlantFit = 'scene' | 'icon';
export type PlantLayer = 'all' | 'back' | 'front';

export { STAGE_NAMES as PLANT_STAGE_NAMES } from '@/catalog/lines';

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

/**
 * Lays out one plant: its vessel (a glass, a dish or a pot) and the plant in and around it, in its look (from
 * Blooming) and with its flourishes (after Evergreen).
 */
export function composePlant(species: PlantSpeciesId, g: Growth, pot: PotId, k: Kit, damp: boolean, look?: PlantLookArt, flourishes = 0): Composed {
  const lk = look && g.stage >= 5 ? look : undefined;
  const c = composeBase(species, g, pot, lk?.shape === 'petite' ? kitWithBloom(k, PETITE_BLOOM) : k, damp);
  const map = lk ? petalMap(species, lk, k) : null;
  const fl = c.kind === 'pot' && g.stage === 7 ? flourishLayers(flourishes, species, pot, k) : { back: null, front: null };
  const bee = lk?.shape === 'paired' && !(fl.front && flourishes >= 2) ? <PairedBee species={species} k={k} /> : null;
  if (!map && !fl.back && !fl.front && !bee) return c;
  const paint = (el: JSX.Element | null | undefined) => (el && map ? (repaint(el, map) as JSX.Element) : el);
  return {
    ...c,
    back: (
      <>
        {fl.back}
        {paint(c.back)}
      </>
    ),
    front: (
      <>
        {paint(c.front)}
        {fl.front}
        {bee}
      </>
    ),
  };
}

/** A Paired look's bee, hovering on the lit side near the top of the plant. */
function PairedBee({ species, k }: { species: PlantSpeciesId; k: Kit }) {
  const fr = ICON_FRAMES[species]?.[6] ?? [10, 10, 80];
  const lit = k.away === 0 ? -1 : -k.away;
  return <Bee x={50 + lit * fr[2] * 0.4} y={fr[1] + fr[2] * 0.2} k={k} s={0.9} />;
}

function composeBase(species: PlantSpeciesId, g: Growth, pot: PotId, k: Kit, damp: boolean): Composed {
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

/** The flat contact shadow, nudged away from the light; tucked in close under the foot when framed as an icon. */
function contactD(foot: number, k: Kit, tight = false): string {
  return tight ? ell(50 + k.away * 1.2, FOOT_Y + 0.3, foot + 2.2, 1.9) : ell(50 + k.away * 2.2, FOOT_Y + 0.4, foot + 5.5, 2.3);
}

/** A habit's plant at any moment of its life (DESIGN §5.5, §10.4). */
export function PlantArt(props: PlantArtProps) {
  const { species, pot, size = 64, animated = false, pulse, title, layer = 'all', look, flourishes = 0 } = props;
  const uid = useUid('plant');
  const svg = useRef<SVGSVGElement>(null);
  const waterings = useWaterings(pulse);
  const onScreen = useInView(svg, animated);
  const light = props.light ?? DAY_LIGHT;
  const k = kitFor(light);
  const g = growthOf(props.stage, props.progress, props.blooms);
  const damp = !!props.damp || waterings > 0;

  const lookKey = look ? `${look.colour}/${look.shape}/${look.partnerColour ?? ''}` : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const c = useMemo(() => composePlant(species, g, pot, k, damp, look, flourishes), [species, g.stage, g.progress, g.blooms, pot, k, damp, lookKey, flourishes]);

  const icon = props.fit === 'icon';
  const besidePot = !!props.withPot && c.kind !== 'pot';
  const box = icon ? (besidePot ? iconFrameWithPot(species, g.stage, pot, k.away) : iconFrame(species, g.stage)) : SCENE_FRAME;
  const mute = (el: JSX.Element | null | undefined) => (props.muted && el ? (muteTree(el) as JSX.Element) : el);
  const emptyPot = besidePot ? mute(<g>{EmptyPot({ pot, k })}</g>) : null;
  const back = layer !== 'front';
  const front = layer !== 'back';

  const r = hash01(props.seed ?? uid);
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
      viewBox={box}
      width={sizePx(size)}
      height={sizePx(size)}
      style={{ ...timing, ...props.style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {back && <path d={contactD(c.foot, k, icon)} class={CONTACT} />}
      {back && emptyPot}
      {back && sway(mute(c.back))}
      {back && mute(c.vessel)}
      {front && sway(mute(c.front))}
      {front && waterings > 0 && <path key={waterings} class="plant-glint" d={ell(c.pivot[0] - c.surface * 0.34, c.pivot[1] + 0.2, Math.max(2.4, c.surface * 0.3), 0.8)} fill="#FFFFFF" />}
    </svg>
  );
}

/**
 * The habit's pot, empty, standing behind a cutting's glass: smaller (it is further back) and to the shade side, so
 * the glass stays the subject. Its own contact shadow sits under it.
 */
const EMPTY_POT = { scale: 0.62, dx: 17, back: 1.6 };

function EmptyPot({ pot, k }: { pot: PotId; k: Kit }) {
  const def = POTS[pot] ?? POTS.terracotta;
  // Behind the glass on the side away from the light; lit from above, to the right.
  const x = 50 + (k.away || 1) * EMPTY_POT.dx;
  const s = EMPTY_POT.scale;
  return (
    <g data-empty-pot={pot} transform={`translate(${f(x - 50 * s)} ${f(FOOT_Y - EMPTY_POT.back - FOOT_Y * s)}) scale(${s})`}>
      <path d={contactD(def.foot, k)} class={CONTACT} />
      <g data-vessel="empty-pot">{def.render(k, false)}</g>
    </g>
  );
}

/** Where the empty pot beside a cutting lands on the canvas: its box [x0, y0, x1, y1]. */
export function emptyPotBox(pot: PotId, away: number): readonly [number, number, number, number] {
  const def = POTS[pot] ?? POTS.terracotta;
  const s = EMPTY_POT.scale;
  const tx = 50 + (away || 1) * EMPTY_POT.dx - 50 * s;
  const ty = FOOT_Y - EMPTY_POT.back - FOOT_Y * s;
  const hw = def.mouth.hw + 1.6;
  return [tx + s * (50 - hw), ty + s * (def.mouth.y - 1), tx + s * (50 + hw), ty + s * (FOOT_Y + 2)];
}

/** The icon frame for a cutting and its empty pot together: the glass's own frame widened to take in the pot, square. */
export function iconFrameWithPot(species: PlantSpeciesId, stage: number, pot: PotId, away: number): string {
  const fr = ICON_FRAMES[species]?.[stage] ?? [0, 0, 100];
  const [px0, py0, px1, py1] = emptyPotBox(pot, away);
  const x0 = Math.min(fr[0], px0 - 1.5);
  const x1 = Math.max(fr[0] + fr[2], px1 + 1.5);
  const y0 = Math.min(fr[1], py0 - 1.5);
  const y1 = Math.max(fr[1] + fr[2], py1);
  const side = Math.max(x1 - x0, y1 - y0);
  return `${f((x0 + x1) / 2 - side / 2)} ${f(y1 - side)} ${f(side)} ${f(side)}`;
}

/** A lone pot is cropped to this square so it fills the icon like other collectibles. */
const POT_CROP = { x: 20, y: 47, size: 60 };

export interface PotArtProps {
  pot: PotId;
  size?: number | string;
  light?: Light;
  damp?: boolean;
  /** Field Guide "not yet" (35% saturation). */
  muted?: boolean;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

/** A standalone pot with its soil (collection book, pot picker, the empty pot beside a cutting). */
export function PotArt({ pot, size = 64, light, damp = false, muted = false, title, class: cls, style }: PotArtProps) {
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
        {muted ? muteTree(def.render(k, damp)) : def.render(k, damp)}
      </g>
    </svg>
  );
}

// It uses hooks and has its own `muted`: a repaint never expands it.
keepPaint(PlantArt);
