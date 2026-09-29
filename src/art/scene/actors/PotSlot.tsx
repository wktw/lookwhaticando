/**
 * A habit's plant standing on the sill: PlantArt in the shared light, and its paper nursery tag.
 */
import type { JSX } from 'preact';
import type { Light } from '@/art/light';
import type { SillPot } from '../model';
import { PLANT_BASELINE, POT_RIM } from '../room';
import { Plant } from './adapters';
import { standAt, u } from './stand';
import s from '../shelf.module.css';

export interface PotSlotProps {
  pot: SillPot;
  x: number;
  /** Baseline (the pot's foot) in units. */
  y: number;
  /** PlantArt canvas edge in units. */
  size: number;
  z: number;
  light: Light;
  tag?: boolean;
  animated?: boolean;
  damp?: boolean;
  pulse?: number;
  scale?: number;
  /** Which side of the pot the tag's stake goes in (away from the resident's head). */
  tagSide?: 'left' | 'right';
  /** Lets the Today band find the pot to pour on it. */
  slotRef?: (el: HTMLDivElement | null) => void;
  class?: string;
}

export function PotSlot({ pot, x, y, size, z, light, tag, animated, damp, pulse, scale = 1, tagSide = 'right', slotRef, class: cls }: PotSlotProps) {
  const stake = tagStake(x, y, size, scale, tagSide);
  return (
    <>
      <div ref={slotRef} class={cls ? `${s.pot} ${cls}` : s.pot} style={standAt(x, y, size, PLANT_BASELINE, z, scale)} data-habit={pot.habitId}>
        <Plant
          species={pot.species}
          stage={pot.stage}
          progress={pot.progress}
          blooms={pot.blooms}
          pot={pot.pot}
          size="100%"
          light={light}
          damp={damp ?? pot.damp}
          pulse={pulse ?? pot.pulse}
          animated={animated}
        />
      </div>
      {tag && pot.name && pot.stage >= 2 && (
        <SillTag name={pot.name} note={pot.note} side={tagSide} style={{ left: u(stake.x), top: u(stake.y), zIndex: z + 2 }} />
      )}
    </>
  );
}

/** Tag type sizes: the floor in px (legible on any scene) and the size in scene units. */
export const TAG_TYPE = { name: { px: 11, units: 3.1 }, note: { px: 10, units: 2.5 } } as const;
/** Scenes shorter than this (px) show the tag's name only, never a clipped note. */
export const TAG_NOTE_MIN_SCENE_PX = 220;
/** The stake's length above the soil, in units. */
const STAKE = 5;

/** Where a pot's tag stake goes into the soil: just inside the rim on one side. */
export function tagStake(x: number, y: number, size: number, scale: number, side: 'left' | 'right'): { x: number; y: number } {
  const rimY = y - ((PLANT_BASELINE - POT_RIM.y) / 100) * size * scale;
  return { x: x + (side === 'left' ? -1 : 1) * size * 0.16 * scale, y: rimY + 0.6 };
}

/**
 * The tag card's box in units [x0, y0, x1, y1] on a scene `sceneH` px tall, estimated from its text
 * (for layout checks; the card sizes itself to its text in CSS). It reaches out over the rim on its side.
 */
export function tagBox(stake: { x: number; y: number }, side: 'left' | 'right', name: string, note: string | undefined, sceneH: number): [number, number, number, number] {
  const px = sceneH / 100;
  const nameU = Math.max(TAG_TYPE.name.px / px, TAG_TYPE.name.units);
  const noteU = Math.max(TAG_TYPE.note.px / px, TAG_TYPE.note.units);
  const showNote = !!note && sceneH >= TAG_NOTE_MIN_SCENE_PX;
  const w = Math.max(name.length * nameU * 0.5, showNote ? note!.length * noteU * 0.46 : 0) + 2.6;
  const h = nameU * 1.12 + (showNote ? noteU * 1.12 : 0) + 1.2;
  const bottom = stake.y - STAKE;
  const x0 = side === 'right' ? stake.x - 1.6 : stake.x + 1.6 - w;
  return [x0, bottom - h, x0 + w, bottom];
}

/**
 * A paper nursery tag on a stake, pushed into the soil. Real text at a legible size, never clipped:
 * on a short scene the note is left off rather than cut.
 * TODO(integration): swap for `PlantTag` from '@/art/plants' when the plants module lands it.
 */
export function SillTag({ name, note, side = 'right', style }: { name: string; note?: string; side?: 'left' | 'right'; style?: JSX.CSSProperties }) {
  return (
    <span class={side === 'left' ? `${s.tag} ${s.tagLeft}` : s.tag} style={style}>
      <span class={s.tagCard}>
        <span class={s.tagName}>{name}</span>
        {note && <span class={s.tagNote}>{note}</span>}
      </span>
    </span>
  );
}
