/**
 * The habit card's plant (DESIGN §9.1, "a nursery plant tag"): the plant in its pot, framed to fill the card, with its
 * resident peeking from the rim (never taller than 20 px) and the habit's icon printed on a paper disc on a little
 * wooden stake in the soil. A cutting stands in its glass beside its empty pot, the stake in the pot waiting for it.
 *
 * The resident sits on the lip on the lit side, between the plant's back layer and the leaves that spill over the rim,
 * so it peeks out of the plant; the stake stands on the shade side. Everything is lit by the app's one light unless a
 * `light` is given, so a card never disagrees with the band above it (DESIGN §10.4).
 */
import type { JSX } from 'preact';
import type { PastelKey, PlantSpeciesId, PotId } from '@/catalog/types';
import type { Light } from '../light';
import { PetArt } from '../pets/PetArt';
import type { Expression } from '../pets/types';
import { HabitIcon } from '../habit-icons';
import { useArtLight } from '../scene/moment';
import { PlantArt, emptyPotBox, iconFrameWithPot } from './PlantArt';
import { iconFrame } from './iconFrames';
import { POT_GEOMETRY } from './geometry';
import type { PlantLookArt } from './looks';

export interface CardPlantProps {
  species: PlantSpeciesId;
  stage: number;
  progress?: number;
  /** Flowers showing from Blooming on (PlantArt `blooms`); left out, they follow the stage. */
  blooms?: number;
  pot: PotId;
  damp?: boolean;
  look?: PlantLookArt;
  flourishes?: number;
  /** The companion living in this plant (DESIGN §14.1), peeking from the rim. */
  residentPetId?: string;
  residentExpression?: Expression;
  /** The habit's icon id (catalog/habitIcons), printed on the stake. Left out: no stake. */
  icon?: string;
  /** The habit's pastel, for the icon print. */
  tone?: PastelKey;
  /** The card's edge in px (square). Default 56. */
  size?: number;
  light?: Light;
  animated?: boolean;
  pulse?: number;
  /** An accessible name; otherwise decorative (the card names the habit). */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

/** A resident on a card is never taller than this (DESIGN §9.1: it peeks, the plant is the subject). */
export const CARD_RESIDENT_MAX_PX = 20;

const STAKE = { wood: '#D9C7AD', woodLamp: '#B9A68C', paper: '#FFFDF9', paperLamp: '#EFE4D6', edge: '#E6DCD0' };

/** The frame the card's plant is drawn in, as [x, y, side] on the plant canvas. */
export function cardFrame(species: PlantSpeciesId, stage: number, pot: PotId, away: number): [number, number, number] {
  const s = Math.max(0, Math.min(7, Math.floor(stage) || 0));
  const box = s < 2 ? iconFrameWithPot(species, s, pot, away) : iconFrame(species, s);
  const [x, y, side] = box.split(' ').map(Number) as [number, number, number, number];
  return [x, y, side];
}

/**
 * Where the resident sits and the stake stands, on the plant canvas: the rim's lip on the lit side (or the sill beside a
 * cutting's glass), and the soil on the shade side (or the empty pot's soil).
 */
export function cardSpots(stage: number, pot: PotId, away: number): { seat: { x: number; y: number }; stake: { x: number; y: number } } {
  const g = POT_GEOMETRY[pot] ?? POT_GEOMETRY.terracotta;
  const dir = away || 1;
  if (Math.floor(stage) < 2) {
    const [x0, y0, x1] = emptyPotBox(pot, away);
    return { seat: { x: 50 - dir * 10, y: 95 }, stake: { x: (x0 + x1) / 2 + dir * 1.5, y: y0 + 2 } };
  }
  const lipX = dir > 0 ? g.rim.x0 : g.rim.x1;
  return { seat: { x: lipX + dir * 2, y: g.rim.y }, stake: { x: 50 + dir * g.mouth.hw * 0.55, y: g.mouth.y } };
}

export function CardPlant(props: CardPlantProps) {
  const { species, stage, pot, size = 56, residentPetId, icon, tone = 'sage' } = props;
  const appLight = useArtLight();
  const light = props.light ?? appLight;
  // Shade falls away from the window: +1 when the light comes from the left.
  const away = light.from === 'left' ? 1 : light.from === 'right' ? -1 : 1;
  const [fx, fy, side] = cardFrame(species, stage, pot, away);
  const toPx = (x: number, y: number) => ({ left: ((x - fx) / side) * size, top: ((y - fy) / side) * size });
  const spots = cardSpots(stage, pot, away);
  const young = Math.floor(stage) < 2;

  const plant = {
    species,
    stage,
    progress: props.progress,
    blooms: props.blooms,
    pot,
    damp: props.damp,
    look: props.look,
    flourishes: props.flourishes,
    light,
    fit: 'icon' as const,
    withPot: young,
    animated: props.animated,
    pulse: props.pulse,
    size: '100%',
    seed: `${species}${pot}`,
  };
  const layer: JSX.CSSProperties = { position: 'absolute', inset: 0 };

  const petPx = Math.min(CARD_RESIDENT_MAX_PX, Math.round(size * 0.36));
  const seat = toPx(spots.seat.x, spots.seat.y);
  // The pet's feet are on y 94 of its canvas; it faces out over the lip, away from the stake.
  const resident = residentPetId ? (
    <PetArt
      petId={residentPetId}
      size={petPx}
      pose="loaf"
      expression={props.residentExpression}
      light={light}
      facing={away > 0 ? 'left' : 'right'}
      animated={props.animated}
      style={{ position: 'absolute', left: `${(seat.left - petPx / 2).toFixed(1)}px`, top: `${(seat.top - petPx * 0.94).toFixed(1)}px` }}
    />
  ) : null;

  const iconPx = Math.max(12, Math.round(size * 0.26));
  const foot = toPx(spots.stake.x, spots.stake.y);
  const stakeH = Math.max(6, size * 0.16);
  const disc = { cx: foot.left, cy: foot.top - stakeH - iconPx * 0.42 };
  const night = light.night;
  const stake = icon ? (
    <>
      <svg style={layer} width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible" aria-hidden="true" focusable="false" data-part="stake">
        <rect x={foot.left - 0.7} y={disc.cy} width={1.4} height={foot.top - disc.cy + 1} rx={0.7} fill={night ? STAKE.woodLamp : STAKE.wood} />
        <circle cx={disc.cx} cy={disc.cy} r={iconPx * 0.56} fill={night ? STAKE.paperLamp : STAKE.paper} />
        <circle cx={disc.cx + away * iconPx * 0.08} cy={disc.cy + iconPx * 0.06} r={iconPx * 0.56} fill="none" stroke={STAKE.edge} stroke-width={0.6} opacity={0.9} />
      </svg>
      <HabitIcon id={icon} tone={tone} size={iconPx * 0.82} style={{ position: 'absolute', left: `${(disc.cx - iconPx * 0.41).toFixed(1)}px`, top: `${(disc.cy - iconPx * 0.41).toFixed(1)}px` }} />
    </>
  ) : null;

  return (
    <span
      class={props.class}
      style={{ position: 'relative', display: 'inline-block', width: `${size}px`, height: `${size}px`, flex: 'none', ...props.style }}
      role={props.title ? 'img' : undefined}
      aria-label={props.title}
      aria-hidden={props.title ? undefined : true}
      data-card-plant={species}
    >
      <PlantArt {...plant} layer={young ? 'all' : 'back'} style={layer} />
      {young && resident}
      {stake}
      {!young && resident}
      {!young && <PlantArt {...plant} layer="front" style={layer} />}
    </span>
  );
}
