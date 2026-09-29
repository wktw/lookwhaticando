/**
 * The view models after the M1 audit: flowers on Blooming plants, the band's inputs, the greeting
 * and date fields, hidden pins, events without display text, and every VOICE-governed line the
 * formatters (src/catalog/format.ts) make from view-model data, run through the voice rules over
 * a matrix of rules, polarities and counts.
 */
import { describe, expect, it, vi } from 'vitest';
import { bloomCount } from '@/art/plants/PlantArt';
import { greetingPeriod } from '@/catalog/lines';
import {
  bestFactLine,
  blockSummary,
  cardAriaLabel,
  consistencyText,
  dayProgressAria,
  forecastLine,
  goalsLine,
  insightLines,
  monthBarLabel,
  monthSoFarLine,
  recordLines,
  restingRow,
  restsLine,
  ruleChangeText,
  runText,
  scheduleText,
  showedUpLine,
  soFarLine,
  statusLine,
  trendLine,
  vineChip,
  weekDayAria,
  weekLine,
  yearSummaryLine,
} from '@/catalog/format';
import { addDays } from '@/domain/dates';
import { newPetState } from '@/domain/friendship';
import { FIRST_CAPSULE_KEY } from '@/domain/gacha';
import { BLOOMING } from '@/domain/growth';
import * as shelf from '@/domain/shelf';
import { buildDemo } from '@/state/demo';
import type { HabitInput } from '@/state/api';
import { badgesVM } from '@/state/views/pets';
import { habitDetailVM } from '@/state/views/habit';
import { progressVM } from '@/state/views/progress';
import { yearQuiltVM } from '@/state/views/calendar';
import { bandPets, bandPots, monthJarStems, todayVM, type TodayVM } from '@/state/views/today';
import type { ViewEnv } from '@/state/views/common';
import { Game, UTC, at } from '../domain/game';

vi.setConfig({ testTimeout: 60_000 });

const TODAY = '2026-09-29';
const NOW = at(TODAY, 21, 45);
const demo = buildDemo({ today: TODAY, now: NOW, local: UTC });
const demoEnv: ViewEnv = { today: TODAY, now: NOW, local: UTC };

/* ------------------------------------------------------------------ */
/* The voice rules the lines must keep (VOICE.md §1–§3)                */
/* ------------------------------------------------------------------ */

