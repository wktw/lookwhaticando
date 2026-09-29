import { describe, expect, it, vi } from 'vitest';
import * as habitsDomain from '@/domain/habits';
import * as logging from '@/domain/logging';
import { addDays } from '@/domain/dates';
import * as gacha from '@/domain/gacha';
import { CUTTING_THRESHOLDS } from '@/domain/growth';
import {
  badgesVM,
  calendarMonthVM,
  capsulesVM,
  collectionVM,
  currentBlock,
  habitDetailVM,
  memoryShelfVM,
  petVM,
  petsVM,
  progressVM,
  seriesVM,
  shelfVM,
  todayVM,
  walletVM,
  wishListVM,
  yearQuiltVM,
  type ViewEnv,
} from '@/state/selectors';
import { machineStatusOf } from '@/state/store';
import { Game, UTC, at } from '../domain/game';
import { backdatingBanner, blockSummary, bestFactLine, forecastLine, goalsLine, monthBarLabel, restingRow, runText, showedUpLine, statusLine, trendLine, vineChip, weekDayAria, weekLine, yearSummaryLine } from '@/catalog/format';

// Builds whole saves (the 120-day demo, months of play): generous time for a busy CI machine.
vi.setConfig({ testTimeout: 30_000 });

const envOf = (g: Game): ViewEnv => ({ today: g.today, now: g.now, local: UTC });
const card = (g: Game, id: string, date?: string) => {
  const vm = todayVM(g.state, envOf(g), date);
  return [...vm.blocks.flatMap((b) => b.cards), ...vm.doneForPeriod, ...vm.thisMonth, ...vm.notToday].find((c) => c.id === id)!;
};
/** The card's status line as data and in words (VOICE.md §5). */
const line = (g: Game, id: string, date?: string) => {
  const c = card(g, id, date);
  return { kind: c.subtitle.kind, text: statusLine(c.subtitle, 1) };
};

