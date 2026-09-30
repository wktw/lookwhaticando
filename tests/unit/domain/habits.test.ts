import { describe, expect, it } from 'vitest';
import { STARTER_IDS } from '@/catalog/collectibles';
import { TEMPLATES } from '@/catalog/templates';
import { addDays } from '@/domain/dates';
import { cuttingOf, ledgerKey } from '@/domain/economy';
import { lifetimeSunshine } from '@/domain/growth';
import * as habits from '@/domain/habits';
import { mulberry32, randomInt } from '@/domain/rng';
import { rewardsPaused } from '@/domain/wallet';
import { Game, at, baseInput } from './game';

const issues = (g: Game, over: Parameters<typeof baseInput>[0]) => habits.validateHabitInput(g.state, baseInput(over)).map((i) => `${i.field}:${i.code}`);

describe('editor pickers', () => {
  it('offer only owned plant species and pots (capsule unlocks join them)', async () => {
    const { ownedPlantSpecies, ownedPots } = await import('@/domain/collection');
    const g = new Game();
    expect(ownedPlantSpecies(g.state.collection)).toEqual(['pothos', 'pilea', 'begonia', 'snakeplant', 'catgrass']);
    expect(ownedPots(g.state.collection)).toEqual(['terracotta', 'cream', 'blush']);
    g.state = { ...g.state, collection: { ...g.state.collection, 'plant-lavender': { count: 1, firstAt: 0 } } };
    expect(ownedPlantSpecies(g.state.collection)).toContain('lavender');
    expect(issues(g, { plant: 'lavender' })).toEqual([]);
  });
});

describe('creating habits', () => {
  it('validates the input', () => {
    const g = new Game();
    expect(issues(g, {})).toEqual([]);
    expect(issues(g, { name: '   ' })).toEqual(['name:name']);
    expect(issues(g, { icon: 'nope' })).toEqual(['icon:icon']);
    expect(issues(g, { plant: 'lavender' })).toEqual(['plant:plant-locked']);
    expect(issues(g, { pot: 'teacup' })).toEqual(['pot:pot-locked']);
    expect(issues(g, { schedule: { kind: 'days', days: [] } })).toEqual(['schedule:days-empty']);
    expect(issues(g, { schedule: { kind: 'weekly', times: 9, every: 1 } })).toEqual(['schedule:times-range']);
    expect(issues(g, { target: 0 })).toEqual(['target:target-range']);
    expect(issues(g, { target: 8, tiny: { label: 'half', count: 8 } })).toEqual(['tiny:tiny-count-range']);
  });

  it('allows at most 3 active big habits', () => {
    const g = new Game();
    for (let i = 0; i < 3; i++) g.addHabit({ name: `Big ${i}`, effort: 'big' });
    expect(issues(g, { effort: 'big' })).toEqual(['effort:too-many-big']);
    expect(() => g.addHabit({ effort: 'big' })).toThrow(habits.HabitInputError);
    const [first] = g.state.habits;
    g.run((tx) => habits.archiveHabit(tx, first!.id));
    expect(issues(g, { effort: 'big' })).toEqual([]);
  });

  it('starts today, with createdAt = now and one rule', () => {
    const g = new Game({ start: '2026-03-02' });
    const id = g.addHabit({ tiny: { label: '  Shoes on  ' } });
    const h = g.state.habits.find((x) => x.id === id)!;
    expect(id).toMatch(/^h-[0-9a-z]{8}$/);
    expect(h).toMatchObject({ startedOn: '2026-03-02', createdAt: g.now, order: 0, pauses: [] });
    expect(h.rules).toEqual([{ from: '2026-03-02', schedule: { kind: 'daily' }, target: 1, step: 1, tiny: { label: 'Shoes on' } }]);
    const b = g.addHabit({ name: 'B' });
    expect(g.state.habits.find((x) => x.id === b)!.order).toBe(1);
  });
});

