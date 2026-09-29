import { describe, expect, it } from 'vitest';
import { addTally, EMPTY_TALLY, enqueueBanner, eventWeight, formatTally, planCelebration, walletDelta, type BannerSpec, type CelebrationContext } from '@/fx/celebrationPlan';
import { BADGE_BY_ID } from '@/catalog/badges';
import type { GameEvent } from '@/state/api';
import { SPECIES_COLOURS } from '@/fx/petalColours';

const ctx = (locallyCelebrated: string[] = []): CelebrationContext => ({
  habit: (id) => ({ 'h-walk': { name: 'Walk', plant: 'pothos' as const, pot: 'terracotta' as const }, 'h-yoga': { name: 'Yoga', plant: 'lavender' as const, pot: 'blush' as const } })[id],
  petName: (id) => (id === 'pet-cat-orange' ? 'Pudding' : 'Juniper'),
  itemName: (id) => ({ 'wear-laurel-sprig': 'Laurel Sprig', 'decor-window-seat': 'The Window Seat', 'treat-strawberry': 'Strawberry' })[id] ?? 'Thing',
  itemFlavor: () => 'Tucked behind one ear.',
  badge: (id) => BADGE_BY_ID.get(id),
  buddy: 'pet-cat-orange',
  locallyCelebrated: new Set(locallyCelebrated),
});

const checkin = (habitId: string, amount = 5): GameEvent => ({ type: 'coins', amount, reason: 'checkin', habitId });

