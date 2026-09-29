import { describe, expect, it } from 'vitest';
import { addTally, EMPTY_TALLY, enqueueBanner, formatTally, planCelebration, type BannerSpec, type CelebrationContext } from '@/fx/celebrationPlan';
import { BADGE_BY_ID } from '@/catalog/badges';
import type { GameEvent } from '@/state/api';

const ctx = (locallyCelebrated: string[] = []): CelebrationContext => ({
  habit: (id) => ({ 'h-walk': { name: 'Walk', plant: 'sunflower' as const, pot: 'terracotta' as const }, 'h-yoga': { name: 'Yoga', plant: 'lavender' as const, pot: 'blush' as const } })[id],
  petName: (id) => (id === 'pet-mochi' ? 'Mochi' : 'Patches'),
  itemName: (id) => ({ 'wear-evergreen-crown': 'Evergreen Crown', 'treat-strawberry': 'Strawberry' })[id] ?? 'Thing',
  itemFlavor: () => 'Never wilts.',
  badge: (id) => BADGE_BY_ID.get(id),
  buddy: 'pet-mochi',
  locallyCelebrated: new Set(locallyCelebrated),
});

const checkin = (habitId: string, amount = 5): GameEvent => ({ type: 'coins', amount, reason: 'checkin', habitId });

describe('planCelebration', () => {
  it('stays quiet about check-in coins the screen already celebrated', () => {
    const plan = planCelebration([checkin('h-walk'), { type: 'checkin', habitId: 'h-walk', date: '2026-09-29', completed: true, count: 1, target: 1 }], ctx(['h-walk']));
    expect(plan.banner).toBeNull();
    expect(plan.toasts).toEqual([]);
    expect(plan.wallet).toEqual(EMPTY_TALLY);
  });

  it('puts unclaimed check-in coins in the wallet tally (one calm toast, not one per check-in)', () => {
    const plan = planCelebration([checkin('h-walk'), checkin('h-yoga', 8)], ctx());
    expect(plan.wallet.coins).toBe(13);
    expect(plan.toasts).toEqual([]);
  });

  it('never celebrates refunds', () => {
    expect(planCelebration([{ type: 'coins', amount: 5, reason: 'refund' }], ctx()).wallet.coins).toBe(0);
  });

  it('a perfect day gets a banner that carries its coins', () => {
    const plan = planCelebration([{ type: 'perfectDay', date: '2026-09-29', coins: 10 }, { type: 'coins', amount: 10, reason: 'perfect' }], ctx());
    expect(plan.banner).toMatchObject({ kind: 'perfectDay', epic: false, rewards: { coins: 10 } });
    expect(plan.banner!.text).toContain('Mochi');
    expect(plan.wallet).toEqual(EMPTY_TALLY);
  });

  it('stacked moments coalesce into ONE banner led by the highest priority', () => {
    const events: GameEvent[] = [
      { type: 'perfectDay', date: '2026-09-29', coins: 12 },
      { type: 'coins', amount: 12, reason: 'perfect' },
      { type: 'milestone', habitId: 'h-walk', rung: 30, unit: 'days', coins: 60, stars: 2, tickets: 1 },
      { type: 'coins', amount: 60, reason: 'milestone' },
      { type: 'stars', amount: 2, reason: 'milestone' },
      { type: 'tickets', amount: 1 },
      { type: 'badge', badgeId: 'checkins-50', stars: 2 },
      { type: 'periodGoal', habitId: 'h-yoga', period: 'week', coins: 10 },
    ];
    const plan = planCelebration(events, ctx());
    expect(plan.banner?.kind).toBe('milestone');
    expect(plan.banner?.title).toBe('30 days of Walk!');
    expect(plan.banner?.confetti).toBe('big');
    expect(plan.banner?.also).toEqual(['Perfect day', 'Fifty & Flourishing badge']);
    expect(plan.banner?.rewards).toEqual({ coins: 72, stars: 2, tickets: 1, stardust: 0 });
    expect(plan.toasts).toEqual([]);
  });

  it('exclusive rewards become the epic moment, even when they arrive inside a milestone', () => {
    const plan = planCelebration([{ type: 'milestone', habitId: 'h-walk', rung: 90, unit: 'days', coins: 120, stars: 4, tickets: 1, exclusive: 'wear-evergreen-crown' }], ctx());
    expect(plan.banner).toMatchObject({ kind: 'exclusive', epic: true, title: 'Evergreen Crown', confetti: 'epic', sound: 'reveal-ultra' });
    expect(plan.banner?.also).toEqual(['90 days of Walk']);
  });

  it('only Blooming and Evergreen plants get banners; other stages are gentle toasts', () => {
    expect(planCelebration([{ type: 'plantStage', habitId: 'h-yoga', stage: 5, stageName: 'Blooming' }], ctx()).banner?.kind).toBe('plant');
    const small = planCelebration([{ type: 'plantStage', habitId: 'h-yoga', stage: 2, stageName: 'Seedling' }], ctx());
    expect(small.banner).toBeNull();
    expect(small.toasts[0]?.message).toBe('Yoga grew into a Seedling 🌱');
  });

  it('small moments toast on their own, with their bonus coins in the wallet tally', () => {
    const plan = planCelebration([{ type: 'welcomeBack', habitId: 'h-walk', coins: 3 }, { type: 'coins', amount: 3, reason: 'welcome' }], ctx());
    expect(plan.banner).toBeNull();
    expect(plan.toasts.map((t) => t.message)).toEqual(['Welcome back to Walk! 🌷']);
    expect(plan.wallet.coins).toBe(3);
  });

  it('letters still toast next to a banner (they point to the inbox)', () => {
    const plan = planCelebration([{ type: 'badge', badgeId: 'first-checkin', stars: 1 }, { type: 'letter', letterId: 'w1' }], ctx());
    expect(plan.banner?.kind).toBe('badge');
    expect(plan.toasts.map((t) => t.key)).toEqual(['letter']);
  });

  it('pet level 10 is a banner, lower levels are toasts', () => {
    expect(planCelebration([{ type: 'petLevel', petId: 'pet-mochi', level: 10 }], ctx()).banner?.kind).toBe('bestFriends');
    expect(planCelebration([{ type: 'petLevel', petId: 'pet-mochi', level: 3 }], ctx()).toasts[0]?.message).toContain('level 3');
  });

  it('copy never uses guilt words', () => {
    const everything: GameEvent[] = [
      { type: 'perfectDay', date: 'x', coins: 5 },
      { type: 'welcomeBack', habitId: 'h-walk', coins: 3 },
      { type: 'milestone', habitId: 'h-walk', rung: 7, unit: 'days', coins: 25, stars: 1, tickets: 0 },
      { type: 'plantStage', habitId: 'h-walk', stage: 7, stageName: 'Evergreen' },
    ];
    const plan = planCelebration(everything, ctx());
    const text = JSON.stringify(plan).toLowerCase();
    for (const word of ['failed', 'lost', 'broken', 'missed', 'streak lost']) expect(text).not.toContain(word);
  });
});

