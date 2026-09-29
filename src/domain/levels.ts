/**
 * Friendship levels (DESIGN §13.10 "Friendship", which overrides the §7.1/§13.7 thresholds).
 *
 * Levels 1–10 at 0, 20, 50, 100, 170, 260, 380, 540, 750, 1000 XP, then cosmetic bond levels
 * 11–15 at 1300, 1650, 2050, 2500, 3000. XP never decays. After level 10, every 150 XP adds a
 * dated Memory polaroid (the UI derives them from `memoriesFor`).
 */

/** Cumulative XP needed for each level; index 0 = level 1. */
export const LEVEL_XP = [0, 20, 50, 100, 170, 260, 380, 540, 750, 1000, 1300, 1650, 2050, 2500, 3000] as const;
export const MAX_FRIEND_LEVEL = 10;
export const MAX_BOND_LEVEL = 15;
export const XP_PER_MEMORY = 150;

/** What each level unlocks (DESIGN §13.10). */
export const LEVEL_PERKS: Readonly<Record<number, string>> = {
  2: 'waves hello',
  3: 'uses your name',
  4: 'claims a favorite spot',
  5: 'twirls',
  6: 'leaves little gifts under the tree',
  7: 'heart-eyes',
  8: 'naps next to your buddy',
  10: 'Best Friends crown',
  11: 'heart emote',
  12: 'name sparkle',
  13: 'shared nap with the buddy',
};

/** Level 1..15 for an XP total. */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]!) level = i + 1;
  return level;
}

export interface LevelProgress {
  level: number;
  /** A cosmetic bond level (11–15). */
  bond: boolean;
  /** XP earned inside the current level. */
  into: number;
  /** XP from this level to the next (0 at the top). */
  span: number;
  /** 0..1 toward the next level (1 at the top). */
  fraction: number;
  /** XP still needed for the next level; null at level 15. */
  toNext: number | null;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const lo = LEVEL_XP[level - 1]!;
  const hi = LEVEL_XP[level];
  if (hi === undefined) return { level, bond: true, into: xp - lo, span: 0, fraction: 1, toNext: null };
  const span = hi - lo;
  return { level, bond: level > MAX_FRIEND_LEVEL, into: xp - lo, span, fraction: Math.min(1, (xp - lo) / span), toNext: hi - xp };
}

/** Levels passed when XP grows from `before` to `after` (each emits a petLevel event). */
export function levelsCrossed(before: number, after: number): number[] {
  const out: number[] = [];
  for (let l = levelForXp(before) + 1; l <= levelForXp(after); l++) out.push(l);
  return out;
}

/** Memory polaroids earned: one per 150 XP beyond level 10 (DESIGN §13.10). */
export function memoriesFor(xp: number): number {
  return Math.max(0, Math.floor((xp - LEVEL_XP[MAX_FRIEND_LEVEL - 1]!) / XP_PER_MEMORY));
}
