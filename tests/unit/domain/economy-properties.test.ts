/**
 * Property tests for the game layer: seeded random action sequences (check-ins, un-checks, tiny,
 * exact counts, rests, history edits, effort and schedule edits, deletes, pulls, day jumps and
 * clock rollbacks) must keep every economy invariant after every single step.
 */
import { describe, expect, it } from 'vitest';
import type { GameEvent } from '@/state/api';
import type { Schedule } from '@/state/types';
import { validateState } from '@/state/validate';
import { addDays } from '@/domain/dates';
import { DAILY_BUDGET, PAY, cuttingOf, ledgerKeyDate } from '@/domain/economy';
import { LEVEL_XP } from '@/domain/levels';
import * as gacha from '@/domain/gacha';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { chance, mulberry32, pick, randomInt, type Rng } from '@/domain/rng';
import { Game } from './game';

const SEEDS = Array.from({ length: 24 }, (_, i) => 7 + i * 104729);
const MAX_PAY = Math.max(...Object.values(PAY));

function randomSchedule(rng: Rng): Schedule {
  switch (randomInt(rng, 0, 3)) {
    case 0:
      return { kind: 'daily' };
    case 1:
      return { kind: 'days', days: [1, 3, 5] };
    case 2:
      return { kind: 'weekly', times: randomInt(rng, 1, 3), every: pick(rng, [1, 2] as const) };
    default:
      return { kind: 'monthly', times: randomInt(rng, 1, 2), every: 1 };
  }
}

/** Runs an edit the UI could attempt; validation errors (HabitInputError) are expected refusals. */
function attempt(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    if (!(e instanceof habits.HabitInputError)) throw e;
  }
}

function step(g: Game, rng: Rng): void {
  const live = g.state.habits.filter((h) => h.archivedOn === undefined);
  const r = rng();
  if (live.length === 0 || r < 0.05) {
    const count = chance(rng, 0.3);
    const schedule = randomSchedule(rng);
    const dayBased = schedule.kind === 'daily' || schedule.kind === 'days';
    attempt(() =>
      g.addHabit({
        name: `H${g.state.habits.length}`,
        schedule,
        target: dayBased && count ? 4 : 1,
        tiny: chance(rng, 0.5) ? { label: 'tiny', ...(dayBased && count ? { count: 2 } : {}) } : undefined,
        effort: pick(rng, ['light', 'steady', 'steady', 'big'] as const),
      }),
    );
    return;
  }
  const h = pick(rng, live);
  const date = addDays(g.today, -randomInt(rng, 0, chance(rng, 0.8) ? 3 : 12));
  if (r < 0.4) g.checkIn(h.id, date);
  else if (r < 0.52) g.undo(h.id, date);
  else if (r < 0.58) g.tiny(h.id, date);
  else if (r < 0.63) g.setCount(h.id, date, randomInt(rng, 0, 6));
  else if (r < 0.66) g.rest(h.id, date);
  else if (r < 0.69) g.run((tx) => logging.editHistory(tx, h.id, date, chance(rng, 0.6)));
  else if (r < 0.72) {
    const effort = pick(rng, ['light', 'steady'] as const);
    g.run((tx) => habits.updateHabit(tx, h.id, { effort }));
  } else if (r < 0.74) {
    const schedule = randomSchedule(rng);
    const timing = pick(rng, ['today', 'next-period'] as const);
    attempt(() => g.run((tx) => habits.updateHabit(tx, h.id, { schedule, target: 1 }, timing)));
  }
  else if (r < 0.76) g.run((tx) => habits.deleteHabit(tx, h.id));
  else if (r < 0.8) {
    if (g.state.wallet.coins >= 25) {
      g.run((tx) => {
        gacha.pull(tx, pick(rng, ['cats', 'cows', 'garden'] as const));
        gacha.finishReveal(tx);
      });
    }
  } else if (r < 0.9) g.advance(randomInt(rng, 1, 2));
  else if (r < 0.92) g.advance(randomInt(rng, 3, 9));
  else if (r < 0.95) {
    const back = g.now;
    g.now -= randomInt(rng, 37, 60) * 3_600_000; // clock set back > 36 h
    g.checkIn(h.id);
    g.now = back;
  } else g.run((tx) => logging.toggleOffDay(tx, g.today));
}

