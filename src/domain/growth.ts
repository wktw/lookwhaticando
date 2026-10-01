/**
 * Plant growth (DESIGN §5.5) and The Cutting (§13).
 *
 * - Sunshine is frequency-normalised: each rewarded occurrence yields 7 / expectedPerWeek(rule), so
 *   a monthly habit kept faithfully grows as fast as a daily one. The tiny version yields 50%, and
 *   flexible check-ins beyond `times` in a period yield none. Sunshine is a ledger (economy layer);
 *   this module supplies the amounts and the pure stage math.
 * - Stage = min(stageFromSunshine, completedOccurrences): each check-in advances at most one stage,
 *   so a monthly habit cannot jump from Cutting to Budding on its first check-in. Completed
 *   occurrences count from the habit's creation day (economy.ts): history filled in before the
 *   habit existed earned nothing, so it can't unlock stages either (§5.3 "no rewards before
 *   createdAt").
 * - Calendar pace (a logic-team reading, NOTES-domain.md; Evergreen is 180 faithful days): a
 *   plant is also capped at the stage a perfectly faithful habit would have reached by now,
 *   stageFromSunshine(days since creation + 6). Honest play never meets this cap (a faithful daily
 *   habit earns 1 sunshine a day, and rarer rhythms are held back by completed occurrences first);
 *   it stops rule flips (a daily habit switched to once-a-year for one check-in banks 364 sunshine)
 *   from growing a plant faster than real time.
 * - Display stage = max(stage, bestStage): plants never shrink.
 * - After Evergreen: Flourishes (permanent visitors: a ladybird, a bee, a snail…) arrive every +60
 *   sunshine, 8 at most, and extra blooms = min(6, floor((sunshine − 180) / 30)) add continuous
 *   detail (`artBlooms` turns them into the art's bloom count).
 * - The Cutting (§13) is the lifetime gauge: a pothos cutting in a jar on the window frame that
 *   grows on lifetime sunshine across all habits, deleted habits' sunshine included, with its own
 *   thresholds 0/5/20/50/105/210/450/900: roots, then a pot, then a vine trailing along the frame
 *   until it frames the whole window.
 */
import type { Habit, HabitRule } from '@/state/types';
import { dayEvaluations, type EvalContext, type HabitLogs } from './activity';
import { periodEvaluations } from './periods';
import { reaches, shortfall, stepsReached } from './precision';
import { expectedPerWeek } from './schedule';

export type PlantStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Sunshine needed for each stage (index = stage). */
export const STAGE_THRESHOLDS = [0, 1, 4, 10, 21, 42, 90, 180] as const;
/** The stage names live with the copy (src/catalog/lines.ts); this is the same list. */
import { STAGE_NAMES, type StageName } from '@/catalog/linesCore';
export { STAGE_NAMES, type StageName };

export const ROOTING: PlantStage = 1;
export const POTTED: PlantStage = 2;
export const BUDDING: PlantStage = 4;
export const BLOOMING: PlantStage = 5;
export const EVERGREEN: PlantStage = 7;
export const SUNSHINE_PER_BLOOM = 30;
export const MAX_BLOOMS = 6;
export const SUNSHINE_PER_FLOURISH = 60;
export const MAX_FLOURISHES = 8;
export const TINY_SUNSHINE_FACTOR = 0.5;
/** The Cutting's stages (§13): lifetime sunshine across all habits needed for each (index = stage). */
export const CUTTING_THRESHOLDS = [0, 5, 20, 50, 105, 210, 450, 900] as const;

const clampStage = (n: number): PlantStage => Math.max(0, Math.min(EVERGREEN, Math.floor(n))) as PlantStage;

/** Sunshine earned by one rewarded occurrence under `rule` (half for the tiny version). */
export function sunshinePerOccurrence(rule: Pick<HabitRule, 'schedule'>, tiny = false): number {
  return (7 / expectedPerWeek(rule)) * (tiny ? TINY_SUNSHINE_FACTOR : 1);
}

/**
 * Sunshine sums are floats of repeating fractions (7/3 per Mon/Wed/Fri occurrence): every threshold
 * is read through the precision contract (precision.ts), so 9 × 7/3 reaches 21 as the design intends.
 */
function stageOn(thresholds: readonly number[], sunshine: number): PlantStage {
  let stage = 0;
  for (let s = 1; s < thresholds.length; s++) if (reaches(sunshine, thresholds[s]!)) stage = s;
  return stage as PlantStage;
}

function progressOn(thresholds: readonly number[], sunshine: number, stage: PlantStage): number {
  if (stage >= EVERGREEN) return 1;
  const lo = thresholds[stage]!;
  return clamp01((sunshine - lo) / (thresholds[stage + 1]! - lo));
}

/** The highest stage whose threshold the sunshine reaches. */
export function stageFromSunshine(sunshine: number): PlantStage {
  return stageOn(STAGE_THRESHOLDS, sunshine);
}