describe('planCelebration', () => {
  it('stays quiet about check-in coins the screen already celebrated', () => {
    const plan = planCelebration([checkin('h-walk'), { type: 'checkin', habitId: 'h-walk', date: '2026-09-29', completed: true, tiny: false, count: 1, target: 1 }], ctx(['h-walk']));
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

  it('a perfect day gets a note in the band that carries its coins, in the design’s words', () => {
    const plan = planCelebration(
      [
        { type: 'perfectDay', date: '2026-09-29', coins: 10 },
        { type: 'coins', amount: 10, reason: 'perfect' },
      ],
      ctx(),
    );
    expect(plan.banner).toMatchObject({ kind: 'perfectDay', epic: false, rewards: { coins: 10 }, title: 'Everything’s watered', text: 'The whole sill is in the sun.' });
    expect(plan.banner!.art).toEqual({ type: 'pet', petId: 'pet-cat-orange', expression: 'sleep' });
    expect(plan.wallet).toEqual(EMPTY_TALLY);
  });

  it('stacked moments coalesce into ONE note led by the highest priority', () => {
    const events: GameEvent[] = [
      { type: 'perfectDay', date: '2026-09-29', coins: 12 },
      { type: 'coins', amount: 12, reason: 'perfect' },
      { type: 'showUp', days: 30, stars: 2, tickets: 1 },
      { type: 'rung', habitId: 'h-walk', streak: 30, unit: 'days', tierDays: 30, coins: 60 },
      { type: 'coins', amount: 60, reason: 'rung' },
      { type: 'stars', amount: 2, reason: 'showup' },
      { type: 'tickets', amount: 1 },
      { type: 'badge', badgeId: 'checkins-50', stars: 2 },
      { type: 'periodGoal', habitId: 'h-yoga', period: 'week', coins: 10 },
    ];
    const plan = planCelebration(events, ctx());
    expect(plan.banner?.kind).toBe('milestone');
    expect(plan.banner?.title).toBe('30 days of showing up');
    expect(plan.banner?.text).toBe('2 stamps and a ticket, enclosed.');
    expect(plan.banner?.confetti).toBe('big');
    expect(plan.banner?.also).toEqual(['Perfect day', 'Fifty waterings pin']);
    expect(plan.banner?.rewards).toEqual({ coins: 72, stars: 2, tickets: 1, stardust: 0 });
    expect(plan.toasts).toEqual([]);
  });

  it('exclusive rewards become the calm epic moment, even when they arrive inside a milestone', () => {
    const plan = planCelebration([{ type: 'showUp', days: 365, stars: 12, tickets: 3, exclusive: 'decor-window-seat' }], ctx());
    expect(plan.banner).toMatchObject({ kind: 'exclusive', epic: true, title: 'The Window Seat', eyebrow: 'For 365 days of showing up', sound: 'reveal-ultra' });
    // The eyebrow already says it: no repeated "365 days of showing up" line.
    expect(plan.banner?.also).toEqual([]);
  });

  it('the Laurel Sprig says what it was for', () => {
    const plan = planCelebration(
      [
        { type: 'plantStage', habitId: 'h-walk', stage: 7, stageName: 'Evergreen' },
        { type: 'exclusive', collectibleId: 'wear-laurel-sprig' },
      ],
      ctx(),
    );
    expect(plan.banner).toMatchObject({ kind: 'exclusive', title: 'Laurel Sprig', eyebrow: 'For the first evergreen plant' });
    expect(plan.banner?.also).toEqual(['Your walk plant is evergreen']);
  });

  it('only Blooming and Evergreen plants get notes in the band; other stages are small notes', () => {
    expect(planCelebration([{ type: 'plantStage', habitId: 'h-yoga', stage: 5, stageName: 'Blooming' }], ctx()).banner?.kind).toBe('plant');
    const small = planCelebration([{ type: 'plantStage', habitId: 'h-yoga', stage: 2, stageName: 'Potted' }], ctx());
    expect(small.banner).toBeNull();
    expect(small.toasts[0]?.message).toBe('Your yoga plant is potted up.');
  });

  it('every growth stage reads as a plain sentence, using the stage names', () => {
    const say = (stage: number, stageName: string) => {
      const plan = planCelebration([{ type: 'plantStage', habitId: 'h-yoga', stage, stageName }], ctx());
      return plan.banner?.title ?? plan.toasts[0]?.message;
    };
    expect(say(1, 'Rooting')).toBe('Your yoga plant is rooting.');
    expect(say(2, 'Potted')).toBe('Your yoga plant is potted up.');
    expect(say(3, 'Leafy')).toBe('Your yoga plant is leafy now.');
    expect(say(4, 'Budding')).toBe('Your yoga plant is budding.');
    expect(say(5, 'Blooming')).toBe('Your yoga plant is blooming');
    expect(say(6, 'Flourishing')).toBe('Your yoga plant is flourishing.');
    expect(say(7, 'Evergreen')).toBe('Your yoga plant is evergreen');
  });

  it('a bloom is described the way that species blooms', () => {
    const bloom = (habitId: string) => planCelebration([{ type: 'plantStage', habitId, stage: 5, stageName: 'Blooming' }], ctx()).banner;
    expect(bloom('h-yoga')).toMatchObject({ eyebrow: 'Blooming', text: 'The lavender is in flower.' });
    expect(bloom('h-walk')?.text).toBe('The pothos is trailing past the edge of the sill.');
    expect(planCelebration([{ type: 'plantStage', habitId: 'h-walk', stage: 7, stageName: 'Evergreen' }], ctx()).banner?.text).toBe('It has grown past the top of the window frame.');
  });

  it('a bloom lets fall its own flowers; a perfect day, the flowers and leaves on the sill', () => {
    const bloom = planCelebration([{ type: 'plantStage', habitId: 'h-yoga', stage: 5, stageName: 'Blooming' }], ctx()).banner;
    expect(bloom?.petals).toMatchObject({ colors: [...SPECIES_COLOURS.lavender.flowers], shapes: ['petal', 'leaf'] });
    const sill = { ...ctx(), sill: () => ['pothos', 'sunflower'] as const };
    const perfect = planCelebration([{ type: 'perfectDay', date: '2026-09-29', coins: 10 }], sill).banner;
    expect(perfect?.petals?.colors).toEqual([...SPECIES_COLOURS.sunflower.flowers]);
    expect(perfect?.petals?.leafColors).toEqual(expect.arrayContaining([...SPECIES_COLOURS.pothos.leaves]));
    // Nothing on the sill flowers: leaves only, never a pastel confetti mix.
    const green = planCelebration([{ type: 'perfectDay', date: '2026-09-29', coins: 10 }], { ...ctx(), sill: () => ['pothos'] as const }).banner;
    expect(green?.petals?.shapes).toEqual(['leaf']);
  });

  it('a small growth step without a known habit shows the pot once it is potted up', () => {
    const art = (stage: number) => planCelebration([{ type: 'plantStage', habitId: 'h-gone', stage, stageName: 'x' }], ctx()).toasts[0]?.art;
    expect(art(1)).toEqual({ type: 'object', name: 'cutting' });
    expect(art(2)).toEqual({ type: 'object', name: 'pot' });
  });

  it('one small moment carries its own rewards: one note, not a second "+3 coins" one', () => {
    const plan = planCelebration(
      [
        { type: 'welcomeHome', coins: 3, tickets: 1 },
        { type: 'coins', amount: 3, reason: 'home' },
      ],
      ctx(),
    );
    expect(plan.banner).toBeNull();
    expect(plan.toasts.map((t) => t.message)).toEqual(['Everything kept. There’s a ticket on the sill.']);
    expect(plan.toasts[0]?.rewards).toEqual({ coins: 3, stars: 0, tickets: 0, stardust: 0 });
    expect(plan.wallet).toEqual(EMPTY_TALLY);
  });

  it('several small moments keep the shared wallet toast for their coins', () => {
    const plan = planCelebration(
      [
        { type: 'welcomeHome', coins: 3, tickets: 0 },
        { type: 'coins', amount: 3, reason: 'home' },
        { type: 'letter', letterId: 'w1' },
      ],
      ctx(),
    );
    expect(plan.toasts.every((t) => !t.rewards)).toBe(true);
    expect(plan.wallet.coins).toBe(3);
  });

  it('a note on the sill still gets its own note next to a banner (it points somewhere)', () => {
    const plan = planCelebration(
      [
        { type: 'badge', badgeId: 'first-checkin', stars: 1 },
        { type: 'letter', letterId: 'w1' },
      ],
      ctx(),
    );
    expect(plan.banner?.kind).toBe('badge');
    expect(plan.toasts.map((t) => t.key)).toEqual(['letter']);
  });

  it('friendship level 10 is a note in the band, lower levels are small notes; pets are named, never pronouned', () => {
    expect(planCelebration([{ type: 'petLevel', petId: 'pet-cat-orange', level: 10 }], ctx()).banner).toMatchObject({ kind: 'bestFriends', title: 'Pudding and you' });
    expect(planCelebration([{ type: 'petLevel', petId: 'pet-cat-orange', level: 3 }], ctx()).toasts[0]?.message).toBe('Pudding reached friendship level 3.');
    expect(planCelebration([{ type: 'favoriteFound', petId: 'pet-cat-orange', treatId: 'treat-strawberry' }], ctx()).toasts[0]?.message).toBe('Strawberry is Pudding’s favourite.');
  });

  it('notes on the sill, goals and rungs say it plainly', () => {
    expect(planCelebration([{ type: 'letter', letterId: 'w1' }], ctx()).toasts[0]?.message).toBe('There’s a note on the sill.');
    expect(planCelebration([{ type: 'periodGoal', habitId: 'h-yoga', period: 'week', coins: 10 }], ctx()).toasts[0]?.message).toBe('Yoga, done for the week.');
    expect(planCelebration([{ type: 'rung', habitId: 'h-walk', streak: 12, unit: 'days', tierDays: 14, coins: 30 }], ctx()).toasts[0]?.message).toBe('Walk, 12 days.');
    expect(planCelebration([{ type: 'stars', amount: 1, reason: 'fusion' }], ctx()).toasts[0]?.message).toBe('10 swaps became 1 stamp.');
  });

  it('copy never uses guilt words', () => {
    const everything: GameEvent[] = [
      { type: 'perfectDay', date: 'x', coins: 5 },
      { type: 'welcomeHome', coins: 20, tickets: 1 },
      { type: 'rung', habitId: 'h-walk', streak: 7, unit: 'days', tierDays: 7, coins: 20 },
      { type: 'plantStage', habitId: 'h-walk', stage: 7, stageName: 'Evergreen' },
    ];
    const plan = planCelebration(everything, ctx());
    const text = JSON.stringify(plan).toLowerCase();
    for (const word of ['failed', 'lost', 'broken', 'missed', 'streak lost']) expect(text).not.toContain(word);
  });
});

describe('event helpers (used in the gesture, before planning)', () => {
  it('reserves exactly the coins and stars that will fly (never refunds or fused stars)', () => {
    expect(walletDelta(checkin('h-walk'))).toEqual({ kind: 'coins', amount: 5 });
    expect(walletDelta({ type: 'stars', amount: 2, reason: 'showup' })).toEqual({ kind: 'stars', amount: 2 });
    expect(walletDelta({ type: 'coins', amount: 5, reason: 'refund' })).toBeNull();
    expect(walletDelta({ type: 'stars', amount: 1, reason: 'fusion' })).toBeNull();
    expect(walletDelta({ type: 'tickets', amount: 1 })).toBeNull();
  });

  it('weighs moments like the plan does: banners are big, toasts small, coins silent', () => {
    expect(eventWeight({ type: 'perfectDay', date: 'x', coins: 5 })).toBe('big');
    expect(eventWeight({ type: 'plantStage', habitId: 'h', stage: 5, stageName: 'Blooming' })).toBe('big');
    expect(eventWeight({ type: 'plantStage', habitId: 'h', stage: 3, stageName: 'Leafy' })).toBe('small');
    expect(eventWeight({ type: 'petLevel', petId: 'p', level: 10 })).toBe('big');
    expect(eventWeight({ type: 'letter', letterId: 'w' })).toBe('small');
    expect(eventWeight(checkin('h-walk'))).toBeNull();
  });
});

describe('banner queue & tallies', () => {
  const banner = (title: string, epic = false): BannerSpec => ({
    kind: 'badge',
    priority: 60,
    eyebrow: '',
    title,
    text: '',
    also: [],
    rewards: { coins: 1, stars: 1, tickets: 0, stardust: 0 },
    art: { type: 'badge', badgeId: 'x' },
    tone: 'blush',
    epic,
    confetti: 'medium',
    sound: 'fanfare',
  });

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
    expect(formatTally(addTally({ coins: 5, stars: 0, tickets: 0, stardust: 0 }, { coins: 13, stars: 1, tickets: 2, stardust: 4 }))).toBe('+18 coins · +1 stamp · +2 tickets · +4 swaps');
    expect(formatTally({ coins: 1, stars: 0, tickets: 0, stardust: 0 })).toBe('+1 coin');
    expect(formatTally(EMPTY_TALLY)).toBe('');
  });
});
