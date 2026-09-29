/** How decor and lights fit a scene: sizes against a pet, and light for art drawn mirrored. */
import type { Light } from '@/art/light';
import { DECOR_ENTRIES, type DecorEntry } from './decor';
import { PET_UNITS } from './room';

/** A decor item's canvas edge in scene units, given a pet's canvas edge (DecorEntry.size is in pet units). */
export function decorSize(item: string | DecorEntry | undefined, petSize: number): number {
  const entry = typeof item === 'string' ? DECOR_ENTRIES[item] : item;
  return ((entry?.size ?? PET_UNITS) * petSize) / PET_UNITS;
}

/** The mirror image of a light, for art drawn flipped: its crescent still falls away from the window. */
export function mirrored(light: Light): Light {
  return light.from === 'top' ? light : { ...light, from: light.from === 'left' ? 'right' : 'left' };
}