describe('editing habits', () => {
  it('cosmetic fields apply at once without a new rule; rule fields add a versioned rule', () => {
    const g = new Game({ start: '2026-03-02' });
    const id = g.addHabit({ unit: 'laps', anchor: 'After lunch' });
    g.goTo('2026-03-10');
    g.run((tx) => habits.updateHabit(tx, id, { name: 'Long walk', effort: 'big', unit: undefined }));
    let h = g.state.habits[0]!;
    expect(h).toMatchObject({ name: 'Long walk', effort: 'big', anchor: 'After lunch' });
    expect(h.unit).toBeUndefined();
    expect(h.rules).toHaveLength(1);
    g.run((tx) => habits.updateHabit(tx, id, { schedule: { kind: 'days', days: [1, 3, 5] } }));
    h = g.state.habits[0]!;
    expect(h.rules.map((r) => [r.from, r.schedule.kind])).toEqual([
      ['2026-03-02', 'daily'],
      ['2026-03-10', 'days'],
    ]);
  });

  it('flexible edits can wait for the next period', () => {
    const g = new Game({ start: '2026-03-02' });
    const id = g.addHabit({ schedule: { kind: 'weekly', times: 2, every: 1 } });
    g.goTo('2026-03-11'); // Wednesday
    g.run((tx) => habits.updateHabit(tx, id, { schedule: { kind: 'weekly', times: 3, every: 1 } }, 'next-period'));
    expect(g.state.habits[0]!.rules.map((r) => r.from)).toEqual(['2026-03-02', '2026-03-16']);
  });

  it('removing the tiny version', () => {
    const g = new Game();
    const id = g.addHabit({ tiny: { label: 'One page' } });
    g.run((tx) => habits.updateHabit(tx, id, { tiny: undefined }));
    expect(g.state.habits[0]!.rules.at(-1)!.tiny).toBeUndefined();
  });

  it('invalid edits throw and change nothing', () => {
    const g = new Game();
    const id = g.addHabit();
    const before = g.state;
    expect(() => g.run((tx) => habits.updateHabit(tx, id, { target: -1 }))).toThrow(habits.HabitInputError);
    expect(g.state).toBe(before);
  });
});

describe('archive, restore, delete, reorder', () => {
  it('restoring adds a pause over the archived stretch', () => {
    const g = new Game({ start: '2026-03-02' });
    const id = g.addHabit();
    g.goTo('2026-03-05');
    g.run((tx) => habits.archiveHabit(tx, id));
    expect(g.state.habits[0]!.archivedOn).toBe('2026-03-05');
    g.goTo('2026-03-12');
    g.run((tx) => habits.restoreHabit(tx, id));
    expect(g.state.habits[0]!.archivedOn).toBeUndefined();
    expect(g.state.habits[0]!.pauses).toEqual([{ start: '2026-03-06', end: '2026-03-11' }]);
  });

  it('delete removes the habit, its logs and its ledger traces (refunding what it can)', () => {
    const g = new Game();
    g.setWallet({ coins: 40 });
    const id = g.addHabit();
    g.checkIn(id);
    expect(g.coins).toBe(45);
    g.run((tx) => habits.deleteHabit(tx, id));
    expect(g.coins).toBe(40);
    expect(g.state.habits).toEqual([]);
    expect(g.state.logs[id]).toBeUndefined();
    expect(g.state.ledger.recent[ledgerKey(id, g.today)]).toBeUndefined();
    expect(g.state.ledger.sunshine[id]).toBeUndefined();
    expect(g.state.ledger.bestStage[id]).toBeUndefined();
    expect(Object.keys(g.state.ledger.once).filter((k) => k.includes(id))).toEqual([]);
  });

  it('reorder puts the listed ids first', () => {
    const g = new Game();
    const [a, b, c] = [g.addHabit({ name: 'A' }), g.addHabit({ name: 'B' }), g.addHabit({ name: 'C' })];
    g.run((tx) => habits.reorderHabits(tx, [c, a]));
    const order = [...g.state.habits].sort((x, y) => x.order - y.order).map((h) => h.id);
    expect(order).toEqual([c, a, b]);
  });
});

