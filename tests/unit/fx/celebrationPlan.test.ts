import { describe, expect, it } from 'vitest';
import { addTally, EMPTY_TALLY, enqueueBanner, eventWeight, formatTally, planCelebration, quietPlan, walletDelta, type BannerSpec, type CelebrationContext } from '@/fx/celebrationPlan';
import { BADGE_BY_ID } from '@/catalog/badges';
import type { GameEvent } from '@/state/api';
import { SPECIES_COLOURS } from '@/fx/petalColours';

const ctx = (locallyCelebrated: string[] = []): CelebrationContext => ({
  habit: (id) =>
    ({
      'h-walk': { name: 'Walk', plant: 'pothos' as const, pot: 'terracotta' as const, stage: 3 },
      'h-yoga': { name: 'Yoga', plant: 'lavender' as const, pot: 'blush' as const, stage: 5 },
      'h-grass': { name: 'Stretch', plant: 'catgrass' as const, pot: 'terracotta' as const, stage: 5 },
      'h-snooze': { name: 'No snooze', plant: 'snakeplant' as const, pot: 'terracotta' as const, avoid: true },
    })[id],
  petName: (id) => (id === 'pet-cat-orange' ? 'Pudding' : 'Juniper'),
  petSpecies: (id) => (id === 'pet-cat-orange' ? 'cat' : 'cow'),
  albumName: (id) => ({ dogs: 'Dogs', cats: 'Cats' })[id] ?? id,
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
    expect(plan.banner).toMatchObject({ kind: 'perfectDay', epic: false, rewards: { coins: 10 }, eyebrow: 'Tuesday, September 29', title: 'Everything’s watered', text: 'The whole sill is in the sun.' });
    // Under the lamp, the same note says so.
    expect(planCelebration([{ type: 'perfectDay', date: '2026-09-29', coins: 10 }], { ...ctx(), lamplight: () => true }).banner?.text).toBe('The whole sill is in the lamplight.');
    expect(plan.banner!.art).toEqual({ type: 'pet', petId: 'pet-cat-orange', expression: 'sleep' });
    expect(plan.wallet).toEqual(EMPTY_TALLY);
  });

  it('Quiet rewards keeps the moment and drops every amount (DESIGN principle 4)', () => {
    const plan = quietPlan(planCelebration([{ type: 'perfectDay', date: '2026-09-29', coins: 10 }, { type: 'coins', amount: 10, reason: 'perfect' }, checkin('h-yoga', 8)], ctx()));
    expect(plan.banner).toMatchObject({ kind: 'perfectDay', title: 'Everything’s watered', rewards: EMPTY_TALLY });
    expect(plan.wallet).toEqual(EMPTY_TALLY);
    expect(plan.toasts.every((t) => t.rewards === undefined)).toBe(true);
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
    expect(plan.banner?.eyebrow).toBe('Showing up');
    expect(plan.banner?.title).toBe('30 days');
    expect(plan.banner?.text).toBe('2 stamps and a ticket.');
    expect(plan.banner?.confetti).toBe('big');
    // DESIGN §9.1: perfect day > streak rung > pin.
    expect(plan.banner?.also).toEqual(['Everything watered', 'Walk: 30 days in a row']);
    expect(plan.banner?.rewards).toEqual({ coins: 72, stars: 2, tickets: 1, stardust: 0 });
    expect(plan.toasts).toEqual([]);
  });

  it('exclusive rewards become the calm epic moment, even when they arrive inside a milestone', () => {
    const plan = planCelebration([{ type: 'showUp', days: 365, stars: 12, tickets: 3, exclusive: 'decor-window-seat' }], ctx());
    expect(plan.banner).toMatchObject({ kind: 'exclusive', epic: true, title: 'The Window Seat', eyebrow: 'Showing up: 365 days', sound: 'reveal-ultra' });
    expect(plan.banner?.text).toBe('The Window Seat is yours: a cushioned seat built into the window, with the best light in the place.');
    // The eyebrow already says it: no repeated "365 days of showing up" line.
    expect(plan.banner?.also).toEqual([]);
  });

  it('the Laurel Sprig says what it was for', () => {
    const plan = planCelebration(
      [
        { type: 'plantStage', habitId: 'h-walk', stage: 7 },
        { type: 'exclusive', collectibleId: 'wear-laurel-sprig' },
      ],
      ctx(),
    );
    expect(plan.banner).toMatchObject({ kind: 'exclusive', title: 'Laurel Sprig', eyebrow: 'The first Evergreen plant' });
    expect(plan.banner?.text).toBe('A laurel sprig, from the first plant to reach Evergreen. It’s in the wardrobe now.');
    expect(plan.banner?.also).toEqual(['The Walk plant is Evergreen']);
  });

  it('only Blooming and Evergreen plants get notes in the band; other stages are small notes', () => {
    expect(planCelebration([{ type: 'plantStage', habitId: 'h-yoga', stage: 5 }], ctx()).banner?.kind).toBe('plant');
    const small = planCelebration([{ type: 'plantStage', habitId: 'h-yoga', stage: 2 }], ctx());
    expect(small.banner).toBeNull();
    expect(small.toasts[0]?.message).toBe('The Yoga plant is potted up.');
  });

  it('every growth stage reads as a plain sentence, using the stage names', () => {
    const say = (stage: number) => {
      const plan = planCelebration([{ type: 'plantStage', habitId: 'h-yoga', stage }], ctx());
      return plan.banner?.title ?? plan.toasts[0]?.message;
    };
    expect(say(1)).toBe('White roots are showing in the glass. The Yoga plant is rooting.');
    expect(say(2)).toBe('The Yoga plant is potted up.');
    expect(say(3)).toBe('The Yoga plant has put out new leaves.');
    expect(say(4)).toBe('There’s a bud on the Yoga plant, still closed tight.');
    expect(say(5)).toBe('The Yoga plant is Blooming');
    expect(say(6)).toBe('The Yoga plant is spilling over the rim of the pot.');
    expect(say(7)).toBe('The Yoga plant is Evergreen');
  });

  it('a bloom is described the way that species blooms', () => {
    const bloom = (habitId: string) => planCelebration([{ type: 'plantStage', habitId, stage: 5 }], ctx()).banner;
    expect(bloom('h-yoga')).toMatchObject({ eyebrow: 'Blooming', text: 'The Yoga plant has purple spikes, and the sill smells of lavender.' });
    expect(bloom('h-walk')?.text).toBe('The Walk plant is trailing past the edge of the sill.');
    expect(planCelebration([{ type: 'plantStage', habitId: 'h-walk', stage: 7 }], ctx()).banner?.text).toBe('There’s a small brass watering can on the pot now.');
  });

  it('a bloom lets fall its own flowers; a perfect day, the flowers and leaves on the sill', () => {
    const bloom = planCelebration([{ type: 'plantStage', habitId: 'h-yoga', stage: 5 }], ctx()).banner;
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
    const art = (stage: number) => planCelebration([{ type: 'plantStage', habitId: 'h-gone', stage }], ctx()).toasts[0]?.art;
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
        { type: 'letter', letterId: 'w1', kind: 'sundayNote' },
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
        { type: 'letter', letterId: 'w1', kind: 'sundayNote' },
      ],
      ctx(),
    );
    expect(plan.banner?.kind).toBe('badge');
    expect(plan.toasts.map((t) => t.key)).toEqual(['letter']);
  });

  it('friendship level 10 is a note in the band, lower levels are small notes; pets are named, never pronouned', () => {
    expect(planCelebration([{ type: 'petLevel', petId: 'pet-cat-orange', level: 10 }], ctx()).banner).toMatchObject({ kind: 'bestFriends', title: 'You and Pudding', text: 'There’s a small brass tag to show it.' });
    // A level says what the pet does now, species-true, never a number.
    expect(planCelebration([{ type: 'petLevel', petId: 'pet-cat-orange', level: 3 }], ctx()).toasts[0]?.message).toBe('Pudding slow-blinks back at you now.');
    expect(planCelebration([{ type: 'petLevel', petId: 'pet-cow-holstein', level: 3 }], ctx()).toasts[0]?.message).toBe('Juniper does a nose-lick when you say hello now.');
    // Bond levels after best friends are notes, not another best-friends banner.
    const bond = planCelebration([{ type: 'petLevel', petId: 'pet-cat-orange', level: 12 }], ctx());
    expect(bond.banner).toBeNull();
    expect(bond.toasts[0]?.message).toBe('Pudding is part of the furniture now, with a cushion that has a dent in it.');
    expect(planCelebration([{ type: 'favoriteFound', petId: 'pet-cat-orange', treatId: 'treat-strawberry' }], ctx()).toasts[0]?.message).toBe('Pudding’s favourite is the strawberry. It’s on the Pet Card now.');
  });

  it('notes on the sill, goals and rungs say it plainly', () => {
    expect(planCelebration([{ type: 'letter', letterId: 'w1', kind: 'sundayNote' }], ctx()).toasts[0]?.message).toBe('There’s a note on the sill.');
    expect(planCelebration([{ type: 'letter', letterId: 'h1', kind: 'herbarium' }], ctx()).toasts[0]?.message).toBe('There’s a page on the sill.');
    expect(planCelebration([{ type: 'periodGoal', habitId: 'h-yoga', period: 'week', coins: 10 }], ctx()).toasts[0]?.message).toBe('Yoga, watered for the week.');
    expect(planCelebration([{ type: 'rung', habitId: 'h-walk', streak: 14, unit: 'days', tierDays: 14, coins: 30 }], ctx()).toasts[0]?.message).toBe('Walk: 14 days in a row.');
    expect(planCelebration([{ type: 'rung', habitId: 'h-snooze', streak: 14, unit: 'days', tierDays: 14, coins: 30 }], ctx()).toasts[0]?.message).toBe('No snooze: held off 14 days.');
    expect(planCelebration([{ type: 'stars', amount: 1, reason: 'fusion' }], ctx()).toasts[0]?.message).toBe('The swap shelf is full: 10 swaps, traded for 1 stamp.');
  });

  it('spending never shrinks or cancels a reward note (gift, exchange, spend)', () => {
    const plan = planCelebration(
      [
        { type: 'coins', amount: -20, reason: 'gift' },
        { type: 'stars', amount: 1, reason: 'badge' },
      ],
      ctx(),
    );
    expect(plan.wallet).toEqual({ coins: 0, stars: 1, tickets: 0, stardust: 0 });
    const swapIn = planCelebration(
      [
        { type: 'coins', amount: -250, reason: 'exchange' },
        { type: 'coins', amount: 25, reason: 'badge' },
        { type: 'stardust', amount: 40, fused: 4 },
      ],
      ctx(),
    );
    expect(swapIn.wallet).toEqual({ coins: 25, stars: 0, tickets: 0, stardust: 40 });
    expect(planCelebration([{ type: 'stars', amount: -3, reason: 'badge' }], ctx()).wallet).toEqual(EMPTY_TALLY);
    // A paid pull, a Night capsule or a Special Order is spending: no "-25 coins" bonus, ever.
    const paid = planCelebration(
      [
        { type: 'coins', amount: -25, reason: 'spend' },
        { type: 'stars', amount: -3, reason: 'spend' },
        { type: 'coins', amount: 0, reason: 'checkin' },
      ],
      ctx(),
    );
    expect(paid).toEqual({ banner: null, toasts: [], wallet: EMPTY_TALLY });
  });

  it('copy never uses guilt words', () => {
    const everything: GameEvent[] = [
      { type: 'perfectDay', date: 'x', coins: 5 },
      { type: 'welcomeHome', coins: 20, tickets: 1 },
      { type: 'rung', habitId: 'h-walk', streak: 7, unit: 'days', tierDays: 7, coins: 20 },
      { type: 'plantStage', habitId: 'h-walk', stage: 7 },
    ];
    const plan = planCelebration(everything, ctx());
    const text = JSON.stringify(plan).toLowerCase();
    for (const word of ['failed', 'lost', 'broken', 'missed', 'streak lost']) expect(text).not.toContain(word);
  });
});

