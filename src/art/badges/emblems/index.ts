import type { Emblem } from './kit';
import { GROWTH_EMBLEMS } from './growth';
import { COLLECTION_EMBLEMS } from './collection';
import { FRIEND_EMBLEMS } from './friends';

export type { Emblem, EmblemCtx } from './kit';

/** Emblem art keyed by badge id (catalog/badges.ts). */
export const BADGE_EMBLEMS: Record<string, Emblem> = { ...GROWTH_EMBLEMS, ...COLLECTION_EMBLEMS, ...FRIEND_EMBLEMS };