/** Days of slack in the calendar-pace cap: a plant may run up to a week ahead of a perfect daily habit. */
export const PACE_SLACK_DAYS = 6;

/**
 * Stage = min(stageFromSunshine, completedOccurrences) (DESIGN v1 §13.4), and, when `elapsedDays`
 * (days since the habit was created, counting that day) is given, at most the calendar-pace stage
 * stageFromSunshine(elapsedDays + 6) (see module doc).
 */
export function plantStage(sunshine: number, completedOccurrences: number, elapsedDays?: number): PlantStage {
  const pace = elapsedDays === undefined ? EVERGREEN : stageFromSunshine(Math.max(0, elapsedDays) + PACE_SLACK_DAYS);
  return clampStage(Math.min(stageFromSunshine(sunshine), Math.max(0, completedOccurrences), pace));
}

/** What the plant shows: never lower than the best stage ever reached. */
export function displayStage(stage: number, bestStage: number | undefined): PlantStage {
  return clampStage(Math.max(stage, bestStage ?? 0));
}

export function stageName(stage: number): StageName {
  return STAGE_NAMES[clampStage(stage)];
}

/**
 * Extra blooms after Evergreen: one per 30 sunshine beyond 180, capped at 6 (0 before Evergreen).
 * These are *extra*: the art's own bloom count follows the stage (Blooming 2–3, Flourishing 4,
 * Evergreen 5), and `artBlooms` adds these on top at Evergreen.
 */
export function extraBloomsFor(sunshine: number, stage: number): number {
  if (stage < EVERGREEN) return 0;
  return Math.min(MAX_BLOOMS, stepsReached(sunshine, STAGE_THRESHOLDS[EVERGREEN], SUNSHINE_PER_BLOOM));
}

/**
 * Progress within the shown stage, 0..1 (continuous plant detail, v1 §13.1): toward the next stage's
 * threshold, or toward the next bloom at Evergreen (1 once blooms are capped). A stage held back by
 * the one-stage-per-check-in rule reads as full: the next check-in grows it.
 */
export function stageProgress(sunshine: number, stage: number): number {
  const s = clampStage(stage);
  if (s === EVERGREEN) {
    const blooms = extraBloomsFor(sunshine, s);
    if (blooms >= MAX_BLOOMS) return 1;
    const into = sunshine - STAGE_THRESHOLDS[EVERGREEN] - blooms * SUNSHINE_PER_BLOOM;
    return clamp01(into / SUNSHINE_PER_BLOOM);
  }
  return progressOn(STAGE_THRESHOLDS, sunshine, s);
}

const clamp01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x);

/**
 * Flourishes after Evergreen: one permanent visitor per 60 sunshine beyond 180, at most 8 (v1 §13.10).
 * This is what the sunshine held now supports; the economy layer keeps the high-water mark, so a
 * visitor that arrived stays even if an un-check inside the refund window takes sunshine back.
 */
export function flourishesFor(sunshine: number, stage: number): number {
  if (stage < EVERGREEN) return 0;
  return Math.min(MAX_FLOURISHES, stepsReached(sunshine, STAGE_THRESHOLDS[EVERGREEN], SUNSHINE_PER_FLOURISH));
}

/** Sunshine still needed to reach the next stage; null at Evergreen (the screens show check-ins, never sunshine). */
export function sunshineToNextStage(sunshine: number, stage: number): number | null {
  const s = clampStage(stage);
  if (s === EVERGREEN) return null;
  return shortfall(sunshine, STAGE_THRESHOLDS[s + 1]!);
}

/** Stages passed when growing from `before` to `after` (each animates in turn, ~350 ms). */
export function stagesCrossed(before: number, after: number): PlantStage[] {
  const out: PlantStage[] = [];
  for (let s = clampStage(before) + 1; s <= clampStage(after); s++) out.push(s as PlantStage);
  return out;
}

export interface GrowthInfo {
  /** min(stageFromSunshine, completedOccurrences, calendar pace). */
  stage: PlantStage;
  /** max(stage, bestStage): what the plant shows. */
  displayStage: PlantStage;
  name: StageName;
  /** Progress within the displayed stage, 0..1. */
  progress: number;
  /** Sunshine to the next stage (0 when only a check-in is missing); null at Evergreen. */
  sunshineToNext: number | null;
  nextName: StageName | null;
  /** Extra blooms after Evergreen (0 before it). The plant art takes `artBlooms(...)`, not this. */
  extraBlooms: number;
  flourishes: number;
  /** Sunshine is ahead of the stage: the next check-in grows the plant. */
  heldBack: boolean;
  /** Sunshine is ahead of the stage but the calendar pace holds it: the plant grows with the days. */
  paced: boolean;
}

