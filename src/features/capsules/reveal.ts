import type { MachineId, Rarity } from '@/catalog/types';
import { getCollectible, SECRET_IDS } from '@/catalog/collectibles';
import type { PendingReveal, PetState } from '@/state/types';
import type { PullResult } from '@/state/api';
import { luminance } from '@/art/machines/color';
import { finishOf, type CapsuleFinish } from '@/art/machines/CapsuleArt';

/** Everything the reveal shows, whether it came out of a cabinet or was ordered at the counter. */
export interface RevealData {
  itemId: string;
  rarity: Rarity;
  /** The series Secret (a "?" on the lineup until now). */
  secret: boolean;
  /** The series it came from (its number and motif are printed on the insert). */
  machineId?: MachineId;
  isNew: boolean;
  /** Swaps from a duplicate (internally stardust). */
  stardust: number;
  /** Stamps made by ten swaps during this reveal (internally stars). */
  fusedStars: number;
  /** A freshly met pet. */
  pet?: PetState;
  /** Friendship gained by a duplicate pet. */
  friendshipXp?: number;
  /** Colours of the capsule it arrived in. */
  shell: { color: string; color2: string };
  /** 'order' = a Special Order: it arrives unboxed, except a Secret, which still comes in a capsule. */
  via: 'pull' | 'order';
}

export function finishFor(data: Pick<RevealData, 'rarity' | 'secret'>): CapsuleFinish {
  return finishOf(data.rarity, data.secret);
}

export function revealFromPull(r: PullResult, shell: RevealData['shell']): RevealData {
  return {
    itemId: r.itemId,
    rarity: r.rarity,
    secret: r.secret,
    machineId: r.machineId,
    isNew: r.isNew,
    stardust: r.stardust,
    fusedStars: r.fusedStars,
    pet: r.pet,
    friendshipXp: r.friendshipXp,
    shell,
    via: 'pull',
  };
}

/** A pull the store committed before a reload (commit before animate, §7.1): resume its reveal. */
export function revealFromPending(p: PendingReveal, shell: RevealData['shell']): RevealData | null {
  const def = getCollectible(p.itemId);
  if (!def) return null;
  return {
    itemId: p.itemId,
    rarity: def.rarity,
    secret: SECRET_IDS.has(p.itemId),
    machineId: p.machineId,
    isNew: p.isNew,
    stardust: p.stardust,
    fusedStars: p.fusedStars,
    friendshipXp: p.friendshipXp,
    shell,
    via: 'pull',
  };
}

/** White (or nearly): lovely in the window, but a blank ball on the reveal. */
export function isWhiteish(color: string): boolean {
  return luminance(color) > 0.9;
}

/**
 * Shell colours for a capsule of palette tint `tint`: its own colour, and a coloured partner for
 * two-colour prints. A white capsule borrows its partner's colour, so a reveal is never blank.
 */
export function capsuleShell(colors: readonly string[], tint: number): RevealData['shell'] {
  const n = colors.length;
  const own = colors[tint % n]!;
  const partners = Array.from({ length: n - 1 }, (_, k) => colors[(tint + 2 + k) % n]!).filter((c) => c !== own && !isWhiteish(c));
  const partner = partners[0] ?? own;
  return isWhiteish(own) ? { color: partner, color2: partners[1] ?? partner } : { color: own, color2: partner };
}
