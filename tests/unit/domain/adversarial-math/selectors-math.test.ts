/**
 * Adversarial review of the view-model math the screens print: phrases, pace lines, "N of M",
 * time-block ordering and the week strip (DESIGN §5.3, §9.1, §13.2, §13.3; upstream §13.11 where the
 * code says it follows it). Tests marked [FAILS] are evidence of a defect; the others pin behaviour
 * the existing suite did not cover.
 */
import { describe, expect, it } from 'vitest';
import { formatHabitPhrase, habitPhrase } from '@/domain/consistency';
import { logsOf, trackingCtx } from '@/domain/economy';
import { showedUpDays } from '@/domain/insights';
import { trackingOf } from '@/domain/consistency';
import * as habitsDomain from '@/domain/habits';
import { todayVM, progressVM, type ViewEnv } from '@/state/selectors';
import { Game, UTC } from '../game';

const envOf = (g: Game): ViewEnv => ({ today: g.today, now: g.now, local: UTC });
const cardOf = (g: Game, id: string, date?: string) => {
  const vm = todayVM(g.state, envOf(g), date);
  return [...vm.blocks.flatMap((b) => b.cards), ...vm.doneForPeriod, ...vm.thisMonth, ...vm.notToday].find((c) => c.id === id)!;
};

/* ------------------------------------------------------------------ */
/* Pace lines ("1 more by Sun") and "N of M this week"                 */
/* ------------------------------------------------------------------ */

describe('pace line and "N of M" agree (DESIGN §9.1 "2 of 3 this week", §13.2 pace line "1 more by Sun")', () => {
  it.each([
    ['weekly 3× created on a Sunday', '2026-09-27', { kind: 'weekly', times: 3, every: 1 } as const],
    ['monthly 2× created on the 29th', '2026-09-29', { kind: 'monthly', times: 2, every: 1 } as const],
  ])('[FAILS] %s: an unmet goal never reads "0 more"', (_label, start, schedule) => {
    const g = new Game({ start });
    const id = g.addHabit({ name: 'Yoga', schedule });
    const c = cardOf(g, id);
    expect(c.met).toBe(false);
    // Observed: target_p = round(times × activeFrac) = 0, so the card prints "0 of 1 this week ·
    // 0 more by today": the goal shown (max(1, target) = 1) and `needed` (target − check-ins = 0)
    // come from two different numbers.
    expect(c.pace!.needed).toBe(c.pace!.target - c.pace!.checkins);
    expect(c.subtitle.text).not.toMatch(/\b0 more\b/);
  });

  it('a normal week reads "1 of 3 this week · 2 more by Sun", then "Done for the week ✓" (passes)', () => {
    const g = new Game({ start: '2026-09-21' }); // Monday
    const id = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 3, every: 1 } });
    g.goTo('2026-09-23');
    g.checkIn(id);
    expect(cardOf(g, id).subtitle.text).toBe('1 of 3 this week · 2 more by Sun');
    g.goTo('2026-09-24');
    g.checkIn(id);
    g.goTo('2026-09-25');
    g.checkIn(id);
    expect(cardOf(g, id).subtitle).toEqual({ kind: 'period-done', text: 'Done for the week ✓' });
    expect(todayVM(g.state, envOf(g)).doneForPeriod.map((c) => c.id)).toEqual([id]);
  });
});

/* ------------------------------------------------------------------ */
/* Rolling "last 30 days" never holds today against you                */
/* ------------------------------------------------------------------ */

describe('rolling phrases never count today against you (DESIGN §5.3 "Today is never held against you", §13.3 phrases; upstream §13.11 "Rolling windows end today if today already counts, else yesterday")', () => {
  function faithful(): { g: Game; id: string } {
    const g = new Game({ start: '2026-08-01' });
    const id = g.addHabit({ name: 'Walk' });
    for (let i = 0; i < 45; i++) {
      g.checkIn(id);
      g.advance(1);
    }
    return { g, id }; // Sep 15 at noon: 45 days done in a row, today not yet
  }

  it('[FAILS] daily: someone who has not missed a day reads "N of the last N days" before checking in today', () => {
    const { g, id } = faithful();
    const h = g.state.habits.find((x) => x.id === id)!;
    const phrase = habitPhrase(h, logsOf(g.state, id), trackingCtx(g.state, g.today))!;
    // Observed: "29 of the last 30 days" (today is pending, yet still inside the 30-day span).
    expect(formatHabitPhrase(phrase, 1)).toMatch(/^(\d+) of the last \1 days$/);
  });

  it('[FAILS] aggregate: "You showed up N of the last 30 days" is 30 of 30 for someone who showed up every one of the last 30 days', () => {
    const { g } = faithful();
    const s = showedUpDays(trackingOf(g.state), g.today, 30);
    // Observed: { days: 29, span: 30 } → "You showed up 29 of the last 30 days".
    expect(s.days).toBe(s.span);
    expect(progressVM(g.state, envOf(g)).showedUp.text).toBe('You showed up 30 of the last 30 days');
  });

  it('once today is checked in, the phrase is 30 of 30 (passes)', () => {
    const { g, id } = faithful();
    g.checkIn(id);
    const h = g.state.habits.find((x) => x.id === id)!;
    expect(formatHabitPhrase(habitPhrase(h, logsOf(g.state, id), trackingCtx(g.state, g.today))!, 1)).toBe('30 of the last 30 days');
  });
});

