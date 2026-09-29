import type { Rarity } from '@/catalog/types';
import type { PetState } from '@/state/types';
import type { PullResult } from '@/state/api';
import { luminance } from '@/art/machines/color';

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

/** White (or nearly): pretty in the dome, but a blank ball on the dark reveal stage. */
export function isWhiteish(color: string): boolean {
  return luminance(color) > 0.9;
}

/**
 * Shell colors for a capsule of palette tint `tint`: its own color, and a colored partner for
 * two-tone shells. A white capsule borrows its partner's color, so a reveal is never blank.
 */
export function capsuleShell(colors: readonly string[], tint: number): RevealData['shell'] {
  const n = colors.length;
  const own = colors[tint % n]!;
  const partners = Array.from({ length: n - 1 }, (_, k) => colors[(tint + 2 + k) % n]!).filter((c) => c !== own && !isWhiteish(c));
  const partner = partners[0] ?? own;
  return isWhiteish(own) ? { color: partner, color2: partners[1] ?? partner } : { color: own, color2: partner };
}
