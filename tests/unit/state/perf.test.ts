/**
 * The quality bar: `todayVM` under 5 ms on 3 years × 20 habits (DESIGN §11.1 performance; the
 * Today screen recomputes on every tap). Measured warm (the same state, as on a clock tick) and
 * after a check-in on one habit (the realistic per-tap case: only that habit's history walks
 * recompute). The first render of a fresh save is reported, not asserted.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AppState } from '@/state/types';
import { transact } from '@/domain/tx';
import * as logging from '@/domain/logging';
import { mulberry32 } from '@/domain/rng';
import { todayVM, type ViewEnv } from '@/state/selectors';
import { bigSave, TODAY } from './bigsave';
import { UTC, at } from '../domain/game';

vi.setConfig({ testTimeout: 120_000 });

const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[xs.length >> 1]!;

describe('todayVM on 3 years × 20 habits', () => {
  it('stays under 5 ms warm and after a check-in', () => {
    const s0 = bigSave({ years: 3, habits: 20 });
    const env: ViewEnv = { today: TODAY, now: at(TODAY, 21), local: UTC };
    const e = { now: env.now, today: TODAY, local: UTC, rng: mulberry32(1) };
    let t = performance.now();
    todayVM(s0, env);
    const cold = performance.now() - t;

    const warm: number[] = [];
    for (let i = 0; i < 15; i++) {
      t = performance.now();
      todayVM(s0, env);
      warm.push(performance.now() - t);
    }

    // Each tap: a check-in (or un-check) on one habit, then the Today view of the new state.
    const tap: number[] = [];
    let s: AppState = s0;
    for (let i = 0; i < 20; i++) {
      const h = s.habits[i % s.habits.length]!;
      const done = s.logs[h.id]?.[TODAY]?.kind === 'log';
      s = transact(s, e, (tx) => (done ? logging.undoCheckIn(tx, h.id, TODAY) : logging.checkIn(tx, h.id, TODAY), {})).state;
      todayVM(s, env); // the first render after the tap warms that habit's walks
      t = performance.now();
      todayVM(s, env);
      tap.push(performance.now() - t);
    }
    // Also the very first render after a tap, which is what the screen actually pays.
    const firstAfterTap: number[] = [];
    for (let i = 0; i < 20; i++) {
      const h = s.habits[(i * 7) % s.habits.length]!;
      const done = s.logs[h.id]?.[TODAY]?.kind === 'log';
      s = transact(s, e, (tx) => (done ? logging.undoCheckIn(tx, h.id, TODAY) : logging.checkIn(tx, h.id, TODAY), {})).state;
      t = performance.now();
      todayVM(s, env);
      firstAfterTap.push(performance.now() - t);
    }
    console.log(
      `todayVM 3y×20: cold ${cold.toFixed(1)} ms · warm median ${median(warm).toFixed(2)} ms · after a tap median ${median(firstAfterTap).toFixed(2)} ms (max ${Math.max(...firstAfterTap).toFixed(2)})`,
    );
    expect(median(warm)).toBeLessThan(5);
    expect(median(tap)).toBeLessThan(5);
    expect(median(firstAfterTap)).toBeLessThan(5);
  });
});