/* ------------------------------------------------------------------ */
/* Time blocks                                                         */
/* ------------------------------------------------------------------ */

describe('time blocks follow the app day (DESIGN §13.2 "The current block comes first, and completed earlier blocks collapse"; day boundary settings.dayStartsAt)', () => {
  it('[FAILS] at 04:00, an hour after the 3:00 day start, Morning is not an "earlier" block and Evening is not current', () => {
    const g = new Game({ start: '2026-09-28', hour: 4 }); // app day Sep 28 began at 03:00
    const m = g.addHabit({ name: 'Stretch', timeOfDay: 'morning' });
    const e = g.addHabit({ name: 'Journal', timeOfDay: 'evening' });
    expect(g.today).toBe('2026-09-28');
    const vm = todayVM(g.state, envOf(g));
    const ids = vm.blocks.map((b) => b.id);
    // Observed: ['evening', 'morning'] with Evening marked current: 04:00 maps to the evening block,
    // so the new day's morning is treated as already behind us (and folds away once done).
    expect(vm.blocks.find((b) => b.current)?.id).not.toBe('evening');
    expect(ids.indexOf('morning')).toBeLessThan(ids.indexOf('evening'));
    void m;
    void e;
  });

  it('at 23:00 the evening block is current and a completed morning folds as "Morning 1/1" (passes)', () => {
    const g = new Game({ start: '2026-09-28', hour: 23 });
    const m = g.addHabit({ name: 'Stretch', timeOfDay: 'morning' });
    g.addHabit({ name: 'Journal', timeOfDay: 'evening' });
    g.checkIn(m);
    const vm = todayVM(g.state, envOf(g));
    expect(vm.blocks.map((b) => [b.id, b.current, b.collapsed, b.summary])).toEqual([
      ['evening', true, false, 'Evening 0/1'],
      ['morning', false, true, 'Morning 1/1'],
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* Week strip and day progress (passing invariants)                    */
/* ------------------------------------------------------------------ */

describe('week strip and day progress (DESIGN §9.1; §13.2 rests/pauses) — passes', () => {
  it('shows the last 7 app days across a year boundary, flags each week start, and counts N of M without allowed rests or paused habits', () => {
    const g = new Game({ start: '2026-12-28' }); // Monday
    const walk = g.addHabit({ name: 'Walk' });
    const read = g.addHabit({ name: 'Read' });
    const yoga = g.addHabit({ name: 'Nap', schedule: { kind: 'days', days: [0, 6] } });
    g.goTo('2027-01-03'); // Sunday
    g.checkIn(walk);
    g.rest(read, '2027-01-03'); // allowed rest: not due
    g.run((tx) => habitsDomain.pauseHabit(tx, yoga, '2027-01-03'));
    const vm = todayVM(g.state, envOf(g));
    expect(vm.weekStrip.map((d) => `${d.letter}${d.day}${d.weekStart ? '|' : ''}`)).toEqual(['M28', 'T29', 'W30', 'T31', 'F1', 'S2', 'S3']);
    // Sunday: Walk done, Read rested (allowed), Nap paused → 1 of 1.
    expect(vm.progress).toMatchObject({ done: 1, total: 1, label: '1 of 1' });
    expect(vm.weekStrip[6]).toMatchObject({ isToday: true, done: 1, due: 1, fraction: 1 });
    expect(vm.paused?.text).toBe('Resting: 1 habit');
    g.run((tx) => {
      tx.section('settings').weekStart = 0;
    });
    // Sunday-start weeks: Jan 3 (the last bubble) starts a week and gets the hairline gap.
    expect(todayVM(g.state, envOf(g)).weekStrip.map((d) => d.weekStart)).toEqual([false, false, false, false, false, false, true]);
  });
});
