/**
 * Versioned habit rules (DESIGN §13.2 "Versioned rules").
 *
 * A habit's schedule/target/step/tiny live in `rules[]`, each starting on its `from` date. Every
 * day and period is evaluated with the rule in effect then, so edits never rewrite history:
 * - an edit to a **day-based** habit applies from today;
 * - an edit to a **flexible** habit applies to the current period ("this period") or from the
 *   next period, as the user chooses (see `RuleEditTiming` for what "this period" means when the
 *   period geometry changes).
 * The first rule also governs any day before its `from` (lookups are clamped), which keeps
 * evaluation total even if `startedOn` was moved earlier than `rules[0].from`.
 */
import type { DateKey, Habit, HabitRule } from '@/state/types';
import { addDays, isDateKey, maxDateKey, type WeekStart } from './dates';
import {
  isDayBased,
  isScheduledDate,
  normalizeRuleContent,
  periodGrid,
  periodSlotAt,
  rhythmOf,
  sameRuleContent,
  samePeriodGeometry,
  validateRuleContent,
  type Rhythm,
  type RuleContent,
  type RuleIssue,
} from './schedule';

type WithRules = Pick<Habit, 'rules'>;
type WithRulesAndStart = Pick<Habit, 'rules' | 'startedOn'>;

/* ------------------------------------------------------------------ */
/* Lookup                                                              */
/* ------------------------------------------------------------------ */

/** Index of the rule in effect on `date`: the last with from ≤ date (0 before the first rule). */
export function ruleIndexAt(rules: readonly HabitRule[], date: DateKey): number {
  for (let i = rules.length - 1; i > 0; i--) if (rules[i]!.from <= date) return i;
  return 0;
}

/** The rule in effect on `date` (DESIGN §13.2). Throws for a habit without rules (corrupt state). */
export function ruleAt(habit: WithRules, date: DateKey): HabitRule {
  const rule = habit.rules[ruleIndexAt(habit.rules, date)];
  if (!rule) throw new Error('Habit has no rules');
  return rule;
}

/** A rule together with the days it governs. */
export interface RuleSegment {
  index: number;
  rule: HabitRule;
  /** First governed day; null for the first rule (it also governs any earlier day). */
  start: DateKey | null;
  /** Last governed day; null while it is the latest rule. Empty when end < start. */
  end: DateKey | null;
}

/** Each rule with its governed range, in order. */
export function ruleSegments(habit: WithRules): RuleSegment[] {
  const { rules } = habit;
  return rules.map((rule, index) => ({
    index,
    rule,
    start: index === 0 ? null : rule.from,
    end: index + 1 < rules.length ? addDays(rules[index + 1]!.from, -1) : null,
  }));
}

/** A maximal run of consecutive rules sharing a rhythm (streaks continue within one). */
export interface RhythmSpan {
  rhythm: Rhythm;
  /** null for the first span (it also covers any earlier day). */
  start: DateKey | null;
  /** null while it is the latest span. */
  end: DateKey | null;
  firstIndex: number;
  lastIndex: number;
}

/**
 * The habit's rhythms in order. Day-based edits (daily ↔ certain days, target changes) stay in one
 * span; a kind change (day-based ↔ flexible, or weekly ↔ monthly) starts a new one: "New rhythm".
 */
export function rhythmSpans(habit: WithRules): RhythmSpan[] {
  const spans: RhythmSpan[] = [];
  for (const seg of ruleSegments(habit)) {
    const rhythm = rhythmOf(seg.rule);
    const last = spans[spans.length - 1];
    if (last && last.rhythm === rhythm) {
      last.end = seg.end;
      last.lastIndex = seg.index;
    } else {
      spans.push({ rhythm, start: seg.start, end: seg.end, firstIndex: seg.index, lastIndex: seg.index });
    }
  }
  return spans;
}

/** The rhythm span containing `date` (the first span for earlier dates). */
export function rhythmSpanAt(habit: WithRules, date: DateKey): RhythmSpan {
  const i = ruleIndexAt(habit.rules, date);
  const span = rhythmSpans(habit).find((s) => s.firstIndex <= i && i <= s.lastIndex);
  if (!span) throw new Error('Habit has no rules');
  return span;
}

/** How `date` looks under the rule in effect that day. */
export type ScheduleStatus = 'scheduled' | 'unscheduled' | 'flexible';

/**
 * 'scheduled' / 'unscheduled' for day-based rules (does this weekday have an occurrence?);
 * 'flexible' when a weekly/monthly rule is in effect (any day may be a check-in day).
 */
export function scheduleStatusOn(habit: WithRules, date: DateKey): ScheduleStatus {
  const rule = ruleAt(habit, date);
  if (!isDayBased(rule)) return 'flexible';
  return isScheduledDate(rule, date) ? 'scheduled' : 'unscheduled';
}

