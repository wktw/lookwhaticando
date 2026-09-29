/**
 * Touching a pet on the Shelf (DESIGN §8.2): tap, stroke (a drag of 40 px or more), boop (a tap on the top 30% of
 * the face side) and carry (a 300 ms long press, then it follows the finger). Pure classification for the tests; the
 * actor wires it to pointer events. Every gesture has a key too: Enter or Space taps, B boops, S strokes, and the
 * Pet Card has buttons for all of them.
 */
import type { Species } from '@/catalog/types';
import type { Expression } from '@/art/pets/types';
import type { PetGesture } from '../model';

/** A stroke is a drag at least this long (px). */
export const STROKE_PX = 40;
/** A press held this long without moving far lifts the pet. */
export const CARRY_MS = 300;
/** Movement under this (px) is still a tap. */
export const TAP_SLOP_PX = 10;
/** The boop zone: the top 30% of the pet's box, on the side its face is. */
export const BOOP_TOP = 0.3;

export interface PressTrack {
  /** Where the press started, as a share of the pet's box (0,0 top left). */
  at: { x: number; y: number };
  /** The farthest the pointer travelled from the start (px). */
  travel: number;
  /** How long it was held (ms). */
  held: number;
  facing: 'left' | 'right';
}

/** What a finished press was, or null (a drag that was neither a stroke nor a carry: a scroll attempt). */
export function classifyPress(p: PressTrack): PetGesture | null {
  if (p.held >= CARRY_MS && p.travel < TAP_SLOP_PX * 2) return 'carry';
  if (p.travel >= STROKE_PX) return 'stroke';
  if (p.travel >= TAP_SLOP_PX) return null;
  const faceSide = p.facing === 'right' ? p.at.x >= 0.4 : p.at.x <= 0.6;
  return p.at.y <= BOOP_TOP && faceSide ? 'boop' : 'tap';
}

/** The key equivalents. */
export function gestureForKey(key: string): PetGesture | null {
  if (key === 'Enter' || key === ' ') return 'tap';
  if (key === 'b' || key === 'B') return 'boop';
  if (key === 's' || key === 'S') return 'stroke';
  return null;
}

/** How a pet answers a touch (never grumpy): a look and a small movement, and how long it lasts. */
export interface Reaction {
  expression: Expression;
  /** A body movement class on the actor: a tiny hop, a lean into the hand, a squash on landing. */
  move?: 'hop' | 'lean' | 'squash';
  ms: number;
}

/** A boop's answer by species: a cat's blep, a cow's nose-lick, a frog's throat puff (DESIGN §8.2, §10.4). */
const BOOP: Readonly<Record<Species, Expression>> = { cat: 'blep', dog: 'blep', bear: 'blep', cow: 'chew', frog: 'happy', bunny: 'blink', duck: 'blink', hamster: 'blink' };

export function reactionFor(gesture: PetGesture | 'drop', species: Species, asleep: boolean): Reaction {
  if (gesture === 'drop') return { expression: 'blink', move: 'squash', ms: 900 };
  // Tapping a sleeping pet gets a yawn and a slow blink.
  if (asleep && gesture !== 'carry') return { expression: 'yawn', ms: 1400 };
  if (gesture === 'tap') return { expression: 'surprised', move: 'hop', ms: 900 };
  if (gesture === 'stroke') return { expression: 'happy', move: 'lean', ms: 1600 };
  if (gesture === 'boop') return { expression: BOOP[species], ms: 1200 };
  return { expression: 'rest', ms: 0 };
}
