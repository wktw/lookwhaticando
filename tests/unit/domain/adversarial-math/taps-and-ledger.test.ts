/**
 * Adversarial review: count habits, the tiny version and same-day rule edits, as seen through the
 * sunshine/coin ledger (DESIGN §6.1 "Reward integrity", §13.2 "Targets and taps" / "Tiny version",
 * §13.4 "Only un-checking the same occurrence inside the refund window removes [sunshine]").
 * Tests marked [FAILS] are evidence of a defect.
 */
import { describe, expect, it } from 'vitest';
import { logStatus } from '@/domain/activity';
import * as habitsDomain from '@/domain/habits';
import { Game } from '../game';

describe('Undo undoes the tiny version (DESIGN §13.2 "Every completing check-in shows a 4-second Undo snackbar"; "Tiny version")', () => {
  it('[FAILS] "Did the tiny version" (4 of 8 glasses) then Undo: the day is not recorded as tiny at day end', () => {
    const g = new Game({ start: '2026-09-20' });
    const id = g.addHabit({ name: 'Water', target: 8, unit: 'glasses', tiny: { label: '4 glasses', count: 4 } });
    g.goTo('2026-09-28');
    g.tiny(id); // logs count 4 with level 'tiny'
    g.undo(id);
    g.goTo('2026-09-29');
    const rule = g.state.habits.find((h) => h.id === id)!.rules[0]!;
    // Observed: Undo only drops the level and keeps the 4 glasses the tiny tap added, so the §13.2
    // day-end rule turns Sep 28 back into a tiny day (and pays ⌈5/2⌉ = 3 coins and 0.5 sunshine again).
    expect(logStatus(g.state.logs[id]?.['2026-09-28'], rule, true)).toBe('none');
    expect(g.state.ledger.sunshine[id] ?? 0).toBe(0);
  });
});

describe('a same-day target edit never turns a tap into its opposite (DESIGN §13.4, §6.1, §13.2 partial taps)', () => {
  it('[FAILS] checked in (target 1), target raised to 8 "from today", then +1: the tap must not refund coins or remove sunshine', () => {
    const g = new Game({ start: '2026-09-20' });
    const id = g.addHabit({ name: 'Water', target: 1 });
    g.goTo('2026-09-28');
    g.checkIn(id); // paid 5 coins (+ First Sprout) and 1 sunshine
    const coins = g.coins;
    const sunshine = g.state.ledger.sunshine[id]!;
    expect(sunshine).toBe(1);
    g.run((tx) => habitsDomain.updateHabit(tx, id, { target: 8, unit: 'glasses' }, 'today'));
    g.checkIn(id); // +1 glass: a partial tap ("ring tick … no coin chip")
    // Observed: the tap re-settles the day against the new target (2 of 8 = pending) and refunds
    // −5 coins and −1 sunshine: a check-in tap that behaves like an un-check.
    expect(g.lastOf('coins').filter((e) => e.amount < 0)).toEqual([]);
    expect(g.coins).toBeGreaterThanOrEqual(coins);
    expect(g.state.ledger.sunshine[id]).toBeGreaterThanOrEqual(sunshine);
  });

  it('[FAILS] 3 of 8 glasses, target lowered to 2 "from today", then Undo: an un-check never pays', () => {
    const g = new Game({ start: '2026-09-20' });
    const id = g.addHabit({ name: 'Water', target: 8, unit: 'glasses' });
    g.goTo('2026-09-28');
    g.checkIn(id);
    g.checkIn(id);
    g.checkIn(id);
    g.run((tx) => habitsDomain.updateHabit(tx, id, { target: 2 }, 'today'));
    const coins = g.coins;
    g.undo(id); // 3 → 2 glasses
    // Observed: the undo settles the day as newly complete (2 ≥ 2) and pays +5 check-in coins, the
    // +20 First Sprout gift and 1 sunshine.
    expect(g.lastOf('coins').filter((e) => e.amount > 0)).toEqual([]);
    expect(g.coins).toBeLessThanOrEqual(coins);
  });

  it('the plain flow is sound: +1 taps below target pay nothing, reaching it pays once, undo refunds (passes)', () => {
    const g = new Game({ start: '2026-09-20' });
    const id = g.addHabit({ name: 'Water', target: 3, unit: 'glasses' });
    g.goTo('2026-09-28');
    g.checkIn(id);
    g.checkIn(id);
    expect(g.coinsBy('checkin')).toBe(0);
    g.checkIn(id);
    expect(g.coinsBy('checkin')).toBe(5);
    g.checkIn(id); // 4 / 3: over target, no extra coins (§13.2)
    expect(g.coinsBy('checkin')).toBe(5);
    g.undo(id); // 3 / 3: still done
    g.undo(id); // 2 / 3: refund
    expect(g.lastOf('coins')).toEqual([{ type: 'coins', amount: -5, reason: 'refund', habitId: id }]);
    expect(g.state.ledger.sunshine[id] ?? 0).toBe(0);
  });
});
