import { describe, expect, it } from 'vitest';
import { planCelebration, type CelebrationContext } from '@/fx/celebrationPlan';
import * as copy from '@/fx/copy';
import { SCREEN_COPY, SHELL_COPY, UPDATE_COPY, INSTALL_COPY } from '@/app/copy';
import { GUIDES } from '@/app/InstallGuide';
import { BADGE_BY_ID } from '@/catalog/badges';
import { PLANTS } from '@/catalog/collectibles';
import { SPECIES } from '@/catalog/types';
import type { GameEvent } from '@/state/api';

/** DESIGN §12: what the narrator never says. */
const BANNED: [string, RegExp][] = [
  ['puns', /\b(purr?fect|pawsome|moo-?tivation|un-?bee-?lievable|hoppy|toadally)\b/i],
  ['cheerleading', /\b(yay|woo+|hooray|bestie|you got this|go you|look at you go|so proud)\b/i],
  ['cozy', /\bco[sz]y\b/i],
  ['platitudes', /\b(at your own pace|every step counts|progress not perfection)\b/i],
  ['guilt', /\b(missed|failed|fail|lost|broken|behind|forgot|streak lost|don'?t break)\b/i],
  ['a streak of 0', /\b0 (days?|in a row|weeks?)\b|streak of 0/i],
  ['baby talk', /\b(teeny|widdle|smol|wittle|tummy)\b/i],
  ['exclamation marks', /!/],
  ['straight apostrophes', /'/],
  ['numbers of friendship', /friendship level \d/i],
  ['a possessive on her plant', /\byour \w+ plant\b/i],
  ['old words', /\b(stars?dust|badge|unlock|level up|congratulations|check in|streak|done for the)\b/i],
  ['emoji', /\p{Extended_Pictographic}/u],
  // Pets are never given a pronoun, and the narrator doesn't gender anyone.
  ['pronouns', /\b(she|he|her|hers|him|his|herself|himself)\b/i],
];

function lint(texts: string[]) {
  const found: string[] = [];
  for (const text of texts) for (const [rule, re] of BANNED) if (re.test(text)) found.push(`${rule}: "${text}"`);
  return found;
}

const ctx: CelebrationContext = {
  habit: (id) => ({ 'h-walk': { name: 'Walk', plant: 'pothos' as const, pot: 'terracotta' as const }, 'h-read': { name: 'Reading', plant: 'begonia' as const, pot: 'cream' as const } })[id],
  petName: () => 'Pudding',
  itemName: (id) => ({ 'decor-window-seat': 'The Window Seat', 'wear-laurel-sprig': 'Laurel Sprig', 'treat-strawberry': 'Strawberry' })[id] ?? 'Thing',
  itemFlavor: () => 'A cushioned seat built into the window. A year of showing up.',
  badge: (id) => BADGE_BY_ID.get(id),
  buddy: 'pet-cat-orange',
  locallyCelebrated: new Set(),
};

/** One of every event, alone and all together. */
const EVERYTHING: GameEvent[] = [
  { type: 'coins', amount: 5, reason: 'checkin', habitId: 'h-walk' },
  { type: 'stars', amount: 2, reason: 'showup' },
  { type: 'stars', amount: 1, reason: 'fusion' },
  { type: 'tickets', amount: 1 },
  { type: 'stardust', amount: 8, fused: 1 },
  { type: 'perfectDay', date: '2026-09-29', coins: 10 },
  { type: 'periodGoal', habitId: 'h-walk', period: 'week', coins: 10 },
  { type: 'periodGoal', habitId: 'h-read', period: 'month', coins: 20 },
  { type: 'welcomeHome', coins: 20, tickets: 1 },
  { type: 'welcomeHome', coins: 20, tickets: 0 },
  { type: 'rung', habitId: 'h-walk', streak: 7, unit: 'days', tierDays: 7, coins: 20 },
  { type: 'rung', habitId: 'h-read', streak: 1, unit: 'weeks', tierDays: 7, coins: 20 },
  { type: 'showUp', days: 30, stars: 3, tickets: 1 },
  { type: 'showUp', days: 365, stars: 12, tickets: 3, exclusive: 'decor-window-seat' },
  ...[1, 2, 3, 4, 5, 6, 7].map((stage): GameEvent => ({ type: 'plantStage', habitId: 'h-read', stage, stageName: copy.STAGE_NAMES[stage]! })),
  { type: 'badge', badgeId: 'first-perfect-day', stars: 1 },
  { type: 'exclusive', collectibleId: 'wear-laurel-sprig' },
  { type: 'petLevel', petId: 'pet-cat-orange', level: 3 },
  { type: 'petLevel', petId: 'pet-cat-orange', level: 10 },
  { type: 'favoriteFound', petId: 'pet-cat-orange', treatId: 'treat-strawberry' },
  { type: 'letter', letterId: 'w1' },
  { type: 'restock', treats: 2 },
  { type: 'harvest', habitId: 'h-walk', treatId: 'treat-catgrass', firstTime: true },
  { type: 'album', albumId: 'dogs', stars: 5 },
  { type: 'album', albumId: 'cats', stars: 0, exclusive: 'decor-reading-chair' },
  { type: 'foundThing', petId: 'pet-cat-orange', date: '2026-09-29', seed: 3, swaps: 1 },
  { type: 'companion', petId: 'pet-cat-orange', habitId: 'h-read' },
  { type: 'companionXp', petId: 'pet-cat-orange', habitId: 'h-read', date: '2026-09-29', xp: 3 },
  { type: 'story', petId: 'pet-cat-orange', habitId: 'h-read', story: 'start' },
  { type: 'keepsake', keepsakeId: 'k-h-read-5', petId: 'pet-cat-orange', habitId: 'h-read', stage: 5, kind: 'read' },
  { type: 'look', habitId: 'h-read', colour: 'dawn', shape: 'paired', read: 'bloom' },
  { type: 'seasonReview', season: 'summer', key: '2026-09-22' },
  { type: 'retired', habitId: 'h-walk', ribbon: true },
  { type: 'petLevel', petId: 'pet-cat-orange', level: 12 },
];

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') return [];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

/** Every line the plan can say (titles, texts, also-lines, eyebrows, notes). */
function planned(): string[] {
  const plans = [...EVERYTHING.map((e) => planCelebration([e], ctx)), planCelebration(EVERYTHING, ctx)];
  return plans.flatMap((p) => [
    ...(p.banner ? [p.banner.eyebrow, p.banner.title, p.banner.text, ...p.banner.also] : []),
    ...p.toasts.map((t) => t.message),
  ]);
}

/** Every line the copy helpers can produce, with realistic names. */
function helpers(): string[] {
  const out: string[] = [];
  for (const name of ['Walk', 'Drink water', 'Reading', 'ASMR walk', 'Tidy for 10 minutes']) {
    for (const p of PLANTS) {
      const habit = { name, plant: p.plant };
      for (let stage = 0; stage <= 7; stage++) out.push(copy.stageLine(habit, stage), copy.majorStageTitle(habit, stage));
      out.push(copy.bloomLine(habit), copy.companionLine('Pudding', habit), copy.lookLine(habit, 'twilight', 'paired'), copy.lookLine(habit, 'dawn', 'classic'));
    }
    for (const kind of ['watered', 'count', 'tiny', 'noCoins', 'history'] as const) out.push(copy.checkInLine(kind, { habit: name, count: 8, unit: 'glasses', date: 'Sat, Sep 27' }));
    out.push(copy.restLine(name), copy.periodGoalLine(name, 'week'), copy.periodGoalLine(name, 'month'), copy.storyLine(name));
    for (const refunded of [0, 1, 5]) out.push(copy.uncheckLine(name, { refunded }), copy.uncheckLine(name, { refunded, spent: true }));
    for (const unit of ['days', 'times', 'weeks', 'months'] as const) for (const n of [1, 3, 12]) out.push(copy.rungLine(name, n, unit), copy.rungLine(name, n, unit, true));
  }
  out.push(copy.stageLine(undefined, 3), copy.EVERGREEN_LINE, copy.NOTE_ON_SILL, copy.welcomeHomeLine(0), copy.welcomeHomeLine(1));
  for (const days of [7, 30, 365]) out.push(copy.showUpTitle(days), copy.showUpLine(days), copy.EXCLUSIVE.forShowingUp(days));
  for (const [stamps, tickets] of [[1, 0], [3, 1], [0, 2], [12, 3]] as const) out.push(copy.showUpText({ stamps, tickets }));
  for (let level = 1; level <= 15; level++) for (const sp of SPECIES) out.push(copy.friendshipLine('Pudding', level, sp), copy.friendshipLine('Pudding', level, sp, 'Juniper'));
  for (const kind of Object.keys(copy.KEEPSAKE_THINGS) as (keyof typeof copy.KEEPSAKE_THINGS)[]) out.push(copy.keepsakeLine('Pudding', kind));
  for (const seed of [0, 1, 2, 3, 4, 5, 6, 99]) out.push(copy.foundLine('Pudding', seed));
  for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) out.push(copy.seasonReviewLine(season));
  for (const p of PLANTS) out.push(copy.harvestLine(p.plant) ?? '');
  out.push(copy.favouriteLine('Pudding', 'Strawberry'), copy.swapsLine(1), copy.swapsLine(2), copy.wateredBatchLine(3, 14), copy.wateredBatchLine(2, 0));
  out.push(copy.albumTitle('Pond Club'), copy.exclusiveLine('wear-laurel-sprig', 'Laurel Sprig'), copy.exclusiveLine('decor-x', 'Paper Lantern'));
  out.push(copy.BEST_FRIENDS.title('Pudding'), copy.BEST_FRIENDS.text, copy.BEST_FRIENDS.line('Pudding'), copy.pinLine('Fifty waterings'), copy.longDate('2026-09-29'));
  out.push(...strings([copy.PERFECT_DAY, copy.SHOWING_UP, copy.PIN, copy.FIELD_GUIDE, copy.EXCLUSIVE, copy.FX_UI, copy.CURRENCY, copy.STAGE_NAMES]));
  return out.filter(Boolean);
}

const shell = () => strings([SHELL_COPY, SCREEN_COPY, UPDATE_COPY, INSTALL_COPY, Object.values(GUIDES).map((g) => [g.title, g.steps.map((s) => [s.title, s.text])])]);

describe('the catkin voice (DESIGN §12)', () => {
  it('celebrations never use a banned word, an exclamation mark, an emoji or a pronoun', () => {
    const texts = planned();
    expect(texts.length).toBeGreaterThan(40);
    expect(lint(texts)).toEqual([]);
  });

  it('nor does any line the copy helpers can write', () => {
    expect(lint(helpers())).toEqual([]);
  });

  it('nor does the app shell (loading, errors, updates, the install guide)', () => {
    const texts = shell();
    expect(texts.length).toBeGreaterThan(40);
    expect(lint(texts)).toEqual([]);
  });

  it('the lint itself catches what it should', () => {
    expect(lint(['Purrfect!', 'Yay 🌱', 'You missed a day', 'She loves it', 'So cozy', '0 days in a row'])).toHaveLength(8);
  });

  it('stages use their names, and plants are named the way lines.ts names them', () => {
    expect(copy.STAGE_NAMES).toEqual(['Cutting', 'Rooting', 'Potted', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen']);
    expect(copy.stageLine({ name: 'Read', plant: 'pothos' }, 2)).toBe('The Read plant is potted up.');
    expect(copy.stageLine({ name: 'Read', plant: 'pothos' }, 4)).toBe('There’s a bud on the Read plant, still closed tight.');
    expect(copy.majorStageTitle({ name: 'Yoga', plant: 'lavender' }, 5)).toBe('The Yoga plant is Blooming');
    expect(copy.stageLine({ name: 'Tidy for 10 minutes', plant: 'snakeplant' }, 3)).toBe('The snake plant has put out new leaves.');
    expect(copy.bloomLine({ name: 'Walk', plant: 'tulip' })).toBe('The Walk plant has opened a single cup.');
    expect(copy.EVERGREEN_LINE).toBe('There’s a small brass watering can on the pot now.');
  });

  it('says the lines from the copy deck (VOICE.md)', () => {
    expect(copy.checkInLine('watered', { habit: 'Walk' })).toBe('Walk, watered.');
    expect(copy.checkInLine('count', { habit: 'Drink water', count: 8, unit: 'glasses' })).toBe('Drink water, watered. 8 glasses.');
    expect(copy.checkInLine('tiny', { habit: 'Walk' })).toBe('Walk, watered: the tiny version.');
    expect(copy.checkInLine('history', { habit: 'Walk', date: 'Sat, Sep 27' })).toBe('Walk, watered for Sat, Sep 27. History only, no coins.');
    expect(copy.uncheckLine('Walk', { refunded: 5 })).toBe('Walk, not watered after all. The 5 coins went back in the jar.');
    expect(copy.uncheckLine('Walk', { refunded: 1 })).toBe('Walk, not watered after all. The coin went back in the jar.');
    expect(copy.uncheckLine('Walk', { refunded: 0, spent: true })).toBe('Walk, not watered after all. The coins were spent already, and stay spent.');
    expect(copy.uncheckLine('Walk', { refunded: 0 })).toBe('Walk, not watered after all.');
    expect(copy.wateredBatchLine(3, 14)).toBe('3 habits watered. Plus 14 coins.');
    expect(copy.restLine('Yoga')).toBe('Yoga is resting today. Nothing here wilts.');
    expect(copy.welcomeHomeLine(1)).toBe('Everything kept. There’s a ticket on the sill.');
    expect(`${copy.PERFECT_DAY.title}. ${copy.PERFECT_DAY.text}`).toBe('Everything’s watered. The whole sill is in the sun.');
    expect(copy.periodGoalLine('Yoga', 'week')).toBe('Yoga, watered for the week.');
    expect(copy.rungLine('Walk', 7, 'days')).toBe('Walk: 7 days in a row.');
    expect(copy.rungLine('Yoga', 21, 'times')).toBe('Yoga: 21 in a row.');
    expect(copy.rungLine('No snooze', 14, 'days', true)).toBe('No snooze: held off 14 days.');
    expect(copy.showUpText({ stamps: 1 })).toBe('1 stamp, onto the card.');
    expect(copy.showUpText({ stamps: 2, tickets: 1 })).toBe('2 stamps and a ticket.');
    expect(copy.showUpText({ stamps: 6, tickets: 2 })).toBe('6 stamps and 2 tickets.');
    expect(copy.friendshipLine('Pudding', 3, 'cat')).toBe('Pudding slow-blinks back at you now.');
    expect(copy.friendshipLine('Clover', 3, 'cow')).toBe('Clover does a nose-lick when you say hello now.');
    expect(copy.friendshipLine('Pudding', 8, 'cat')).toBe('Pudding naps in the same spot every afternoon now.');
    expect(copy.friendshipLine('Pudding', 8, 'cat', 'Juniper')).toBe('Pudding naps next to Juniper now, most afternoons.');
    expect(copy.companionLine('Pudding', { name: 'Read', plant: 'pothos' })).toBe('Pudding moved into the Read plant.');
    expect(copy.storyLine('Walk')).toBe('There’s a story on the plant tag for Walk.');
    expect(copy.lookLine({ name: 'Walk', plant: 'pothos' }, 'twilight', 'classic')).toBe('A new look for the Walk plant: Twilight.');
    expect(copy.foundLine('Pudding', 5)).toBe('Pudding left a bottle top on the sill.');
    expect(copy.keepsakeLine('Pudding', 'move')).toBe('Pudding left a pebble from the path by the pot.');
    expect(copy.harvestLine('catgrass')).toBe('A pinch of cat grass, into the basket.');
    expect(copy.harvestLine('pothos')).toBeNull();
    expect(copy.favouriteLine('Pudding', 'Strawberry')).toBe('Pudding’s favourite is the strawberry. It’s on the Pet Card now.');
    expect(copy.swapsLine(1)).toBe('The swap shelf is full: 10 swaps, traded for 1 stamp.');
    expect(copy.longDate('2026-09-29')).toBe('Tuesday, September 29');
  });
});