describe('economy invariants under random play', () => {
  it.each(SEEDS)('seed %i', (seed) => {
    const rng = mulberry32(seed);
    const g = new Game({ seed, start: '2026-02-02' });
    // "Cats or Cows?", then an old friend at level 6 so found things are in play.
    g.run((tx) => (gacha.pull(tx, 'cats', { free: true }), gacha.finishReveal(tx)));
    const friend = Object.keys(g.state.pets)[0]!;
    g.state = { ...g.state, pets: { ...g.state.pets, [friend]: { ...g.state.pets[friend]!, xp: LEVEL_XP[5]! } } };
    const actionDays = new Set<string>([g.today]);
    const onesByDay = new Map<string, number>();
    const foundByDay = new Map<string, number>();
    let lastBest = new Map<string, number>();
    let lastCutting = 0;
    for (let i = 0; i < 160; i++) {
      const eventsBefore = g.events.length;
      step(g, rng);
      const day = g.today;
      actionDays.add(day);
      const fresh: GameEvent[] = g.events.slice(eventsBefore);
      for (const e of fresh) if (e.type === 'coins' && e.reason === 'checkin' && e.amount === 1) onesByDay.set(day, (onesByDay.get(day) ?? 0) + 1);
      for (const e of fresh) if (e.type === 'foundThing') foundByDay.set(e.date, (foundByDay.get(e.date) ?? 0) + 1);
      const s = g.state;

      // The save stays valid (and every committed state was deep-frozen by the harness).
      const v = validateState(s);
      expect(v.ok ? [] : v.errors, `seed ${seed} step ${i}`).toEqual([]);

      // Balances never go negative; stardust always fused.
      expect(s.wallet.coins).toBeGreaterThanOrEqual(0);
      expect(s.wallet.stardust).toBeLessThan(10);

      // No occurrence ever holds more than one full check-in's pay.
      const heldSun = new Map<string, number>();
      for (const [k, e] of Object.entries(s.ledger.recent)) {
        expect(e.coins, k).toBeLessThanOrEqual(MAX_PAY);
        const hid = k.slice(0, k.lastIndexOf('|'));
        heldSun.set(hid, (heldSun.get(hid) ?? 0) + e.sunshine);
        expect(ledgerKeyDate(k) >= addDays(g.today, -7), `compacted ${k}`).toBe(true);
      }
      // Sunshine totals cover what the window still holds (older grants were folded in).
      for (const [hid, sun] of heldSun) expect((s.ledger.sunshine[hid] ?? 0) + 1e-6).toBeGreaterThanOrEqual(sun);

      // The 40-coin full-rate budget per action day (beyond it, 1 coin per check-in).
      for (const [d, paid] of Object.entries(s.ledger.daily)) expect(paid, `budget ${d}`).toBeLessThanOrEqual(DAILY_BUDGET + (onesByDay.get(d) ?? 0));

      // Counters: show-up days are distinct action days; plants never shrink.
      expect(s.lifetime.showUpDays).toBeLessThanOrEqual(actionDays.size);
      expect(s.lifetime.checkins).toBeGreaterThanOrEqual(Object.values(s.ledger.recent).filter((e) => e.lvl).length);
      for (const [hid, st] of Object.entries(s.ledger.bestStage)) expect(st).toBeGreaterThanOrEqual(lastBest.get(hid) ?? 0);
      lastBest = new Map(Object.entries(s.ledger.bestStage));

      // Found things: at most one a day, only on action days; The Cutting's stage never goes back.
      for (const [d, n] of foundByDay) {
        expect(n, `found things on ${d}`).toBe(1);
        expect(actionDays.has(d)).toBe(true);
      }
      expect(new Set((s.found ?? []).map((f) => f.date)).size).toBe((s.found ?? []).length);
      const cutting = cuttingOf(s).stage;
      expect(cutting).toBeGreaterThanOrEqual(lastCutting);
      lastCutting = cutting;
    }
  });
});

describe('farming never beats honest play', () => {
  const bonuses = (g: Game) => g.events.reduce((a, e) => (e.type === 'coins' && e.reason !== 'checkin' && e.reason !== 'refund' ? a + e.amount : a), 0);

  it.each(SEEDS.slice(0, 8))('seed %i: 200 random taps / un-taps / tiny on one day pay each occurrence at most once', (seed) => {
    const rng = mulberry32(seed);
    const g = new Game({ seed });
    g.setWallet({ coins: 500 });
    const ids = Array.from({ length: 4 }, (_, i) => g.addHabit({ name: `H${i}`, effort: 'light' }));
    for (let i = 0; i < 200; i++) {
      const id = pick(rng, ids);
      const r = rng();
      if (r < 0.45) g.checkIn(id);
      else if (r < 0.9) g.undo(id);
      else g.tiny(id);
    }
    for (const id of ids) g.checkIn(id);
    expect(g.coins).toBe(500 + 4 * PAY.light + bonuses(g));
  });

  it.each(SEEDS.slice(0, 8))('seed %i: with effort edits in between, never more than the best effort once per occurrence', (seed) => {
    const rng = mulberry32(seed);
    const g = new Game({ seed });
    g.setWallet({ coins: 500 });
    const ids = Array.from({ length: 3 }, (_, i) => g.addHabit({ name: `H${i}`, effort: 'light' }));
    for (let i = 0; i < 200; i++) {
      const id = pick(rng, ids);
      const r = rng();
      if (r < 0.4) g.checkIn(id);
      else if (r < 0.8) g.undo(id);
      else if (r < 0.9) g.tiny(id);
      else attempt(() => g.run((tx) => habits.updateHabit(tx, id, { effort: pick(rng, ['light', 'big'] as const) })));
    }
    for (const id of ids) g.checkIn(id);
    expect(g.coins).toBeLessThanOrEqual(500 + 3 * PAY.big + bonuses(g));
    for (const e of Object.values(g.state.ledger.recent)) expect(e.coins).toBeLessThanOrEqual(PAY.big);
  });
});
