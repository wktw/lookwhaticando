import type { Rarity } from '@/catalog/types';
import type { PetState } from '@/state/types';
import type { PullResult } from '@/state/api';

/** Everything the reveal overlay shows, whether it came from a capsule or a wish. */
export interface RevealData {
  itemId: string;
  rarity: Rarity;
  isNew: boolean;
  /** Stardust from a duplicate. */
  stardust: number;
  /** Stars fused from stardust by this reveal. */
  fusedStars: number;
  /** A freshly met pet. */
  pet?: PetState;
  /** Friendship gained by a duplicate pet. */
  friendshipXp?: number;
  /** Shell colors of the capsule it arrived in. */
  shell: { color: string; color2: string };
  /** 'wish' = granted by the Wishing Well: no capsule to open (except a Secret, which stays a surprise). */
  via: 'pull' | 'wish';
}

export function revealFromPull(r: PullResult, shell: RevealData['shell']): RevealData {
  return {
    itemId: r.itemId,
    rarity: r.rarity,
    isNew: r.isNew,
    stardust: r.stardust,
    fusedStars: r.fusedStars,
    pet: r.pet,
    friendshipXp: r.friendshipXp,
    shell,
    via: 'pull',
  };
}
