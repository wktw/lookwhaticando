/** The Garden Journal (DESIGN §14.2): up to five sentences that ink in from week 2, with honest forecasts. */
import { describe, expect, it } from 'vitest';
import type { AppState } from '@/state/types';
import { addDays } from '@/domain/dates';
import { gardenJournal, steadiestWeekday } from '@/domain/journal';
import { checkinsToStage } from '@/state/views/common';
import { BLOOMING } from '@/domain/growth';
import { Game, UTC } from './game';

const habitOf = (s: AppState, id: string) => s.habits.find((h) => h.id === id)!;
const journal = (g: Game, id: string) =>
  gardenJournal(g.state, habitOf(g.state, id), { today: g.today, local: UTC, weekStart: 1, checkinsToBlooming: checkinsToStage(g.state, habitOf(g.state, id), g.today, UTC, BLOOMING) });

describe('Garden Journal', () => {
  it('is all pencil in week 1, with forecasts in check-ins where one can be said', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ tiny: { label: 'tiny' } });
    g.goTo('2026-03-02', 8);
    g.checkIn(a);
    expect(journal(g, a)).toEqual([
      { kind: 'usualTime', inked: false, remaining: 9 },
      { kind: 'steadiestDay', inked: false, remaining: null },
      { kind: 'tinyDays', inked: false, remaining: null },
      { kind: 'keptTogether', inked: false, remaining: null },
      { kind: 'whyItLooks', inked: false, remaining: 41 },
    ]);
  });

  it('inks the usual time at 10 eligible days, the steadiest day after the second week, and tiny days from week 2', () => {
    const g = new Game({ start: '2026-03-02' }); // Monday
    const a = g.addHabit({ tiny: { label: 'tiny' } });
    let day = '2026-03-02';
    for (let i = 0; i < 15; i++, day = addDays(day, 1)) {
      g.goTo(day, 7, 40);
      if (i === 3) g.tiny(a);
      else if (i % 7 !== 6) g.checkIn(a); // Sundays off
    }
    const j = journal(g, a);
    expect(j[0]).toEqual({ kind: 'usualTime', inked: true, minute: 465, band: 'dawn' });
    expect(j[1]).toEqual({ kind: 'steadiestDay', inked: true, weekday: 1, days: 3 }); // Mondays: 3 (ties go to the earlier day)
    expect(j[2]).toEqual({ kind: 'tinyDays', inked: true, days: 1 });
    expect(j[3]).toEqual({ kind: 'keptTogether', inked: false, remaining: null });
    expect(j[4]).toMatchObject({ kind: 'whyItLooks', inked: false });
  });

  it('leaves out tiny days for a habit that never had a tiny version, and inks the look once there is one', () => {
    const g = new Game({ start: '2026-01-05' });
    const walk = g.addHabit({ name: 'Walk' });
    const read = g.addHabit({ name: 'Read', anchorHabitId: walk });
    let day = '2026-01-05';
    for (let i = 0; i < 45; i++, day = addDays(day, 1)) {
      g.goTo(day, 18, 0);
      g.checkIn(walk);
      g.goTo(day, 18, 30);
      g.checkIn(read);
    }
    const j = journal(g, read);
    expect(j.map((e) => e.kind)).toEqual(['usualTime', 'steadiestDay', 'keptTogether', 'whyItLooks']);
    expect(j[2]).toEqual({ kind: 'keptTogether', inked: true, anchorHabitId: walk, days: 45 });
    expect(j[3]).toEqual({ kind: 'whyItLooks', inked: true, colour: 'twilight', shape: 'paired', band: 'twilight', usualMinute: 1110 });
  });

  it('the steadiest weekday is null without check-ins', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    expect(steadiestWeekday(g.state, habitOf(g.state, a), g.today, 1)).toBeNull();
  });
});