/*
 * HM2 / R213 (WP-B1): deleting a habit reverses only the grants ordinary undo could still reverse
 * (the refund window today−6 … today, with the clock trusted). The ledger keeps one day more
 * (LEDGER_DAYS = 7); an entry on that extra day is dropped without taking anything back.
 */
describe('delete reverses only refundable grants (HM2, WP-B1)', () => {
  const DAY0 = '2026-09-07';

  /**
   * Walk is checked in once on DAY0 (5 coins, 1 sunshine). Read is checked in on DAY0…DAY0+3, so
   * lifetime sunshine is exactly 5, The Cutting's first threshold: reversing Walk's 1 sunshine
   * drops it below. Then the clock moves to DAY0+age and the wallet is set to `balance`.
   */
  function walkAged(age: number, balance: number) {
    const g = new Game({ start: DAY0 });
    const walk = g.addHabit({ name: 'Walk' });
    const read = g.addHabit({ name: 'Read' });
    g.checkIn(walk);
    for (let d = 0; d < 4; d++) {
      g.goTo(addDays(DAY0, d));
      g.checkIn(read);
    }
    g.goTo(addDays(DAY0, age));
    g.setWallet({ coins: balance });
    return { g, walk };
  }
  const facts = (g: Game) => ({
    coins: g.coins,
    lifetime: g.state.lifetime,
    sunshine: lifetimeSunshine(g.state.ledger.sunshine),
    cutting: cuttingOf(g.state),
  });

  it('the setup: Walk earned 5 coins and 1 sunshine on DAY0, and lifetime sunshine sits on the 5 threshold', () => {
    const { g, walk } = walkAged(3, 100);
    expect(g.state.ledger.recent[ledgerKey(walk, DAY0)]).toMatchObject({ coins: 5, sunshine: 1, lvl: 'full' });
    expect(facts(g)).toMatchObject({ sunshine: 5, cutting: { stage: 1, toNext: 15 } });
  });

  it('age 6, enough coins: the grant is reversed (coins, sunshine, check-in count; The Cutting falls back below 5)', () => {
    const { g, walk } = walkAged(6, 100);
    const before = facts(g);
    g.run((tx) => habits.deleteHabit(tx, walk));
    const after = facts(g);
    expect(after.coins).toBe(95);
    expect(after.lifetime.coinsEarned).toBe(before.lifetime.coinsEarned - 5);
    expect(after.lifetime.checkins).toBe(before.lifetime.checkins - 1);
    expect(after.sunshine).toBe(4);
    expect(g.state.ledger.sunshine[walk]).toBeUndefined();
    expect(after.cutting).toMatchObject({ stage: 1, toNext: 16 }); // the stage is a high-water mark; the gauge is not
    expect(g.lastOf('coins')).toEqual([{ type: 'coins', amount: -5, reason: 'refund', habitId: walk }]);
  });

  it('age 6, too few coins: no coins come back (all or nothing), the sunshine and check-in count still do', () => {
    const { g, walk } = walkAged(6, 3);
    const before = facts(g);
    g.run((tx) => habits.deleteHabit(tx, walk));
    const after = facts(g);
    expect(after.coins).toBe(3);
    expect(after.lifetime.coinsEarned).toBe(before.lifetime.coinsEarned);
    expect(after.lifetime.checkins).toBe(before.lifetime.checkins - 1);
    expect(after.sunshine).toBe(4);
    expect(after.cutting).toMatchObject({ stage: 1, toNext: 16 });
  });

  for (const age of [7, 8]) {
    for (const balance of [100, 3]) {
      it(`age ${age}, balance ${balance}: nothing is taken back; wallet, lifetime, sunshine and The Cutting are unchanged`, () => {
        const { g, walk } = walkAged(age, balance);
        const before = facts(g);
        g.run((tx) => habits.deleteHabit(tx, walk));
        expect(facts(g)).toEqual(before);
        expect(facts(g)).toMatchObject({ coins: balance, sunshine: 5, cutting: { stage: 1, toNext: 15 } });
        expect(g.state.ledger.sunshine[walk]).toBe(1); // a deleted habit's lifetime sunshine stays (§13)
        expect(g.lastOf('coins')).toEqual([]);
        // The habit and any retained ledger entry are gone all the same.
        expect(g.state.habits.map((h) => h.id)).not.toContain(walk);
        expect(g.state.ledger.recent[ledgerKey(walk, DAY0)]).toBeUndefined();
      });
    }
  }

  it('ages 7 and 8 end the same way (the outcome no longer depends on whether compaction has run)', () => {
    const end = (age: number) => {
      const { g, walk } = walkAged(age, 100);
      g.run((tx) => habits.deleteHabit(tx, walk));
      return { ...facts(g), walkSunshine: g.state.ledger.sunshine[walk] };
    };
    expect(end(7)).toEqual(end(8));
  });

  it('keep the plant (archive) stays distinct: at age 6 nothing is reversed and the habit stays', () => {
    const { g, walk } = walkAged(6, 100);
    const before = facts(g);
    g.run((tx) => habits.deleteHabit(tx, walk, { keepPlant: true }));
    expect(facts(g)).toEqual(before);
    expect(g.state.habits.find((h) => h.id === walk)?.archivedOn).toBe(addDays(DAY0, 6));
    expect(g.state.ledger.recent[ledgerKey(walk, DAY0)]).toBeDefined();
  });

  describe('the clock guard (rewards paused)', () => {
    /** Walk checked in on DAY0; the clock reached DAY0+3, then went 48 h back (the app day stays DAY0+3). */
    function behind() {
      const g = new Game({ start: DAY0 });
      const walk = g.addHabit({ name: 'Walk' });
      g.checkIn(walk);
      g.goTo(addDays(DAY0, 3));
      g.now = at(addDays(DAY0, 1));
      g.setWallet({ coins: 100 });
      return { g, walk };
    }

    it('undo reverses nothing while the clock is behind (the predicate delete must share)', () => {
      const { g, walk } = behind();
      expect(rewardsPaused(g.state, g.now)).toBe(true);
      expect(g.today).toBe(addDays(DAY0, 3));
      expect(g.undo(walk, DAY0)).toEqual({ refunded: 0 });
      expect(g.coins).toBe(100);
    });

    it('delete reverses nothing while the clock is behind', () => {
      const { g, walk } = behind();
      const before = facts(g);
      g.run((tx) => habits.deleteHabit(tx, walk));
      expect(facts(g)).toEqual(before);
      expect(g.state.ledger.sunshine[walk]).toBe(1);
      expect(g.lastOf('coins')).toEqual([]);
    });

    it('once the clock catches up, the same delete reverses the grant', () => {
      const { g, walk } = behind();
      g.now = at(addDays(DAY0, 3));
      expect(rewardsPaused(g.state, g.now)).toBe(false);
      g.run((tx) => habits.deleteHabit(tx, walk));
      expect(g.coins).toBe(95);
      expect(g.state.ledger.sunshine[walk]).toBeUndefined();
    });
  });

  it('property: over random ages 0–10 and balances 0–20, delete reverses the grant iff its day is in the refund window', () => {
    const rng = mulberry32(213);
    for (let i = 0; i < 60; i++) {
      const age = randomInt(rng, 0, 10);
      const balance = randomInt(rng, 0, 20);
      const g = new Game({ start: DAY0 });
      const walk = g.addHabit({ name: 'Walk' });
      g.checkIn(walk);
      g.goTo(addDays(DAY0, age));
      g.setWallet({ coins: balance });
      const before = facts(g);
      g.run((tx) => habits.deleteHabit(tx, walk));
      const after = facts(g);
      const refundable = age <= 6;
      const why = `age ${age}, balance ${balance}`;
      expect(after.coins, why).toBe(refundable && balance >= 5 ? balance - 5 : balance);
      expect(after.lifetime.checkins, why).toBe(before.lifetime.checkins - (refundable ? 1 : 0));
      expect(after.sunshine, why).toBe(before.sunshine - (refundable ? 1 : 0));
      expect(g.state.ledger.sunshine[walk], why).toBe(refundable ? undefined : 1);
    }
  });
});

