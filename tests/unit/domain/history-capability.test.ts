import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/state/defaults';
import { addDays } from '@/domain/dates';
import { historyEdit, editHistory } from '@/domain/logging';
import { mulberry32 } from '@/domain/rng';
import { transact } from '@/domain/tx';
import { calendarMonthVM } from '@/state/views/calendar';
import type { AppState, Habit } from '@/state/types';
import { habit, monthly, rule, weekly, DAILY } from './helpers';
import { randomWorld, randomContent } from './random';
import { at, UTC } from './game';

const today = '2026-09-29';
const env = { today, now: at(today), local: UTC, rng: mulberry32(1) };
function save(h: Habit): AppState { return { ...createInitialState(env.now), habits: [h] }; }
function edit(s: AppState, date: string, done: boolean) {
  return transact(s, env, (tx) => ({ ok: editHistory(tx, 'h1', date, done) }));
}

describe('history edit capability (WP-B8)', () => {
  it.each([weekly(3), monthly(6)])('closed $kind periods support add/remove/add without rewards', (schedule) => {
    let s = save(habit({ startedOn: '2026-01-01', schedule }));
    const date = '2026-08-05';
    for (const done of [true, false, true]) {
      expect(historyEdit(s, 'h1', date, today)).toEqual({ canAdd: true, canRemove: true, reason: null });
      const out = edit(s, date, done);
      expect(out.ok).toBe(true);
      expect(out.state.logs.h1?.[date]?.kind === 'log' ? out.state.logs.h1[date].count : 0).toBe(done ? 1 : 0);
      expect(out.state.wallet).toEqual(s.wallet);
      expect(out.state.ledger).toEqual(s.ledger);
      expect(out.state.lifetime).toEqual(s.lifetime);
      s = out.state;
    }
  });

  it('protects removal from a flexible period that reaches the rewarding window, including its boundary', () => {
    const s = save(habit({ startedOn: '2026-01-01', schedule: monthly(6) }));
    expect(historyEdit(s, 'h1', '2026-09-02', today)).toEqual({ canAdd: true, canRemove: false, reason: 'open-period' });
    expect(edit(s, '2026-09-02', false).ok).toBe(false);
    const h = habit({ startedOn: '2026-01-01', rules: [rule('2026-01-01', monthly(6)), rule('2026-09-24', DAILY)] });
    expect(historyEdit(save(h), 'h1', '2026-09-02', today).canRemove).toBe(false);
    h.rules[1] = rule('2026-09-23', DAILY);
    expect(historyEdit(save(h), 'h1', '2026-09-02', today).canRemove).toBe(true);
  });

  it('allows history corrections on paused, off, resting and unscheduled days', () => {
    const s = save(habit({ startedOn: '2026-01-01', pauses: [{ start: '2026-09-01', end: '2026-09-20' }] }));
    s.offDays['2026-09-10'] = true;
    s.logs.h1 = { '2026-09-10': { kind: 'rest', note: 'Kept note' } };
    expect(historyEdit(s, 'h1', '2026-09-10', today).canAdd).toBe(true);
    const out = edit(s, '2026-09-10', true);
    expect(out.ok).toBe(true);
    expect(out.state.logs.h1?.['2026-09-10']).toEqual({ kind: 'log', count: 1, note: 'Kept note' });
  });

  it('refuses invalid, future, missing, before-start, post-archive and unstarted dates with an accurate reason', () => {
    const s = save(habit({ startedOn: '2026-09-01', archivedOn: '2026-09-15' }));
    for (const [date, reason] of [['bad', 'invalid-date'], ['2026-10-01', 'future'], ['2026-08-30', 'before-start'], ['2026-09-20', 'archived'], ['2026-09-29', 'archived']]) {
      expect(historyEdit(s, 'h1', date!, today)).toEqual({ canAdd: false, canRemove: false, reason });
      expect(edit(s, date!, true).ok).toBe(false);
    }
    expect(historyEdit(s, 'gone', '2026-09-10', today).reason).toBe('missing-habit');
    const h = { ...s.habits[0]!, archivedOn: '2026-09-01', unstarted: true as const };
    expect(historyEdit(save(h), 'h1', h.startedOn, today).reason).toBe('archived');
  });

  it('calendar carries capability even for a bare flexible date, and no Today link after archive', () => {
    const s = save(habit({ startedOn: '2026-01-01', schedule: weekly(3), archivedOn: '2026-09-20' }));
    const cells = calendarMonthVM(s, env, 'h1', '2026-09').weeks.flat();
    const older = cells.find((c) => c?.date === '2026-09-01')!;
    expect(older.state).toBe('unscheduled');
    expect(older.history).toEqual({ canAdd: true, canRemove: true, reason: null });
    expect(cells.find((c) => c?.date === '2026-09-28')!.edit).toBeNull();
  });

  it('capability and reducer agree across seeded dates and changing rule histories', () => {
    const rng = mulberry32(803);
    for (let i = 0; i < 60; i++) {
      const w = randomWorld(rng);
      const h = { ...w.habit, rules: [...w.habit.rules, { from: addDays(w.habit.startedOn, 40), ...randomContent(rng) }, { from: addDays(w.habit.startedOn, 80), ...randomContent(rng) }] };
      const s: AppState = { ...save(h), logs: { h1: { ...w.logs } }, offDays: w.offDays, settings: { ...save(h).settings, weekStart: w.weekStart } };
      const e = { ...env, today: w.end, now: at(w.end) };
      for (let offset = -3; offset <= 155; offset += 3) {
        const date = addDays(h.startedOn, offset);
        const cap = historyEdit(s, 'h1', date, e.today);
        for (const done of [false, true]) {
          const out = transact(s, e, (tx) => ({ ok: editHistory(tx, 'h1', date, done) }));
          expect(out.ok, `case ${i}: ${date}, add=${done}`).toBe(done ? cap.canAdd : cap.canRemove);
          if (!out.ok) expect(out.state).toBe(s);
          expect(out.state.wallet).toEqual(s.wallet);
          expect(out.state.ledger).toEqual(s.ledger);
        }
      }
    }
  });
});
