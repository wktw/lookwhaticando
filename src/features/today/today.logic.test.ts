/**
 * Today's pure logic: the group snapshot (a tap never regroups), what a ring tap does, the band's
 * greeting and inputs, the letters in words, and the Habit Editor's form rules.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/state/defaults';
import { transact } from '@/domain/tx';
import { openDay } from '@/domain/rollover';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import { mulberry32 } from '@/domain/rng';
import { appDayKey, addDays, runtimeLocalTime } from '@/domain/dates';
import { todayVM, type HabitCardVM } from '@/state/selectors';
import type { AppState } from '@/state/types';
import type { HabitInput } from '@/state/api';
import { bandOrder, cardsById, liveGroups, orderedIds, selectDay, selectedDay, snapshotGroups, structureKey } from './state';
import { checkinCoins, noteEvents, refundedOf, tapAction } from './checkin';
import { bandPets, bandPots, greetingLine } from './Band';
import { holdAction, ringLabel, ringStateOf, unitFor } from './HabitCard';
import { groupAriaLabel, groupTitle } from './HabitList';
import { dayMark } from './WeekStrip';
import { quickAdds } from './CountPad';
import { amountHead } from './WalletSheet';
import { highlightLine, sundayNoteText, timesWord } from './letterText';
import { choicesFor, seasonPlantLine, seasonPlantLines } from './SeasonReview';
import { cleanInput, issuesByField, maxTimes, patchOf, scheduleFor, toggleDay, touchesRule, withName, withSchedule, withUnitPreset } from '@/features/habits/editor/form';

const NOON = Date.UTC(2026, 8, 29, 12, 0);
const env = (ms = NOON) => ({ now: ms, today: appDayKey(ms, 180, runtimeLocalTime), local: runtimeLocalTime, rng: mulberry32(3) });
const run = <R>(s: AppState, fn: (tx: Parameters<Parameters<typeof transact>[2]>[0]) => R, ms = NOON) => transact(s, env(ms), (tx) => (openDay(tx), { r: fn(tx) }));
const viewEnv = (ms = NOON) => ({ today: env(ms).today, now: ms, local: runtimeLocalTime });

function household(): AppState {
  let s = createInitialState(NOON - 86_400_000 * 10);
  s = run(s, (tx) => habits.completeOnboarding(tx, { name: 'Sam', templateIds: ['water', 'walk', 'read'] }), NOON - 86_400_000 * 10).state;
  return s;
}

describe('the group snapshot (DESIGN §9.1: never regrouped on tap)', () => {
  it('keeps a flexible habit in its block after it is met, though the view model moves it', () => {
    let s = household();
    const yoga: HabitInput = { ...habits.habitInputFromTemplate({ id: 'x', group: 'body', name: 'Yoga', icon: 'yoga', schedule: { kind: 'weekly', times: 1, every: 1 }, target: 1, effort: 'steady', timeOfDay: 'midday', plant: 'pilea', color: 'lavender' }) };
    const made = run(s, (tx) => habits.createHabit(tx, yoga));
    s = made.state;
    const vm = todayVM(s, viewEnv());
    const snap = snapshotGroups(vm);
    const where = (id: string, groups: ReturnType<typeof liveGroups>) => groups.find((g) => g.cards.some((c) => c.id === id))?.key;
    expect(where(made.r, liveGroups(snap, cardsById(vm)))).toBe('block:midday');

    s = run(s, (tx) => logging.checkIn(tx, made.r, env().today)).state;
    const after = todayVM(s, viewEnv());
    expect(after.doneForPeriod.map((c) => c.id)).toContain(made.r);
    // Same snapshot, fresh cards: it stays where she tapped it, watered.
    const live = liveGroups(snap, cardsById(after));
    expect(where(made.r, live)).toBe('block:midday');
    expect(live.flatMap((g) => g.cards).find((c) => c.id === made.r)?.done).toBe(true);
    // A check-in doesn't change the structure key; a new habit does.
    expect(structureKey(s, after.date, after.date)).toBe(structureKey(made.state, after.date, after.date));
    const more = run(s, (tx) => habits.createHabit(tx, { ...yoga, name: 'Stretch' })).state;
    expect(structureKey(more, after.date, after.date)).not.toBe(structureKey(s, after.date, after.date));
  });

  it('folds an earlier block that is all watered, and lists rows after the blocks', () => {
    const vm = todayVM(household(), viewEnv());
    const snap = snapshotGroups(vm);
    expect(snap.every((g, i) => !g.key.startsWith('block:') || snap.slice(0, i).every((x) => x.key.startsWith('block:')))).toBe(true);
    expect(orderedIds(liveGroups(snap, cardsById(vm)))).toHaveLength(3);
  });

  it('selects past days only (a future or today selection is today)', () => {
    selectDay('2026-09-27', '2026-09-29');
    expect(selectedDay.value).toBe('2026-09-27');
    selectDay('2026-09-29', '2026-09-29');
    expect(selectedDay.value).toBeNull();
    selectDay('2026-09-30', '2026-09-29');
    expect(selectedDay.value).toBeNull();
  });
});

const card = (over: Partial<HabitCardVM>): HabitCardVM => ({ id: 'h', name: 'Walk', rested: false, done: false, full: false, flexible: false, target: 1, count: 0, tiny: false, step: 1, unit: null, ...over }) as HabitCardVM;

describe('a tap on the ring (DESIGN §5.2)', () => {
  it('toggles a one-tap habit, adds to a count until full, then adjusts; a moon comes off', () => {
    expect(tapAction(card({}))).toBe('water');
    expect(tapAction(card({ done: true, count: 1 }))).toBe('unwater');
    expect(tapAction(card({ target: 8, count: 3 }))).toBe('water');
    expect(tapAction(card({ target: 8, count: 8, done: true, full: true }))).toBe('adjust');
    expect(tapAction(card({ target: 8, count: 2, tiny: true, done: true }))).toBe('unwater');
    expect(tapAction(card({ rested: true }))).toBe('unrest');
    expect(tapAction(card({ flexible: true, done: true }))).toBe('unwater');
  });

  it('names the ring by what it does (VOICE §23)', () => {
    expect(ringLabel(card({}), '2026-09-29', false)).toBe('Walk');
    expect(ringLabel(card({}), '2026-09-27', true)).toBe('Walk for Sunday');
    expect(ringLabel(card({ name: 'Drink water', target: 8, count: 3, unit: 'glasses' }), '2026-09-29', false)).toBe('Add 1 glass to Drink water');
    expect(ringLabel(card({ name: 'Read', target: 20, step: 5, count: 5, unit: 'pages' }), '2026-09-29', false)).toBe('Add 5 pages to Read');
    expect(ringStateOf(card({ rested: true }))).toBe('rest');
    expect(ringStateOf(card({ tiny: true, done: true }))).toBe('tiny');
    expect(ringStateOf(card({ target: 8 }))).toBeUndefined();
    expect(unitFor('glasses', 1)).toBe('glass');
    expect(unitFor('pages', 1)).toBe('page');
    expect(unitFor('km', 1)).toBe('km');
    expect(unitFor('minutes', 5)).toBe('minutes');
  });

  it('reads the coins and the refund off the events', () => {
    const events = [
      { type: 'coins', amount: 5, reason: 'checkin', habitId: 'h' },
      { type: 'coins', amount: 10, reason: 'perfect' },
      { type: 'uncheck', habitId: 'h', date: '2026-09-29', refunded: 4 },
    ] as const;
    expect(checkinCoins(events as never, 'h')).toBe(5);
    expect(refundedOf(events as never, 'h')).toBe(4);
    expect(quickAdds(1)).toEqual([1, 2]);
    expect(quickAdds(5)).toEqual([1, 5, 10]);
  });
});

describe('the band', () => {
  it('greets by the period and drops the comma without a name', () => {
    expect(greetingLine({ period: 'afternoon', hour: 14, name: 'Sam', birthday: false }, 29)).toBe('Afternoon, Sam.');
    expect(greetingLine({ period: 'morning', hour: 8, name: '', birthday: false }, 29)).toBe('Morning.');
    expect(greetingLine({ period: 'morning', hour: 8, name: 'Sam', birthday: true }, 29)).toBe('Happy birthday, Sam.');
  });

  it('builds pots in card order, with residents only when they are out', () => {
    const s = household();
    const vm = todayVM(s, viewEnv());
    const pots = bandPots(vm, s.habits);
    expect(pots.map((p) => p.habitId)).toEqual(vm.sill.map((p) => p.habitId));
    expect(pots.every((p) => p.stage === 0)).toBe(true);
    expect(bandPets(vm, s.pets)).toEqual([]);
  });

  it('never shows a count of 0 in the wallet', () => {
    expect(amountHead(0, { one: '1 coin', other: '{count} coins' })).toBe('Coins');
    expect(amountHead(12, { one: '1 coin', other: '{count} coins' })).toBe('12 coins');
  });
});

describe('the list and the strip', () => {
  it('words the rows (VOICE §5)', () => {
    const c = card({ pace: { period: { kind: 'weekly', every: 1 } } as never });
    expect(groupTitle({ key: 'block:morning', cards: [c, c, c], done: 3 })).toBe('Morning 3/3');
    expect(groupTitle({ key: 'block:morning', cards: [c], done: 0 })).toBe('Morning');
    expect(groupTitle({ key: 'doneForPeriod', cards: [c], done: 1 })).toBe('Watered for the week');
    expect(groupTitle({ key: 'doneForPeriod', cards: [card({ pace: { period: { kind: 'monthly', every: 1 } } as never })], done: 1 })).toBe('Watered for the month');
    expect(groupTitle({ key: 'thisMonth', cards: [c], done: 0 })).toBe('This month');
    expect(groupTitle({ key: 'notToday', cards: [c], done: 0 })).toBe('Other days');
  });

  it('draws a flower for a watered day and just the date for an empty one', () => {
    expect(dayMark({ state: 'done', offDay: false })).toBe('glyph');
    expect(dayMark({ state: 'rest', offDay: false })).toBe('glyph');
    expect(dayMark({ state: 'none', offDay: false })).toBe('date');
    expect(dayMark({ state: 'none', offDay: true })).toBe('glyph');
  });
});

describe('letters and the season in words (VOICE §12)', () => {
  const s = household();
  const walk = s.habits.find((h) => h.name === 'Walk')!;
  it('writes a Sunday Note without a percentage, spelling counts at the start', () => {
    const t = sundayNoteText(s, { id: 'l', kind: 'sundayNote', weekStart: '2026-09-21', waterings: 19, highlights: [{ kind: 'everyDay', habitId: walk.id }, { kind: 'stageUp', habitId: walk.id, stage: 4, date: '2026-09-24' }], quote: null, ps: null, stamps: 3, read: false });
    expect(t.lines.map((l) => l.text)).toEqual(['Week of Sep 21. Nineteen waterings.', 'Walk, watered every day.', 'The Walk plant showed a first bud on Thursday.', 'Three stamps, enclosed.']);
    expect(t.lines.join(' ')).not.toMatch(/%/);
  });
  it('skips a bare count below five', () => {
    const t = sundayNoteText(s, { id: 'l', kind: 'sundayNote', weekStart: '2026-09-21', waterings: 2, highlights: [], quote: null, ps: null, stamps: 1, read: false });
    expect(t.lines[0]!.text).toBe('Week of Sep 21.');
    expect(t.lines[1]!.text).toBe('One stamp, enclosed.');
  });
  it('words the P.S. times and the highlights', () => {
    expect(timesWord(4, 'evening')).toBe('four evenings');
    expect(timesWord(1, 'morning')).toBe('one morning');
    expect(timesWord(7, 'anytime')).toBe('every day');
    expect(highlightLine(s, { kind: 'topHabit', habitId: walk.id, days: 1 })).toBe('Walk, watered on 1 day.');
  });
  it('offers only the chips a habit can take, and words each plant in counts', () => {
    expect(choicesFor({ tinier: null, grow: null })).toEqual(['keep', 'rest', 'finish']);
    expect(choicesFor({ tinier: {}, grow: { patch: {}, pays: true } })).toEqual(['keep', 'tinier', 'grow', 'rest', 'finish']);
    expect(seasonPlantLine({ habitName: 'Walk', fromStage: 0, toStage: 5, waterings: 71 })).toBe('Walk · Cutting to Blooming · 71 waterings');
    expect(seasonPlantLine({ habitName: 'Walk', fromStage: 3, toStage: 3, waterings: 1 })).toBe('Walk · Leafy · 1 watering');
  });
});

describe('the Habit Editor form', () => {
  const base: HabitInput = { name: 'Drink water', icon: 'water', color: 'sky', plant: 'pothos', pot: 'terracotta', schedule: { kind: 'daily' }, target: 8, step: 1, unit: 'glasses', tiny: { label: 'Four glasses', count: 4 }, effort: 'light', timeOfDay: 'anytime', polarity: 'build' };

  it('switches how often, keeping what it can, and makes a flexible habit count one a day', () => {
    expect(scheduleFor('days', { kind: 'daily' })).toEqual({ kind: 'days', days: [1, 3, 5] });
    expect(scheduleFor('monthly', { kind: 'weekly', times: 3, every: 1 })).toEqual({ kind: 'monthly', times: 3, every: 1 });
    const flex = withSchedule(base, { kind: 'weekly', times: 3, every: 1 });
    expect(flex.target).toBe(1);
    expect(flex.unit).toBeUndefined();
    expect(flex.tiny).toEqual({ label: 'Four glasses' });
    expect(maxTimes({ kind: 'weekly', times: 1, every: 2 })).toBe(14);
    expect(toggleDay([1, 5], 3)).toEqual([1, 3, 5]);
    expect(toggleDay([1, 3, 5], 3)).toEqual([1, 5]);
  });

  it('suggests an icon from the name until she picks one', () => {
    expect(withName({ ...base, icon: 'sparkle' }, 'Read a book', false).icon).toBe('book');
    expect(withName({ ...base, icon: 'sparkle' }, 'Read a book', true).icon).toBe('sparkle');
    expect(withUnitPreset({ ...base, target: 1, unit: undefined }, { unit: 'pages', step: 5, target: 20 })).toMatchObject({ unit: 'pages', step: 5, target: 20 });
  });

  it('sends only what changed, and knows a rule edit', () => {
    expect(patchOf(base, { ...base, name: 'Water' })).toEqual({ name: 'Water' });
    expect(touchesRule(patchOf(base, { ...base, name: 'Water' }))).toBe(false);
    expect(touchesRule(patchOf(base, { ...base, target: 6 }))).toBe(true);
    const cleared = patchOf(base, cleanInput({ ...base, tiny: { label: '  ' } }));
    expect(Object.prototype.hasOwnProperty.call(cleared, 'tiny')).toBe(true);
    expect(cleared.tiny).toBeUndefined();
  });

  it('puts each field note under its section, in the deck’s words', () => {
    const notes = issuesByField([
      { field: 'name', code: 'name', message: 'Give it a name, up to 60 characters.' },
      { field: 'target', code: 'target-range', message: 'Pick an amount from 1 to 100,000.' },
      { field: 'anchorHabitId', code: 'anchor-self', message: 'Pick another habit to follow.' },
    ]);
    expect(notes).toEqual({ name: 'Give it a name, up to 60 characters.', amount: 'Pick an amount from 1 to 100,000.', anchor: 'Pick another habit to follow.' });
  });
});

describe('dates stay honest', () => {
  it('uses a day six back as the strip’s first day', () => {
    const vm = todayVM(household(), viewEnv());
    expect(vm.weekStrip[0]!.date).toBe(addDays(vm.date, -6));
    expect(vm.weekStrip[6]!.isToday).toBe(true);
  });
});

describe('review round 1', () => {
  const card = (over: Partial<HabitCardVM>): HabitCardVM => ({ rested: false, flexible: false, target: 1, tinyLabel: null, canTiny: false, ...over }) as HabitCardVM;

  it('arms a hold only when it does something: the pad for a count, the tiny version, else nothing', () => {
    expect(holdAction(card({ target: 8 }))).toBe('pad');
    expect(holdAction(card({ target: 8, rested: true }))).toBeNull();
    expect(holdAction(card({ tinyLabel: 'Shoes on', canTiny: true }))).toBe('tiny');
    expect(holdAction(card({ tinyLabel: 'Shoes on', canTiny: false }))).toBeNull();
    // Phone-free bedtime: no tiny version, no count, so a slow tap is just a tap.
    expect(holdAction(card({}))).toBeNull();
    expect(holdAction(card({ flexible: true, target: 3 }))).toBeNull();
  });

  it('names folded rows in words, never "1/1"', () => {
    const cards = [{ name: 'Take vitamins', done: true } as HabitCardVM];
    const label = groupAriaLabel({ key: 'block:morning', cards, done: 1 });
    expect(label).toBe('Morning, 1 of 1 watered: Take vitamins');
    expect(label).not.toMatch(/\d\/\d/);
    expect(groupAriaLabel({ key: 'block:morning', cards, done: 0 }, false)).toBe('Morning');
    expect(groupAriaLabel({ key: 'thisMonth', cards, done: 0 })).toMatch(/: Take vitamins$/);
  });

  it('puts the cards still to water first on the band, in the list order', () => {
    const c = (id: string, done: boolean) => ({ id, done, rested: false, restState: null }) as unknown as HabitCardVM;
    const order = bandOrder([
      { folded: false, cards: [c('a', true), c('b', false)] },
      { folded: false, cards: [c('c', false)] },
      { folded: true, cards: [c('d', false)] },
    ]);
    expect(order).toEqual(['b', 'c', 'a', 'd']);
  });

  it('leaves the harvest aside out of the note with Quiet rewards', () => {
    const events = [{ type: 'harvest', habitId: 'w' }, { type: 'checkin', habitId: 'w' }] as never[];
    expect(noteEvents(events, true)).toHaveLength(1);
    expect(noteEvents(events, false)).toHaveLength(2);
  });

  it('words the Season Review caption in short lines', () => {
    const lines = seasonPlantLines({ habitName: 'Drink water', fromStage: 0, toStage: 5, waterings: 76 });
    expect(lines[0]).toBe('Drink water');
    expect(lines.slice(1).join(' · ')).toBe(seasonPlantLine({ habitName: '', fromStage: 0, toStage: 5, waterings: 76 }).replace(/^ · /, ''));
  });
});
