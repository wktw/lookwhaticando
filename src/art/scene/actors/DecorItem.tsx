/**
 * A placed decor item (drawn by the items module, `DECOR_ENTRIES`) standing on the Shelf in the scene's
 * light: flipped items get the mirrored light so their crescent still falls away from the window, and
 * lights (a jam-jar lantern, a paper star) glow warm after dark.
 */
import { memo } from 'preact/compat';
import type { Light } from '@/art/light';
import { DECOR_ENTRIES } from '../decor';
import { DECOR_BASELINE, PET_UNITS } from '../room';
import { useUid } from '../uid';
import { decorSize, mirrored } from '../fit';
import { standAt, u } from './stand';
import s from '../shelf.module.css';

export interface DecorItemProps {
  itemId: string;
  x: number;
  /** Baseline in units (for hanging items: the y it hangs from). */
  y: number;
  z: number;
  /** A pet's canvas edge in units: decor sizes are measured against a sitting cat (PET_UNITS). */
  petSize: number;
  light: Light;
  flip?: boolean;
  scale?: number;
}

export const DecorItem = memo(function DecorItem({ itemId, x, y, z, petSize, light, flip = false, scale = 1 }: DecorItemProps) {
  const glowId = useUid('dglow');
  const entry = DECOR_ENTRIES[itemId];
  if (!entry) return null;
  const size = decorSize(itemId, petSize);
  const hanging = entry.hang === 'window';
  const style = hanging
    ? { position: 'absolute' as const, left: u(x - size / 2), top: u(y), width: u(size), height: u(size), zIndex: z }
    : standAt(x, y, size, DECOR_BASELINE, z, scale);
  const glow = light.night ? entry.glow : undefined;
  const art = entry.art({ night: light.night, light: flip ? mirrored(light) : light, line: PET_UNITS / entry.size });
  return (
    <svg class={s.decor} style={style} viewBox="0 0 100 100" aria-hidden="true" focusable="false" overflow="visible" data-decor={itemId}>
      {glow && (
        <>
          <defs>
            <radialGradient id={glowId}>
              <stop offset="0" stop-color="var(--lamp, #FFC98A)" stop-opacity={0.55} />
              <stop offset="0.4" stop-color="var(--lamp, #FFC98A)" stop-opacity={0.2} />
              <stop offset="1" stop-color="var(--lamp, #FFC98A)" stop-opacity={0} />
            </radialGradient>
          </defs>
          <circle cx={glow[0]} cy={glow[1]} r={glow[2] * 1.3} fill={`url(#${glowId})`} />
        </>
      )}
      {flip ? <g transform="translate(100 0) scale(-1 1)">{art}</g> : art}
    </svg>
  );
});