describe('Today: habit card status line (DESIGN §9.1.1, first match wins)', () => {
  it('count in progress → tiny → flexible pace / done → streak ≥ 3 → consistency → rooting / just planted', () => {
    const g = new Game({ start: '2026-03-02' }); // Monday
    const water = g.addHabit({ name: 'Water', target: 8, unit: 'glasses', tiny: { label: '4', count: 4 } });
    const walk = g.addHabit({ name: 'Walk', tiny: { label: 'Shoes on' } });
    const yoga = g.addHabit({ name: 'Yoga', schedule: { kind: 'weekly', times: 2, every: 1 } });
    const phone = g.addHabit({ name: 'Phone-free', polarity: 'avoid' });
    const read = g.addHabit({ name: 'Read', schedule: { kind: 'days', days: [1, 3, 5] } });
    expect(line(g, walk)).toEqual({ kind: 'new', text: 'Just planted' });
    expect(line(g, yoga)).toEqual({ kind: 'new', text: 'Just planted' }); // no "0 of 2 this week"
    g.checkIn(water);
    g.checkIn(water);
    expect(card(g, water).subtitle).toEqual({ kind: 'count', count: 2, target: 8, unit: 'glasses' });
    expect(line(g, water)).toEqual({ kind: 'count', text: '2/8 glasses' });
    g.tiny(walk);
    expect(line(g, walk)).toEqual({ kind: 'tiny', text: 'Tiny version ✓' });
    g.checkIn(yoga);
    expect(line(g, yoga)).toEqual({ kind: 'period', text: '1 of 2 this week' });
    expect(card(g, yoga).pace).toMatchObject({ checkins: 1, target: 2, to: '2026-03-08', current: true, met: false });
    expect(card(g, yoga).pace).not.toHaveProperty('needed');
    g.goTo('2026-03-03');
    g.checkIn(yoga);
    expect(line(g, yoga)).toEqual({ kind: 'period-done', text: 'Watered for the week ✓' });
    g.goTo('2026-03-04');
    for (const d of ['2026-03-02', '2026-03-03', '2026-03-04']) g.checkIn(phone, d); // backfills in the window
    expect(card(g, phone).subtitle).toEqual({ kind: 'streak', length: 3, unit: 'days', polarity: 'avoid' });
    expect(line(g, phone)).toEqual({ kind: 'streak', text: 'Held off 3 days' });
    for (const d of ['2026-03-06', '2026-03-09']) {
      g.goTo(d);
      g.checkIn(read);
    }
    g.goTo('2026-03-11');
    g.checkIn(read);
    expect(line(g, read)).toEqual({ kind: 'streak', text: '3 in a row' });
    // A rest day says so, with the moon.
    const rested = g.addHabit({ name: 'Swim' });
    g.rest(rested, g.today);
    expect(line(g, rested)).toEqual({ kind: 'rested', text: 'Resting today' });
  });

  it('a new plant says how far it is from being potted up: "Rooting · 3 more to pot up"', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    g.checkIn(a); // 1 sunshine: Rooting; Potted is at 4
    expect(card(g, a).plant).toMatchObject({ displayStage: 1, name: 'Rooting', nextName: 'Potted', checkinsToNext: 3 });
    expect(line(g, a)).toEqual({ kind: 'rooting', text: 'Rooting · 3 more to pot up' });
    g.advance(1);
    g.checkIn(a);
    expect(line(g, a)).toEqual({ kind: 'rooting', text: 'Rooting · 2 more to pot up' });
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
    expect(line(g, a)).toEqual({ kind: 'consistency', text: '16 of the last 20 days' });
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
    expect(vm.blocks.map((b) => [b.id, b.current, b.collapsed, blockSummary(b)])).toEqual([
      ['evening', true, false, 'Evening'],
      ['anytime', false, false, 'Anytime'],
      ['morning', false, true, 'Morning 1/1'],
      ['midday', false, false, 'Midday'],
    ]);
    expect(vm.progress).toMatchObject({ done: 1, total: 4 });
    expect(vineChip(vm.progress, vm.coinsToday)).toBe(`1 of 4 · +${vm.coinsToday} coins`);
    expect(vineChip(vm.progress)).toBe('1 of 4');
    // Data, not words: the screen picks the line from lines.ts (GREETINGS[period]).
    expect(vm.greeting).toEqual({ period: 'evening', hour: 18, name: 'Sam', birthday: false });
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
    expect(vm.paused).toMatchObject({ count: 1, back: '2026-03-11' });
    expect(restingRow(vm.paused!)).toBe('Resting: 1 habit · back Mar 11');
    expect(vm.sill.map((p) => p.habitId)).toEqual([weekly, monthly, days]);
    expect(vm.sill.map((p) => p.resident)).toEqual([null, null, null]); // no pets yet
  });

  it('the band: whoever is nearest sits in the pots, damp soil where watered, the Cutting, the found thing', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit({ name: 'Walk' });
    const b = g.addHabit({ name: 'Read' });
    const c = g.addHabit({ name: 'Stretch' });
    g.run((tx) => (gacha.pull(tx, 'cats', { free: true }), gacha.finishReveal(tx)));
    const first = Object.keys(g.state.pets)[0]!;
    g.state = {
      ...g.state,
      pets: {
        ...g.state.pets,
        'pet-cow-holstein': { ...g.state.pets[first]!, id: 'pet-cow-holstein', xp: 400, obtainedAt: g.now + 1 },
        'pet-dog-corgi': { ...g.state.pets[first]!, id: 'pet-dog-corgi', xp: 999, inMeadow: false },
      },
    };
    g.checkIn(b);
    const vm = todayVM(g.state, envOf(g));
    // Out on the Shelf, closest friends first (the L6 cow before the new cat); the corgi is indoors.
    expect(vm.sill.map((p) => [p.habitId, p.resident, p.done])).toEqual([
      [a, { petId: 'pet-cow-holstein', companion: false }, false],
      [b, { petId: first, companion: false }, true],
      [c, null, false],
    ]);
    expect(vm.found).toEqual({ petId: 'pet-cow-holstein', seed: expect.any(Number) });
    expect(vm.cutting).toMatchObject({ stage: 0, toNext: CUTTING_THRESHOLDS[1]! - 1, framed: false });
  });

  it('the greeting knows her birthday', () => {
    const g = new Game({ start: '2026-03-02', hour: 8 });
    g.state = { ...g.state, profile: { ...g.state.profile, name: '  Sam ', birthday: '03-02' } };
    expect(todayVM(g.state, envOf(g)).greeting).toEqual({ period: 'morning', hour: 8, name: 'Sam', birthday: true });
    g.advance(1);
    expect(todayVM(g.state, envOf(g)).greeting.birthday).toBe(false);
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
    expect(weekDayAria(vm.weekStrip.at(-1)!)).toBe('Sunday, March 8, 1 of 1 watered');
    expect(vm).toMatchObject({ dateLabel: 'Sunday, March 8', shortDate: 'Mar 8', weekdayName: 'Sunday' });
    const past = todayVM(g.state, envOf(g), '2026-03-06');
    expect(past.backdating).toEqual({ date: '2026-03-06', weekdayName: 'Friday', rewards: true });
    expect(backdatingBanner(past.backdating!.date)).toBe('Logging for Fri, Mar 6');
    expect(todayVM(g.state, envOf(g), '2026-02-20').backdating).toEqual({ date: '2026-02-20', weekdayName: 'Friday', rewards: false });
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
    expect(c.pace).toMatchObject({ met: true, current: false, checkins: 2, target: 2, to: '2026-03-01' });
    expect(statusLine(c.subtitle)).toBe('Watered for the week ✓');
    expect(card(g, y).pace).toMatchObject({ met: false, current: true, checkins: 0 });
    expect(line(g, y).kind).not.toBe('period'); // nothing watered this week yet: no period line at all
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
    // 7 sunshine (Potted); Leafy needs 10, and each Mon/Wed/Fri check-in (from tomorrow) brings 7/3.
    expect(vm.plant).toMatchObject({ checkinsToNext: 2, nextName: 'Leafy' });
    expect(forecastLine(vm.plant)).toBe('2 more waterings to Leafy.');
    // Today (Sat) was already checked in and rewarded, so the edit applies from tomorrow: today's
    // check-in keeps the rule it was rewarded under (stage-3 decision, habits.updateHabit).
    expect(vm.stats.current).toMatchObject({ length: 7, unit: 'days', polarity: 'build' });
    expect(runText(vm.stats.current!)).toBe('7 days in a row');
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
  it('month hero, week chip, showed-up line, garden and The Cutting', () => {
    const g = new Game({ start: '2026-03-01' });
    const a = g.addHabit();
    for (let d = '2026-03-01'; d <= '2026-03-12'; d = addDays(d, 1)) {
      g.goTo(d);
      g.checkIn(a);
    }
    const vm = progressVM(g.state, envOf(g));
    expect(vm.hero).toMatchObject({ month: '2026-03', label: 'March', tally: { achieved: 12, expected: 12, percent: 100, ready: true } });
    expect(showedUpLine(vm.showedUp)).toBe('You showed up 12 of the last 12 days');
    expect(vm.recentMonths.map((m) => [m.label, m.days])).toEqual([['Mar', 12]]);
    expect(monthBarLabel(vm.recentMonths[0]!)).toBe('Mar · 12 days');
    expect(vm.hero.daysSoFar).toEqual({ days: 12, span: 12 });
    expect(weekLine(vm.week.tally)).toMatch(/^\d+ of \d+ this week$/);
    expect(goalsLine(vm.goals)).toBeNull(); // no weekly or monthly goals: no line
    expect(vm.garden.map((p) => [p.habitName, p.plant.name])).toEqual([['Walk', 'Leafy']]);
    // 12 lifetime sunshine: past 5 (roots), 8 short of 20 (a pot).
    expect(vm.cutting).toEqual({ stage: 1, progress: 7 / 15, overall: (1 + 7 / 15) / 7, toNext: 8, framed: false });
    expect(vm.garden[0]).toMatchObject({ retired: false });
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
    expect(vm.trend).toMatchObject({ kind: 'fact', fact: { month: '2026-03', current: true, waterings: 4, steadiest: 'Walk' } });
    expect(trendLine(vm.trend)).toBe('4 waterings so far in March. Walk is the steadiest.');
    expect(trendLine(vm.trend)).not.toMatch(/100|down|↓/);
    if (vm.trend.kind === 'fact') expect(bestFactLine({ ...vm.trend.fact, current: false })).toBe('4 waterings in March. Walk was the steadiest.');
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
    expect(q.summary).toEqual({ checkins: 1, daysShowedUp: 1 });
    expect(yearSummaryLine({ year: q.year, ...q.summary })).toBe('1 watering in 2026, across 1 day');
  });
});

