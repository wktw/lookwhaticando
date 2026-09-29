/**
 * Shared kit for habit icons (32-unit canvas). Every icon is a small real object printed in one
 * pastel family: the 500 hero fill for the object, the 700 ink for its second tone (handles, laces,
 * lettering), 300 and 100 for glass and paper, and a pre-mixed shade for the side away from the window.
 * No outlines around shapes; only genuinely thin things (strings, wires, stems, spokes) are strokes.
 */
import type { JSX } from 'preact';

/** The tones one family hands to a drawing. */
export interface HabitColors {
  /** 500: the object. */
  fill: string;
  /** 100: paper, highlights, light interiors. */
  soft: string;
  /** 700: the second print tone (details, handles, lettering). */
  ink: string;
  /** 300: glass, pale parts. */
  light: string;
  /** The 500 pre-mixed with the lavender shade ink: the side away from the window. */
  shade: string;
}

export type HabitDrawing = (c: HabitColors) => JSX.Element;

/** Weight of the thin things (strings, stems, spokes), in canvas units. */
export const THIN = 1.7;

/** A round-capped thin line in the ink tone. */
export function Thin({ d, c, w = THIN, color }: { d: string; c: HabitColors; w?: number; color?: string }) {
  return <path d={d} fill="none" stroke={color ?? c.ink} stroke-width={w} stroke-linecap="round" stroke-linejoin="round" />;
}
