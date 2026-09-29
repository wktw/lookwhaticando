import { describe, expect, it } from 'vitest';
import { MOCHI_ID } from '@/catalog/collectibles';
import { TEMPLATES } from '@/catalog/templates';
import { addDays } from '@/domain/dates';
import { ledgerKey } from '@/domain/economy';
import * as habits from '@/domain/habits';
import { Game, baseInput } from './game';

const issues = (g: Game, over: Parameters<typeof baseInput>[0]) => habits.validateHabitInput(g.state, baseInput(over)).map((i) => `${i.field}:${i.code}`);

describe('editor pickers', () => {
  it('offer only owned plant species and pots (capsule unlocks join them)', async () => {
    const { ownedPlantSpecies, ownedPots } = await import('@/domain/collection');
    const g = new Game();
    expect(ownedPlantSpecies(g.state.collection)).toEqual(['tulip', 'daisy', 'sunflower', 'succulent', 'monstera']);
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
    expect(issues(g, { pot: 'frog' })).toEqual(['pot:pot-locked']);
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

describe('onboarding (DESIGN §13.10)', () => {
  it('gives Mochi, the starter recipes, up to 3 template habits (substituting capsule plants), and no coins', () => {
    const g = new Game({ onboard: false });
    const ids = g.run((tx) => habits.completeOnboarding(tx, { name: '  Sam  ', templateIds: ['yoga', 'water', 'strength', 'read'], dayStartsAt: 240 }));
    expect(ids).toHaveLength(3);
    expect(g.state.profile).toMatchObject({ name: 'Sam', onboarded: true, buddy: MOCHI_ID });
    expect(g.state.settings.dayStartsAt).toBe(240);
    expect(g.state.pets[MOCHI_ID]).toBeDefined();
    expect(g.state.collection[MOCHI_ID]?.count).toBe(1);
    expect(Object.keys(g.state.pantry).sort()).toEqual(['treat-biscuit', 'treat-strawberry']);
    const yoga = g.state.habits.find((h) => h.name === 'Yoga')!;
    expect(TEMPLATES.find((t) => t.id === 'yoga')!.plant).toBe('lavender');
    expect(yoga.plant).toBe('tulip'); // lavender is still in a capsule
    expect(g.state.habits.find((h) => h.name === 'Strength training')!.plant).toBe('succulent');
    expect(g.state.wallet.coins).toBe(0);
    expect(g.run((tx) => habits.completeOnboarding(tx, { name: 'Again', templateIds: ['water'] }))).toEqual([]);
  });
});

describe('"Ready to grow?" (DESIGN §13.2)', () => {
  it('pays +1★ and applies the bigger rule from tomorrow, only while the offer stands', () => {
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
