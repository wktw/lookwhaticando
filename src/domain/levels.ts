/**
 * Friendship levels (DESIGN §8.2).
 *
 * Levels 1–10 at 0, 20, 50, 100, 170, 260, 380, 540, 750, 1000 XP, then bond levels 11–15 at
 * 1300, 1650, 2050, 2500, 3000. XP never decays. After level 10, every 150 XP adds a dated Memory.
 */

/** Cumulative XP needed for each level; index 0 = level 1. */
export const LEVEL_XP = [0, 20, 50, 100, 170, 260, 380, 540, 750, 1000, 1300, 1650, 2050, 2500, 3000] as const;
export const MAX_FRIEND_LEVEL = 10;
export const MAX_BOND_LEVEL = 15;
export const XP_PER_MEMORY = 150;
/** From this level a pet out on the Shelf leaves found things on the sill (friendship.ts). */
export const FOUND_THING_LEVEL = 6;

/**
 * What changes at each level (§8.2: levels change behaviour, not just badges). Ids, not words: the
 * screens word them (src/catalog/lines.ts) and the art plays them.
 * L2 looks up when you water · L3 slow-blinks back (cats) / nose-licks (cows) · L4 claims a
 * favourite spot · L5 follows the sunbeam · L6 leaves found things · L7 naps touching you (the
 * edge of the screen) · L8 naps next to its best friend · L10 best friends (a tiny brass tag).
 */
export type LevelPerk = 'looks-up' | 'slow-blink' | 'favourite-spot' | 'follows-sunbeam' | 'found-things' | 'naps-touching' | 'best-friend-nap' | 'best-friends';
export const LEVEL_PERKS: Readonly<Record<number, LevelPerk>> = {
  2: 'looks-up',
  3: 'slow-blink',
  4: 'favourite-spot',
  5: 'follows-sunbeam',
  [FOUND_THING_LEVEL]: 'found-things',
  7: 'naps-touching',
  8: 'best-friend-nap',
  10: 'best-friends',
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

/** Memories earned: one per 150 XP beyond level 10 (DESIGN §8.2). */
export function memoriesFor(xp: number): number {
  return Math.max(0, Math.floor((xp - LEVEL_XP[MAX_FRIEND_LEVEL - 1]!) / XP_PER_MEMORY));
}