/** Everything the plant art and the "4 more check-ins to Blooming" line need. */
export function growthInfo(input: {
  sunshine: number;
  completedOccurrences: number;
  bestStage?: number;
  elapsedDays?: number;
  /** The most Flourishes the plant has had (they are permanent, so never fewer are shown). */
  bestFlourishes?: number;
}): GrowthInfo {
  const { sunshine, completedOccurrences, bestStage, elapsedDays, bestFlourishes } = input;
  const stage = plantStage(sunshine, completedOccurrences, elapsedDays);
  const shown = displayStage(stage, bestStage);
  return {
    stage,
    displayStage: shown,
    name: stageName(shown),
    progress: stageProgress(sunshine, shown),
    sunshineToNext: sunshineToNextStage(sunshine, shown),
    nextName: shown < EVERGREEN ? stageName(shown + 1) : null,
    extraBlooms: extraBloomsFor(sunshine, shown),
    flourishes: Math.max(flourishesFor(sunshine, shown), shown >= EVERGREEN ? Math.min(MAX_FLOURISHES, bestFlourishes ?? 0) : 0),
    heldBack: stageFromSunshine(sunshine) > stage && plantStage(sunshine, completedOccurrences + 1, elapsedDays) > stage,
    paced: stageFromSunshine(sunshine) > stage && plantStage(sunshine, completedOccurrences + 1, elapsedDays) === stage,
  };
}

/**
 * The `blooms` the plant art takes (PlantArt, SillPot): left out below Evergreen, so the art's own
 * count follows the stage (Blooming shows 2–3 flowers, Flourishing 4); at Evergreen the art's 5
 * plus the extra blooms, at most MAX_BLOOMS. Never 0 from Blooming on, which the art would draw
 * as a plant without flowers.
 */
export function artBlooms(stage: number, extraBlooms: number): number | undefined {
  return stage < EVERGREEN ? undefined : Math.min(MAX_BLOOMS, 5 + Math.max(0, Math.floor(extraBlooms)));
}

/** The Cutting (§13): the lifetime gauge on the window frame. */
export interface CuttingVM {
  /**
   * 0–7: 0 a cutting in a jar · 1 roots · 2 potted · 3+ a vine trailing further along the frame · 7 it
   * frames the window. Never lower than the best stage reached (it never shrinks, like the plants).
   */
  stage: PlantStage;
  /** Progress toward the next stage, 0..1 (1 at the top). */
  progress: number;
  /** How far along the whole gauge, 0..1: stages and progress combined (the vine's length for the art). */
  overall: number;
  /** Lifetime sunshine still needed for the next stage; null once the vine frames the window. */
  toNext: number | null;
  /** The vine frames the whole window (the last stage). */
  framed: boolean;
}

/** Lifetime sunshine across every habit, deleted habits included (their totals stay in the ledger). */
export function lifetimeSunshine(ledgerSunshine: Readonly<Record<string, number>>): number {
  let total = 0;
  for (const v of Object.values(ledgerSunshine)) total += v;
  return total;
}

/**
 * The Cutting for a lifetime sunshine total (§13): thresholds 0/5/20/50/105/210/450/900. `bestStage`
 * (the high-water mark, economy.ts) keeps the stage from going back after an un-check.
 */
export function theCutting(lifetime: number, bestStage = 0): CuttingVM {
  const stage = clampStage(Math.max(stageOn(CUTTING_THRESHOLDS, lifetime), bestStage));
  const progress = progressOn(CUTTING_THRESHOLDS, lifetime, stage);
  const top = CUTTING_THRESHOLDS.length - 1;
  return {
    stage,
    progress,
    overall: stage >= top ? 1 : (stage + progress) / top,
    toNext: stage >= top ? null : shortfall(lifetime, CUTTING_THRESHOLDS[stage + 1]!),
    framed: stage >= top,
  };
}

/**
 * Sunshine and completed occurrences implied by a habit's whole history as of `ctx.today`, as if
 * every achieved occurrence had been rewarded: day-based achieved days, plus the first `times`
 * check-in days of each flexible period (in date order). Used for the completed-occurrence count,
 * demo seeding and ledger verification; the live sunshine total comes from the reward ledger.
 */
export function sunshineFromHistory(habit: Pick<Habit, 'rules' | 'startedOn' | 'archivedOn' | 'unstarted' | 'pauses'>, logs: HabitLogs, ctx: EvalContext): {
  sunshine: number;
  completedOccurrences: number;
} {
  let sunshine = 0;
  let completedOccurrences = 0;
  for (const ev of dayEvaluations(habit, logs, habit.startedOn, ctx.today, ctx)) {
    if (ev.outcome !== 'achieved') continue;
    completedOccurrences++;
    sunshine += sunshinePerOccurrence(ev.rule, ev.tiny);
  }
  for (const p of periodEvaluations(habit, logs, habit.startedOn, ctx.today, ctx)) {
    for (const c of p.checkins.slice(0, p.times)) {
      completedOccurrences++;
      sunshine += sunshinePerOccurrence(p.rule, c.tiny);
    }
  }
  return { sunshine, completedOccurrences };
}
