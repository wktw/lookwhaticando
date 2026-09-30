/**
 * Blooms Like You (DESIGN §14.2): the classifier (live stamps only, no catch-up bursts, no late
 * nights, ≥ 10 eligible days), the shape, the reads at Blooming and Evergreen (looks only added),
 * the plant tag's facts and the "Move it to Evening?" nudge. Honest time: local wall clock, DST.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AppState } from '@/state/types';
import { validateState } from '@/state/validate';
import { epochAtLocal } from '@/state/demo';
import { addDays, eachDay, zonedLocalTime, type LocalTimeReader } from '@/domain/dates';
import { BLOOMING, EVERGREEN } from '@/domain/growth';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { answerTimeNudge, eligibleTimes, readShape, readTimes, setPlantLook, timeNudge, type EligibleTime } from '@/domain/signature';
import { Game, at, deepFreeze } from './game';

vi.setConfig({ testTimeout: 60_000 });

const habitOf = (s: AppState, id: string) => s.habits.find((h) => h.id === id)!;
const times = (...minutes: number[]): EligibleTime[] => minutes.map((minute, i) => ({ date: addDays('2026-03-01', i), minute }));

describe('eligible check-in times: live stamps only, no catch-up bursts, nothing from 23:00 to 03:59', () => {
  it('drops a burst of 3 habits within 120 s, keeps a pair, and keeps three spread over 150 s', () => {
    const g = new Game({ start: '2026-03-02' });
    const [a, b, c] = ['A', 'B', 'C'].map((name) => g.addHabit({ name }));
    // Day 1: a burst (7:00:00, 7:01:00, 7:01:30).
    g.now = at('2026-03-03', 7, 0);
    g.checkIn(a!);
    g.now += 60_000;
    g.checkIn(b!);
    g.now += 30_000;
    g.checkIn(c!);
    // Day 2: only two habits close together.
    g.now = at('2026-03-04', 7, 0);
    g.checkIn(a!);
    g.now += 30_000;
    g.checkIn(b!);
    g.now = at('2026-03-04', 12, 0);
    g.checkIn(c!);
    // Day 3: three habits, but spread over 150 s (no 120-s window holds all three).
    g.now = at('2026-03-05', 7, 0);
    g.checkIn(a!);
    g.now += 75_000;
    g.checkIn(b!);
    g.now += 75_000;
    g.checkIn(c!);
    const days = (id: string) => eligibleTimes(g.state, habitOf(g.state, id), '2026-03-05', g.local).map((t) => t.date);
    expect(days(a!)).toEqual(['2026-03-04', '2026-03-05']);
    expect(days(b!)).toEqual(['2026-03-04', '2026-03-05']);
    expect(days(c!)).toEqual(['2026-03-04', '2026-03-05']);
  });

  it('drops late nights (23:00–03:59) and backfill, and reads the stamp that completed a count habit’s day', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ name: 'Read' });
    const w = g.addHabit({ name: 'Water', target: 3 });
    g.goTo('2026-03-02', 23, 30);
    g.checkIn(a);
    g.goTo('2026-03-04', 3, 30); // after the 3:00 day start: today's app day, but still night
    g.checkIn(a);
    g.goTo('2026-03-05', 9, 0);
    g.checkIn(a, '2026-03-03'); // backfill: no stamp
    g.checkIn(a);
    for (const [h, m] of [
      [8, 0],
      [12, 0],
      [18, 15],
    ] as const) {
      g.goTo('2026-03-05', h, m);
      g.checkIn(w);
    }
    expect(eligibleTimes(g.state, habitOf(g.state, a), g.today, g.local)).toEqual([{ date: '2026-03-05', minute: 540 }]);
    expect(eligibleTimes(g.state, habitOf(g.state, w), g.today, g.local)).toEqual([{ date: '2026-03-05', minute: 18 * 60 + 15 }]);
  });

  it('reads the local wall clock across a DST change (London, Mar 29 2026)', () => {
    const london = zonedLocalTime('Europe/London');
    const g = new Game({ start: '2026-03-20' });
    g.local = london;
    const a = g.addHabit();
    for (const d of eachDay('2026-03-20', '2026-04-05')) {
      g.now = epochAtLocal(d, 7, 30, london);
      g.checkIn(a);
    }
    const t = eligibleTimes(g.state, habitOf(g.state, a), g.today, london);
    expect(t).toHaveLength(17);
    expect(new Set(t.map((x) => x.minute))).toEqual(new Set([450]));
    expect(readTimes(t)).toMatchObject({ colour: 'dawn', band: 'dawn', usualMinute: 450, block: 'morning' });
  });
});

describe('the colour: a band holding ≥ 60% of ≥ 10 eligible days, else Wildflower', () => {
  it('needs 10 eligible days', () => {
    expect(readTimes(times(...Array(9).fill(450)))).toMatchObject({ colour: null, band: 'all-sorts', block: null, usualMinute: 450, eligibleDays: 9 });
    expect(readTimes(times(...Array(10).fill(450)))).toMatchObject({ colour: 'dawn', bandDays: 10 });
  });

  it('Dawn before 9 · Sunlit 9–18 · Twilight from 18 · Wildflower when no band holds 60%', () => {
    expect(readTimes(times(...Array(6).fill(539), ...Array(4).fill(1200)))).toMatchObject({ colour: 'dawn', band: 'dawn', bandDays: 6, usualMinute: 540 });
    expect(readTimes(times(...Array(6).fill(540), ...Array(4).fill(1200)))).toMatchObject({ colour: 'sunlit' });
    expect(readTimes(times(...Array(7).fill(1080), ...Array(3).fill(600)))).toMatchObject({ colour: 'twilight', usualMinute: 1080 });
    expect(readTimes(times(...Array(5).fill(450), ...Array(5).fill(1200)))).toMatchObject({ colour: 'wildflower', band: 'all-sorts' });
  });

  it('the usual time is the band’s median, rounded to 15 minutes', () => {
    expect(readTimes(times(440, 445, 452, 458, 460, 470, 470, 480, 1300, 1300)).usualMinute).toBe(465);
  });
});

describe('the shape: Paired (≥ 14 kept-together days) › Petite (tiny on ≥ 25% and ≥ 5 days) › Classic', () => {
  it('Petite needs both the share and the count', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ tiny: { label: 'tiny' } });
    for (let i = 0; i < 16; i++) {
      if (i % 4 === 0) g.tiny(a);
      else g.checkIn(a);
      g.advance(1);
    }
    expect(readShape(g.state, habitOf(g.state, a), g.today)).toMatchObject({ shape: 'classic', tinyDays: 4, doneDays: 16 });
    g.tiny(a);
    expect(readShape(g.state, habitOf(g.state, a), g.today)).toMatchObject({ shape: 'petite', tinyDays: 5, doneDays: 17 });
  });

  it('Paired wins once the stack has been kept together 14 days', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit({ name: 'Walk' });
    const stretch = g.addHabit({ name: 'Stretch', tiny: { label: 'tiny' }, anchorHabitId: walk });
    for (let i = 0; i < 14; i++) {
      g.checkIn(walk);
      g.tiny(stretch);
      g.advance(1);
    }
    expect(readShape(g.state, habitOf(g.state, stretch), g.today)).toMatchObject({ shape: 'paired', keptTogether: { habitId: walk, days: 14 }, tinyDays: 14 });
  });
});

describe('reads at the first Blooming and at Evergreen; looks are only ever added', () => {
  it('Dawn at Blooming, Twilight added at Evergreen (shown unless she chose), Classic always available', () => {
    const g = new Game({ start: '2026-01-05' });
    const a = g.addHabit();
    let day = '2026-01-05';
    let bloomedOn: string | null = null;
    for (let i = 0; i < 200; i++, day = addDays(day, 1)) {
      g.goTo(day, i < 60 ? 7 : 19, 30); // the Evergreen re-read sees only the last 120 days of stamps
      g.checkIn(a);
      if (!bloomedOn && (g.state.ledger.bestStage[a] ?? 0) >= BLOOMING) bloomedOn = day;
    }
    const pl = g.state.plantLooks![a]!;
    expect(pl.looks.map((l) => [l.colour, l.shape, l.read])).toEqual([
      ['dawn', 'classic', 'bloom'],
      ['twilight', 'classic', 'evergreen'],
    ]);
    expect(pl.looks[0]!.on).toBe(bloomedOn);
    expect(pl.looks[0]!.evidence).toMatchObject({ band: 'dawn', usualMinute: 450, tinyDays: 0 });
    expect(pl.shown).toBe(1);
    expect(pl.reads.evergreen).toBe(pl.looks[1]!.on);
    expect(g.allOf('look').map((e) => e.colour)).toEqual(['dawn', 'twilight']);
    expect(g.state.ledger.bestStage[a]).toBe(EVERGREEN);
    // Classic, then back to a look; out-of-range picks are refused.
    expect(g.run((tx) => setPlantLook(tx, a, null))).toBe(true);
    expect(g.state.plantLooks![a]!).toMatchObject({ shown: null, chosen: true });
    expect(g.run((tx) => setPlantLook(tx, a, 2))).toBe(false);
    expect(g.run((tx) => setPlantLook(tx, a, 0))).toBe(true);
    expect(validateState(g.state).ok).toBe(true);
  });

  it('a read waits for 10 eligible days rather than guess, then reads as it is kept by then', () => {
    const g = new Game({ start: '2026-01-05' });
    const a = g.addHabit();
    let day = '2026-01-05';
    for (let i = 0; i < 45; i++, day = addDays(day, 1)) {
      g.goTo(day, 23, 30); // late nights only: nothing eligible
      g.checkIn(a);
    }
    expect(g.state.ledger.bestStage[a]).toBeGreaterThanOrEqual(BLOOMING);
    expect(g.state.plantLooks?.[a]).toBeUndefined();
    for (let i = 0; i < 10; i++, day = addDays(day, 1)) {
      g.goTo(day, 12, 0);
      g.checkIn(a);
    }
    expect(g.state.plantLooks![a]!.looks.map((l) => [l.colour, l.read, l.on])).toEqual([['sunlit', 'bloom', addDays(day, -1)]]);
  });

  it('a re-read that matches an existing look adds nothing; a chosen look stays shown', () => {
    const g = new Game({ start: '2026-01-05' });
    const a = g.addHabit();
    let day = '2026-01-05';
    for (let i = 0; i < 60; i++, day = addDays(day, 1)) {
      g.goTo(day, 8, 0);
      g.checkIn(a);
    }
    g.run((tx) => setPlantLook(tx, a, null)); // she prefers Classic
    for (let i = 0; i < 140; i++, day = addDays(day, 1)) {
      g.goTo(day, 8, 0);
      g.checkIn(a);
    }
    expect(g.state.plantLooks![a]).toMatchObject({ shown: null, chosen: true });
    expect(g.state.plantLooks![a]!.looks).toHaveLength(1);
    expect(g.state.plantLooks![a]!.reads.evergreen).toBeDefined();
  });
});

describe('"You set Walk for mornings but usually water it after 6 pm. Move it to Evening?"', () => {
  it('offers the usual block once 60% of ≥ 10 eligible days fall in it; either answer closes it for good', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ timeOfDay: 'morning' });
    const b = g.addHabit({ name: 'Any', timeOfDay: 'anytime' });
    let day = '2026-03-02';
    for (let i = 0; i < 9; i++, day = addDays(day, 1)) {
      g.goTo(day, 19, 0);
      g.checkIn(a);
      g.checkIn(b);
    }
    expect(timeNudge(g.state, habitOf(g.state, a), g.today, g.local)).toBeNull(); // 9 days
    g.goTo(day, 19, 0);
    g.checkIn(a);
    g.checkIn(b);
    expect(timeNudge(g.state, habitOf(g.state, a), g.today, g.local)).toEqual({ from: 'morning', to: 'evening', band: 'twilight', usualMinute: 1140 });
    expect(timeNudge(g.state, habitOf(g.state, b), g.today, g.local)).toBeNull(); // Anytime has no mismatch
    expect(g.run((tx) => answerTimeNudge(tx, a, true))).toBe(true);
    expect(habitOf(g.state, a)).toMatchObject({ timeOfDay: 'evening', timeNudge: 'moved' });
    g.run((tx) => habits.updateHabit(tx, a, { timeOfDay: 'morning' }));
    expect(timeNudge(g.state, habitOf(g.state, a), g.today, g.local)).toBeNull(); // offered once
    const c = g.addHabit({ name: 'C', timeOfDay: 'midday' });
    for (let i = 0; i < 10; i++, day = addDays(day, 1)) {
      g.goTo(day, 7, 0);
      g.checkIn(c);
    }
    expect(timeNudge(g.state, habitOf(g.state, c), g.today, g.local)?.to).toBe('morning');
    g.run((tx) => answerTimeNudge(tx, c, false));
    expect(habitOf(g.state, c)).toMatchObject({ timeOfDay: 'midday', timeNudge: 'left' });
    expect(timeNudge(g.state, habitOf(g.state, c), g.today, g.local)).toBeNull();
    expect(g.run((tx) => answerTimeNudge(tx, c, true))).toBe(false);
    expect(validateState(g.state).ok).toBe(true);
  });

  it('pays nothing: a look, a nudge and its answer never touch the wallet', () => {
    const g = new Game({ start: '2026-01-05' });
    const a = g.addHabit({ timeOfDay: 'morning' });
    let day = '2026-01-05';
    for (let i = 0; i < 50; i++, day = addDays(day, 1)) {
      g.goTo(day, 20, 0);
      g.checkIn(a);
    }
    const wallet = g.state.wallet;
    g.run((tx) => answerTimeNudge(tx, a, true));
    g.run((tx) => setPlantLook(tx, a, 0));
    expect(g.state.wallet).toEqual(wallet);
    expect(g.allOf('coins').some((e) => e.reason !== 'checkin' && e.reason !== 'gift' && e.reason !== 'rung' && e.reason !== 'perfect')).toBe(false);
    void logging;
  });
});

describe('the eligible-times memo is keyed by the zone too (P-history-04, WP-B3)', () => {
  /** A habit watered at 07:30 UTC on 12 days: one reading per zone. */
  function watered() {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    for (const d of eachDay('2026-03-02', '2026-03-13')) {
      g.goTo(d, 7, 30);
      g.checkIn(a);
    }
    return { s: g.state, habit: habitOf(g.state, a), today: g.today };
  }
  const minutes = (t: EligibleTime[]) => [...new Set(t.map((x) => x.minute))];

  it('the same state read in another zone is read again, not served from the memo', () => {
    const { s, habit, today } = watered();
    expect(minutes(eligibleTimes(s, habit, today, zonedLocalTime('UTC'), 'UTC'))).toEqual([450]);
    // Kathmandu (+05:45): 13:15.
    expect(minutes(eligibleTimes(s, habit, today, zonedLocalTime('Asia/Kathmandu'), 'Asia/Kathmandu'))).toEqual([795]);
    // A reader for a zone passed without its name still gets its own reading: Chatham in March is +13:45, so 21:15.
    expect(minutes(eligibleTimes(s, habit, today, zonedLocalTime('Pacific/Chatham')))).toEqual([21 * 60 + 15]);
    expect(minutes(eligibleTimes(s, habit, today, zonedLocalTime('UTC'), 'UTC'))).toEqual([450]);
  });

  it('the device’s own reader after the device moves zone (the same function) is read again', () => {
    const { s, habit, today } = watered();
    let zone = 'Europe/London'; // GMT in March before the 29th
    const device: LocalTimeReader = (ms) => zonedLocalTime(zone)(ms);
    expect(minutes(eligibleTimes(s, habit, today, device, zone))).toEqual([450]);
    zone = 'Asia/Kolkata';
    expect(minutes(eligibleTimes(s, habit, today, device, zone))).toEqual([13 * 60]);
    // …and its usual time, colour and nudge follow: 13:00 is Sunlit and Midday.
    expect(readTimes(eligibleTimes(s, habit, today, device, zone), s.settings.dayStartsAt)).toMatchObject({ usualMinute: 780, band: 'sunlit', block: 'midday' });
    expect(timeNudge(s, { ...habit, timeOfDay: 'morning' }, today, device, zone)).toMatchObject({ from: 'morning', to: 'midday' });
  });

  it('a repeated reading in one zone is still served from the memo', () => {
    const { s, habit, today } = watered();
    const reader = zonedLocalTime('Asia/Kathmandu');
    const first = eligibleTimes(s, habit, today, reader, 'Asia/Kathmandu');
    expect(eligibleTimes(s, habit, today, reader, 'Asia/Kathmandu')).toBe(first);
  });
});

