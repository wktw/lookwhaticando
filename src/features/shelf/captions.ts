/**
 * The line under the Shelf: what a pet is doing, in the narrator's voice (DESIGN §8.2, VOICE §9
 * Captions). A tap picks from the caption matrix by the hour: `tap` by day, `evening` under the lamp
 * (20:00–23:00) and `night` asleep (23:00–06:00), never repeating one of the last 5 in a context.
 */
import type { LineContext } from '@/catalog/lines';
import { fillLine, pickLine } from '@/catalog/lines';
import type { Personality, Species } from '@/catalog/types';

/** The caption context for a touch at this hour. */
export function touchContext(hour: number): LineContext {
  if (hour >= 23 || hour < 6) return 'night';
  if (hour >= 20) return 'evening';
  return 'tap';
}

/** The caption context for the Shelf's opening line at this hour (the pets' own routine). */
export function idleContext(hour: number): LineContext {
  if (hour >= 23 || hour < 6) return 'night';
  if (hour >= 20) return 'evening';
  if (hour >= 12) return 'afternoon';
  return 'morning';
}

const recent = new Map<LineContext, string[]>();
let seed = Math.floor(Math.random() * 1_000_000);

/** A caption for a pet, filled with its name. `level` keeps a behaviour back until its level. */
export function captionFor(pet: { name: string; personality: Personality; species: Species; level: number }, context: LineContext, hour: number): string {
  const past = recent.get(context) ?? [];
  const template = pickLine(context, pet.personality, pet.species, ++seed, past, { level: pet.level, night: hour >= 23 || hour < 6 });
  recent.set(context, [...past, template].slice(-5));
  return fillLine(template, { name: pet.name });
}

/** Tests: start from a known seed with nothing recent. */
export function resetCaptions(at = 0): void {
  recent.clear();
  seed = at;
}