describe('every event the domain emits gets its moment (VOICE, DESIGN §9.1)', () => {
  const one = (e: GameEvent) => planCelebration([e], ctx());

  it('a new look and a keepsake are lines under the plant banner', () => {
    const plan = planCelebration(
      [
        { type: 'plantStage', habitId: 'h-yoga', stage: 5 },
        { type: 'look', habitId: 'h-yoga', colour: 'twilight', shape: 'classic', read: 'bloom' },
        { type: 'keepsake', keepsakeId: 'k-h-yoga-5', petId: 'pet-cat-orange', habitId: 'h-yoga', stage: 5, kind: 'mind' },
      ],
      ctx(),
    );
    expect(plan.banner?.kind).toBe('plant');
    expect(plan.banner?.also).toEqual(['A new look for the Yoga plant: Twilight', 'Pudding left a smooth grey stone by the pot']);
    expect(plan.toasts).toEqual([]);
    // Alone (at Evergreen's re-read, or a keepsake at Rooting), each is its own note.
    expect(one({ type: 'look', habitId: 'h-walk', colour: 'dawn', shape: 'paired', read: 'evergreen' }).toasts[0]).toMatchObject({
      message: 'A new look for the Walk plant: Dawn · Paired.',
      art: { type: 'plant', species: 'pothos', stage: 7 },
    });
    expect(one({ type: 'keepsake', keepsakeId: 'k', petId: 'pet-cat-orange', habitId: 'h-walk', stage: 1, kind: 'move' }).toasts[0]?.message).toBe('Pudding left a pebble from the path by the pot.');
  });

  it('a full Field Guide page is a banner with its stamps; a page with a keepsake is the epic moment', () => {
    const page = planCelebration(
      [
        { type: 'album', albumId: 'dogs', stars: 5 },
        { type: 'stars', amount: 5, reason: 'album' },
      ],
      ctx(),
    );
    expect(page.banner).toMatchObject({ kind: 'album', eyebrow: 'Field Guide', title: 'The Dogs page is full', text: '5 stamps, onto the card.', rewards: { stars: 5 } });
    const chair = one({ type: 'album', albumId: 'cats', stars: 0, exclusive: 'decor-reading-chair' });
    expect(chair.banner).toMatchObject({ kind: 'exclusive', epic: true, eyebrow: 'A full Field Guide page', text: 'The Cats page is full. A reading chair, for the Shelf.' });
  });

  it('the first harvest is a note; later ones are the check-in note’s aside', () => {
    expect(one({ type: 'harvest', habitId: 'h-grass', treatId: 'treat-catgrass', firstTime: true }).toasts[0]?.message).toBe('A pinch of cat grass, into the basket.');
    expect(one({ type: 'harvest', habitId: 'h-grass', treatId: 'treat-catgrass', firstTime: false })).toEqual({ banner: null, toasts: [], wallet: EMPTY_TALLY });
  });

  it('a companion moving in, a story, a found thing and a season review each say where to look', () => {
    expect(one({ type: 'companion', petId: 'pet-cat-orange', habitId: 'h-walk' }).toasts[0]?.message).toBe('Pudding moved into the Walk plant.');
    expect(one({ type: 'story', petId: 'pet-cat-orange', habitId: 'h-walk', story: 'start' }).toasts[0]?.message).toBe('There’s a story on the plant tag for Walk.');
    expect(one({ type: 'seasonReview', season: 'summer', key: '2026-09-22' }).toasts[0]?.message).toBe('Summer, on the sill. It’s on Today.');
    // The found thing's swap rides on its own note, not a second "+1 swap" in the tally.
    const found = planCelebration(
      [
        { type: 'foundThing', petId: 'pet-cat-orange', date: '2026-09-29', seed: 5, swaps: 1 },
        { type: 'stardust', amount: 1, fused: 0 },
      ],
      ctx(),
    );
    expect(found.toasts).toHaveLength(1);
    expect(found.toasts[0]).toMatchObject({ message: 'Pudding left a bottle top on the sill.', rewards: { stardust: 1 } });
    expect(found.wallet).toEqual(EMPTY_TALLY);
    // Beside a banner, notes that point somewhere keep their own toast.
    const withBanner = planCelebration(
      [
        { type: 'badge', badgeId: 'first-checkin', stars: 1 },
        { type: 'story', petId: 'pet-cat-orange', habitId: 'h-walk', story: 'start' },
        { type: 'foundThing', petId: 'pet-cat-orange', date: '2026-09-29', seed: 1, swaps: 1 },
      ],
      ctx(),
    );
    expect(withBanner.toasts.map((t) => t.key)).toEqual(['story-h-walk', 'found-2026-09-29']);
    expect(withBanner.banner?.also).toEqual([]);
  });

  it('companion friendship, a retired habit and a pantry restock are quiet here', () => {
    for (const e of [
      { type: 'companionXp', petId: 'pet-cat-orange', habitId: 'h-walk', date: '2026-09-29', xp: 3 },
      { type: 'retired', habitId: 'h-walk', ribbon: true },
      { type: 'restock', treats: 2 },
    ] as GameEvent[]) {
      expect(one(e)).toEqual({ banner: null, toasts: [], wallet: EMPTY_TALLY });
      expect(eventWeight(e)).toBeNull();
    }
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
    expect(eventWeight({ type: 'plantStage', habitId: 'h', stage: 5 })).toBe('big');
    expect(eventWeight({ type: 'plantStage', habitId: 'h', stage: 3 })).toBe('small');
    expect(eventWeight({ type: 'petLevel', petId: 'p', level: 10 })).toBe('big');
    expect(eventWeight({ type: 'letter', letterId: 'w', kind: 'sundayNote' })).toBe('small');
    expect(eventWeight({ type: 'album', albumId: 'dogs', stars: 5 })).toBe('big');
    expect(eventWeight({ type: 'petLevel', petId: 'p', level: 12 })).toBe('small');
    expect(eventWeight({ type: 'harvest', habitId: 'h', treatId: 't', firstTime: true })).toBe('small');
    expect(eventWeight({ type: 'harvest', habitId: 'h', treatId: 't', firstTime: false })).toBeNull();
    for (const type of ['keepsake', 'look', 'companion', 'foundThing', 'story', 'seasonReview'] as const) expect(eventWeight({ type } as GameEvent)).toBe('small');
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
