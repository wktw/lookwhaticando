/**
 * Badges (DESIGN §6.5 as amended by v1 §13.10: Night owl → Wind-Down, plus Album Complete and First
 * Harvest). Every badge in `catalog/badges.ts` has exactly one rule below (a test enforces it).
 *
 * - A badge is awarded once (`state.badges[id]` = when), pays its catalog stars and emits a
 *   `badge` event. Nothing is ever taken back.
 * - Rules are either *state* rules (derivable from the save: lifetime counters, collection, plant
 *   high-water marks, friendship) or *moment* rules that need to know what just happened (a first
 *   rest, a pull's rarity, a live check-in's wall-clock time…), passed as a `BadgeTrigger`.
 * - Counters only move through reward paths (never through history edits), so badges cannot be
 *   farmed by editing the calendar or by un-checking and re-checking.
 * - Early bird and Wind-Down read wall-clock time from live `at` stamps only (v1 §13.2).
 * - Nothing is awarded while the clock guard pauses rewards (v1 §13.2).
 */
import { ALBUMS } from '@/catalog/collectibles';
import { BADGES, BADGE_BY_ID } from '@/catalog/badges';
import { MACHINES } from '@/catalog/machines';
import type { Rarity } from '@/catalog/types';
import type { AppState } from '@/state/types';
import { albumProgress, isMachineComplete, machineCollectiblesOwned } from './collection';
import { clampDayStartsAt, type LocalTimeReader } from './dates';
import { levelForXp, MAX_FRIEND_LEVEL } from './levels';
import type { Tx } from './tx';
import { grantExclusive, grantStars, hasOnce, rewardsPaused, setOnce } from './wallet';

/** What just happened, for badges that celebrate a moment rather than a state. */
export interface BadgeTrigger {
  /** A rest day was just set. */
  rested?: boolean;
  /** A treat was just fed. */
  fedTreat?: boolean;
  /** A favorite treat was just discovered by feeding it. */
  favoriteFound?: boolean;
  /** An outfit item was just put on. */
  outfit?: boolean;
  /** A harvest treat just dropped. */
  harvested?: boolean;
  /** The Welcome home gift was just granted. */
  welcomeHome?: boolean;
  /** Rarity of a capsule just pulled. */
  pulled?: Rarity;
  /** Epoch ms of a LIVE check-in just made (for Early bird / Wind-Down). */
  liveCheckinAt?: number;
  /** Every day of a calendar week just became a perfect day. */
  perfectWeek?: boolean;
  /** A closed month just scored ≥ 80% with ≥ 10 expected. */
  steadyMonth?: boolean;
}

interface RuleContext {
  s: AppState;
  t: BadgeTrigger;
  local: LocalTimeReader;
}

type Rule = (c: RuleContext) => boolean;

/** Early bird: a live check-in from the start of the app day (never before 4:00) until 7:00 am. */
export const EARLY_BIRD = { fromMin: 4 * 60, untilMin: 7 * 60 } as const;
/** Wind-Down: three evening check-ins between 19:00 and 22:00 (v1 §13.10). */
export const WIND_DOWN = { fromMin: 19 * 60, untilMin: 22 * 60, count: 3 } as const;

const minutesOf = (ms: number, local: LocalTimeReader): number => {
  const t = local(ms);
  return t.hour * 60 + t.minute;
};

/** True when a live check-in at `ms` counts as an Early bird check-in. */
export function isEarlyBird(ms: number, dayStartsAt: number, local: LocalTimeReader): boolean {
  const m = minutesOf(ms, local);
  return m >= Math.max(EARLY_BIRD.fromMin, clampDayStartsAt(dayStartsAt)) && m < EARLY_BIRD.untilMin;
}

export function isWindDown(ms: number, local: LocalTimeReader): boolean {
  const m = minutesOf(ms, local);
  return m >= WIND_DOWN.fromMin && m < WIND_DOWN.untilMin;
}

/** Habit-days with a live check-in stamp between 19:00 and 22:00. */
export function windDownCheckins(s: AppState, local: LocalTimeReader): number {
  let n = 0;
  for (const logs of Object.values(s.logs)) {
    for (const log of Object.values(logs)) {
      if (log.kind === 'log' && log.at?.some((ms) => isWindDown(ms, local))) n++;
    }
  }
  return n;
}

const maxBestStage = (s: AppState): number => Math.max(0, ...Object.values(s.ledger.bestStage));
const checkins = (n: number): Rule => ({ s }) => s.lifetime.checkins >= n;
const collected = (n: number): Rule => ({ s }) => machineCollectiblesOwned(s.collection) >= n;

