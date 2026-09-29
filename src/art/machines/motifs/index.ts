import type { MachineId } from '@/catalog/types';
import type { Motif } from './shared';
import { dreamy, kitty, moo, puppy, sakura, sweets } from './standard';
import { beach, love, pumpkin, rainy, snow } from './seasonal';

export type { Motif, MotifCtx } from './shared';

/** Placeholder mapping onto the Mochi-era motifs until the catkin cabinet restyle lands. */
export const MOTIFS: Record<MachineId, Motif> = {
  cats: kitty,
  cows: moo,
  dogs: puppy,
  pond: rainy,
  garden: sakura,
  pantry: sweets,
  night: dreamy,
  autumn: pumpkin,
  winter: snow,
  valentine: love,
  spring: sakura,
  summer: beach,
};
