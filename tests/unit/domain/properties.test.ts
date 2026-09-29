/**
 * Property tests over seeded random histories (mulberry32): the invariants the design promises
 * must hold for every habit, schedule, edit sequence, pause pattern and week start.
 */
import { describe, expect, it } from 'vitest';
import type { DateKey, Habit } from '@/state/types';
import { evaluateDay, type EvalContext, type HabitLogs } from '@/domain/activity';
import { habitTally, trailingWindow, monthWindow, type StatWindow } from '@/domain/consistency';
import { addDays, eachDay } from '@/domain/dates';
import { plantStage } from '@/domain/growth';
import { sunshineFromHistory } from '@/domain/growth';
import { periodEvaluations } from '@/domain/periods';
import { mulberry32, randomInt } from '@/domain/rng';
import { validateHabitRules, withRuleEdit } from '@/domain/rules';
import { streakInfo } from '@/domain/streaks';
import { randomEdits, randomWorld, type World } from './random';

const SEEDS = Array.from({ length: 60 }, (_, i) => 1000 + i * 7919);
const ctxOf = (w: World, today: DateKey): EvalContext => ({ today, weekStart: w.weekStart, offDays: w.offDays });

/** Everything that is settled as of `today`: past day-based days and closed periods. */
function closedHistory(h: Habit, logs: HabitLogs, c: EvalContext): { days: Map<DateKey, string>; periods: Map<string, string> } {
  const days = new Map<DateKey, string>();
  for (const d of eachDay(h.startedOn, addDays(c.today, -1))) {
    const ev = evaluateDay(h, logs, d, c);
    if (ev.dayBased) days.set(d, `${ev.outcome}${ev.tiny ? '/tiny' : ''}`);
  }
  const periods = new Map<string, string>();
  for (const p of periodEvaluations(h, logs, h.startedOn, c.today, c)) {
    if (p.state === 'closed') periods.set(`${p.key}|${p.from}|${p.to}`, JSON.stringify([p.target, p.achieved, p.expected, p.tinyAchieved, p.met]));
  }
  return { days, periods };
}

function expectSubset(before: Map<string, string>, after: Map<string, string>, label: string): void {
  for (const [k, v] of before) expect(after.get(k), `${label} ${k}`).toBe(v);
}

describe('edits never change settled history (DESIGN §13.2 versioned rules)', () => {
  it.each(SEEDS)('seed %i: random edit sequence', (seed) => {
    const rng = mulberry32(seed);
    const w = randomWorld(rng);
    let h = w.habit;
    for (const edit of randomEdits(rng, w)) {
      const c = ctxOf(w, edit.day);
      const before = closedHistory(h, w.logs, c);
      h = withRuleEdit(h, edit.content, edit.day, edit.timing, w.weekStart);
      expect(validateHabitRules(h), `seed ${seed} rules valid after edit on ${edit.day}`).toEqual([]);
      const after = closedHistory(h, w.logs, c);
      expectSubset(before.days, after.days, `seed ${seed} edit ${edit.day} (${edit.timing}) day`);
      expectSubset(before.periods, after.periods, `seed ${seed} edit ${edit.day} (${edit.timing}) period`);
    }
  });
});

describe('as today advances (fixed logs)', () => {
  it.each(SEEDS.slice(0, 40))('seed %i: settled results are stable; achieved and expected only grow', (seed) => {
    const rng = mulberry32(seed);
    const w = randomWorld(rng, { days: 120 });
    let h = w.habit;
    for (const edit of randomEdits(rng, w)) h = withRuleEdit(h, edit.content, edit.day, edit.timing, w.weekStart);

    let prev: { today: DateKey; periods: Map<string, { achieved: number; expected: number; state: string; full: string }>; closed: ReturnType<typeof closedHistory> } | null = null;
    for (let T = h.startedOn; T <= w.end; T = addDays(T, randomInt(rng, 1, 4))) {
      const c = ctxOf(w, T);
      const periods = new Map<string, { achieved: number; expected: number; state: string; full: string }>();
      for (const p of periodEvaluations(h, w.logs, h.startedOn, T, c)) {
        periods.set(`${p.ruleIndex}|${p.key}`, {
          achieved: p.achieved,
          expected: p.expected,
          state: p.state,
          full: JSON.stringify([p.target, p.achieved, p.expected, p.met]),
        });
        expect(p.achieved).toBeLessThanOrEqual(p.expected + (p.skipped ? 0 : 0));
      }
      const closed = closedHistory(h, w.logs, c);
      if (prev) {
        for (const [k, a] of prev.periods) {
          const b = periods.get(k)!;
          expect(b, `seed ${seed} period ${k} vanished`).toBeDefined();
          expect(b.achieved, `seed ${seed} ${k} achieved ${prev.today}→${T}`).toBeGreaterThanOrEqual(a.achieved);
          expect(b.expected, `seed ${seed} ${k} expected ${prev.today}→${T}`).toBeGreaterThanOrEqual(a.expected);
          if (a.state === 'closed') expect(b.full, `seed ${seed} closed ${k}`).toBe(a.full);
        }
        expectSubset(prev.closed.days, closed.days, `seed ${seed} day ${prev.today}→${T}`);
      }
      prev = { today: T, periods, closed };
    }
  });
});

