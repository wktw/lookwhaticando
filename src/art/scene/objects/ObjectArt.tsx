/**
 * A keepsake or a routine's object on its own (the memory shelf, the Pet Card's "Known for", a keepsake toast): the
 * same drawing the Sill places, on its 100 canvas, lit by the app's one light unless given one (DESIGN §10.4, §14.1).
 */
import type { JSX } from 'preact';
import type { KeepsakeKind } from '@/state/types';
import type { Routine } from '@/domain/routines';
import type { Light } from '@/art/light';
import { useArtLight } from '../moment';
import { KEEPSAKE_ART } from './keepsakes';
import { ROUTINE_ART } from './routines';

export interface ObjectArtProps {
  /** A keepsake's kind, or a routine: exactly one. */
  keepsake?: KeepsakeKind;
  routine?: Routine;
  size?: number | string;
  light?: Light;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export function ObjectArt({ keepsake, routine, size = 48, light: given, title, class: cls, style }: ObjectArtProps) {
  const appLight = useArtLight();
  const light = given ?? appLight;
  const entry = keepsake ? KEEPSAKE_ART[keepsake] : routine ? ROUTINE_ART[routine] : undefined;
  if (!entry) return null;
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg viewBox="0 0 100 100" width={px} height={px} class={cls} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false" data-object={keepsake ?? routine}>
      {entry.art({ light, night: light.night })}
    </svg>
  );
}
