import { describe, expect, it, vi } from 'vitest';
import * as habitsDomain from '@/domain/habits';
import * as logging from '@/domain/logging';
import { addDays } from '@/domain/dates';
import { MOCHI_ID } from '@/catalog/collectibles';
import {
  badgesVM,
  calendarMonthVM,
  capsulesVM,
  collectionVM,
  currentBlock,
  habitDetailVM,
  lettersVM,
  meadowVM,
  petVM,
  petsVM,
  progressVM,
  seriesVM,
  todayVM,
  walletVM,
  wishListVM,
  yearQuiltVM,
  type ViewEnv,
} from '@/state/selectors';
import { machineStatusOf } from '@/state/store';
import { Game, UTC, at } from '../domain/game';

// Builds whole meadows (the 120-day demo, months of play): generous time for a busy CI machine.
vi.setConfig({ testTimeout: 30_000 });

const envOf = (g: Game): ViewEnv => ({ today: g.today, now: g.now, local: UTC });
const card = (g: Game, id: string, date?: string) => {
  const vm = todayVM(g.state, envOf(g), date);
  return [...vm.blocks.flatMap((b) => b.cards), ...vm.doneForPeriod, ...vm.thisMonth, ...vm.notToday].find((c) => c.id === id)!;
};

describe('Today: habit card status line (DESIGN §13.11, first match wins)', () => {
  it('count in progress → tiny → flexible pace / done → streak ≥ 3 → consistency → just planted', () => {
    const g = new Game({ start: '2026-03-02' }); // Monday
    const water = g.addHabit({ name: 'Water', target: 8, unit: 'glasses', tiny: { label: '4', count: 4 } });
    const walk = g.addHabit({ name: 'Walk', tiny: { label: 'Shoes on' } });
    const yoga = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 2, every: 1 } });
    const phone = g.addHabit({ name: 'Phone-free', polarity: 'avoid' });
    const read = g.addHabit({ name: 'Read', schedule: { kind: 'days', days: [1, 3, 5] } });
    expect(card(g, walk).subtitle).toEqual({ kind: 'new', text: 'Just planted 🌱' });
    g.checkIn(water);
    g.checkIn(water);
    expect(card(g, water).subtitle).toEqual({ kind: 'count', text: '2/8 glasses' });
    g.tiny(walk);
    expect(card(g, walk).subtitle).toEqual({ kind: 'tiny', text: 'Tiny version ✓' });
    g.checkIn(yoga);
    expect(card(g, yoga).subtitle).toEqual({ kind: 'period', text: '1 of 2 this week · 1 more by Sun' });
    expect(card(g, yoga).pace).toMatchObject({ needed: 1, deadline: '2026-03-08', deadlineLabel: 'Sun', met: false });
    g.goTo('2026-03-03');
    g.checkIn(yoga);
    expect(card(g, yoga).subtitle).toEqual({ kind: 'period-done', text: 'Done for the week ✓' });
    g.goTo('2026-03-04');
    for (const d of ['2026-03-02', '2026-03-03', '2026-03-04']) g.checkIn(phone, d); // backfills in the window
    expect(card(g, phone).subtitle).toEqual({ kind: 'streak', text: 'Kept it up 3 days' });
    for (const d of ['2026-03-06', '2026-03-09']) {
      g.goTo(d);
      g.checkIn(read);
    }
    g.goTo('2026-03-11');
    g.checkIn(read);
    expect(card(g, read).subtitle).toEqual({ kind: 'streak', text: '3 in a row' });
  });

  it('shows "26 of the last 30 days" once there are ≥ 10 expected and no streak ≥ 3', () => {
    const g = new Game({ start: '2026-03-01' });
    const a = g.addHabit();
    for (let d = '2026-03-01'; d <= '2026-03-20'; d = addDays(d, 1)) {
      g.goTo(d);
      if (!d.endsWith('9') && !d.endsWith('8')) g.checkIn(a);
    }
    g.goTo('2026-03-21');
    // Today (Mar 21) is pending, so the rolling window ends yesterday: Mar 1–20.
    expect(card(g, a).subtitle).toEqual({ kind: 'consistency', text: '16 of the last 20 days' });
  });
});