/** One rule per catalog badge. */
export const BADGE_RULES: Readonly<Record<string, Rule>> = {
  'first-checkin': checkins(1),
  'first-perfect-day': ({ s }) => s.lifetime.perfectDays >= 1,
  'perfect-week': ({ t }) => t.perfectWeek === true,
  'checkins-10': checkins(10),
  'checkins-50': checkins(50),
  'checkins-100': checkins(100),
  'checkins-250': checkins(250),
  'checkins-500': checkins(500),
  'checkins-1000': checkins(1000),
  'first-rest': ({ t }) => t.rested === true,
  comeback: ({ t }) => t.welcomeHome === true,
  'first-capsule': ({ s }) => s.lifetime.pulls >= 1,
  'first-rare': ({ t }) => t.pulled === 'rare' || t.pulled === 'ultra',
  'first-ultra': ({ t }) => t.pulled === 'ultra',
  'collect-10': collected(10),
  'collect-25': collected(25),
  'collect-50': collected(50),
  'collect-100': collected(100),
  'set-complete': ({ s }) => MACHINES.some((m) => isMachineComplete(s.collection, m.id)),
  'first-bloom': ({ s }) => maxBestStage(s) >= 5,
  'first-evergreen': ({ s }) => maxBestStage(s) >= 7,
  'first-treat': ({ t }) => t.fedTreat === true,
  'favorite-found': ({ t }) => t.favoriteFound === true,
  'first-outfit': ({ t }) => t.outfit === true,
  'best-friends': ({ s }) => Object.values(s.pets).some((p) => levelForXp(p.xp) >= MAX_FRIEND_LEVEL),
  'early-bird': ({ s, t, local }) => t.liveCheckinAt !== undefined && isEarlyBird(t.liveCheckinAt, s.settings.dayStartsAt, local),
  'wind-down': ({ s, t, local }) =>
    t.liveCheckinAt !== undefined && isWindDown(t.liveCheckinAt, local) && windDownCheckins(s, local) >= WIND_DOWN.count,
  'album-complete': ({ s }) => ALBUMS.some((a) => albumProgress(s.collection, a).complete),
  'first-harvest': ({ t }) => t.harvested === true,
  'steady-month': ({ t }) => t.steadyMonth === true,
};

/** Catalog badges without a rule (must be empty; tested). */
export function badgesWithoutRules(): string[] {
  return BADGES.filter((b) => !BADGE_RULES[b.id]).map((b) => b.id);
}

/** Awards one badge if not yet earned. Returns true when newly awarded. */
export function awardBadge(tx: Tx, badgeId: string): boolean {
  if (tx.s.badges[badgeId] !== undefined) return false;
  const def = BADGE_BY_ID.get(badgeId);
  if (!def) return false;
  tx.section('badges')[badgeId] = tx.env.now;
  tx.emit({ type: 'badge', badgeId, stars: def.stars });
  grantStars(tx, def.stars, 'badge');
  return true;
}

/** Field Guide page rewards: 5 stamps and the page's `ALBUMS[].reward` (if any), once per page (DESIGN §8.5). */
export const ALBUM_STARS = 5;

function checkAlbums(tx: Tx): void {
  for (const album of ALBUMS) {
    const key = `album|${album.id}`;
    if (hasOnce(tx.s, key) || !albumProgress(tx.s.collection, album).complete) continue;
    setOnce(tx, key);
    // The first completed page's 5 stamps are the Album Complete pin's; later pages pay their own.
    const firstAlbum = tx.s.badges['album-complete'] === undefined;
    const stars = firstAlbum ? 0 : ALBUM_STARS;
    const exclusive = album.reward ?? undefined;
    if (exclusive) grantExclusive(tx, exclusive);
    tx.emit(exclusive ? { type: 'album', albumId: album.id, stars, exclusive } : { type: 'album', albumId: album.id, stars });
    if (firstAlbum) awardBadge(tx, 'album-complete');
    else grantStars(tx, stars, 'gift');
  }
}

/**
 * Awards every badge whose rule now holds (catalog order). Call after any reducer that can move a
 * counter, the collection, a plant or a pet, passing what just happened.
 */
export function evaluateBadges(tx: Tx, trigger: BadgeTrigger = {}): void {
  if (rewardsPaused(tx.s, tx.env.now)) return;
  checkAlbums(tx);
  for (const def of BADGES) {
    if (tx.s.badges[def.id] !== undefined) continue;
    const rule = BADGE_RULES[def.id];
    if (rule && rule({ s: tx.s, t: trigger, local: tx.env.local })) awardBadge(tx, def.id);
  }
}
