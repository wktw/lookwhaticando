/**
 * Habit stacking (DESIGN §14.2 "Habit stacking"): `Habit.anchorHabitId` makes a habit follow another
 * ("After Walk"). The follower sorts right after its anchor, and its kept-together count says on
 * how many days it came right after it.
 *
 * - An anchor must be another existing, live habit, and following anchors from it must never lead
 *   back (no cycles), so the order is always well defined. When the anchor is archived, retired or
 *   deleted, its followers stop following it.
 * - A kept-together day: both habits showed up that day (each inside its lifetime), and, when
 *   both were checked in live, the follower's first check-in came at or after the anchor's. A day
 *   with only history or backfill (no live stamps) counts on showing up alone. Nothing here pays.
 */
import type { AppState, DateKey, Habit } from '@/state/types';
import { inLifetime, logStatus, showedUp, type HabitLogs } from './activity';
import { ruleAt } from './rules';
import { seal, type Tx } from './tx';

/** Why an anchor can't be used, or null when it can. */
export function anchorIssue(s: Pick<AppState, 'habits'>, habitId: string | undefined, anchorId: string): 'unknown' | 'self' | 'archived' | 'cycle' | null {
  if (anchorId === habitId) return 'self';
  const byId = new Map(s.habits.map((h) => [h.id, h]));
  const anchor = byId.get(anchorId);
  if (!anchor) return 'unknown';
  if (anchor.archivedOn !== undefined) return 'archived';
  const seen = new Set<string>();
  for (let cur: Habit | undefined = anchor; cur?.anchorHabitId !== undefined; cur = byId.get(cur.anchorHabitId)) {
    if (cur.anchorHabitId === habitId) return 'cycle';
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
  }
  return null;
}

/**
 * Display order with stacks kept together: by `order`, except that each follower comes right
 * after its anchor (chains included) when the anchor is in the same list. Stable; cycle-safe.
 */
export function stackOrder<H extends Pick<Habit, 'id' | 'order' | 'anchorHabitId'>>(list: readonly H[]): H[] {
  const sorted = [...list].sort((a, b) => a.order - b.order);
  if (!sorted.some((h) => h.anchorHabitId !== undefined)) return sorted;
  const ids = new Set(sorted.map((h) => h.id));
  const followers = new Map<string, H[]>();
  for (const h of sorted) {
    if (h.anchorHabitId === undefined || !ids.has(h.anchorHabitId) || h.anchorHabitId === h.id) continue;
    followers.set(h.anchorHabitId, [...(followers.get(h.anchorHabitId) ?? []), h]);
  }
  const out: H[] = [];
  const placed = new Set<string>();
  const visit = (h: H): void => {
    if (placed.has(h.id)) return;
    placed.add(h.id);
    out.push(h);
    for (const f of followers.get(h.id) ?? []) visit(f);
  };
  for (const h of sorted) {
    const rooted = h.anchorHabitId === undefined || !ids.has(h.anchorHabitId) || h.anchorHabitId === h.id;
    if (rooted) visit(h);
  }
  for (const h of sorted) visit(h); // members of a cycle (never saved, but never lost either)
  return out;
}

/** Memo by the identity of (follower, anchor, their logs): state objects are never mutated once shared. */
const memo = new WeakMap<object, WeakMap<object, WeakMap<object, WeakMap<object, Map<string, number>>>>>();

function memoMap(a: object, b: object, c: object, d: object): Map<string, number> {
  for (const o of [a, b, c, d]) seal(o);
  let m1 = memo.get(a);
  if (!m1) memo.set(a, (m1 = new WeakMap()));
  let m2 = m1.get(b);
  if (!m2) m1.set(b, (m2 = new WeakMap()));
  let m3 = m2.get(c);
  if (!m3) m2.set(c, (m3 = new WeakMap()));
  let m4 = m3.get(d);
  if (!m4) m3.set(d, (m4 = new Map()));
  return m4;
}

function firstStamp(log: HabitLogs[string] | undefined): number | null {
  if (log?.kind !== 'log' || !log.at || log.at.length === 0) return null;
  let min = Infinity;
  for (const t of log.at) if (t < min) min = t;
  return Number.isFinite(min) ? min : null;
}

/** Kept-together days of `follower` with its anchor in [start, end] (both inclusive, end ≤ today counts). */
export function keptTogetherDays(s: Pick<AppState, 'habits' | 'logs'>, follower: Habit, today: DateKey, start = '0000-00-00', end: DateKey = today): number {
  const anchor = follower.anchorHabitId === undefined ? undefined : s.habits.find((h) => h.id === follower.anchorHabitId);
  if (!anchor) return 0;
  const fLogs = s.logs[follower.id];
  const aLogs = s.logs[anchor.id];
  if (!fLogs || !aLogs) return 0;
  const map = memoMap(follower, anchor, fLogs, aLogs);
  const key = `${today}|${start}|${end}`;
  const hit = map.get(key);
  if (hit !== undefined) return hit;
  let n = 0;
  const last = end < today ? end : today;
  for (const [date, log] of Object.entries(fLogs)) {
    if (date < start || date > last || !inLifetime(follower, date) || !inLifetime(anchor, date)) continue;
    const other = aLogs[date];
    if (!showedUp(logStatus(log, ruleAt(follower, date), date < today))) continue;
    if (!showedUp(logStatus(other, ruleAt(anchor, date), date < today))) continue;
    const f = firstStamp(log);
    const a = firstStamp(other);
    if (f !== null && a !== null && f < a) continue;
    n++;
  }
  if (map.size > 64) map.clear();
  map.set(key, n);
  return n;
}

/**
 * A habit leaves the sill (archived, retired or deleted): its followers no longer follow it, so no
 * card reads "After" a habit that isn't there and no edit trips over a retired anchor.
 */
export function unstackFollowers(tx: Tx, habitId: string): void {
  for (const f of tx.s.habits) if (f.anchorHabitId === habitId) delete tx.habit(f.id).anchorHabitId;
}
