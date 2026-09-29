/**
 * The Habit Editor's form logic, pure and tested: turning a schedule kind into a schedule, keeping a
 * count habit's numbers sensible, the patch an edit sends, and which field each issue belongs to.
 */
import type { HabitInput } from '@/state/api';
import type { Schedule, Weekday } from '@/state/types';
import type { HabitIssue } from '@/domain/habits';
import { RULE_LIMITS } from '@/domain/schedule';
import { suggestHabitIcon } from '@/catalog/habitIcons';

export type ScheduleKind = Schedule['kind'];
export const WEEKLY_EVERY = [1, 2, 3, 4] as const;
export const MONTHLY_EVERY = [1, 2, 3, 6, 12] as const;

/** Unit presets (DESIGN §5.2): the unit and the step a tap adds. */
export const UNIT_PRESETS: readonly { unit: string; step: number; target: number }[] = [
  { unit: 'glasses', step: 1, target: 8 },
  { unit: 'pages', step: 5, target: 20 },
  { unit: 'minutes', step: 5, target: 20 },
  { unit: 'steps', step: 1000, target: 8000 },
  { unit: 'km', step: 1, target: 3 },
];

/** The schedule a kind switches to, keeping what it can of the one before. */
export function scheduleFor(kind: ScheduleKind, prev: Schedule): Schedule {
  if (kind === prev.kind) return prev;
  switch (kind) {
    case 'daily':
      return { kind: 'daily' };
    case 'days':
      return { kind: 'days', days: [1, 3, 5] };
    case 'weekly':
      return { kind: 'weekly', times: prev.kind === 'monthly' ? Math.min(7, prev.times) : 3, every: 1 };
    case 'monthly':
      return { kind: 'monthly', times: prev.kind === 'weekly' ? Math.min(10, prev.times) : 2, every: 1 };
  }
}

/** A flexible habit counts one watering a day: its target is 1, and it has no unit or step. */
export const isFlexibleKind = (k: ScheduleKind): boolean => k === 'weekly' || k === 'monthly';

/** Most `times` a flexible period can hold (7 a week, 10 a month, times its `every`). */
export function maxTimes(s: Schedule): number {
  if (s.kind === 'weekly') return RULE_LIMITS.weeklyTimesPerWeek * s.every;
  if (s.kind === 'monthly') return RULE_LIMITS.monthlyTimesPerMonth * s.every;
  return 1;
}

/** Toggles a weekday on a certain-days schedule (kept in weekday order). */
export function toggleDay(days: readonly Weekday[], d: Weekday): Weekday[] {
  return (days.includes(d) ? days.filter((x) => x !== d) : [...days, d]).sort((a, b) => a - b);
}

/** A schedule change, with the form's numbers made to fit it. */
export function withSchedule(input: HabitInput, schedule: Schedule): HabitInput {
  const next: HabitInput = { ...input, schedule };
  if (isFlexibleKind(schedule.kind)) {
    next.target = 1;
    next.step = 1;
    delete next.unit;
    if (next.tiny) next.tiny = { label: next.tiny.label };
  }
  return next;
}

/** The name, and the icon that follows it until she picks one herself. */
export function withName(input: HabitInput, name: string, iconChosen: boolean): HabitInput {
  return { ...input, name, ...(iconChosen ? {} : { icon: suggestHabitIcon(name) }) };
}

/** A unit preset fills the unit, the step and (for a one-tap habit) a sensible target. */
export function withUnitPreset(input: HabitInput, preset: (typeof UNIT_PRESETS)[number]): HabitInput {
  return { ...input, unit: preset.unit, step: preset.step, target: input.target > 1 ? Math.max(input.target, preset.step) : preset.target };
}

const RULE_KEYS = ['schedule', 'target', 'step', 'tiny'] as const;
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * What an edit changes: only the fields that differ from the habit as it stands (a field cleared
 * is sent as `undefined`, which removes it).
 */
export function patchOf(before: HabitInput, after: HabitInput): Partial<HabitInput> {
  const patch: Partial<HabitInput> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)] as (keyof HabitInput)[]);
  for (const k of keys) if (!same(before[k], after[k])) (patch as Record<string, unknown>)[k] = after[k];
  return patch;
}

/** The edit touches the rule (so "From when?" is asked). */
export const touchesRule = (patch: Partial<HabitInput>): boolean => RULE_KEYS.some((k) => Object.prototype.hasOwnProperty.call(patch, k));

/** Where an issue shows: the section of the form it belongs to. */
export type FieldKey = 'name' | 'icon' | 'plant' | 'schedule' | 'amount' | 'tiny' | 'effort' | 'anchor' | 'why' | 'endsOn' | 'other';

export function fieldOf(issue: Pick<HabitIssue, 'field'>): FieldKey {
  switch (issue.field) {
    case 'name':
    case 'icon':
    case 'tiny':
    case 'effort':
    case 'why':
    case 'endsOn':
      return issue.field;
    case 'plant':
    case 'pot':
      return 'plant';
    case 'schedule':
      return 'schedule';
    case 'target':
    case 'step':
    case 'unit':
      return 'amount';
    case 'anchor':
    case 'anchorHabitId':
      return 'anchor';
    default:
      return 'other';
  }
}

/** The first issue per section, for the field notes. */
export function issuesByField(issues: readonly HabitIssue[]): Partial<Record<FieldKey, string>> {
  const out: Partial<Record<FieldKey, string>> = {};
  for (const i of issues) {
    const f = fieldOf(i);
    if (!out[f]) out[f] = i.message;
  }
  return out;
}

/** The trimmed input as the store takes it (empty optional words dropped). */
export function cleanInput(input: HabitInput): HabitInput {
  const out: HabitInput = { ...input, name: input.name.trim() };
  for (const k of ['unit', 'anchor', 'why'] as const) {
    const v = out[k]?.trim();
    if (v) out[k] = v;
    else delete out[k];
  }
  if (out.tiny && !out.tiny.label.trim()) delete out.tiny;
  else if (out.tiny) out.tiny = { ...out.tiny, label: out.tiny.label.trim() };
  return out;
}