describe('banner queue & tallies', () => {
  const banner = (title: string, epic = false): BannerSpec => ({ kind: 'badge', priority: 60, eyebrow: '', title, text: '', also: [], rewards: { coins: 1, stars: 1, tickets: 0, stardust: 0 }, art: { type: 'badge', badgeId: 'x' }, tone: 'blush', epic, confetti: 'medium', sound: 'fanfare' });

  it('queues up to the limit, then merges newcomers into the last waiting banner', () => {
    let q: BannerSpec[] = [];
    for (const t of ['a', 'b', 'c', 'd', 'e']) q = enqueueBanner(q, banner(t));
    expect(q.map((b) => b.title)).toEqual(['a', 'b', 'c']);
    expect(q[2]!.also).toEqual(['d', 'e']);
    expect(q[2]!.rewards).toEqual({ coins: 3, stars: 3, tickets: 0, stardust: 0 });
  });

  it('never merges an epic moment away', () => {
    let q: BannerSpec[] = [banner('a'), banner('b'), banner('c')];
    q = enqueueBanner(q, banner('crown', true));
    expect(q.at(-1)?.title).toBe('crown');
  });

  it('adds and formats tallies', () => {
    expect(formatTally(addTally({ coins: 5, stars: 0, tickets: 0, stardust: 0 }, { coins: 13, stars: 1, tickets: 2, stardust: 4 }))).toBe('+18 coins · +1 star · +2 tickets · +4 stardust');
    expect(formatTally({ coins: 1, stars: 0, tickets: 0, stardust: 0 })).toBe('+1 coin');
    expect(formatTally(EMPTY_TALLY)).toBe('');
  });
});
