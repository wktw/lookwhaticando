/**
 * The sunshine precision contract (audit domain-d1, WP-B2).
 *
 * Sunshine grants are repeating fractions: 7 / expectedPerWeek(rule) per occurrence (7/3 for a
 * Mon/Wed/Fri habit), half for the tiny version. They are stored exactly as the float arithmetic
 * gives them, never rounded one by one (rounding each 7/3 to 2.333333 left nine of them at 20.999997,
 * one check-in short of Budding's 21). Every threshold reader (plant stages, extra blooms,
 * Flourishes, The Cutting, companion stories and the forecasts that count check-ins to them) goes
 * through the helpers below, so a total counts as reaching a threshold when it is within
 * THRESHOLD_EPS of it.
 *
 * THRESHOLD_EPS is 1/1000 sunshine: far below the smallest grant (a daily habit's tiny version, 0.5),
 * yet far above the float error of any lifetime of additions (about 1e-13 each). Under one rule
 * every grant is a multiple of 1/720 at worst (monthly 10×, tiny halves: 91/(3·times·2) with
 * times ≤ 120 over 12 months, RULE_LIMITS), so an exact sum under one rhythm that falls short of a
 * whole threshold falls short by more than THRESHOLD_EPS and is never read as reaching it. Only sums
 * that mix rhythms (a rule edit, The Cutting across habits) can come closer; such a total reads as
 * reaching the threshold at most 1/1000 sunshine early.
 */

/** How close to a threshold a sunshine total must be to count as reaching it. */
export const THRESHOLD_EPS = 1e-3;

/** A running total this close to zero after taking grants back is zero (float residue, not sunshine). */
const RESIDUE = 1e-9;

/** The sunshine total reaches `threshold`. */
export function reaches(sunshine: number, threshold: number): boolean {
  return sunshine + THRESHOLD_EPS >= threshold;
}

/** Sunshine still needed to reach `threshold`: 0 once it `reaches` it. */
export function shortfall(sunshine: number, threshold: number): number {
  return reaches(sunshine, threshold) ? 0 : threshold - sunshine;
}

/** Whole steps of `step` reached beyond `base` (extra blooms, Flourishes); 0 below `base`. */
export function stepsReached(sunshine: number, base: number, step: number): number {
  return Math.max(0, Math.floor((sunshine - base + THRESHOLD_EPS) / step));
}

/** Occurrences worth `per` each still needed to reach `threshold` (0 once reached). */
export function occurrencesToReach(sunshine: number, threshold: number, per: number): number {
  const short = shortfall(sunshine, threshold);
  return short === 0 || per <= 0 ? 0 : Math.ceil((short - THRESHOLD_EPS) / per);
}

/** Two amounts of one grant are the same (a price unchanged by a rule edit, within the old 6-place rounding). */
export function sameAmount(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

/** Adds `delta` to a running sunshine total, never below 0, with float residue at zero cleared. */
export function addToTotal(total: number, delta: number): number {
  const next = total + delta;
  return next < RESIDUE ? 0 : next;
}
