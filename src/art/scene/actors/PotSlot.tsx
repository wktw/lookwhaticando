/**
 * A habit's plant standing on the sill: PlantArt in the shared light, in two layers (the vessel and the foliage behind
 * the rim, then the foliage that spills over it) so a resident on the rim sits among its leaves, not over them. Its
 * paper nursery tag stands low in the soil in front of the pot, on the side away from the resident's head, below the
 * rim line (DESIGN §9.1: the plants and the animals are the subject, the tag is a label).
 */
import type { JSX } from 'preact';
import type { Light } from '@/art/light';
import { PlantArt, PlantTag } from '@/art/plants';
import type { SillPot } from '../model';
import type { PotPlace } from '../sill/world';
import { standAt, u } from './stand';
import s from '../shelf.module.css';

export interface PotSlotProps {
  pot: SillPot;
  /** Where it stands (sillWorld's `pots`). */
  place: PotPlace;
  z: number;
  light: Light;
  tag?: boolean;
  animated?: boolean;
  pulse?: number;
  /** Lets the Today band find the pot to pour on it. */
  slotRef?: (el: HTMLDivElement | null) => void;
  class?: string;
}

/** Tag type: the floor in px (legible on any scene) and the size in scene units. */
export const TAG_TYPE = { name: { px: 11, units: 2.5 }, note: { px: 10, units: 1.95 } } as const;
/** Scenes shorter than this (px) show the tag's name only: the note would push the card above the rim. */
export const TAG_NOTE_MIN_SCENE_PX = 520;
/** No tag card is taller than this share of its pot (DESIGN §9.1: the tag is a label, not a sign). */
export const TAG_MAX_POT_SHARE = 0.35;

/** The tag card's top edge, as a share of the pot's height below its rim. */
export const TAG_TOP = 0.3;

/** Where a pot's tag stands: its card's top edge, just under the rim, and the x it reaches out from. */
export function tagAnchor(place: PotPlace): { x: number; y: number } {
  const rimW = place.metrics.rimW * place.size * place.scale;
  // Leaning on the pot's face on the tag side: the card's top a third of the way down the pot, below the rim.
  return { x: place.x + (place.tagSide === 'left' ? -1 : 1) * rimW * 0.08, y: place.rimY + place.potH * TAG_TOP };
}

/** The tag card's box in units [x0, y0, x1, y1] on a scene `sceneH` px tall, estimated from its text (for layout checks). */
export function tagBox(place: PotPlace, name: string, note: string | undefined, sceneH: number): [number, number, number, number] {
  const a = tagAnchor(place);
  const px = sceneH / 100;
  const nameU = Math.max(TAG_TYPE.name.px / px, TAG_TYPE.name.units);
  const noteU = Math.max(TAG_TYPE.note.px / px, TAG_TYPE.note.units);
  const showNote = !!note && sceneH >= TAG_NOTE_MIN_SCENE_PX;
  const w = Math.max(name.length * nameU * 0.5, showNote ? note!.length * noteU * 0.46 : 0) + nameU * 1.2;
  const h = nameU * 1.05 + (showNote ? noteU * 1.05 : 0) + nameU * 0.48;
  const x0 = place.tagSide === 'right' ? a.x : a.x - w;
  return [x0, a.y, x0 + w, a.y + h];
}

export function PotSlot({ pot, place, z, light, tag, animated, pulse, slotRef, class: cls }: PotSlotProps) {
  const stand = standAt(place.x, place.y, place.size, place.metrics.foot, z, place.scale);
  const stage = Math.max(0, Math.floor(pot.stage) || 0);
  const common = {
    species: pot.species,
    stage: pot.stage,
    progress: pot.progress,
    blooms: pot.blooms,
    pot: pot.pot,
    size: '100%',
    light,
    damp: pot.damp,
    pulse: pulse ?? pot.pulse,
    animated,
    look: pot.look,
    flourishes: pot.flourishes,
    // A cutting stands in its glass beside its empty pot (DESIGN §5.5).
    withPot: stage < 2,
    seed: pot.habitId,
  } as const;
  const a = tagAnchor(place);
  return (
    <>
      <div ref={slotRef} class={cls ? `${s.pot} ${cls}` : s.pot} style={stand} data-habit={pot.habitId}>
        <PlantArt {...common} layer="back" />
      </div>
      {/* the foliage that spills over the rim, over a resident sitting on it */}
      <div class={s.pot} style={{ ...stand, zIndex: z + 2 }} data-habit-front={pot.habitId}>
        <PlantArt {...common} layer="front" />
      </div>
      {pot.bow && (
        <svg class={s.pot} style={{ ...stand, zIndex: z + 3 }} viewBox="0 0 100 100" overflow="visible" aria-hidden="true" focusable="false" data-bow={pot.habitId}>
          <PotBow mouthY={place.metrics.mouth.y} hw={place.metrics.mouth.hw} side={place.facing === 'right' ? 1 : -1} night={light.night} />
        </svg>
      )}
      {tag && pot.name && stage >= 2 && (
        <PlantTag
          name={pot.name}
          note={pot.note}
          stand="propped"
          side={place.tagSide}
          maxWidth={0}
          size={`calc(${TAG_TYPE.name.units} * 1cqh)`}
          class={place.tagSide === 'left' ? `${s.potTag} ${s.potTagLeft}` : s.potTag}
          style={{ left: u(a.x), top: u(a.y), zIndex: z + 4, lineHeight: 1.05 } as JSX.CSSProperties}
        />
      )}
    </>
  );
}

/** A came-home day's bow (DESIGN §13): a ribbon round the pot under the rim, tied on the resident's side. */
function PotBow({ mouthY, hw, side, night }: { mouthY: number; hw: number; side: number; night: boolean }) {
  const y = mouthY + 5;
  const w = hw + 1.2;
  const bx = 50 + side * w * 0.5;
  const c = night ? { band: '#D9B970', bow: '#E3C57E', knot: '#C9A45A' } : { band: '#EFCF72', bow: '#F4DC93', knot: '#DDB450' };
  return (
    <g>
      <path d={`M${50 - w} ${y - 1}Q50 ${y + 0.6} ${50 + w} ${y - 1}L${50 + w - 0.3} ${y + 0.9}Q50 ${y + 2.5} ${50 - w + 0.3} ${y + 0.9}Z`} fill={c.band} />
      <path d={`M${bx} ${y}l-3.6 -2.2l0.2 4.2Z M${bx} ${y}l3.6 -2.2l-0.2 4.2Z`} fill={c.bow} />
      <path d={`M${bx} ${y}l-1.4 4.8l1.1 -0.4Z M${bx} ${y}l1.6 4.6l-1.1 -0.2Z`} fill={c.knot} />
      <ellipse cx={bx} cy={y} rx={0.95} ry={0.85} fill={c.knot} />
    </g>
  );
}
