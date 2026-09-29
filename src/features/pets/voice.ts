/**
 * When a pet makes a sound (DESIGN §8.2: sounds are sparse). A tap or "Say hello" may voice the pet,
 * at most once every 20 seconds across the app; a boop, a stroke and a carry are quiet, and so is
 * everyone between 23:00 and 06:00, when the pets are asleep. Haptics are not limited.
 */
import type { Species } from '@/catalog/types';
import { SPECIES_VOICE } from '@/catalog/personalities';
import { sfx } from '@/fx/sound';

export const VOICE_GAP_MS = 20_000;

let last = Number.NEGATIVE_INFINITY;

/** Whether a gesture at this moment gets a voice (and, if so, marks the time). */
export function shouldVoice(gesture: string, hour: number, at: number): boolean {
  if (gesture !== 'tap') return false;
  if (hour >= 23 || hour < 6) return false;
  if (at - last < VOICE_GAP_MS) return false;
  last = at;
  return true;
}

/** Voice the pet if the moment allows it. */
export function petVoice(species: Species | null | undefined, gesture: string, hour: number, at = Date.now()): void {
  if (species && shouldVoice(gesture, hour, at)) sfx.voice(SPECIES_VOICE[species]);
}

/** Tests: forget the last voice. */
export function resetVoice(): void {
  last = Number.NEGATIVE_INFINITY;
}