describe('Today: layout', () => {
  it('current block first, then later blocks, Anytime, then earlier blocks (folded when complete)', () => {
    // Default 3:00 day start: 2 am still belongs to the previous app day's evening, 4 am is the new morning.
    expect([2, 4, 5, 10, 11, 16, 17, 23].map((h) => currentBlock(h, 180))).toEqual(['evening', 'morning', 'morning', 'morning', 'midday', 'midday', 'evening', 'evening']);
    expect([currentBlock(2, 120), currentBlock(1, 120, 59), currentBlock(0, 0)]).toEqual(['morning', 'evening', 'morning']);
    const g = new Game({ start: '2026-03-02', hour: 18 });
    const m = g.addHabit({ name: 'Vitamins', timeOfDay: 'morning' });
    g.addHabit({ name: 'Walk', timeOfDay: 'midday' });
    g.addHabit({ name: 'Read', timeOfDay: 'evening' });
    g.addHabit({ name: 'Water', timeOfDay: 'anytime' });
    g.checkIn(m);
    const vm = todayVM(g.state, envOf(g));
    expect(vm.blocks.map((b) => [b.id, b.current, b.collapsed, b.summary])).toEqual([
      ['evening', true, false, 'Evening 0/1'],
      ['anytime', false, false, 'Anytime 0/1'],
      ['morning', false, true, 'Morning 1/1'],
      ['midday', false, false, 'Midday 0/1'],
    ]);
    expect(vm.progress).toMatchObject({ done: 1, total: 4, label: '1 of 4' });
    expect(vm.greeting.text).toBe('Good evening, Sam 🌙');
  });

  it('sorts habits into met-this-period, this month, not today and paused', () => {
    const g = new Game({ start: '2026-03-03' }); // Tuesday
    const weekly = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 1, every: 1 } });
    const monthly = g.addHabit({ name: 'Budget', schedule: { kind: 'monthly', times: 1, every: 1 } });
    const days = g.addHabit({ name: 'Read', schedule: { kind: 'days', days: [1, 3, 5] } });
    const paused = g.addHabit({ name: 'Swim' });
    g.run((tx) => habitsDomain.pauseHabit(tx, paused, '2026-03-03', '2026-03-10'));
    g.checkIn(weekly);
    const vm = todayVM(g.state, envOf(g));
    expect(vm.doneForPeriod.map((c) => c.id)).toEqual([weekly]);
    expect(vm.thisMonth.map((c) => c.id)).toEqual([monthly]);
    expect(vm.notToday.map((c) => c.id)).toEqual([days]);
    expect(vm.paused).toMatchObject({ count: 1, text: 'Resting: 1 habit · back Mar 11' });
    expect(vm.sill.map((p) => p.habitId)).toEqual([weekly, monthly, days]);
  });

  it('week strip, backdating banner, off day, first capsule card, coins today', () => {
    const g = new Game({ start: '2026-03-08' }); // Sunday
    const a = g.addHabit();
    g.checkIn(a);
    g.run((tx) => logging.toggleOffDay(tx, '2026-03-08'));
    const vm = todayVM(g.state, envOf(g));
    expect(vm.weekStrip.map((d) => `${d.letter}${d.day}`)).toEqual(['M2', 'T3', 'W4', 'T5', 'F6', 'S7', 'S8']);
    expect(vm.weekStrip.at(-1)).toMatchObject({ isToday: true, selected: true, offDay: true, done: 1, due: 1, fraction: 1 });
    expect(vm.weekStrip[0]!.weekStart).toBe(false); // the strip's first bubble needs no gap
    expect(vm.offDay).toEqual({ isOff: true, remaining: 3, perMonth: 4, canToggle: true });
    expect(vm.firstCapsule).toBe(true);
    expect(vm.coinsToday).toBe(5);
    const past = todayVM(g.state, envOf(g), '2026-03-06');
    expect(past.backdating).toEqual({ label: 'Logging for Fri, Mar 6', rewards: true });
    expect(todayVM(g.state, envOf(g), '2026-02-20').backdating).toEqual({ label: 'Logging for Fri, Feb 20', rewards: false });
  });
});

describe('Today: a selected past day shows its own period', () => {
  it('a day of last week reads that week’s goal, counting every check-in in it', () => {
    const g = new Game({ start: '2026-02-23' });
    const y = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 2, every: 1 } });
    g.goTo('2026-03-03'); // Tuesday
    g.checkIn(y, '2026-02-27'); // last Friday
    g.checkIn(y, '2026-03-01'); // last Sunday: goal met for the week of Feb 23
    const c = card(g, y, '2026-02-27');
    expect(c.pace).toMatchObject({ met: true, periodLabel: 'that week', progressText: '2 of 2 that week', paceText: null, deadline: '2026-03-01' });
    expect(c.subtitle.text).toBe('Done for the week ✓');
    expect(card(g, y).pace).toMatchObject({ met: false, periodLabel: 'this week', paceText: '2 more by Sun' });
  });
});