describe('a day’s time is the check-in that made it count, not the last tap (P-history-02, DEC-P11, WP-B4)', () => {
  const D = '2026-03-02';
  /** A count habit (target 3) completed at 08:10 on D, after taps at 08:00 and 08:05. */
  function completedAt810() {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Water', target: 3 });
    for (const m of [0, 5, 10]) {
      g.goTo(D, 8, m);
      g.checkIn(a);
    }
    return { g, a, read: () => read(g, a) };
  }
  const minute = (h: number, m = 0) => h * 60 + m;

  it('over-target taps in the evening leave the day at its completing check-in', () => {
    const { g, a, read } = completedAt810();
    for (const m of [0, 30]) {
      g.goTo(D, 20, m);
      g.checkIn(a);
    }
    expect(g.state.logs[a]![D]).toMatchObject({ count: 5 });
    expect(read()).toEqual([{ date: D, minute: minute(8, 10) }]);
  });

  it('a number-pad entry past the target, then a decrease, leave it there too', () => {
    const { g, a, read } = completedAt810();
    g.goTo(D, 21, 0);
    g.setCount(a, D, 10);
    g.goTo(D, 21, 30);
    g.setCount(a, D, 5);
    expect(read()).toEqual([{ date: D, minute: minute(8, 10) }]);
  });

  it('undoing an over-target tap leaves it there; undoing below the target and completing again moves it to the new completion', () => {
    const { g, a, read } = completedAt810();
    for (const m of [0, 5]) {
      g.goTo(D, 20, m);
      g.checkIn(a);
    }
    g.goTo(D, 20, 10);
    g.undo(a);
    expect(read()).toEqual([{ date: D, minute: minute(8, 10) }]);
    const again = completedAt810();
    again.g.goTo(D, 8, 15);
    again.g.undo(again.a); // 2 of 3: the day no longer counts
    expect(again.read()).toEqual([]);
    again.g.goTo(D, 19, 0);
    again.g.checkIn(again.a);
    expect(again.read()).toEqual([{ date: D, minute: minute(19) }]);
  });

  it('the completing check-in outlives the 24-stamp cap', () => {
    const g = new Game({ start: D, hour: 6 });
    const a = g.addHabit({ name: 'Water', target: 2 });
    for (const m of [0, 1]) {
      g.goTo(D, 7, m);
      g.checkIn(a);
    }
    for (let i = 0; i < 30; i++) {
      g.goTo(D, 19, i);
      g.checkIn(a);
    }
    expect(read(g, a)).toEqual([{ date: D, minute: minute(7, 1) }]);
  });

  it('the tiny version makes the day count; upgrading it later in the day does not move it', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Walk', tiny: { label: 'Shoes on' } });
    g.goTo(D, 8);
    g.tiny(a);
    g.goTo(D, 20);
    g.checkIn(a);
    expect(g.state.logs[a]![D]).toMatchObject({ count: 1 });
    expect(read(g, a)).toEqual([{ date: D, minute: minute(8) }]);
  });

  it('a count that closes on its tiny count reads the check-in that reached it', () => {
    const g = new Game({ start: D, hour: 6 });
    const a = g.addHabit({ name: 'Water', target: 8, tiny: { label: 'Three glasses', count: 3 } });
    for (const m of [0, 5, 10]) {
      g.goTo(D, 7, m);
      g.checkIn(a);
    }
    expect(read(g, a)).toEqual([]); // today it is partial
    g.goTo(addDays(D, 1), 12);
    expect(read(g, a)).toEqual([{ date: D, minute: minute(7, 10) }]);
  });

  it('ten mornings completed at dawn with evening extras read as Dawn, not Twilight', () => {
    const g = new Game({ start: D, hour: 6 });
    const a = g.addHabit({ name: 'Read', target: 2 });
    for (let i = 0; i < 10; i++) {
      const d = addDays(D, i);
      for (const [h, m] of [
        [6, 50],
        [7, 0],
        [19, 0],
        [19, 10],
        [19, 20],
      ] as const) {
        g.goTo(d, h, m);
        g.checkIn(a);
      }
    }
    expect(readTimes(read(g, a))).toMatchObject({ eligibleDays: 10, band: 'dawn', colour: 'dawn', usualMinute: minute(7) });
  });

  it('an older build’s day reads its completing stamp when every tap was live, and is left out when that is unknown', () => {
    const g = new Game({ start: D, hour: 7 });
    const a = g.addHabit({ name: 'Water', target: 3 });
    const b = g.addHabit({ name: 'Pages', target: 3 });
    g.goTo(addDays(D, 2), 12);
    const t = (h: number, m = 0) => at(D, h, m);
    // As an older build wrote them: stamps only. Water: five live taps (08:00 … 08:20).
    // Pages: 10 counted, but only two taps were live (a number-pad entry): which one completed it is unknown.
    const logs: AppState['logs'] = {
      ...g.state.logs,
      [a]: { [D]: { kind: 'log', count: 5, at: [t(8, 0), t(8, 5), t(8, 10), t(8, 15), t(8, 20)] } },
      [b]: { [D]: { kind: 'log', count: 10, at: [t(9), t(21)] } },
    };
    g.state = deepFreeze({ ...g.state, logs });
    expect(read(g, a)).toEqual([{ date: D, minute: minute(8, 10) }]);
    expect(read(g, b)).toEqual([]);
    g.goTo(addDays(D, 3), 12); // the day's reconciler runs: the same readings
    expect(read(g, a)).toEqual([{ date: D, minute: minute(8, 10) }]);
    expect(read(g, b)).toEqual([]);
  });
});

function read(g: Game, id: string): EligibleTime[] {
  return eligibleTimes(g.state, habitOf(g.state, id), g.today, g.local);
}