/** True when the rule in effect on `date` is day-based and has an occurrence that weekday. */
export function isScheduledOn(habit: WithRules, date: DateKey): boolean {
  return scheduleStatusOn(habit, date) === 'scheduled';
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/** Sorted by `from` (stable); for duplicate dates the later entry wins. */
export function normalizeRules(rules: readonly HabitRule[]): HabitRule[] {
  const byFrom = new Map<DateKey, HabitRule>();
  for (const r of rules) byFrom.set(r.from, r);
  return [...byFrom.values()].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

/** Every problem with a habit's rule history (empty = valid). */
export function validateHabitRules(habit: WithRulesAndStart): RuleIssue[] {
  const { rules } = habit;
  if (rules.length === 0) return [{ code: 'rules-empty', message: 'A habit needs at least one rule.' }];
  const issues: RuleIssue[] = [];
  rules.forEach((rule, index) => {
    if (!isDateKey(rule.from)) issues.push({ code: 'from-invalid', message: `Rule ${index} has an invalid from date.`, index });
    for (const issue of validateRuleContent(rule)) issues.push({ ...issue, index });
    if (index > 0 && !(rules[index - 1]!.from < rule.from)) {
      issues.push({ code: 'rules-order', message: `Rule ${index} must start after rule ${index - 1}.`, index });
    }
  });
  if (rules[0]!.from !== habit.startedOn) {
    issues.push({ code: 'first-rule-start', message: 'The first rule must start on startedOn.', index: 0 });
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* Editing                                                             */
/* ------------------------------------------------------------------ */

/**
 * When an edit applies (store contract `updateHabit(…, applyFrom)`):
 * - 'today': day-based habits change from today. For a flexible habit this is "this period"
 *   (DESIGN §13.2): when the new rule cuts time into the same periods (same unit and `every`; only
 *   `times` changes) it takes over the whole current period, which is re-evaluated under it. When
 *   the geometry changes (weekly ↔ monthly, another `every`, or flexible → day-based) there is no
 *   shared period to take over, so the new rule starts today: the old rule's period is cut short
 *   at yesterday and closes under the old rule (periods.ts evaluates such a cut period as it stood
 *   on the day of the cut), and the new rule's first period starts today, like a habit created
 *   today. Either way no day before today changes hands, so no past day or closed period can
 *   become a new shortfall ("edits never rewrite history").
 * - 'next-period': flexible habits change from the day after the current period ends. Day-based
 *   habits ignore it and change from today (DESIGN §13.2).
 * - 'tomorrow': any habit changes from tomorrow (accepting "Ready to grow?", §13.2 graduation).
 *   A flexible habit's current period is then cut short tonight (see above).
 */
export type RuleEditTiming = 'today' | 'next-period' | 'tomorrow';

/**
 * The first day an edit made on `today` governs. It is never earlier than the current rule's own
 * start, so no day that already closed under an earlier rule can change, and never before
 * `startedOn`. An edit reaching back to the very first day replaces the whole history's rule
 * (from = rules[0].from, keeping rules[0].from === startedOn). `next` is the new rule's schedule;
 * without it a flexible "this period" edit is assumed to keep the period geometry.
 */
export function editEffectiveFrom(
  habit: WithRulesAndStart,
  today: DateKey,
  timing: RuleEditTiming,
  weekStart: WeekStart,
  next?: Pick<RuleContent, 'schedule'>,
): DateKey {
  const first = habit.rules[0];
  if (!first) throw new Error('Habit has no rules');
  const current = ruleAt(habit, today);
  let from: DateKey;
  if (timing === 'tomorrow') {
    from = addDays(today, 1);
  } else if (isDayBased(current)) {
    from = today;
  } else {
    const slot = periodSlotAt(periodGrid(current, current.from, weekStart), today);
    if (timing === 'next-period') from = addDays(slot.end, 1);
    else if (next && !samePeriodGeometry(current, next.schedule)) from = today;
    else from = maxDateKey(slot.start, current.from);
  }
  from = maxDateKey(from, habit.startedOn);
  return from <= first.from ? first.from : from;
}

/**
 * The habit with a rule edit applied (pure). Rules starting on or after the effective day are
 * superseded (the latest edit wins, including a pending next-period one), and an edit that matches
 * the rule already in effect collapses away, so undoing an edit leaves no trace.
 * Throws a RangeError when the new rule content is invalid.
 */
export function withRuleEdit<H extends WithRulesAndStart>(
  habit: H,
  content: RuleContent,
  today: DateKey,
  timing: RuleEditTiming,
  weekStart: WeekStart,
): H {
  const from = editEffectiveFrom(habit, today, timing, weekStart, content);
  const next: HabitRule = normalizeRuleContent({
    from,
    schedule: content.schedule,
    target: content.target,
    step: content.step,
    ...(content.tiny ? { tiny: content.tiny } : {}),
  });
  const issues = validateRuleContent(next);
  if (issues.length > 0) throw new RangeError(`Invalid rule: ${issues.map((i) => i.code).join(', ')}`);
  const kept = habit.rules.filter((r) => r.from < from);
  const prev = kept[kept.length - 1];
  if (prev && sameRuleContent(prev, next)) {
    return kept.length === habit.rules.length ? habit : { ...habit, rules: kept };
  }
  return { ...habit, rules: [...kept, next] };
}

/**
 * "Start tracking Walk from Mon, Sep 22?" (DESIGN §13.2): moves `startedOn` (and the first rule's
 * `from`) earlier. Later dates are ignored: history is never trimmed this way.
 */
export function withStartedOn<H extends WithRulesAndStart>(habit: H, date: DateKey): H {
  if (!(date < habit.startedOn)) return habit;
  const [first, ...rest] = habit.rules;
  return { ...habit, startedOn: date, rules: first ? [{ ...first, from: date }, ...rest] : habit.rules };
}