const VOICE_RULES: readonly [string, RegExp][] = [
  ['a zero', /(^|[^\d/.,])0(?![\d.,])/],
  ['an exclamation mark', /!/],
  ['a count of what is undone', /\b(left|to go|remaining|more by|not (yet )?(done|watered))\b/i],
  ['a deadline', /\bby (mon|tue|wed|thu|fri|sat|sun)/i],
  ['"check-in" (say watering)', /\bcheck(ed|s)?[- ]?ins?\b/i],
  ['"streak"', /\bstreaks?\b/i],
  ['pep talk', /\b(kept it up|keep it up|great job|well done)\b/i],
  ['"Done for the" (say "Watered for the")', /\bDone for the\b/],
  ['a comparison in points', /\b(pts?|vs\.?)\b|%/],
  ['missed / failed / lost / broken / behind', /\b(miss(ed)?|fail(ed)?|lost|broken|behind)\b/i],
  ['a straight apostrophe', /[A-Za-z]'[A-Za-z]/],
  ['an emoji', /\p{Extended_Pictographic}/u],
];

function voiceProblems(text: string): string[] {
  return VOICE_RULES.filter(([, re]) => re.test(text)).map(([why]) => why);
}

function expectVoice(lines: Iterable<string | null>): number {
  let n = 0;
  const bad: string[] = [];
  for (const text of lines) {
    if (text === null) continue;
    n++;
    const p = voiceProblems(text);
    if (p.length > 0) bad.push(`${JSON.stringify(text)}: ${p.join(', ')}`);
  }
  expect(bad).toEqual([]);
  return n;
}

const allCards = (vm: TodayVM) => [...vm.blocks.flatMap((b) => b.cards), ...vm.doneForPeriod, ...vm.thisMonth, ...vm.notToday];

describe('the voice rules catch what the view models used to say', () => {
  it.each([
    '0 of 2 this week · 2 more by Sun',
    'Done for the week ✓',
    'Kept it up 4 days',
    '3 checked in',
    '↑ 3 pts vs Aug 1–29',
    '12 check-ins in 2026',
    '4 more check-ins to Blooming',
  ])('%s', (text) => expect(voiceProblems(text)).not.toEqual([]));
});

/* ------------------------------------------------------------------ */
/* Flowers (finding: blooms semantics)                                 */
/* ------------------------------------------------------------------ */

describe('Blooming and Flourishing plants keep their flowers in the art', () => {
  it('the demo band has Blooming+ pots, and the art draws flowers on every one', () => {
    const vm = todayVM(demo, demoEnv);
    const blooming = vm.sill.filter((p) => p.stage >= BLOOMING);
    expect(blooming.length).toBeGreaterThan(0);
    for (const p of blooming) expect(bloomCount(p.stage, p.progress, p.blooms), `${p.habitId} stage ${p.stage}`).toBeGreaterThan(0);
    for (const p of bandPots(vm).filter((b) => b.stage >= BLOOMING)) expect(bloomCount(p.stage, p.progress ?? 0, p.blooms)).toBeGreaterThan(0);
    for (const c of allCards(vm).filter((c) => c.plant.displayStage >= BLOOMING)) expect(bloomCount(c.plant.displayStage, c.plant.progress, c.plant.blooms)).toBeGreaterThan(0);
    for (const g of progressVM(demo, demoEnv).garden.filter((g) => g.plant.displayStage >= BLOOMING)) expect(bloomCount(g.plant.displayStage, g.plant.progress, g.plant.blooms)).toBeGreaterThan(0);
  });

  it('below Evergreen the art follows the stage; the view model sends no bloom count', () => {
    for (const p of todayVM(demo, demoEnv).sill.filter((p) => p.stage < 7)) expect(p.blooms).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* The band's inputs                                                   */
/* ------------------------------------------------------------------ */

describe('the windowsill band gets pots and pets in the art’s shapes', () => {
  it('pots follow the card order, current block first, with the tag name and anchor note', () => {
    const vm = todayVM(demo, demoEnv);
    const pots = bandPots(vm);
    expect(pots.map((p) => p.habitId)).toEqual(allCards(vm).map((c) => c.id));
    const current = vm.blocks.find((b) => b.current);
    if (current) expect(pots.slice(0, current.cards.length).map((p) => p.habitId)).toEqual(current.cards.map((c) => c.id));
    for (const p of pots) {
      const card = allCards(vm).find((c) => c.id === p.habitId)!;
      expect(p).toMatchObject({ name: card.name, species: card.plant.species, pot: card.plant.pot, stage: card.plant.displayStage, pulse: card.waterings });
      expect(p).not.toHaveProperty('plant');
    }
  });

  it('pets: each resident out on the Shelf once, sitting in its pot, with name, personality and outfit', () => {
    const vm = todayVM(demo, demoEnv);
    const pets = bandPets(vm, demo);
    expect(pets.length).toBeGreaterThan(0);
    expect(new Set(pets.map((p) => p.petId)).size).toBe(pets.length);
    const potIds = new Set(bandPots(vm).map((p) => p.habitId));
    for (const p of pets) {
      const pet = demo.pets[p.petId]!;
      expect(pet.inMeadow).toBe(true);
      expect(p).toMatchObject({ key: p.petId, name: pet.name, personality: pet.personality, outfit: pet.outfit, place: 'sill' });
      expect(potIds.has(p.home!)).toBe(true);
    }
  });

  it('a pet indoors, or spending the day in another place, doesn’t sit in a sill pot', () => {
    const g = new Game();
    g.setWallet({ coins: 5_000 });
    const a = g.addHabit({ name: 'Walk' });
    const b = g.addHabit({ name: 'Read', icon: 'book' });
    const duck = 'pet-duck-mallard';
    const cat = 'pet-cat-orange';
    const cow = 'pet-cow-jersey';
    g.state = {
      ...g.state,
      pets: {
        [duck]: newPetState(duck, g.rng, g.now, g.today, true),
        [cat]: newPetState(cat, g.rng, g.now, g.today, true),
        [cow]: newPetState(cow, g.rng, g.now, g.today, false),
      },
    };
    g.run((tx) => shelf.buyPlace(tx, 'pond')); // the duck moves into the pond
    const vm = todayVM(g.state, { today: g.today, now: g.now, local: UTC });
    const residents = vm.sill.map((p) => p.resident?.petId ?? null);
    expect(residents).toContain(cat);
    expect(residents).not.toContain(duck);
    expect(residents).not.toContain(cow);
    expect(bandPets(vm, g.state).map((p) => p.petId)).toEqual([cat]);
    expect(vm.sill.map((p) => p.habitId).sort()).toEqual([a, b].sort());
  });
});

/* ------------------------------------------------------------------ */
/* Small seams                                                         */
/* ------------------------------------------------------------------ */

describe('the greeting, dates and pins', () => {
  it('greeting.period is greetingPeriod(hour) at every hour; the short date and weekday are there', () => {
    for (let hour = 0; hour < 24; hour++) {
      const vm = todayVM(demo, { ...demoEnv, now: at(TODAY, hour, 30) });
      expect(vm.greeting.period, `hour ${hour}`).toBe(greetingPeriod(hour));
      expect(vm.greeting).not.toHaveProperty('timeOfDay');
    }
    const vm = todayVM(demo, demoEnv);
    expect(vm).toMatchObject({ dateLabel: 'Tuesday, September 29', shortDate: 'Sep 29', weekdayName: 'Tuesday', backdating: null });
    const past = todayVM(demo, demoEnv, addDays(TODAY, -3));
    expect(past.backdating).toMatchObject({ date: '2026-09-26', weekdayName: 'Saturday' });
  });

  it('"Key under the mat" stays hidden until it is earned', () => {
    const g = new Game();
    const pin = badgesVM(g.state).badges.find((b) => b.id === 'comeback')!;
    expect(pin).toMatchObject({ earned: false, hidden: true });
    expect(badgesVM(g.state).badges.filter((b) => b.hidden).map((b) => b.id)).toEqual(['comeback']);
    g.state = { ...g.state, badges: { ...g.state.badges, comeback: g.now } };
    expect(badgesVM(g.state).badges.find((b) => b.id === 'comeback')).toMatchObject({ earned: true, hidden: false });
  });

  it('events carry no display text: a plant stage is a number', () => {
    const g = new Game();
    const a = g.addHabit();
    g.checkIn(a);
    const ev = g.allOf('plantStage');
    expect(ev.length).toBeGreaterThan(0);
    for (const e of ev) expect(e).not.toHaveProperty('stageName');
  });
});

/* ------------------------------------------------------------------ */
/* Every VOICE-governed line, over a matrix                            */
/* ------------------------------------------------------------------ */

const SCHEDULES: HabitInput['schedule'][] = [
  { kind: 'daily' },
  { kind: 'days', days: [1, 3, 5] },
  { kind: 'weekly', times: 3, every: 1 },
  { kind: 'weekly', times: 1, every: 2 },
  { kind: 'weekly', times: 2, every: 3 },
  { kind: 'weekly', times: 1, every: 4 },
  { kind: 'monthly', times: 2, every: 1 },
  { kind: 'monthly', times: 1, every: 2 },
  { kind: 'monthly', times: 1, every: 3 },
  { kind: 'monthly', times: 1, every: 6 },
  { kind: 'monthly', times: 1, every: 12 },
];

describe('every line the formatters make from view-model data keeps the voice', () => {
  it('card status lines across schedules, polarities, counts, tiny and rests, over 10 weeks', () => {
    const g = new Game({ start: '2026-03-02', seed: 3 });
    const ids: string[] = [];
    for (const schedule of SCHEDULES) {
      for (const polarity of ['build', 'avoid'] as const) ids.push(g.addHabit({ name: `${schedule.kind} ${polarity}`, schedule, polarity }));
    }
    const water = g.addHabit({ name: 'Water', target: 8, unit: 'glasses', tiny: { label: '4 glasses', count: 4 } });
    const stretch = g.addHabit({ name: 'Stretch', target: 3, tiny: { label: 'One' } });
    const texts: (string | null)[] = [];
    const kinds = new Set<string>();
    for (let d = 0; d < 70; d++) {
      const day = addDays('2026-03-02', d);
      g.goTo(day, 20);
      const env: ViewEnv = { today: g.today, now: g.now, local: UTC };
      const before = todayVM(g.state, env);
      for (const c of allCards(before)) {
        texts.push(statusLine(c.subtitle, 1));
        kinds.add(c.subtitle.kind);
        texts.push(cardAriaLabel(c));
        if (c.streak) texts.push(runText(c.streak), runText(c.streak, 'card'));
      }
      for (const id of ids) {
        const r = g.rng();
        if (r < 0.55) g.checkIn(id);
        else if (r < 0.62) g.tiny(id);
        else if (r < 0.66 && d > 0) g.rest(id, day);
      }
      const n = Math.floor(g.rng() * 10);
      for (let i = 0; i < n; i++) g.checkIn(water);
      if (g.rng() < 0.3) g.tiny(stretch);
      else if (g.rng() < 0.6) g.checkIn(stretch);
      const after = todayVM(g.state, env);
      for (const c of allCards(after)) {
        texts.push(statusLine(c.subtitle, 1));
        kinds.add(c.subtitle.kind);
      }
      texts.push(vineChip(after.progress, after.coinsToday), vineChip(after.progress), dayProgressAria(after.progress));
      for (const b of after.blocks) texts.push(blockSummary(b));
      for (const w of after.weekStrip) texts.push(weekDayAria(w));
      if (after.paused) texts.push(restingRow(after.paused));
    }
    expect(expectVoice(texts)).toBeGreaterThan(1000);
    // The matrix reached every kind the status line has, but `none`.
    for (const k of ['rested', 'count', 'tiny', 'period', 'period-done', 'streak', 'consistency', 'rooting', 'new']) expect(kinds, k).toContain(k);
    // Habit Detail: the forecast and the rolling phrase, for every habit.
    const env: ViewEnv = { today: g.today, now: g.now, local: UTC };
    for (const id of [...ids, water, stretch]) {
      const vm = habitDetailVM(g.state, env, id)!;
      expectVoice([forecastLine(vm.plant)]);
    }
  });

  it('Progress, the year strip and the records on the demo and on a quiet first week', () => {
    const lines: (string | null)[] = [];
    const add = (s: typeof demo, env: ViewEnv) => {
      const p = progressVM(s, env);
      lines.push(
        showedUpLine(p.showedUp),
        monthSoFarLine({ month: p.hero.month, ...p.hero.daysSoFar }),
        soFarLine(p.hero.tally),
        weekLine(p.week.tally),
        trendLine(p.trend),
        goalsLine(p.goals),
        restsLine(p.rests),
        ...p.recentMonths.map(monthBarLabel),
        ...recordLines(p.records),
        ...insightLines(p.insights),
      );
      if (p.trend.kind === 'fact') lines.push(bestFactLine(p.trend.fact));
      const year = Number(env.today.slice(0, 4));
      lines.push(yearSummaryLine({ year, ...yearQuiltVM(s, env, year).summary }));
      return p;
    };
    const p = add(demo, demoEnv);
    expect(showedUpLine(p.showedUp)).toMatch(/^You showed up \d+ of the last \d+ days$/);
    for (const d of ['2026-06-15', '2026-08-01', '2026-09-01']) add(demo, { ...demoEnv, today: d, now: at(d, 20) });
    const g = new Game({ start: '2026-03-02' });
    const a = g.addHabit();
    add(g.state, { today: g.today, now: g.now, local: UTC }); // nothing yet: no zeros
    g.checkIn(a);
    add(g.state, { today: g.today, now: g.now, local: UTC });
    expect(expectVoice(lines)).toBeGreaterThan(20);
  });

  it('a phrase that would say 0 has no words at all', () => {
    expect(consistencyText({ kind: 'days', achieved: 0, spanDays: 30, tiny: 0 } as never, 1)).toBeNull();
    expect(statusLine({ kind: 'period', count: 0, target: 3, period: { kind: 'weekly', every: 1 }, current: true })).toBeNull();
    expect(statusLine({ kind: 'rooting', count: 0 })).toBeNull();
    expect(statusLine({ kind: 'none' })).toBeNull();
    expect(goalsLine({ onTrack: 0 })).toBeNull();
    expect(restsLine({ rests: 0, offDays: 0 })).toBeNull();
    expect(showedUpLine({ days: 0, span: 30 })).toBeNull();
    expect(vineChip({ done: 0, total: 0, flexibleCheckins: 0 })).toBeNull();
    expect(yearSummaryLine({ year: 2026, checkins: 0, daysShowedUp: 0 })).toBeNull();
    expect(recordLines({ totalCheckins: 0, tinyCheckins: 0, bestStreak: null, bestMonth: null, perfectDays: 0, showUpDays: 0 })).toEqual([]);
  });
});

describe('how often, in words (VOICE.md §22)', () => {
  it('scheduleText and ruleChangeText', () => {
    expect(scheduleText({ kind: 'daily' })).toBe('Every day');
    expect(scheduleText({ kind: 'days', days: [1, 3, 5] })).toBe('Mon/Wed/Fri');
    expect(scheduleText({ kind: 'days', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Every day');
    expect(scheduleText({ kind: 'weekly', times: 3, every: 1 })).toBe('3 times a week');
    expect(scheduleText({ kind: 'weekly', times: 1, every: 2 })).toBe('Once every 2 weeks');
    expect(scheduleText({ kind: 'monthly', times: 2, every: 1 })).toBe('Twice a month');
    expect(scheduleText({ kind: 'monthly', times: 1, every: 3 })).toBe('Once a quarter');
    expect(scheduleText({ kind: 'monthly', times: 1, every: 12 })).toBe('Once a year');
    expect(ruleChangeText({ date: '2026-09-22', first: true, schedule: { kind: 'daily' }, target: 8, unit: 'glasses' })).toBe('Since Sep 22: Every day · 8 glasses');
    expect(ruleChangeText({ date: '2026-10-06', first: false, schedule: { kind: 'days', days: [1, 3, 5] }, target: 1, unit: null })).toBe('From Oct 6: Mon/Wed/Fri');
    expect(ruleChangeText({ date: '2026-10-06', first: false, schedule: { kind: 'daily' }, target: 3, unit: null })).toBe('From Oct 6: Every day · 3');
    for (const sc of SCHEDULES) expect(voiceProblems(scheduleText(sc)), scheduleText(sc)).toEqual([]);
  });
});

describe('the Shelf tab shows your closest pet (DESIGN §1 Many animals)', () => {
  it('petsVM.closest: the most friendship, ties to who came home first; null before any pet', async () => {
    const { petsVM } = await import('@/state/views/pets');
    const g = new Game();
    expect(petsVM(g.state).closest).toBeNull();
    const cow = 'pet-cow-jersey';
    const cat = 'pet-cat-orange';
    g.state = { ...g.state, pets: { [cat]: newPetState(cat, g.rng, g.now, g.today, true), [cow]: newPetState(cow, g.rng, g.now + 1, g.today, true) } };
    expect(petsVM(g.state).closest).toEqual({ id: cat, species: 'cat' });
    g.state = { ...g.state, pets: { ...g.state.pets, [cow]: { ...g.state.pets[cow]!, xp: 60 } } };
    expect(petsVM(g.state).closest).toEqual({ id: cow, species: 'cow' });
    const demoClosest = petsVM(demo).closest!;
    expect(demoClosest.id).toBe(Object.values(demo.pets).sort((a, b) => b.xp - a.xp || a.obtainedAt - b.obtainedAt)[0]!.id);
  });

  it('the tab bar and the sidebar draw that species on the Shelf tab, and a sprig before the first pet', async () => {
    const { closestPet } = await import('@/state/views/pets');
    const { state } = await import('@/state/store');
    const { shelfTabSpecies, tabSpecies } = await import('@/app/shelfTab');
    const g = new Game();
    const cow = 'pet-cow-jersey';
    state.value = { ...g.state, pets: {} };
    expect(shelfTabSpecies.value).toBeNull();
    state.value = { ...g.state, pets: { [cow]: newPetState(cow, g.rng, g.now, g.today, true) } };
    expect(shelfTabSpecies.value).toBe('cow');
    expect(tabSpecies('shelf')).toBe('cow');
    expect(tabSpecies('today')).toBeUndefined();
    const { petsVM } = await import('@/state/views/pets');
    expect(closestPet(demo)).toEqual(petsVM(demo).closest);
  });
});

describe('the month jar (DESIGN §13, Pressing Day)', () => {
  it('holds one stem per habit watered since the 1st, in habit order, and nothing from last month', () => {
    const [a, b] = demo.habits;
    const s: Pick<typeof demo, 'habits' | 'logs'> = { habits: demo.habits, logs: { [a!.id]: { '2026-09-01': { kind: 'log' as const, count: 1 } }, [b!.id]: { '2026-08-31': { kind: 'log' as const, count: 1 }, '2026-09-02': { kind: 'rest' as const } } } };
    expect(monthJarStems(s, '2026-09-29')).toEqual([{ habitId: a!.id, plant: a!.plant }]);
    expect(monthJarStems(s, '2026-10-01')).toEqual([]);
    const vm = todayVM(demo, demoEnv);
    expect(vm.monthJar.length).toBeGreaterThan(0);
    expect(vm.monthJar.every((m) => demo.habits.some((h) => h.id === m.habitId && h.plant === m.plant))).toBe(true);
  });
});

describe('the first-capsule card (VOICE §16 step 6)', () => {
  it('says the capsule is waiting while it is still on the house, and to water anything once it is not', () => {
    const fresh = { ...demo, profile: { ...demo.profile, onboarded: true }, lifetime: { ...demo.lifetime, pulls: 0 }, ledger: { ...demo.ledger, once: {} } };
    expect(todayVM(fresh, demoEnv)).toMatchObject({ firstCapsule: true, firstCapsuleWaiting: true });
    const taken = { ...fresh, ledger: { ...fresh.ledger, once: { [FIRST_CAPSULE_KEY]: true as const } } };
    expect(todayVM(taken, demoEnv)).toMatchObject({ firstCapsule: true, firstCapsuleWaiting: false });
    expect(todayVM(demo, demoEnv).firstCapsuleWaiting).toBe(false);
  });
});