describe('Capsules, wallet, Special Order, Field Guide', () => {
  it('the wallet’s "What can I get?" facts, as numbers (coins, stamps, swaps, tickets)', () => {
    const g = new Game();
    g.setWallet({ coins: 75, stars: 5, stardust: 7, tickets: 1 });
    expect(walletVM(g.state)).toMatchObject({
      coins: 75,
      stars: 5,
      stardust: 7,
      tickets: 1,
      dust: { have: 7, of: 10 },
      coinsFacts: { capsules: 3, toNext: 0, price: 25 },
      stampsFacts: { nightPulls: 1, nightPrice: 3, canOrderClassic: true, classicPrice: 3 },
    });
    g.setWallet({ coins: 18, stars: 1 });
    expect(walletVM(g.state)).toMatchObject({ coinsFacts: { capsules: 0, toNext: 7 }, stampsFacts: { nightPulls: 0, canOrderClassic: false } });
  });

  it('machine cards, the series lineup (chances sum to 1, hidden Secret) and the Well', () => {
    const g = new Game({ start: '2026-09-29' });
    const env = envOf(g);
    const vm = capsulesVM(g.state, env, (id) => machineStatusOf(g.state, env.today, id));
    expect(vm.machines.map((m) => m.id)).toEqual(['cats', 'cows', 'dogs', 'pond', 'garden', 'pantry', 'night', 'autumn']);
    expect(vm.machines.map((m) => m.label)).toEqual(['No. 01 · Cats', 'No. 02 · Cows', 'No. 03 · Dogs', 'No. 04 · Pond', 'No. 05 · Garden', 'No. 06 · Pantry', 'No. 07 · Night', 'Autumn Edition']);
    expect(vm.machines.find((m) => m.id === 'autumn')!.seasonal).toEqual({ until: '2026-11-10' });
    expect(vm.machines[0]).toMatchObject({ pity: { tier: 'rare', within: 10 }, luckyPips: 0, free: true });
    expect(vm.machines.filter((m) => m.free).map((m) => m.id)).toEqual(['cats', 'cows', 'dogs', 'pond']);
    expect(vm.firstCapsule).toBe(true);
    expect(vm.away.map((a) => [a.id, a.back])).toEqual([
      ['winter', '2026-11-11'],
      ['valentine', '2027-01-15'],
      ['spring', '2027-03-01'],
      ['summer', '2027-06-01'],
    ]);
    const series = seriesVM(g.state, env, 'cats');
    const all = [...series.tiers.flatMap((t) => t.items), ...series.moonlit];
    expect(all.reduce((a, i) => a + i.chance, 0)).toBeCloseTo(1, 10);
    expect(all.find((i) => i.secret)).toMatchObject({ id: 'pet-cat-mainecoon', hidden: true, rarityLabel: 'Secret' });
    expect(series.tiers.map((t) => [t.label, t.eachPct])).toEqual([
      ['Classic', 7.5],
      ['Special', 5],
      ['Rare', 2],
      ['Super rare', 1.7],
    ]);
    expect(seriesVM(g.state, env, 'winter').coverOnly).toBe(true);
    expect(seriesVM(g.state, env, 'autumn').coverOnly).toBe(false); // on the day she arrived: it has visited
    const well = wishListVM(g.state, env);
    const winter = well.groups.find((x) => x.machineId === 'winter')!;
    expect(winter.items[0]).toMatchObject({ status: 'season-not-visited', arrives: '2026-11-11' });
    expect(well.groups.find((x) => x.machineId === 'autumn')!.items[0]).toMatchObject({ status: 'not-enough-stars', arrives: null });
    expect(well.groups.find((x) => x.machineId === 'cats')!.items[0]).toMatchObject({ status: 'not-enough-stars', price: 3 });
  });

  it('the Field Guide by category and by species page', () => {
    const g = new Game();
    const vm = collectionVM(g.state);
    expect(vm.categories.map((c) => c.category)).toEqual(['pet', 'wearable', 'treat', 'decor', 'plant', 'pot']);
    expect(vm.categories.find((c) => c.category === 'plant')!.owned).toBe(5);
    expect(vm.albums.map((a) => a.name)).toEqual(['Cats', 'Cows', 'Dogs', 'Rabbits', 'Pond Club', 'Bears', 'Hamsters']);
    expect(vm.albums.map((a) => a.reward)).toEqual(['decor-reading-chair', 'decor-pasture-fence', null, null, 'decor-stepping-stones', null, null]);
    expect(vm.albums[0]!.pets.every((p) => p.owned === 0)).toBe(true);
    expect(vm.albums[0]!.pets[0]).toMatchObject({ from: 'No. 01 · Cats', visits: null });
    const plants = vm.categories.find((c) => c.category === 'plant')!.items;
    expect(plants.find((p) => p.id === 'plant-pothos')).toMatchObject({ from: 'Starter', owned: 1 });
    expect(plants.find((p) => p.id === 'plant-tulip')).toMatchObject({ from: 'Spring Edition', visits: { start: { month: 3, day: 1 }, end: { month: 5, day: 31 } } });
    const treats = vm.categories.find((c) => c.category === 'treat')!.items;
    expect(treats.find((t) => t.id === 'treat-catnip')).toMatchObject({ from: 'Harvest' });
    expect(vm.moonlit.items).toEqual([]);
  });
});

