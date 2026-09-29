/**
 * Meadow scene art. STUB: the world module implements the full scene.
 *
 * <MeadowScene> fills its container (use a wrapper with an aspect ratio / height) and renders
 * sky (by time of day), hills, tree, fence, flowers, placed decor, and a planter box. Pets and
 * other live actors are rendered by the Meadow screen as `children` inside the ground layer,
 * positioned with GROUND coordinates (x 0..1 across, y 0..1 from horizon to front edge).
 */
import type { ComponentChildren, JSX } from 'preact';

export type TimeOfDay = 'dawn' | 'day' | 'golden' | 'night';

export function timeOfDayAt(date: Date): TimeOfDay {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'golden';
  return 'night';
}

export interface PlacedDecor {
  itemId: string;
  /** Ground coordinates 0..1. */
  x: number;
  y: number;
}

export interface MeadowSceneProps {
  time: TimeOfDay;
  decor: PlacedDecor[];
  /** Plants shown in the planter box (left to right). */
  planters?: { species: string; stage: number; pot: string }[];
  children?: ComponentChildren;
  class?: string;
  style?: JSX.CSSProperties;
}

export function MeadowScene({ children, class: cls, style }: MeadowSceneProps) {
  return (
    <div class={cls} style={{ position: 'relative', background: 'linear-gradient(#BBDCF6, #EBF5E6 60%, #C3DFB4)', ...style }}>
      {children}
    </div>
  );
}

export interface WindowsillSceneProps {
  time: TimeOfDay;
  /** Buddy + plants are passed as children by the Today screen. */
  children?: ComponentChildren;
  class?: string;
  style?: JSX.CSSProperties;
}

/** A compact header scene for Today: a window with the sky outside and a sill to sit things on. */
export function WindowsillScene({ children, class: cls, style }: WindowsillSceneProps) {
  return (
    <div class={cls} style={{ position: 'relative', background: 'linear-gradient(#BBDCF6, #FFF1E6)', borderRadius: '22px', ...style }}>
      {children}
    </div>
  );
}
