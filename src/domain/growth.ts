/**
 * Plant growth (DESIGN §5.5 as amended by §13.4).
 *
 * - Sunshine is frequency-normalised: each rewarded occurrence yields 7 / expectedPerWeek(rule), so
 *   a monthly habit kept faithfully grows as fast as a daily one. The tiny version yields 50%, and
 *   flexible check-ins beyond `times` in a period yield none. Sunshine is a ledger (economy layer);
 *   this module supplies the amounts and the pure stage math.
 * - Stage = min(stageFromSunshine, completedOccurrences): each check-in advances at most one stage,
 *   so a monthly habit cannot jump from Seed to Budding on its first check-in.
 * - Display stage = max(stage, bestStage): plants never shrink.
 * - After Evergreen: blooms = min(6, floor((sunshine − 180) / 30)), and Flourishes (permanent
 *   visitors) arrive every +60 sunshine, 8 at most (§13.10 "Plants keep living").
 * - Mochi's sprout is a whole-meadow gauge over lifetime sunshine across all habits, with its own
 *   thresholds 0/5/20/50/105/210/450/900 (§13.10).
 */
import type { Habit, HabitRule } from '@/state/types';
import { dayEvaluations, type EvalContext, type HabitLogs } from './activity';
import { periodEvaluations } from './periods';
import { expectedPerWeek } from './schedule';

