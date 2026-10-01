/**
 * WP-B5 on the screens' view models: a habit finished on its first day with nothing watered
 * (domain-d6, `unstarted`) leaves no card, no missed day and no "Start tracking from…" offer, and
 * the calendar offers "Start tracking from…" only back to the backdating bound (DEC-P12g).
 */
import { describe, expect, it } from 'vitest';
import type { DateKey } from '@/state/types';
import { addDays, monthKey } from '@/domain/dates';
import * as habits from '@/domain/habits';
import { retireWithRibbon } from '@/domain/seasonReview';
import { calendarMonthVM, habitDayState, type CalendarCell } from '@/state/views/calendar';
import { habitDetailVM } from '@/state/views/habit';
import { todayVM } from '@/state/views/today';
import type { ViewEnv } from '@/state/views/common';
import { Game, UTC } from '../domain/game';

const D = '2026-09-07';
const envOf = (g: Game): ViewEnv => ({ today: g.today, now: g.now, local: UTC });
const cardIds = (g: Game, date?: DateKey) => {
  const vm = todayVM(g.state, envOf(g), date);
  return [...vm.blocks.flatMap((b) => b.cards), ...vm.doneForPeriod, ...vm.thisMonth, ...vm.notToday].map((c) => c.id);
};
const cell = (g: Game, id: string, date: DateKey): CalendarCell =>
  calendarMonthVM(g.state, envOf(g), id, monthKey(date)).weeks.flat().find((c) => c?.date === date)!;

describe('a habit finished on its first day with nothing watered, on the screens (WP-B5, domain-d6)', () => {
  it('no card today or tomorrow, an empty sill, and no missed day on its calendar', () => {
    const g = new Game({ start: D });
    const id = g.addHabit({ name: 'Water' });
    g.run((tx) => retireWithRibbon(tx, id));
    expect(cardIds(g)).not.toContain(id);
    expect(todayVM(g.state, envOf(g)).empty).toBe(true);
    expect(habitDayState(g.state, g.state.habits[0]!, D, g.today).state).toBe('archived');
    expect(cell(g, id, D)).toMatchObject({ state: 'archived' });
    expect(calendarMonthVM(g.state, envOf(g), id, monthKey(D)).tally).toMatchObject({ achieved: 0, expected: 0 });
    g.goTo(addDays(D, 1));
    expect(cardIds(g)).not.toContain(id);
    expect(cardIds(g, D)).not.toContain(id);
    expect(cell(g, id, D)).toMatchObject({ state: 'archived' });
    expect(habitDetailVM(g.state, envOf(g), id)).toMatchObject({ archived: true });
  });

  it('its calendar offers no "Start tracking from…" (the domain refuses it while unstarted)', () => {
    const g = new Game({ start: D });
    const id = g.addHabit({ name: 'Water' });
    g.run((tx) => retireWithRibbon(tx, id));
    g.goTo(addDays(D, 1));
    expect(cell(g, id, addDays(D, -1)).edit).toBeNull();
  });

  it('restored: the card is back and the calendar offers it again', () => {
    const g = new Game({ start: D });
    const id = g.addHabit({ name: 'Water' });
    g.run((tx) => retireWithRibbon(tx, id));
    g.run((tx) => habits.restoreHabit(tx, id));
    expect(cardIds(g)).toContain(id);
    expect(cell(g, id, addDays(D, -1)).edit).toBe('start-earlier');
  });

  it("restored by an older build that kept the flag: the card is back, the sill is not empty, the offer is back", () => {
    const g = new Game({ start: D });
    const id = g.addHabit({ name: 'Water' });
    g.run((tx) => retireWithRibbon(tx, id));
    g.goTo(addDays(D, 1));
    // An older build's Restore deletes the dates it knows and keeps `unstarted`.
    g.run((tx) => {
      const w = tx.habit(id);
      delete w.archivedOn;
      delete w.ribbon;
    });
    expect(g.state.habits[0]).toMatchObject({ unstarted: true });
    expect(cardIds(g)).toContain(id);
    expect(todayVM(g.state, envOf(g)).empty).toBe(false);
    expect(cell(g, id, g.today).state).not.toBe('archived');
    expect(cell(g, id, addDays(D, -1)).edit).toBe('start-earlier');
  });
});

describe('the calendar offers "Start tracking from…" back to the bound only (WP-B5, DEC-P12g)', () => {
  it('ten years back is offered, the day before is not', () => {
    const g = new Game({ start: D });
    const id = g.addHabit({ name: 'Walk' });
    expect(cell(g, id, '2016-09-07').edit).toBe('start-earlier');
    expect(cell(g, id, '2016-09-06').edit).toBeNull();
  });
});
