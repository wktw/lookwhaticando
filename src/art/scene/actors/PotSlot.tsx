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
  /** Lets the Today band find the pot to pour on it. */
  slotRef?: (el: HTMLDivElement | null) => void;
  class?: string;
}

export function PotSlot({ pot, x, y, size, z, light, tag, animated, damp, pulse, scale = 1, slotRef, class: cls }: PotSlotProps) {
  const rimY = y - ((PLANT_BASELINE - POT_RIM.y) / 100) * size * scale;
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
        <SillTag name={pot.name} note={pot.note} style={{ left: u(x + size * 0.13 * scale), top: u(rimY + 0.6), zIndex: z + 2 }} />
      )}
    </>
  );
}

/**
 * A paper nursery tag on a stake, pushed into the soil. Real text, never clipped mid-word.
 * TODO(integration): swap for `PlantTag` from '@/art/plants' when the plants module lands it.
 */
export function SillTag({ name, note, style }: { name: string; note?: string; style?: JSX.CSSProperties }) {
  return (
    <span class={s.tag} style={style}>
      <span class={s.tagCard}>
        <span class={s.tagName}>{name}</span>
        {note && <span class={s.tagNote}>{note}</span>}
      </span>
    </span>
  );
}