export type PlantStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Sunshine needed for each stage (index = stage). */
export const STAGE_THRESHOLDS = [0, 1, 4, 10, 21, 42, 90, 180] as const;
export const STAGE_NAMES = ['Seed', 'Sprout', 'Seedling', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen'] as const;
export type StageName = (typeof STAGE_NAMES)[number];

export const EVERGREEN: PlantStage = 7;
export const BLOOMING: PlantStage = 5;
export const SUNSHINE_PER_BLOOM = 30;
export const MAX_BLOOMS = 6;
export const SUNSHINE_PER_FLOURISH = 60;
export const MAX_FLOURISHES = 8;
export const TINY_SUNSHINE_FACTOR = 0.5;
/** Mochi's sprout: the same 8 stage names, driven by lifetime sunshine across all habits (§13.10). */
export const MEADOW_SPROUT_THRESHOLDS = [0, 5, 20, 50, 105, 210, 450, 900] as const;

/**
 * Sunshine sums are floats (7/3 per Mon/Wed/Fri occurrence); comparisons allow this much rounding
 * error so 9 × 7/3 reaches the 21 threshold exactly as the design intends.
 */
const EPS = 1e-9;

const clampStage = (n: number): PlantStage => Math.max(0, Math.min(EVERGREEN, Math.floor(n))) as PlantStage;

/** Sunshine earned by one rewarded occurrence under `rule` (half for the tiny version). */
export function sunshinePerOccurrence(rule: Pick<HabitRule, 'schedule'>, tiny = false): number {
  return (7 / expectedPerWeek(rule)) * (tiny ? TINY_SUNSHINE_FACTOR : 1);
}

function stageOn(thresholds: readonly number[], sunshine: number): PlantStage {
  let stage = 0;
  for (let s = 1; s < thresholds.length; s++) if (sunshine + EPS >= thresholds[s]!) stage = s;
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

/** Stage = min(stageFromSunshine, completedOccurrences) (DESIGN §13.4). */
export function plantStage(sunshine: number, completedOccurrences: number): PlantStage {
  return clampStage(Math.min(stageFromSunshine(sunshine), Math.max(0, completedOccurrences)));
}

/** What the plant shows: never lower than the best stage ever reached. */
export function displayStage(stage: number, bestStage: number | undefined): PlantStage {
  return clampStage(Math.max(stage, bestStage ?? 0));
}

export function stageName(stage: number): StageName {
  return STAGE_NAMES[clampStage(stage)];
}

/** Blooms after Evergreen: one per 30 sunshine beyond 180, capped at 6 (0 before Evergreen). */
export function bloomsFor(sunshine: number, stage: number): number {
  if (stage < EVERGREEN) return 0;
  return Math.max(0, Math.min(MAX_BLOOMS, Math.floor((sunshine - STAGE_THRESHOLDS[EVERGREEN] + EPS) / SUNSHINE_PER_BLOOM)));
}

/**
 * Progress within the shown stage, 0..1 (continuous plant detail, §13.1): toward the next stage's
 * threshold, or toward the next bloom at Evergreen (1 once blooms are capped). A stage held back by
 * the one-stage-per-check-in rule reads as full: the next check-in grows it.
 */
export function stageProgress(sunshine: number, stage: number): number {
  const s = clampStage(stage);
  if (s === EVERGREEN) {
    const blooms = bloomsFor(sunshine, s);
    if (blooms >= MAX_BLOOMS) return 1;
    const into = sunshine - STAGE_THRESHOLDS[EVERGREEN] - blooms * SUNSHINE_PER_BLOOM;
    return clamp01(into / SUNSHINE_PER_BLOOM);
  }
  return progressOn(STAGE_THRESHOLDS, sunshine, s);
}

const clamp01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x);

/** Flourishes after Evergreen: one permanent visitor per 60 sunshine beyond 180, at most 8 (§13.10). */
export function flourishesFor(sunshine: number, stage: number): number {
  if (stage < EVERGREEN) return 0;
  return Math.max(0, Math.min(MAX_FLOURISHES, Math.floor((sunshine - STAGE_THRESHOLDS[EVERGREEN] + EPS) / SUNSHINE_PER_FLOURISH)));
}

/** Sunshine still needed to reach the next stage ("12 ☀ to Blooming"); null at Evergreen. */
export function sunshineToNextStage(sunshine: number, stage: number): number | null {
  const s = clampStage(stage);
  if (s === EVERGREEN) return null;
  return Math.max(0, STAGE_THRESHOLDS[s + 1]! - sunshine);
}

/** Stages passed when growing from `before` to `after` (each animates in turn, ~350 ms). */
export function stagesCrossed(before: number, after: number): PlantStage[] {
  const out: PlantStage[] = [];
  for (let s = clampStage(before) + 1; s <= clampStage(after); s++) out.push(s as PlantStage);
  return out;
}

export interface GrowthInfo {
  /** min(stageFromSunshine, completedOccurrences). */
  stage: PlantStage;
  /** max(stage, bestStage): what the plant shows. */
  displayStage: PlantStage;
  name: StageName;
  /** Progress within the displayed stage, 0..1. */
  progress: number;
  /** Sunshine to the next stage (0 when only a check-in is missing); null at Evergreen. */
  sunshineToNext: number | null;
  nextName: StageName | null;
  blooms: number;
  flourishes: number;
  /** Sunshine is ahead of the stage: the next check-in grows the plant. */
  heldBack: boolean;
}

/** Everything the plant art and the "12 ☀ to Blooming" line need. */
export function growthInfo(input: { sunshine: number; completedOccurrences: number; bestStage?: number }): GrowthInfo {
  const { sunshine, completedOccurrences, bestStage } = input;
  const stage = plantStage(sunshine, completedOccurrences);
  const shown = displayStage(stage, bestStage);
  return {
    stage,
    displayStage: shown,
    name: stageName(shown),
    progress: stageProgress(sunshine, shown),
    sunshineToNext: sunshineToNextStage(sunshine, shown),
    nextName: shown < EVERGREEN ? stageName(shown + 1) : null,
    blooms: bloomsFor(sunshine, shown),
    flourishes: flourishesFor(sunshine, shown),
    heldBack: stageFromSunshine(sunshine) > stage,
  };
}

export interface MeadowSprout {
  stage: PlantStage;
  name: StageName;
  /** Progress toward the next sprout stage, 0..1 (1 at the top). */
  progress: number;
  /** From stage 5 the sprout blooms, in the colour of the most-checked habit (insights.mostCheckedHabit). */
  blooming: boolean;
}

/** Mochi's sprout, a gauge of the whole meadow: lifetime sunshine summed over every habit (§13.10). */
export function meadowSprout(lifetimeSunshine: number): MeadowSprout {
  const stage = stageOn(MEADOW_SPROUT_THRESHOLDS, lifetimeSunshine);
  return { stage, name: stageName(stage), progress: progressOn(MEADOW_SPROUT_THRESHOLDS, lifetimeSunshine, stage), blooming: stage >= BLOOMING };
}

/**
 * Sunshine and completed occurrences implied by a habit's whole history as of `ctx.today`, as if
 * every achieved occurrence had been rewarded: day-based achieved days, plus the first `times`
 * check-in days of each flexible period (in date order). Used for the completed-occurrence count,
 * demo seeding and ledger verification; the live sunshine total comes from the reward ledger.
 */
export function sunshineFromHistory(habit: Pick<Habit, 'rules' | 'startedOn' | 'archivedOn' | 'pauses'>, logs: HabitLogs, ctx: EvalContext): {
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
