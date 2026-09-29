/**
 * A placed decor item (drawn by the items module, `DECOR_ENTRIES`, or a keepsake or routine object) standing on the
 * Shelf in the scene's light: flipped items get the mirrored light so their crescent still falls away from the window.
 * Lights (a jam-jar lantern, a paper star) paint their own halo; the scene lays their pool on the sill under them, so
 * each source has exactly one halo (DESIGN §10.4).
 */
import { memo } from 'preact/compat';
import type { Light } from '@/art/light';
import type { DecorEntry } from '../decor';
import { DECOR_BASELINE, PET_UNITS } from '../room';
import { mirrored } from '../fit';
import { standAt, u } from './stand';
import s from '../shelf.module.css';

export interface DecorItemProps {
  entry: DecorEntry;
  /** For the DOM (tests, edit mode). */
  itemId: string;
  x: number;
  /** Baseline in units (for hanging items: the y it hangs from). */
  y: number;
  z: number;
  /** Canvas edge in units (before the depth scale). */
  size: number;
  light: Light;
  flip?: boolean;
  scale?: number;
  /** Draw only the part in front of a napping pet (a box's front face), over it. */
  front?: boolean;
}

export const DecorItem = memo(function DecorItem({ entry, itemId, x, y, z, size, light, flip = false, scale = 1, front = false }: DecorItemProps) {
  const draw = front ? entry.front : entry.art;
  if (!draw) return null;
  const hanging = entry.hang === 'window';
  const style = hanging
    ? { position: 'absolute' as const, left: u(x - size / 2), top: u(y), width: u(size), height: u(size), zIndex: z }
    : standAt(x, y, size, DECOR_BASELINE, z, scale);
  const art = draw({ night: light.night, light: flip ? mirrored(light) : light, line: PET_UNITS / entry.size });
  return (
    <svg class={s.decor} style={style} viewBox="0 0 100 100" aria-hidden="true" focusable="false" overflow="visible" data-decor={itemId} data-part={front ? 'front' : undefined}>
      {flip ? <g transform="translate(100 0) scale(-1 1)">{art}</g> : art}
    </svg>
  );
});
