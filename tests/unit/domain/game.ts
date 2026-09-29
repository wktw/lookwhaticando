/**
 * A tiny game harness for economy tests: holds a state, a controllable clock (UTC wall time, so
 * app days are easy to reason about) and a seeded rng, and runs the real domain reducers.
 */
import type { GameEvent, HabitInput } from '@/state/api';
import type { AppState, DateKey } from '@/state/types';
import { createInitialState } from '@/state/defaults';
import { appDayKey, monotonicDayKey, type LocalTimeReader } from '@/domain/dates';
import { mulberry32, type Rng } from '@/domain/rng';
import { transact, type Env, type Tx } from '@/domain/tx';
import { openDay } from '@/domain/rollover';
import * as logging from '@/domain/logging';
import * as habits from '@/domain/habits';

/** Wall clock = UTC (fast, zone-independent). */
export const UTC: LocalTimeReader = (ms) => {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
};

/** Epoch ms of a UTC wall time. */
export function at(date: DateKey, hour = 12, minute = 0): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d, hour, minute);
}

export const deepFreeze = <T>(o: T): T => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
};

export const baseInput = (over: Partial<HabitInput> = {}): HabitInput => ({
  name: 'Walk',
  icon: 'walk',
  color: 'sage',
  plant: 'pothos',
  pot: 'terracotta',
  schedule: { kind: 'daily' },
  target: 1,
  step: 1,
  effort: 'steady',
  timeOfDay: 'anytime',
  polarity: 'build',
  ...over,
});

export class Game {
  state: AppState;
  now: number;
  rng: Rng;
  local: LocalTimeReader = UTC;
  events: GameEvent[] = [];
  /** Freeze every committed state (proves reducers never mutate their input). */
  freeze = true;

  constructor(opts: { start?: DateKey; hour?: number; seed?: number; onboard?: boolean; name?: string } = {}) {
    this.now = at(opts.start ?? '2026-03-02', opts.hour ?? 9);
    this.rng = mulberry32(opts.seed ?? 42);
    this.state = createInitialState(this.now);
    this.run((tx) => openDay(tx));
    if (opts.onboard !== false) this.run((tx) => habits.completeOnboarding(tx, { name: opts.name ?? 'Sam', templateIds: [] }));
  }

  get today(): DateKey {
    return monotonicDayKey(appDayKey(this.now, this.state.settings.dayStartsAt, this.local), this.state.clock.maxDateKey);
  }

  env(): Env {
    return { now: this.now, today: this.today, local: this.local, rng: this.rng };
  }

  /** Runs a reducer body and commits (after bringing the day up to date, like the store). */
  run<R>(body: (tx: Tx) => R): R {
    const out = transact(this.state, this.env(), (tx) => {
      openDay(tx);
      const r = body(tx);
      return { r };
    });
    this.state = this.freeze ? deepFreeze(out.state) : out.state;
    this.events.push(...out.events);
    this.last = out.events;
    return out.r;
  }
  last: GameEvent[] = [];

  /** Moves the clock to a wall time (default noon) on `date` and opens that day. */
  goTo(date: DateKey, hour = 12, minute = 0): this {
    this.now = at(date, hour, minute);
    this.run(() => undefined);
    return this;
  }

  /** Advances `days` days (same wall time). */
  advance(days = 1): this {
    this.now += days * 86_400_000;
    this.run(() => undefined);
    return this;
  }

  addHabit(over: Partial<HabitInput> = {}): string {
    return this.run((tx) => ({ id: habits.createHabit(tx, baseInput(over)) })).id;
  }

  checkIn(id: string, date?: DateKey) {
    return this.run((tx) => logging.checkIn(tx, id, date));
  }
  tiny(id: string, date?: DateKey) {
    return this.run((tx) => logging.checkInTiny(tx, id, date));
  }
  undo(id: string, date?: DateKey) {
    return this.run((tx) => logging.undoCheckIn(tx, id, date));
  }
  setCount(id: string, date: DateKey, n: number) {
    this.run((tx) => logging.setCount(tx, id, date, n));
  }
  rest(id: string, date: DateKey) {
    return this.run((tx) => ({ ok: logging.toggleRest(tx, id, date) })).ok;
  }

  get coins(): number {
    return this.state.wallet.coins;
  }
  /** Sum of coin events of one reason since the harness started. */
  coinsBy(reason: string): number {
    return this.events.reduce((a, e) => (e.type === 'coins' && e.reason === reason ? a + e.amount : a), 0);
  }
  lastOf<T extends GameEvent['type']>(type: T): Extract<GameEvent, { type: T }>[] {
    return this.last.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
  }
  allOf<T extends GameEvent['type']>(type: T): Extract<GameEvent, { type: T }>[] {
    return this.events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
  }
  /** Sets the wallet directly (test setup only). */
  setWallet(patch: Partial<AppState['wallet']>): void {
    this.state = deepFreeze({ ...this.state, wallet: { ...this.state.wallet, ...patch } });
  }
}
