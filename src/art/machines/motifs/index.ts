import type { MachineId } from '@/catalog/types';
import type { Motif } from './shared';
import { dreamy, kitty, moo, puppy, sakura, sweets } from './standard';
import { beach, love, pumpkin, rainy, snow } from './seasonal';

export type { Motif, MotifCtx } from './shared';

export const MOTIFS: Record<MachineId, Motif> = { kitty, moo, puppy, sakura, sweets, dreamy, pumpkin, snow, love, rainy, beach };