describe('pauses and start dates', () => {
  it('pauses start today or later; resume ends the pause yesterday', () => {
    const g = new Game({ start: '2026-03-02' });
    const id = g.addHabit();
    g.goTo('2026-03-10');
    expect(g.run((tx) => habits.pauseHabit(tx, id, '2026-03-01', '2026-03-20'))).toBe(true);
    expect(g.state.habits[0]!.pauses).toEqual([{ start: '2026-03-10', end: '2026-03-20' }]);
    expect(g.run((tx) => habits.pauseHabit(tx, id, '2026-03-25', '2026-03-22'))).toBe(false);
    g.goTo('2026-03-14');
    g.run((tx) => habits.resumeHabit(tx, id));
    expect(g.state.habits[0]!.pauses).toEqual([{ start: '2026-03-10', end: '2026-03-13' }]);
  });

  it('setStartedOn only moves the start earlier (and never into the future)', () => {
    const g = new Game({ start: '2026-03-10' });
    const id = g.addHabit();
    expect(g.run((tx) => habits.setStartedOn(tx, id, '2026-03-12'))).toBe(false);
    expect(g.run((tx) => habits.setStartedOn(tx, id, '2026-03-11'))).toBe(false);
    expect(g.run((tx) => habits.setStartedOn(tx, id, '2026-03-01'))).toBe(true);
    expect(g.state.habits[0]).toMatchObject({ startedOn: '2026-03-01', rules: [{ from: '2026-03-01' }] });
  });
});