describe('Habit detail', () => {
  it('growth line, streaks, ladder, moments and history', () => {
    const g = new Game({ start: '2026-03-01' });
    const a = g.addHabit({ name: 'Read' });
    for (let d = '2026-03-01'; d <= '2026-03-07'; d = addDays(d, 1)) {
      g.goTo(d);
      g.checkIn(a);
      if (d.endsWith('3') || d.endsWith('6')) g.run((tx) => logging.setNote(tx, a, d, `Note ${d}`));
    }
    g.run((tx) => habitsDomain.updateHabit(tx, a, { schedule: { kind: 'days', days: [1, 3, 5] } }));
    const vm = habitDetailVM(g.state, envOf(g), a)!;
    // 7 sunshine (Seedling); Leafy needs 10, and each Mon/Wed/Fri check-in (from tomorrow) brings 7/3.
    expect(vm.plant.nextLine).toBe('2 more check-ins to Leafy');
    // Today (Sat) was already checked in and rewarded, so the edit applies from tomorrow: today's
    // check-in keeps the rule it was rewarded under (stage-3 decision, habits.updateHabit).
    expect(vm.stats.current).toMatchObject({ length: 7, label: '7 days' });
    expect(vm.stats.best).toMatchObject({ length: 7 });
    expect(vm.upcoming).toMatchObject({ from: '2026-03-08', label: 'From Mar 8: Mon/Wed/Fri' });
    expect(vm.ladder.rungs.filter((r) => r.reached).map((r) => [r.tier, r.paid])).toEqual([
      [3, true],
      [7, true],
    ]);
    expect(vm.ladder.next).toMatchObject({ tier: 14, coins: 30 });
    expect(vm.moments.map((m) => m.date)).toEqual(['2026-03-06', '2026-03-03']);
    expect(vm.history.map((h) => h.label)).toEqual(['Since Mar 1: Every day', 'From Mar 8: Mon/Wed/Fri']);
    expect(vm.scheduleLabel).toBe('Every day');
    expect(vm.createdOn).toBe('2026-03-01');
  });
});

describe('Progress', () => {
  it('month hero, week chip, showed-up line, garden and Mochi’s sprout', () => {
    const g = new Game({ start: '2026-03-01' });
    const a = g.addHabit();
    for (let d = '2026-03-01'; d <= '2026-03-12'; d = addDays(d, 1)) {
      g.goTo(d);
      g.checkIn(a);
    }
    const vm = progressVM(g.state, envOf(g));
    expect(vm.hero).toMatchObject({ month: '2026-03', label: 'March', tally: { achieved: 12, expected: 12, percent: 100, ready: true } });
    expect(vm.showedUp.text).toBe('You showed up 12 of the last 12 days');
    expect(vm.recentMonths.map((m) => m.label)).toEqual(['Mar']);
    expect(vm.garden.map((p) => [p.habitName, p.plant.name])).toEqual([['Walk', 'Leafy']]);
    expect(vm.sprout).toMatchObject({ stage: 1, name: 'Sprout', color: 'sage' });
    expect(vm.trend.kind).toBe('none');
  });

  it('a lower month shows its best fact, never the higher number', () => {
    const g = new Game({ start: '2026-02-01' });
    const a = g.addHabit({ name: 'Walk' });
    for (let d = '2026-02-01'; d <= '2026-03-12'; d = addDays(d, 1)) {
      g.goTo(d);
      if (d < '2026-03-01' || d.endsWith('2') || d.endsWith('5') || d.endsWith('8')) g.checkIn(a);
    }
    const vm = progressVM(g.state, envOf(g));
    expect(vm.trend.kind).toBe('fact');
    expect(vm.trend.text).toBe('4 check-ins so far in March. Walk is your steadiest 🌿');
    expect(vm.trend.text).not.toMatch(/100|down|↓/);
  });
});

