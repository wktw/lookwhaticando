import { describe, expect, it } from 'vitest';
import { planCelebration, type CelebrationContext } from '@/fx/celebrationPlan';
import * as copy from '@/fx/copy';
import { SCREEN_COPY, SHELL_COPY, UPDATE_COPY, INSTALL_COPY } from '@/app/copy';
import { GUIDES } from '@/app/InstallGuide';
import { BADGE_BY_ID } from '@/catalog/badges';
import { PLANTS } from '@/catalog/collectibles';
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
  for (const name of ['Walk', 'Drink water', 'Reading', 'ASMR walk']) {
    for (let stage = 0; stage <= 7; stage++) out.push(copy.stageLine(name, stage), copy.majorStageTitle(name, stage));
    out.push(copy.checkInLine(name), copy.checkInLine(name, { tiny: true }), copy.restLine(name), copy.periodGoalLine(name, 'week'), copy.periodGoalLine(name, 'month'));
    for (const unit of ['days', 'times', 'weeks', 'months'] as const) for (const n of [1, 3, 12]) out.push(copy.rungLine(name, n, unit));
  }
  for (const p of PLANTS) out.push(copy.bloomLine(p.plant));
  out.push(copy.bloomLine(undefined), copy.EVERGREEN_LINE, copy.NOTE_ON_SILL, copy.welcomeHomeLine(0), copy.welcomeHomeLine(1));
  for (const days of [7, 30, 365]) out.push(copy.showUpTitle(days), copy.EXCLUSIVE.forShowingUp(days));
  for (const [stamps, tickets, coins] of [[1, 0, 0], [3, 1, 0], [0, 2, 0], [0, 0, 20], [12, 3, 0]] as const) out.push(copy.enclosedLine({ stamps, tickets, coins }));
  out.push(copy.friendshipLine('Pudding', 3), copy.favouriteLine('Pudding', 'Strawberry'), copy.swapsLine(1), copy.swapsLine(2));
  out.push(copy.BEST_FRIENDS.title('Pudding'), copy.BEST_FRIENDS.text, copy.BEST_FRIENDS.line('Pudding'), copy.pinLine('Perfect Day'));
  out.push(...strings([copy.PERFECT_DAY, copy.SHOWING_UP, copy.PIN, copy.EXCLUSIVE, copy.FX_UI, copy.CURRENCY, copy.STAGE_NAMES]));
  return out;
}

const shell = () => strings([SHELL_COPY, SCREEN_COPY, UPDATE_COPY, INSTALL_COPY, Object.values(GUIDES).map((g) => [g.title, g.steps.map((s) => [s.title, s.text])])]);

describe('the catkin voice (DESIGN §12)', () => {
  it('celebrations never use a banned word, an exclamation mark, an emoji or a pronoun', () => {
    const texts = planned();
    expect(texts.length).toBeGreaterThan(30);
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

  it('stages use their names, and plants are named by their habit', () => {
    expect(copy.STAGE_NAMES).toEqual(['Cutting', 'Rooting', 'Potted', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen']);
    expect(copy.stageLine('Reading', 2)).toBe('Your reading plant is potted up.');
    expect(copy.majorStageTitle('Yoga', 5)).toBe('Your yoga plant is blooming');
    expect(copy.stageLine('ASMR walk', 3)).toBe('Your ASMR walk plant is leafy now.');
  });

  it('says the lines from the design', () => {
    expect(copy.checkInLine('Walk')).toBe('Walk, watered.');
    expect(copy.restLine('Yoga')).toBe('Yoga is resting today. Nothing here wilts.');
    expect(copy.welcomeHomeLine(1)).toBe('Everything kept. There’s a ticket on the sill.');
    expect(`${copy.PERFECT_DAY.title}. ${copy.PERFECT_DAY.text}`).toBe('Everything’s watered. The whole sill is in the sun.');
    expect(copy.enclosedLine({ stamps: 3 })).toBe('3 stamps, enclosed.');
    expect(copy.enclosedLine({ stamps: 3, tickets: 1 })).toBe('3 stamps and a ticket, enclosed.');
  });
});