describe('tallies are well-formed', () => {
  it.each(SEEDS.slice(0, 30))('seed %i: 0 ≤ tiny ≤ achieved ≤ expected for random windows', (seed) => {
    const rng = mulberry32(seed);
    const w = randomWorld(rng);
    let h = w.habit;
    for (const edit of randomEdits(rng, w)) h = withRuleEdit(h, edit.content, edit.day, edit.timing, w.weekStart);
    for (let i = 0; i < 12; i++) {
      const T = addDays(h.startedOn, randomInt(rng, 0, 150));
      const windows: StatWindow[] = [trailingWindow(T, 30), monthWindow(T), { start: addDays(T, -randomInt(rng, 0, 90)), end: addDays(T, randomInt(rng, 0, 10)), attribution: 'calendar' }];
      for (const win of windows) {
        const t = habitTally(h, w.logs, win, ctxOf(w, T));
        expect(t.tiny).toBeGreaterThanOrEqual(0);
        expect(t.tiny).toBeLessThanOrEqual(t.achieved);
        expect(t.achieved).toBeLessThanOrEqual(t.expected);
      }
    }
  });
});

describe('growth and streaks', () => {
  it.each(SEEDS.slice(0, 30))('seed %i: stage ≤ completed occurrences, never shrinks, one stage per check-in on a single rule', (seed) => {
    const rng = mulberry32(seed);
    const w = randomWorld(rng, { days: 200 });
    const h = w.habit; // single rule: each occurrence adds ≤ one stage
    let prevStage = 0;
    let prevCompleted = 0;
    for (let T = h.startedOn; T <= w.end; T = addDays(T, 1)) {
      const { sunshine, completedOccurrences } = sunshineFromHistory(h, w.logs, ctxOf(w, T));
      const stage = plantStage(sunshine, completedOccurrences);
      expect(stage).toBeLessThanOrEqual(completedOccurrences);
      expect(stage).toBeGreaterThanOrEqual(prevStage);
      expect(stage - prevStage, `seed ${seed} ${T}`).toBeLessThanOrEqual(Math.max(0, completedOccurrences - prevCompleted));
      prevStage = stage;
      prevCompleted = completedOccurrences;
    }
  });

  it.each(SEEDS.slice(0, 30))('seed %i: streaks are bounded by achievements and best ≥ current', (seed) => {
    const rng = mulberry32(seed);
    const w = randomWorld(rng);
    let h = w.habit;
    for (const edit of randomEdits(rng, w)) h = withRuleEdit(h, edit.content, edit.day, edit.timing, w.weekStart);
    for (let i = 0; i < 8; i++) {
      const c = ctxOf(w, addDays(h.startedOn, randomInt(rng, 0, 150)));
      const s = streakInfo(h, w.logs, c);
      const { completedOccurrences } = sunshineFromHistory(h, w.logs, c);
      if (s.current) {
        expect(s.best).not.toBeNull();
        expect(s.best!.occurrences).toBeGreaterThanOrEqual(s.current.occurrences);
        expect(s.current.start <= s.current.end).toBe(true);
        expect(s.current.end <= c.today || s.current.unit === 'weeks' || s.current.unit === 'months').toBe(true);
      }
      if (s.best && (s.best.unit === 'days' || s.best.unit === 'times')) expect(s.best.occurrences).toBeLessThanOrEqual(completedOccurrences);
    }
  });
});