describe('Calendar & quilt', () => {
  it('day-state glyphs and edit modes', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ name: 'Read', schedule: { kind: 'days', days: [1, 3, 5] } });
    g.goTo('2026-03-20');
    g.checkIn(a, '2026-03-16');
    g.rest(a, '2026-03-18');
    g.run((tx) => logging.editHistory(tx, a, '2026-03-02', true));
    const vm = calendarMonthVM(g.state, envOf(g), a, '2026-03');
    const cell = (d: string) => vm.weeks.flat().find((c) => c?.date === d)!;
    expect([cell('2026-03-01').state, cell('2026-03-02').state, cell('2026-03-03').state, cell('2026-03-04').state].join()).toBe('before-start,done,unscheduled,none');
    expect(cell('2026-03-16')).toMatchObject({ state: 'done', edit: 'window' });
    expect(cell('2026-03-18')).toMatchObject({ state: 'rest' });
    expect(cell('2026-03-02').edit).toBe('history');
    expect(cell('2026-03-01').edit).toBe('start-earlier');
    expect(cell('2026-03-21')).toMatchObject({ state: 'future', edit: null });
    expect(vm.weekdays).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(vm.next).toBeNull();
    expect(vm.prev).toBe('2026-02');
    const agg = calendarMonthVM(g.state, envOf(g), null, '2026-03');
    expect(agg.weeks.flat().find((c) => c?.date === '2026-03-16')).toMatchObject({ state: 'done', fraction: 1 });
  });

  it('the year quilt draws nothing before tracking or in the future', () => {
    const g = new Game({ start: '2026-03-02' });
    g.checkIn(g.addHabit());
    const q = yearQuiltVM(g.state, envOf(g), 2026);
    expect(q.weeks.length).toBeGreaterThanOrEqual(53);
    const patches = q.weeks.flat().filter((p) => p !== null);
    expect(patches.map((p) => p!.date)).toEqual(['2026-03-02']);
    expect(patches[0]).toMatchObject({ level: 4, state: 'done' });
    expect(q.months[0]).toEqual({ month: '2026-01', label: 'Jan', column: 0 });
    expect(q.summary.text).toBe('1 check-in in 2026, across 1 day');
  });
});

describe('Capsules, wallet, Well, collection', () => {
  it('wallet lines speak in capsules and stars', () => {
    const g = new Game();
    g.setWallet({ coins: 75, stars: 5, stardust: 7, tickets: 1 });
    expect(walletVM(g.state).lines.map((l) => l.text)).toEqual([
      '75 coins → 3 capsules',
      '5 stars → 1 Dreamy Night pull, or wish for any Classic',
      '1 ticket → a free pull on any machine',
      '7/10 stardust → your next star',
    ]);
    expect(walletVM(g.state).dust.text).toBe('7/10 to your next star');
  });

  it('machine cards, the series lineup (chances sum to 1, hidden Secret) and the Well', () => {
    const g = new Game({ start: '2026-09-29' });
    const env = envOf(g);
    const vm = capsulesVM(g.state, env, (id) => machineStatusOf(g.state, env.today, id));
    expect(vm.machines.map((m) => m.id)).toEqual(['kitty', 'moo', 'puppy', 'sakura', 'sweets', 'dreamy', 'pumpkin']);
    expect(vm.machines.find((m) => m.id === 'pumpkin')!.seasonal).toEqual({ emoji: '🎃', label: 'Until Nov 10' });
    expect(vm.machines[0]!.pityHint).toBe('Rare+ within 10 pulls ✨');
    expect(vm.away.map((a) => a.label)).toEqual(['Back Nov 11', 'Back Jan 15', 'Back Mar 1', 'Back Jun 1']);
    const series = seriesVM(g.state, env, 'kitty');
    const all = [...series.tiers.flatMap((t) => t.items), ...series.moonlit];
    expect(all.reduce((a, i) => a + i.chance, 0)).toBeCloseTo(1, 10);
    expect(all.find((i) => i.secret)).toMatchObject({ id: 'pet-cat-lucky', hidden: true, rarityLabel: 'Secret' });
    expect(series.tiers.map((t) => [t.label, t.eachPct])).toEqual([
      ['Classic', 7.5],
      ['Special', 5],
      ['Rare', 2],
      ['Super rare', 1.7],
    ]);
    expect(seriesVM(g.state, env, 'snow').coverOnly).toBe(true);
    const well = wishListVM(g.state, env);
    const snow = well.groups.find((x) => x.machineId === 'snow')!;
    expect(snow.items[0]).toMatchObject({ status: 'season-not-visited', note: 'Arrives Nov 11 · wishable after its first visit' });
    expect(well.groups.find((x) => x.machineId === 'kitty')!.items[0]).toMatchObject({ status: 'not-enough-stars', price: 2 });
  });

  it('collection book by category and species albums', () => {
    const g = new Game();
    const vm = collectionVM(g.state);
    expect(vm.categories.map((c) => c.category)).toEqual(['pet', 'wearable', 'treat', 'decor', 'plant', 'pot']);
    expect(vm.categories.find((c) => c.category === 'plant')!.owned).toBe(5);
    expect(vm.albums.map((a) => a.name)).toEqual(['Cat Café', 'The Whole Herd', 'Puppy Pack', 'Bunny Burrow', 'Pond Club', 'Teddy Den', 'Hamster Hideout']);
    expect(vm.albums[0]!.pets.every((p) => p.owned === 0)).toBe(true);
    expect(vm.moonlit.items).toEqual([]);
  });
});

