/** Seeded random habits and histories for property tests. */
import type { DateKey, DayLog, Habit, Pause, Schedule, Weekday } from '@/state/types';
import type { HabitLogs } from '@/domain/activity';
import { addDays, eachDay } from '@/domain/dates';
import { chance, pick, randomInt, type Rng } from '@/domain/rng';
import { isDayBased, type RuleContent } from '@/domain/schedule';
import type { RuleEditTiming } from '@/domain/rules';
import { habit } from './helpers';

export function randomSchedule(rng: Rng): Schedule {
  switch (randomInt(rng, 0, 3)) {
    case 0:
      return { kind: 'daily' };
    case 1: {
      const days = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).filter(() => chance(rng, 0.5));
      return { kind: 'days', days: days.length > 0 ? days : [randomInt(rng, 0, 6) as Weekday] };
    }
    case 2: {
      const every = pick(rng, [1, 2, 3, 4] as const);
      return { kind: 'weekly', times: randomInt(rng, 1, 7), every };
    }
    default: {
      const every = pick(rng, [1, 2, 3, 6, 12] as const);
      return { kind: 'monthly', times: randomInt(rng, 1, 3), every };
    }
  }
}

export function randomContent(rng: Rng): RuleContent {
  const schedule = randomSchedule(rng);
  const target = isDayBased(schedule) && chance(rng, 0.3) ? randomInt(rng, 2, 8) : 1;
  const withTiny = chance(rng, 0.4);
  const tinyCount = withTiny && target > 1 && chance(rng, 0.5) ? randomInt(rng, 1, target - 1) : undefined;
  return {
    schedule,
    target,
    step: 1,
    ...(withTiny ? { tiny: { label: 'tiny', ...(tinyCount !== undefined ? { count: tinyCount } : {}) } } : {}),
  };
}

export interface World {
  habit: Habit;
  logs: HabitLogs;
  offDays: Record<DateKey, true>;
  weekStart: 0 | 1;
  /** Last day of the simulated timeline. */
  end: DateKey;
}

/** A habit with random pauses/archive, ~150 days of mixed logs, random off days and week start. */
export function randomWorld(rng: Rng, opts: { days?: number } = {}): World {
  const days = opts.days ?? 150;
  const startedOn = addDays('2026-01-05', randomInt(rng, 0, 40));
  const end = addDays(startedOn, days);
  const content = randomContent(rng);
  const pauses: Pause[] = [];
  for (let i = randomInt(rng, 0, 2); i > 0; i--) {
    const start = addDays(startedOn, randomInt(rng, 0, days));
    pauses.push(chance(rng, 0.2) ? { start } : { start, end: addDays(start, randomInt(rng, 0, 12)) });
  }
  const archivedOn = chance(rng, 0.15) ? addDays(startedOn, randomInt(rng, days / 2, days)) : undefined;
  const base = habit({ startedOn, rules: [{ from: startedOn, ...content }], pauses, ...(archivedOn ? { archivedOn } : {}) });
  const logs: Record<DateKey, DayLog> = {};
  const offDays: Record<DateKey, true> = {};
  for (const d of eachDay(addDays(startedOn, -3), end)) {
    const r = rng();
    if (r < 0.45) logs[d] = { kind: 'log', count: 8 };
    else if (r < 0.55) logs[d] = { kind: 'log', count: 0, level: 'tiny' };
    else if (r < 0.65) logs[d] = { kind: 'log', count: randomInt(rng, 1, 7) };
    else if (r < 0.72) logs[d] = { kind: 'rest' };
    if (chance(rng, 0.03)) offDays[d] = true;
  }
  return { habit: base, logs, offDays, weekStart: pick(rng, [0, 1] as const), end };
}

export interface RandomEdit {
  day: DateKey;
  content: RuleContent;
  timing: RuleEditTiming;
}

/** 1–5 edits on increasing days inside the timeline. */
export function randomEdits(rng: Rng, w: World): RandomEdit[] {
  const n = randomInt(rng, 1, 5);
  const offsets = Array.from({ length: n }, () => randomInt(rng, 0, 140)).sort((a, b) => a - b);
  return offsets.map((o) => ({ day: addDays(w.habit.startedOn, o), content: randomContent(rng), timing: pick(rng, ['today', 'next-period'] as const) }));
}
