/**
 * Who kept a habit company on a day (WP-B6, domain-d3; DESIGN §14.1 "Keeping Company").
 *
 * A pairing record keeps the spans the pet kept the habit company (`CompanyPair.stints`). A day
 * belongs to the pet that keeps the habit company at the day's close (today: now), so pairing on a
 * day counts that day, moving or freeing it on a day does not, and pairing and freeing the same
 * day shares nothing. A habit retired (archived, finished) on a day keeps its companion's span
 * through that day: no other pet keeps it company afterwards. Spans follow the days, not the
 * check-ins: a check-in filled in later for a day before the pairing is not a day they shared.
 *
 * A record written before WP-B6 has no spans. Then the habit's current companion counts from
 * `since` (its first day with the habit: a lower bound, the only evidence there is), and a pet
 * that no longer keeps it company counts on no day. The first time such a record is paired or
 * freed, that reading is written down as its spans, so what it said about earlier days stays.
 * Spans an older build left behind: an open span whose pet it freed counts on no day, and a pet it
 * paired again (its spans all closed) gets a span from the first open that sees it
 * (`company.reopenCompanionSpans`); when either happened is not known, so nothing is made up.
 */
import type { AppState, CompanyPair, DateKey, Habit, PairStint } from '@/state/types';
import { addDays } from './dates';
import { BLOOMING } from './growth';

/** Whether the pair's pet kept the habit company on `date` (by the day-end rule above). */
export function keptCompanyOn(pair: CompanyPair, habit: Pick<Habit, 'companionId'>, date: DateKey): boolean {
  const current = habit.companionId === pair.petId;
  if (!pair.stints) return current && date >= pair.since;
  // An open span counts only while the pet is still the companion (an older build may have freed it).
  return pair.stints.some((st) => date >= st.from && (st.to !== undefined ? date <= st.to : current));
}

/** The first day of the pet's current unbroken span with the habit, or null when it isn't the habit's companion now. */
export function currentStintFrom(pair: CompanyPair, habit: Pick<Habit, 'companionId'>): DateKey | null {
  if (habit.companionId !== pair.petId) return null;
  if (!pair.stints) return pair.since;
  const last = pair.stints[pair.stints.length - 1];
  return last && last.to === undefined ? last.from : null;
}

/** The spans as known now (an older record's from its reading above), as fresh objects. */
function knownStints(pair: CompanyPair, current: boolean): PairStint[] {
  if (pair.stints) return pair.stints.map((st) => ({ ...st }));
  return current ? [{ from: pair.since }] : [];
}

/** The spans after the pet (not the habit's companion until now) is paired with it today. */
export function stintsOpened(pair: CompanyPair, today: DateKey): PairStint[] {
  const out = knownStints(pair, false);
  // An open span left by an older build counts on no day: drop it.
  if (out.length > 0 && out[out.length - 1]!.to === undefined) out.pop();
  const last = out[out.length - 1];
  if (last && last.to! >= addDays(today, -1)) delete last.to; // freed yesterday's close or today: one span
  else out.push({ from: today });
  return out;
}

/** The spans after the pet, the habit's companion until now, stops keeping it company after `to` (null: nothing to change). */
export function stintsClosed(pair: CompanyPair, to: DateKey): PairStint[] | null {
  const out = knownStints(pair, true);
  const last = out[out.length - 1];
  if (!last || last.to !== undefined) return pair.stints ? null : out;
  if (to < last.from) out.pop();
  else last.to = to;
  return out;
}

/**
 * The day the plant bloomed with this pet keeping it company (P-history-09), or null: not bloomed,
 * bloomed before the day was recorded, or bloomed before (or after) the pet's time with it.
 */
export function bloomedTogetherOn(s: Pick<AppState, 'habits' | 'stageDates'>, pair: CompanyPair): DateKey | null {
  const day = s.stageDates?.[pair.habitId]?.[BLOOMING];
  const habit = s.habits.find((h) => h.id === pair.habitId);
  return day !== undefined && habit && keptCompanyOn(pair, habit, day) ? day : null;
}