describe('Pets, meadow, letters, badges', () => {
  it('pets list, pet sheet, meadow', () => {
    const g = new Game();
    const list = petsVM(g.state);
    expect(list).toMatchObject({ out: 1, capacity: 8 });
    expect(list.pets[0]).toMatchObject({ id: MOCHI_ID, mochi: true, buddy: true, level: 1, hearts: 1 });
    const mochi = petVM(g.state, envOf(g), MOCHI_ID)!;
    expect(mochi).toMatchObject({ nameLocked: true, personalityLabel: 'Sunny', favoriteTreat: { known: true, name: 'Strawberry Milk' }, today: { petsLeft: 5, treatsLeft: 3, favoriteBonusLeft: true } });
    expect(mochi.perks.filter((p) => p.unlocked)).toEqual([]);
    expect(mochi.wardrobe.head).toEqual([]);
    expect(mochi.treats.map((t) => t.name)).toEqual(['Strawberry', 'Paw Biscuit']);
    const meadow = meadowVM(g.state);
    expect(meadow.zones.map((z) => [z.id, z.owned, z.price])).toEqual([
      ['meadow', true, 0],
      ['pond', false, 400],
      ['orchard', false, 700],
      ['porch', false, 1000],
      ['greenhouse', false, 1500],
      ['starhill', false, 2500],
    ]);
  });

  it('letters and badge progress', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    for (let d = 0; d < 8; d++) {
      g.checkIn(a);
      g.advance(1);
    }
    const letters = lettersVM(g.state);
    expect(letters).toMatchObject({ unread: 1, next: 'weekly-2026-03-02' });
    expect(letters.letters[0]).toMatchObject({ title: 'Week of Mar 2', stars: 3, read: false });
    const badges = badgesVM(g.state);
    expect(badges.badges.find((b) => b.id === 'checkins-10')).toMatchObject({ earned: false, progress: { have: 8, need: 10 } });
    expect(badges.badges.find((b) => b.id === 'first-checkin')).toMatchObject({ earned: true, progress: null });
  });
});

describe('memoised Progress records agree with the domain’s records()', () => {
  it('on the demo meadow: totals, best streak, best month and closed-month tallies', async () => {
    const { buildDemo } = await import('@/state/demo');
    const { records } = await import('@/domain/insights');
    const { aggregateTally, monthWindow, trackingOf } = await import('@/domain/consistency');
    const { progressRecords } = await import('@/state/selectors');
    const s = buildDemo({ today: '2026-09-29', now: at('2026-09-29', 21), local: UTC });
    const mine = progressRecords(s, '2026-09-29');
    const ref = records(trackingOf(s), '2026-09-29');
    expect([mine.totalCheckins, mine.tinyCheckins]).toEqual([ref.totalCheckins, ref.tinyCheckins]);
    expect({ habitId: mine.best!.habit.id, run: mine.best!.run }).toEqual(ref.bestStreak);
    expect(mine.bestMonth).toEqual(ref.bestMonth && { month: ref.bestMonth.month, tally: ref.bestMonth.tally });
    for (const [m, t] of mine.closedMonths) expect(t).toEqual(aggregateTally(trackingOf(s), monthWindow(m), '2026-09-29').total);
  });
});

describe('selectors are cheap: repeated views reuse memoised history walks', () => {
  it('a second todayVM on the same state is much faster than the first', () => {
    const g = new Game({ start: '2026-01-01' });
    const ids = Array.from({ length: 6 }, (_, i) => g.addHabit({ name: `H${i}` }));
    g.freeze = false;
    g.goTo('2026-06-30');
    // Six months of history: calendar edits for older days, the week strip for the 6-day window.
    for (let d = '2026-01-01'; d <= '2026-06-30'; d = addDays(d, 1)) {
      for (const id of ids) {
        if (d < '2026-06-24') expect(g.run((tx) => logging.editHistory(tx, id, d, true))).toBe(true);
        else g.checkIn(id, d);
      }
    }
    expect(Object.keys(g.state.logs[ids[0]!]!)).toHaveLength(181);
    const t0 = performance.now();
    todayVM(g.state, envOf(g));
    const first = performance.now() - t0;
    const t1 = performance.now();
    todayVM(g.state, envOf(g));
    const second = performance.now() - t1;
    expect(second).toBeLessThan(Math.max(first / 2, 25)); // slack for a busy machine
  });
});
