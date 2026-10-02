/**
 * The Garden Journal (DESIGN §14.2, Habit Detail): up to five plain sentences about how she keeps a
 * habit, as data records (the voice layer words them: `GARDEN_JOURNAL` in lines.ts).
 *
 * Nothing inks in before week 2 (the habit started at least 7 days ago). Until a sentence can be
 * written truthfully it is a pencil placeholder saying when it will fill in, with a forecast in
 * check-ins where one exists (never a date):
 * 1. **usualTime**: the usual check-in time (signature.ts), once there are 10 eligible live
 *    check-in days; the forecast is the eligible days still needed.
 * 2. **steadiestDay**: the weekday with the most check-ins, from the third week (after the second
 *    week), ties to the earlier day of her week.
 * 3. **tinyDays**: how often the tiny version was enough; only for a habit that has, or had, a tiny
 *    version; inks at the first tiny day.
 * 4. **keptTogether**: days it came right after its anchor (stacking.ts); inks once it follows
 *    another habit and they have been kept together at least once.
 * 5. **whyItLooks**: the shown look's reason, once the plant has a look; the forecast is the
 *    check-ins to Blooming (at Blooming, the eligible live check-in days its read still needs).
 */
import type { AppState, BloomColour, BloomShape, DateKey, Habit, TimeBand, Weekday } from '@/state/types';
import { inLifetime, logStatus, showedUp } from './activity';
import { diffDays, weekday, weekdayOrder, type LocalTimeReader } from './dates';
import { ruleAt } from './rules';
import { eligibleTimes, looksOf, readTimes, SIGNATURE, doneAndTinyDays } from './signature';
import { keptTogetherDays } from './stacking';

export const JOURNAL = { inkFromDays: 7, steadiestFromDays: 14 } as const;

export type JournalEntry =
  | { kind: 'usualTime'; inked: true; minute: number; band: TimeBand }
  | { kind: 'steadiestDay'; inked: true; weekday: Weekday; days: number }
  | { kind: 'tinyDays'; inked: true; days: number }
  | { kind: 'keptTogether'; inked: true; anchorHabitId: string; days: number }
  | { kind: 'whyItLooks'; inked: true; colour: BloomColour; shape: BloomShape; band: TimeBand; usualMinute: number }
  | {
      kind: 'usualTime' | 'steadiestDay' | 'tinyDays' | 'keptTogether' | 'whyItLooks';
      inked: false;
      /** Check-ins still needed before it fills in, when that can be said in check-ins; else null. */
      remaining: number | null;
    };

/** Everything the journal needs besides the state. */
export interface JournalInput {
  today: DateKey;
  local: LocalTimeReader;
  /** The device's IANA zone, when known (the eligible-times memo is keyed by the zone). */
  timeZone?: string;
  weekStart: 0 | 1;
  /** Check-ins still needed to reach Blooming (null once there). */
  checkinsToBlooming: number | null;
}

/** The Garden Journal for a habit (up to 5 entries, in the order above). */
export function gardenJournal(s: Pick<AppState, 'habits' | 'logs' | 'plantLooks'>, habit: Habit, input: JournalInput): JournalEntry[] {
  const { today } = input;
  const age = diffDays(habit.startedOn, today);
  const ink = age >= JOURNAL.inkFromDays;
  const out: JournalEntry[] = [];

  // 1. Usual time.
  const times = readTimes(eligibleTimes(s, habit, today, input.local, input.timeZone));
  if (ink && times.usualMinute !== null && times.eligibleDays >= SIGNATURE.minEligibleDays) {
    out.push({ kind: 'usualTime', inked: true, minute: times.usualMinute, band: times.band });
  } else out.push({ kind: 'usualTime', inked: false, remaining: Math.max(1, SIGNATURE.minEligibleDays - times.eligibleDays) });

  // 2. Steadiest weekday.
  const steady = age >= JOURNAL.steadiestFromDays ? steadiestWeekday(s, habit, today, input.weekStart) : null;
  out.push(steady ? { kind: 'steadiestDay', inked: true, weekday: steady.weekday, days: steady.days } : { kind: 'steadiestDay', inked: false, remaining: null });

  // 3. Tiny days (only for a habit with a tiny version, now or before).
  const { tiny } = doneAndTinyDays(s, habit, today);
  if (tiny > 0 || habit.rules.some((r) => r.tiny)) {
    out.push(ink && tiny > 0 ? { kind: 'tinyDays', inked: true, days: tiny } : { kind: 'tinyDays', inked: false, remaining: null });
  }

  // 4. Kept together.
  const kept = habit.anchorHabitId !== undefined ? keptTogetherDays(s, habit, today) : 0;
  out.push(ink && kept > 0 ? { kind: 'keptTogether', inked: true, anchorHabitId: habit.anchorHabitId!, days: kept } : { kind: 'keptTogether', inked: false, remaining: null });

  // 5. Why it looks like this.
  const looks = looksOf(s, habit.id);
  const look = looks.shown !== null ? looks.looks[looks.shown] : looks.looks[looks.looks.length - 1];
  if (ink && look && !looks.confirmed?.shown) {
    out.push({ kind: 'whyItLooks', inked: true, colour: look.colour, shape: look.shape, band: look.evidence.band, usualMinute: look.evidence.usualMinute });
  } else {
    // Not at Blooming yet: the check-ins to Blooming. At Blooming, the read waits for 10 eligible
    // live check-in days (signature.ts): the ones still needed.
    const remaining = input.checkinsToBlooming ?? Math.max(1, SIGNATURE.minEligibleDays - times.eligibleDays);
    out.push({ kind: 'whyItLooks', inked: false, remaining });
  }
  return out;
}

/** The weekday with the most check-in days over the habit's lifetime (ties: earlier in her week). */
export function steadiestWeekday(s: Pick<AppState, 'logs'>, habit: Habit, today: DateKey, weekStart: 0 | 1): { weekday: Weekday; days: number } | null {
  const counts = new Array<number>(7).fill(0);
  for (const [date, log] of Object.entries(s.logs[habit.id] ?? {})) {
    if (date > today || !inLifetime(habit, date)) continue;
    if (showedUp(logStatus(log, ruleAt(habit, date), date < today))) counts[weekday(date)]!++;
  }
  let best: Weekday | null = null;
  for (const d of weekdayOrder(weekStart)) if (counts[d]! > 0 && (best === null || counts[d]! > counts[best]!)) best = d;
  return best === null ? null : { weekday: best, days: counts[best]! };
}