describe('onboarding (DESIGN §9.6)', () => {
  it('sets the name, day start and birthday, the starter recipes and up to 3 template habits; no pet, no coins', () => {
    const g = new Game({ onboard: false });
    const ids = g.run((tx) => habits.completeOnboarding(tx, { name: '  Sam  ', templateIds: ['yoga', 'water', 'strength', 'read'], dayStartsAt: 240, birthday: '09-30' }));
    expect(ids).toHaveLength(3);
    expect(g.state.profile).toMatchObject({ name: 'Sam', onboarded: true, birthday: '09-30' });
    expect('buddy' in g.state.profile).toBe(false);
    expect(g.state.settings.dayStartsAt).toBe(240);
    expect(g.state.pets).toEqual({}); // the first pet comes from the "Who comes home first?" capsule
    expect(Object.keys(g.state.pantry).sort()).toEqual(['treat-oat-biscuit', 'treat-strawberry']);
    expect(g.state.habits.map((h) => [h.name, h.plant, h.pot])).toEqual([
      ['Yoga', 'pilea', 'terracotta'],
      ['Drink water', 'pothos', 'terracotta'],
      ['Strength training', 'snakeplant', 'terracotta'],
    ]);
    expect(g.state.wallet.coins).toBe(0);
    expect(g.run((tx) => habits.completeOnboarding(tx, { name: 'Again', templateIds: ['water'] }))).toEqual([]);
  });

  it('every template grows a free starter plant in a free pot, so the preview is what gets planted', () => {
    const starters = new Set(STARTER_IDS);
    for (const t of TEMPLATES) {
      const input = habits.habitInputFromTemplate(t);
      expect(starters.has(`plant-${input.plant}`), t.id).toBe(true);
      expect(starters.has(`pot-${input.pot}`), t.id).toBe(true);
      expect(input.plant).toBe(t.plant);
    }
    const g = new Game();
    for (const t of TEMPLATES) expect(habits.validateHabitInput(g.state, habits.habitInputFromTemplate(t)), t.id).toEqual([]);
  });
});

