/** Small builders so domain tests read like the scenarios they describe. */
import type { DateKey, DayLog, Habit, HabitRule, Pause, Schedule, Weekday } from '@/state/types';
import type { EvalContext, HabitLogs } from '@/domain/activity';
import { isDayBased } from '@/domain/schedule';
import { eachDay } from '@/domain/dates';

export const DAILY: Schedule = { kind: 'daily' };
export const onDays = (...days: Weekday[]): Schedule => ({ kind: 'days', days });
export const weekly = (times: number, every: 1 | 2 | 3 | 4 = 1): Schedule => ({ kind: 'weekly', times, every });
export const monthly = (times: number, every: 1 | 2 | 3 | 6 | 12 = 1): Schedule => ({ kind: 'monthly', times, every });

export function rule(from: DateKey, schedule: Schedule, extra: Partial<Omit<HabitRule, 'from' | 'schedule'>> = {}): HabitRule {
  return { from, schedule, target: 1, step: 1, ...extra, ...(isDayBased(schedule) ? {} : { target: 1 }) };
}

export interface HabitSpec {
  id?: string;
  startedOn: DateKey;
  schedule?: Schedule;
  target?: number;
  tiny?: HabitRule['tiny'];
  rules?: HabitRule[];
  archivedOn?: DateKey;
  pauses?: Pause[];
  order?: number;
}

export function habit(spec: HabitSpec): Habit {
  const rules = spec.rules ?? [rule(spec.startedOn, spec.schedule ?? DAILY, { target: spec.target ?? 1, ...(spec.tiny ? { tiny: spec.tiny } : {}) })];
  return {
    id: spec.id ?? 'h1',
    name: 'Test habit',
    icon: 'sparkle',
    color: 'sage',
    plant: 'tulip',
    pot: 'terracotta',
    rules,
    effort: 'steady',
    timeOfDay: 'anytime',
    polarity: 'build',
    createdAt: Date.UTC(2026, 0, 1),
    startedOn: spec.startedOn,
    ...(spec.archivedOn ? { archivedOn: spec.archivedOn } : {}),
    pauses: spec.pauses ?? [],
    order: spec.order ?? 0,
  };
}

export const done = (count = 1): DayLog => ({ kind: 'log', count });
export const tiny = (count = 0): DayLog => ({ kind: 'log', count, level: 'tiny' });
export const partial = (count: number): DayLog => ({ kind: 'log', count });
export const REST: DayLog = { kind: 'rest' };

/** A log map with the same entry on each date. */
export function on(dates: DateKey[], log: DayLog = done()): Record<DateKey, DayLog> {
  return Object.fromEntries(dates.map((d) => [d, log]));
}

/** Every day in [start, end] logged the same way. */
export function range(start: DateKey, end: DateKey, log: DayLog = done()): Record<DateKey, DayLog> {
  return on(eachDay(start, end), log);
}

export function logs(...parts: Record<DateKey, DayLog>[]): HabitLogs {
  return Object.assign({}, ...parts) as HabitLogs;
}

/** The same logs minus some dates. */
export function without(l: HabitLogs, ...dates: DateKey[]): HabitLogs {
  return Object.fromEntries(Object.entries(l).filter(([d]) => !dates.includes(d)));
}

export function ctx(today: DateKey, opts: { weekStart?: 0 | 1; offDays?: DateKey[] } = {}): EvalContext {
  return {
    today,
    weekStart: opts.weekStart ?? 1,
    offDays: Object.fromEntries((opts.offDays ?? []).map((d) => [d, true as const])),
  };
}