describe('Pets, the Shelf, rituals, pins', () => {
  it('pets list, pet card, the Shelf', () => {
    const g = new Game();
    expect(petsVM(g.state)).toEqual({ pets: [], out: 0, capacity: 8, featured: null });
    const r = g.run((tx) => (gacha.pull(tx, 'cows', { free: true }) as { ok: true; itemId: string }));
    const id = r.itemId;
    const list = petsVM(g.state);
    expect(list).toMatchObject({ out: 1, capacity: 8, featured: id });
    expect(list.pets[0]).toMatchObject({ id, out: true, featured: true, favorite: false, level: 1, hearts: 1, moonlit: false, species: 'cow' });
    const pet = petVM(g.state, envOf(g), id)!;
    expect(pet).toMatchObject({ favoriteTreat: { known: false, treatId: null, name: null }, today: { petsLeft: 5, treatsLeft: 3, favoriteBonusLeft: true } });
    expect(['tag', 'plant']).toContain(pet.favoriteTreat.hint.kind);
    expect(pet.perks.map((p) => [p.level, p.perk, p.unlocked])).toEqual([
      [2, 'looks-up', false],
      [3, 'slow-blink', false],
      [4, 'favourite-spot', false],
      [5, 'follows-sunbeam', false],
      [6, 'found-things', false],
      [7, 'naps-touching', false],
      [8, 'best-friend-nap', false],
      [10, 'best-friends', false],
    ]);
    expect(pet.wardrobe.head).toEqual([]);
    expect(pet.treats.map((t) => t.name)).toEqual(['Strawberry', 'Oat Biscuit']);
    expect(pet.arrivedOn).toBe(g.today);
    expect(JSON.stringify(pet)).not.toMatch(/\p{Extended_Pictographic}/u);
    const vm = shelfVM(g.state);
    expect(vm.places.map((p) => [p.id, p.owned, p.price, p.petsOut])).toEqual([
      ['sill', true, 0, 8],
      ['pond', false, 400, 2],
      ['grass', false, 700, 2],
      ['bookshelf', false, 1000, 2],
      ['balcony', false, 1500, 2],
      ['quilt', false, 2500, 2],
    ]);
    expect(vm.out.map((p) => p.id)).toEqual([id]);
    expect(vm.indoors).toEqual([]);
    expect(vm.cutting).toMatchObject({ stage: 0, framed: false });
  });

  it('the memory shelf (a Sunday Note, never a percentage) and badge progress', () => {
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    for (let d = 0; d < 8; d++) {
      g.checkIn(a);
      g.advance(1);
    }
    const shelf = memoryShelfVM(g.state);
    expect(shelf).toMatchObject({ unread: 1, next: 'weekly-2026-03-02' });
    expect(shelf.items[0]).toMatchObject({ kind: 'sundayNote', weekStart: '2026-03-02', stamps: 3, read: false, waterings: 7 });
    expect(shelf.items[0]).not.toHaveProperty('achieved');
    expect(shelf.sundayNotes).toHaveLength(1);
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