describe('"Ready to grow?" (DESIGN §5.2)', () => {
  it('pays +1 stamp and applies the bigger rule from tomorrow, only while the offer stands', () => {
    const g = new Game({ start: '2026-03-01' });
    const id = g.addHabit({ name: 'Read', target: 1 });
    expect(g.run((tx) => habits.acceptGrowOffer(tx, id, { target: 2 }))).toBe(false);
    for (let d = '2026-03-01'; d <= '2026-03-30'; d = addDays(d, 1)) {
      g.goTo(d);
      g.checkIn(id);
    }
    const stars = g.state.wallet.stars;
    expect(g.run((tx) => habits.acceptGrowOffer(tx, id, { target: 2 }))).toBe(true);
    expect(g.state.wallet.stars).toBe(stars + 1);
    expect(g.state.habits[0]!.rules.at(-1)).toMatchObject({ from: '2026-03-31', target: 2 });
    expect(g.run((tx) => habits.acceptGrowOffer(tx, id, { target: 3 }))).toBe(false); // accepted: the change is pending
    g.goTo('2026-04-02');
    expect(g.run((tx) => habits.acceptGrowOffer(tx, id, { target: 3 }))).toBe(false); // the new rule needs 28 days first
  });
});

describe('"Keep it as it is"', () => {
  it('closes that offer until the habit earns it afresh, 28 days on', () => {
    const g = new Game({ start: '2026-03-01' });
    const id = g.addHabit({ name: 'Read', target: 1 });
    expect(g.run((tx) => habits.declineOffer(tx, id, 'grow'))).toBe(false); // nothing to decline yet
    for (let d = '2026-03-01'; d <= '2026-03-30'; d = addDays(d, 1)) {
      g.goTo(d);
      g.checkIn(id);
    }
    const habit = () => g.state.habits[0]!;
    expect(habits.currentOffer(g.state, habit(), g.state.clock.maxDateKey)).toBe('grow');
    expect(g.run((tx) => habits.declineOffer(tx, id, 'tinier'))).toBe(false); // not the offer standing
    expect(g.run((tx) => habits.declineOffer(tx, id, 'grow'))).toBe(true);
    expect(habits.currentOffer(g.state, habit(), '2026-03-30')).toBeNull();
    for (let d = '2026-03-31'; d <= '2026-04-26'; d = addDays(d, 1)) {
      g.goTo(d);
      g.checkIn(id);
      expect(habits.currentOffer(g.state, habit(), d), d).toBeNull();
    }
    g.goTo('2026-04-27');
    g.checkIn(id);
    expect(habits.currentOffer(g.state, habit(), '2026-04-27')).toBe('grow');
  });
});

describe('the editor’s field notes come from the copy deck (HABIT_ISSUES, VOICE.md §22)', () => {
  it('every issue says what to do in words from lines.ts, with its limit filled in', async () => {
    const { HABIT_ISSUES } = await import('@/catalog/lines');
    const g = new Game();
    const inputs: Parameters<typeof baseInput>[0][] = [
      { name: '   ' },
      { icon: 'nope' },
      { color: 'nope' as never },
      { plant: 'lavender' },
      { pot: 'teacup' },
      { effort: 'huge' as never },
      { timeOfDay: 'noon' as never },
      { polarity: 'maybe' as never },
      { dueDay: 40 },
      { anchor: 'x'.repeat(200) },
      { anchorHabitId: 'nope' },
      { endsOn: 'soon' },
      { schedule: { kind: 'days', days: [] } },
      { schedule: { kind: 'weekly', times: 9, every: 1 } },
      { target: 0 },
      { step: 0 },
      { tiny: { label: ' ' } },
    ];
    const seen = new Set<string>();
    for (const over of inputs) {
      for (const issue of habits.validateHabitInput(g.state, baseInput(over))) {
        seen.add(issue.code);
        expect(Object.keys(HABIT_ISSUES), issue.code).toContain(issue.code);
        expect(issue.message).not.toMatch(/\{|!|invalid|must|error/i);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(15);
    expect(habits.habitIssueMessage('name', 60)).toBe('Give it a name, up to 60 characters.');
    expect(habits.habitIssueMessage('too-many-big', 3)).toBe('3 long habits is the most at once. Pick a shorter time, or pause one of the others.');
    expect(habits.habitIssueMessage('target-range', 100_000)).toBe('Pick an amount from 1 to 100,000.');
  });
});
