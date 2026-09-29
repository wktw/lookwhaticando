import { describe, expect, it } from 'vitest';
import { COLLECTIBLES, PETS, TREATS, getCollectible, itemsInMachine } from '@/catalog/collectibles';
import { MACHINES, getMachine } from '@/catalog/machines';
import { PERSONALITIES } from '@/catalog/personalities';
import { RARITIES, type MachineId, type Rarity } from '@/catalog/types';
import type { AppState } from '@/state/types';
import * as gacha from '@/domain/gacha';
import { newPetState } from '@/domain/friendship';
import { activeWindow, availableMachineIds, machineAvailability, seasonVisited } from '@/domain/seasons';
import { mulberry32 } from '@/domain/rng';
import { Game } from './game';

const ownAll = (s: AppState, ids: string[]): AppState => ({
  ...s,
  collection: { ...s.collection, ...Object.fromEntries(ids.map((id) => [id, { count: 1, firstAt: 0 }])) },
});
const lineup = (m: MachineId) => itemsInMachine(m).map((c) => c.id);
/** Past the first capsule (the first pull ever is the guaranteed-pet one, and doesn't advance pity). */
const seasoned = (s: AppState): AppState => ({ ...s, lifetime: { ...s.lifetime, pulls: Math.max(1, s.lifetime.pulls) } });
const withPity = (g: Game, m: MachineId, p: Partial<AppState['pity'][MachineId] & object>) => {
  g.state = { ...g.state, pity: { ...g.state.pity, [m]: { sinceRare: 0, sinceUltra: 0, dupStreak: 0, pulls: 0, ...p } } };
};
const pull = (g: Game, m: MachineId, opts: gacha.PullOptions = {}) =>
  g.run((tx) => {
    const r = gacha.pull(tx, m, opts);
    gacha.finishReveal(tx);
    return r;
  });

describe('seasonal editions (DESIGN §7.1: fixed dates from machines.ts)', () => {
  it.each([
    ['winter', '2026-12-25', { available: true, activeUntil: '2027-01-14' }],
    ['winter', '2027-01-14', { available: true, activeUntil: '2027-01-14' }],
    ['winter', '2027-01-15', { available: false, nextStart: '2027-11-11' }],
    ['valentine', '2027-02-20', { available: true, activeUntil: '2027-02-28' }], // Feb 29 in a non-leap year
    ['valentine', '2028-02-29', { available: true, activeUntil: '2028-02-29' }],
    ['valentine', '2027-03-01', { available: false, nextStart: '2028-01-15' }],
    ['autumn', '2026-09-01', { available: true, activeUntil: '2026-11-10' }],
    ['autumn', '2026-08-31', { available: false, nextStart: '2026-09-01' }],
    ['cats', '2026-08-31', { available: true }],
  ] as const)('%s on %s', (m, date, expected) => {
    expect(machineAvailability(m, date)).toEqual(expected);
  });

  it('exactly one seasonal machine is on every day of the year', () => {
    for (let d = '2027-01-01'; d <= '2027-12-31'; d = addDay(d)) {
      const seasonal = availableMachineIds(d).filter((id) => getMachine(id).seasonal);
      expect(seasonal, d).toHaveLength(1);
    }
  });

  it('Memories rule (§7.3): a season has visited once it was on for a day since the profile was created', () => {
    expect(seasonVisited('autumn', '2026-09-29', '2026-09-29')).toBe(true); // created mid-season: she has seen this visit
    expect(seasonVisited('autumn', '2026-11-11', '2027-08-31')).toBe(false); // it ended the day before she came
    expect(seasonVisited('autumn', '2026-11-11', '2027-09-01')).toBe(true);
    expect(seasonVisited('winter', '2026-09-29', '2026-11-10')).toBe(false);
    expect(seasonVisited('winter', '2026-09-29', '2026-11-11')).toBe(true);
    expect(seasonVisited('winter', '2027-01-14', '2027-01-14')).toBe(true); // its last day counts
    expect(seasonVisited('winter', '2027-01-15', '2027-11-10')).toBe(false);
    expect(seasonVisited('cats', '2026-09-29', '2026-09-29')).toBe(true);
    expect(activeWindow(getMachine('winter'), '2027-01-01')).toEqual({ start: '2026-11-11', end: '2027-01-14' });
  });
});

function addDay(d: string): string {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

describe('the first capsule: "Who comes home first?" (DESIGN §9.6)', () => {
  it.each(Array.from({ length: 25 }, (_, i) => i + 1))('seed %i: a guaranteed Classic or Special pet from that series, free, no pity', (seed) => {
    const g = new Game({ seed });
    expect(g.state.pets).toEqual({}); // a new save owns no pets
    const m: MachineId = gacha.FIRST_CAPSULE_MACHINES[seed % 4]!;
    expect(gacha.canPullFree(g.state, m)).toBe(true);
    const r = pull(g, m, { free: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const def = getCollectible(r.itemId)!;
    expect(def.category).toBe('pet');
    expect(def.source).toBe(m);
    expect(['common', 'uncommon']).toContain(def.rarity);
    expect(r.paidWith).toBe('free');
    expect(r.pet).toMatchObject({ id: r.itemId, xp: 0, favoriteKnown: false, inMeadow: true });
    expect(g.state.pity[m]).toBeUndefined(); // doesn't advance pity
    expect(g.state.wallet.coins).toBe(0);
    expect(g.state.lifetime.pulls).toBe(1);
  });

  it('is available exactly once, and only on the four first-pick cabinets (§1 Many animals)', () => {
    expect(gacha.FIRST_CAPSULE_MACHINES).toEqual(['cats', 'cows', 'dogs', 'pond']);
    const g = new Game();
    for (const m of ['cats', 'cows', 'dogs', 'pond'] as const) expect(gacha.canPullFree(g.state, m), m).toBe(true);
    expect(pull(g, 'garden', { free: true })).toEqual({ ok: false, error: 'machine-unavailable' });
    expect(pull(g, 'night', { free: true })).toEqual({ ok: false, error: 'machine-unavailable' });
    expect(pull(g, 'pond', { free: true }).ok).toBe(true);
    for (const m of ['cats', 'cows', 'dogs', 'pond'] as const) expect(gacha.canPullFree(g.state, m), m).toBe(false);
    expect(pull(g, 'dogs', { free: true })).toEqual({ ok: false, error: 'machine-unavailable' });
    expect(pull(g, 'pond', { free: true })).toEqual({ ok: false, error: 'machine-unavailable' });
  });

  it('every first-pick cabinet has Classic and Special pets for the guaranteed first pet', () => {
    for (const m of gacha.FIRST_CAPSULE_MACHINES) {
      const pets = gacha.machinePool(m, {}).map((p) => getCollectible(p.id)!).filter((d) => d.category === 'pet');
      expect(pets.some((d) => d.rarity === 'common'), `${m} Classic pet`).toBe(true);
      expect(pets.some((d) => d.rarity === 'uncommon'), `${m} Special pet`).toBe(true);
    }
  });

  it.each([
    ['before any watering', false],
    ['after First Sprout', true],
  ] as const)('%s, the four cabinets leave the same coins: one gift, whichever she chooses', (_label, sprouted) => {
    const coins = gacha.FIRST_CAPSULE_MACHINES.map((m) => {
      const g = new Game({ seed: 3 });
      if (sprouted) g.checkIn(g.addHabit());
      const r = pull(g, m, { free: true });
      expect(r, m).toMatchObject({ ok: true, paidWith: 'free' });
      if (r.ok) expect(getCollectible(r.itemId)).toMatchObject({ category: 'pet', source: m });
      return g.coins;
    });
    expect(new Set(coins).size, coins.join(',')).toBe(1);
    expect(coins[0]).toBe(sprouted ? 5 : 0);
  });

  it('taken before any check-in, First Sprout never tops the jar up afterwards (one gift, one capsule)', () => {
    const g = new Game();
    pull(g, 'cows', { free: true });
    const walk = g.addHabit();
    g.checkIn(walk);
    expect(g.coins).toBe(5); // the check-in's own pay, no top-up
    expect(g.coinsBy('gift')).toBe(0);
  });

  it('taken after First Sprout, it spends exactly the top-up: the coins her check-ins earned stay hers', () => {
    const g = new Game();
    const walk = g.addHabit();
    const read = g.addHabit({ name: 'Read', icon: 'book', effort: 'big' });
    g.checkIn(walk); // 5 + a 20-coin top-up = 25
    expect(g.coins).toBe(25);
    g.checkIn(read); // + 7, and a perfect day
    const before = g.coins;
    expect(before).toBeGreaterThan(25);
    const r = pull(g, 'cats', { free: true });
    expect(r).toMatchObject({ ok: true, paidWith: 'free' });
    expect(g.coins).toBe(before - 20); // only the 20 First Sprout added
    expect(g.lastOf('coins')).toEqual([{ type: 'coins', amount: -20, reason: 'gift' }]);
    expect(pull(g, 'cats', { free: true })).toEqual({ ok: false, error: 'machine-unavailable' });
  });

  it('never spends more than the jar holds (an un-check refunded part of it)', () => {
    const g = new Game();
    const walk = g.addHabit();
    g.checkIn(walk); // 25
    g.undo(walk); // −5 → 20, the top-up stays
    expect(g.coins).toBe(20);
    expect(pull(g, 'cats', { free: true }).ok).toBe(true);
    expect(g.coins).toBe(0);
  });

  it('a paid first capsule on any series is a guaranteed pet too, and doesn’t advance pity', () => {
    for (const m of ['dogs', 'pond', 'garden', 'pantry'] as const) {
      for (let seed = 1; seed <= 6; seed++) {
        const g = new Game({ seed });
        g.setWallet({ coins: 25 });
        const r = pull(g, m);
        expect(r.ok && getCollectible(r.itemId)?.category).toBe('pet');
        expect(r.ok && ['common', 'uncommon'].includes(r.rarity)).toBe(true);
        expect(g.state.pity[m]).toBeUndefined();
        expect(gacha.canPullFree(g.state, 'cats')).toBe(false);
      }
    }
  });
});

describe('paying for a pull', () => {
  it('coins, stars, tickets and their errors', () => {
    const g = new Game();
    expect(pull(g, 'cats')).toEqual({ ok: false, error: 'not-enough-coins' });
    expect(pull(g, 'night')).toEqual({ ok: false, error: 'not-enough-stars' });
    expect(pull(g, 'cats', { useTicket: true })).toEqual({ ok: false, error: 'no-ticket' });
    g.setWallet({ coins: 30, stars: 3, tickets: 1 });
    expect(pull(g, 'cats')).toMatchObject({ ok: true, paidWith: 'coins' });
    expect(pull(g, 'night')).toMatchObject({ ok: true, paidWith: 'stars' });
    expect(pull(g, 'night', { useTicket: true })).toMatchObject({ ok: true, paidWith: 'ticket' });
    const badgeStars = g.allOf('badge').reduce((a, e) => a + e.stars, 0);
    expect(g.state.badges['first-capsule']).toBeDefined();
    expect(g.state.wallet).toMatchObject({ coins: 5, stars: badgeStars, tickets: 0 });
    expect(g.state.lifetime.pulls).toBe(3);
  });

  it('out-of-season machines are unavailable (tickets too)', () => {
    const g = new Game({ start: '2026-03-02' });
    g.setWallet({ coins: 100, tickets: 1 });
    expect(pull(g, 'autumn')).toEqual({ ok: false, error: 'machine-unavailable' });
    expect(pull(g, 'autumn', { useTicket: true })).toEqual({ ok: false, error: 'machine-unavailable' });
    expect(g.state.wallet).toMatchObject({ coins: 100, tickets: 1 });
    expect(pull(g, 'spring').ok).toBe(true);
  });

  it('commit before animate: the result is stored as pendingReveal and blocks the next pull until finished', () => {
    const g = new Game();
    g.setWallet({ coins: 100 });
    const r = g.run((tx) => gacha.pull(tx, 'cats'));
    expect(r.ok).toBe(true);
    expect(g.state.pendingReveal).toMatchObject({ machineId: 'cats', itemId: r.ok ? r.itemId : '' });
    expect(g.run((tx) => gacha.pull(tx, 'cats'))).toEqual({ ok: false, error: 'reveal-pending' });
    expect(g.coins).toBe(75);
    g.run((tx) => gacha.finishReveal(tx));
    expect(g.state.pendingReveal).toBeUndefined();
  });
});

describe('pity & the lucky meter (DESIGN §7.1)', () => {
  it('the 10th pull without a rare-or-better is a rare (rare tier only) and picks an unowned rare', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = new Game({ seed });
      g.setWallet({ coins: 100 });
      g.state = seasoned(g.state);
      withPity(g, 'cats', { sinceRare: 9, sinceUltra: 5 });
      const r = pull(g, 'cats');
      expect(r.ok && r.rarity).toBe('rare');
      expect(r.ok && r.isNew).toBe(true);
      expect(g.state.pity.cats).toMatchObject({ sinceRare: 0, sinceUltra: 6 });
    }
  });

  it('ultra pity is independent and wins when both are due', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = new Game({ seed });
      g.setWallet({ coins: 100 });
      g.state = seasoned(g.state);
      withPity(g, 'cows', { sinceRare: 9, sinceUltra: 39 });
      const r = pull(g, 'cows');
      expect(r.ok && r.rarity).toBe('ultra');
      expect(g.state.pity.cows).toMatchObject({ sinceRare: 0, sinceUltra: 0 });
    }
  });

  it('a fully owned tier hides its counter and turns its pity off', () => {
    const g = new Game();
    g.setWallet({ coins: 100 });
    const rares = itemsInMachine('cats').filter((c) => c.rarity === 'rare').map((c) => c.id);
    g.state = seasoned(ownAll(g.state, rares));
    withPity(g, 'cats', { sinceRare: 9 });
    const pool = gacha.machinePool('cats', g.state.collection);
    expect(gacha.pityCountdown(pool, gacha.pityOf(g.state, 'cats'), g.state.collection).rareIn).toBeNull();
    const r = pull(g, 'cats', {});
    expect(r.ok && r.pity.rareIn).toBeNull();
  });

  it('counters count down: "Rare+ within 3 pulls"', () => {
    const g = new Game();
    withPity(g, 'cats', { sinceRare: 7, sinceUltra: 30 });
    expect(gacha.pityCountdown(gacha.machinePool('cats', g.state.collection), gacha.pityOf(g.state, 'cats'), g.state.collection)).toEqual({ rareIn: 3, ultraIn: 10 });
  });

  it('after 4 consecutive duplicates the next pull is guaranteed new', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = new Game({ seed });
      g.setWallet({ coins: 100 });
      // Own everything but one item, so ordinary pulls would almost surely be duplicates.
      const ids = lineup('pantry');
      const missing = ids[seed % ids.length]!;
      g.state = seasoned(ownAll(g.state, ids.filter((id) => id !== missing)));
      withPity(g, 'pantry', { dupStreak: 4 });
      const r = pull(g, 'pantry');
      expect(r.ok && r.itemId).toBe(missing);
      expect(r.ok && r.dupStreak).toBe(0);
    }
  });

  it('the lucky meter counts duplicates and caps at 4', () => {
    const g = new Game();
    g.setWallet({ coins: 1000 });
    g.state = seasoned(ownAll(g.state, lineup('cats')));
    for (let i = 1; i <= 6; i++) {
      const r = pull(g, 'cats');
      expect(r.ok && r.dupStreak).toBe(Math.min(4, i));
    }
  });
});

describe('duplicates', () => {
  it('turn into stardust by rarity (2/4/8/15) that fuses 10 → 1★, and a duplicate pet gets +20 friendship', () => {
    const g = new Game();
    g.setWallet({ coins: 1000, stardust: 8 });
    g.state = seasoned(ownAll(g.state, lineup('cats')));
    g.state = { ...g.state, pets: { ...g.state.pets, 'pet-cat-orange': newPetState('pet-cat-orange', mulberry32(1), g.now, g.today, true) } };
    let stardust = 0;
    let fused = 0;
    for (let i = 0; i < 12; i++) {
      const r = pull(g, 'cats');
      if (!r.ok) throw new Error('pull failed');
      const expected = { common: 2, uncommon: 4, rare: 8, ultra: 15 }[r.rarity];
      expect(r.stardust).toBe(expected);
      stardust += r.stardust;
      fused += r.fusedStars;
      if (r.itemId === 'pet-cat-orange') expect(r.friendshipXp).toBe(20);
    }
    expect(g.state.wallet.stardust).toBe((8 + stardust) % 10);
    expect(fused).toBe(Math.floor((8 + stardust) / 10));
    const badgeStars = g.allOf('badge').reduce((a, e) => a + e.stars, 0); // first capsule, set complete…
    expect(g.state.wallet.stars).toBe(fused + badgeStars);
  });

  it('new pets get a PetState with a rolled personality and favorite treat', () => {
    const g = new Game({ seed: 7 });
    g.setWallet({ coins: 2000 });
    for (let i = 0; i < 40; i++) pull(g, 'pantry');
    const personalities = new Set(PERSONALITIES.map((p) => p.id));
    const treats = new Set(TREATS.map((t) => t.id));
    for (const pet of Object.values(g.state.pets)) {
      expect(personalities.has(pet.personality)).toBe(true);
      expect(treats.has(pet.favoriteTreat)).toBe(true);
      expect(pet.name).toBe((getCollectible(pet.id) as { defaultName: string }).defaultName);
    }
  });
});

describe('No. 07 Night: Moonlit variants of pets you own (DESIGN §7.1)', () => {
  it('owned series pets add Moonlit variants that share one Rare slot', () => {
    const g = new Game();
    const pets = PETS.filter((p) => p.source === 'cats').map((p) => p.id);
    g.state = ownAll(g.state, pets);
    const pool = gacha.machinePool('night', g.state.collection);
    const moonlit = pool.filter((p) => p.moonlit).map((p) => p.id);
    expect(moonlit.sort()).toEqual(pets.map((id) => `moonlit:${id}`).sort());
    expect(moonlit.every((id) => !id.startsWith('moonlit:moonlit:'))).toBe(true);
    const chances = gacha.itemChances('night', g.state.collection);
    const rares = itemsInMachine('night').filter((c) => c.rarity === 'rare');
    const slot = moonlit.reduce((a, id) => a + chances.get(id)!, 0);
    for (const r of rares) expect(slot).toBeCloseTo(chances.get(r.id)! * gacha.MOONLIT_SLOT_SHARE, 10); // one shared half-slot
    const total = [...chances.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('a Moonlit variant can be ordered (8 stamps) only once its base pet is owned', () => {
    const g = new Game();
    g.setWallet({ stars: 20 });
    expect(g.run((tx) => gacha.wish(tx, 'moonlit:pet-cat-calico'))).toEqual({ ok: false, error: 'not-wishable' });
    g.state = ownAll(g.state, ['pet-cat-calico']);
    const r = g.run((tx) => gacha.wish(tx, 'moonlit:pet-cat-calico'));
    expect(r).toMatchObject({ ok: true, stars: 8 });
    expect(g.state.pets['moonlit:pet-cat-calico']?.name).toBe('Moonlit Juniper');
    expect(g.run((tx) => gacha.wish(tx, 'moonlit:moonlit:pet-cat-calico'))).toEqual({ ok: false, error: 'not-wishable' });
  });
});

describe('Special Order (internally the wish; DESIGN §7.3)', () => {
  it.each([
    ['pet-cat-orange', 3],
    ['pet-cat-calico', 4],
    ['pet-cat-tortie', 8],
    ['pet-cat-oddeyed', 15],
    ['wear-duffle-coat', 15],
    ['decor-glass-float', 15],
  ] as const)('%s costs %i stamps', (id, price) => {
    expect(gacha.wishPrice(id)).toBe(price);
    const g = new Game();
    g.setWallet({ stars: price });
    expect(g.run((tx) => gacha.wish(tx, id))).toMatchObject({ ok: true, stars: price });
    expect(g.state.wallet.stars).toBe(0);
    expect(g.state.collection[id]?.count).toBe(1);
    expect(g.run((tx) => gacha.wish(tx, id))).toEqual({ ok: false, error: 'already-owned' });
  });

  it('exclusives, starters and harvests are never orderable; stamps are checked last', () => {
    const g = new Game({ start: '2026-09-29' });
    for (const id of ['wear-laurel-sprig', 'decor-window-seat', 'wear-party-hat', 'decor-reading-chair', 'plant-pothos', 'pot-terracotta', 'treat-cat-grass', 'pet-mochi']) {
      expect(g.run((tx) => gacha.wish(tx, id)).ok, id).toBe(false);
    }
    expect(g.run((tx) => gacha.wish(tx, 'pet-cat-orange'))).toEqual({ ok: false, error: 'not-enough-stars' });
  });

  it('Memories rule: seasonal items wait for their season’s first visit, then stay orderable', () => {
    const g = new Game({ start: '2026-11-11' });
    g.setWallet({ stars: 50 });
    expect(g.run((tx) => gacha.wish(tx, 'pet-bear-polar'))).toMatchObject({ ok: true }); // Winter is on the day she arrives
    expect(g.run((tx) => gacha.wish(tx, 'pet-cow-spice'))).toEqual({ ok: false, error: 'season-not-visited' }); // Autumn ended Nov 10
    expect(g.run((tx) => gacha.wish(tx, 'pet-duck-runner'))).toEqual({ ok: false, error: 'season-not-visited' });
    g.goTo('2027-03-01');
    expect(g.run((tx) => gacha.wish(tx, 'pet-bear-polar'))).toEqual({ ok: false, error: 'already-owned' });
    expect(g.run((tx) => gacha.wish(tx, 'pet-duck-runner'))).toMatchObject({ ok: true }); // Spring's first day
    expect(g.run((tx) => gacha.wish(tx, 'pet-cow-spice'))).toEqual({ ok: false, error: 'season-not-visited' });
    g.goTo('2027-09-01');
    expect(g.run((tx) => gacha.wish(tx, 'pet-cow-spice'))).toMatchObject({ ok: true });
    g.goTo('2028-06-15');
    expect(g.run((tx) => gacha.wish(tx, 'pet-dog-husky'))).toMatchObject({ ok: true }); // Winter's items, any time after
  });
});

describe('swap-in (DESIGN §7.3)', () => {
  it('only on a completed series: 250 coins → 40 swaps (4 stamps)', () => {
    const g = new Game();
    g.setWallet({ coins: 300 });
    expect(g.run((tx) => gacha.sparkleExchange(tx, 'cats'))).toEqual({ ok: false });
    g.state = ownAll(g.state, lineup('cats'));
    expect(g.run((tx) => gacha.sparkleExchange(tx, 'cats'))).toEqual({ ok: true });
    expect(g.state.wallet).toMatchObject({ coins: 50, stars: 4, stardust: 0 });
    expect(g.run((tx) => gacha.sparkleExchange(tx, 'cats'))).toEqual({ ok: false });
  });
});

describe('odds', () => {
  it('empty tiers fall to the nearest non-empty tier below, then above', () => {
    const pool = [
      { id: 'a', rarity: 'uncommon' as Rarity, moonlit: false },
      { id: 'b', rarity: 'ultra' as Rarity, moonlit: false },
    ];
    expect(gacha.nonEmptyTier(pool, 'rare')).toBe('uncommon');
    expect(gacha.nonEmptyTier(pool, 'common')).toBe('uncommon');
    expect(gacha.nonEmptyTier(pool, 'ultra')).toBe('ultra');
  });

  // Strict for every series (§7.1). No. 03 Dogs (8/5/4/2) and No. 04 Pond (7/4/4/2) used to tie at 2.5% between
  // each Rare and each Super rare; the Duffle Coat and the Glass Float (a third Super rare each) settled it.
  it.each(MACHINES.map((m) => m.id))('%s: every rarer item is individually less likely than every commoner one (moonlit pool full)', (id) => {
    // Everything owned, Moonlit variants included, so every weight is 1 (the "new-first weight 1" condition).
    const all = [...COLLECTIBLES.map((c) => c.id), ...PETS.map((p) => `moonlit:${p.id}`)];
    const chances = gacha.itemChances(id, Object.fromEntries(all.map((x) => [x, { count: 1, firstAt: 0 }])));
    const byTier = RARITIES.map((r) => itemsInMachine(id).filter((c) => c.rarity === r).map((c) => chances.get(c.id)!));
    for (let i = 0; i + 1 < byTier.length; i++) {
      if (byTier[i]!.length === 0 || byTier[i + 1]!.length === 0) continue;
      const lo = Math.min(...byTier[i]!);
      const hi = Math.max(...byTier[i + 1]!);
      expect(lo, `${id}: ${RARITIES[i]} vs ${RARITIES[i + 1]}`).toBeGreaterThan(hi);
    }
  });

  it('50k seeded pulls match the printed odds (new-first weight 1) and per-item chances decrease by tier', () => {
    const g = new Game();
    let s = seasoned(ownAll(g.state, COLLECTIBLES.map((c) => c.id)));
    s = { ...s, pity: {} };
    const rng = mulberry32(12345);
    const N = 50_000;
    const tiers: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, ultra: 0 };
    const items = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const d = gacha.decidePull(s, 'cats', rng);
      tiers[d.item.rarity]++;
      items.set(d.item.id, (items.get(d.item.id) ?? 0) + 1);
    }
    const odds = getMachine('cats').odds;
    for (const r of RARITIES) expect(Math.abs(tiers[r] / N - odds[r] / 100), r).toBeLessThan(0.006);
    const perItem = RARITIES.map((r) => itemsInMachine('cats').filter((c) => c.rarity === r).map((c) => (items.get(c.id) ?? 0) / N));
    for (let i = 0; i + 1 < perItem.length; i++) expect(Math.min(...perItem[i]!)).toBeGreaterThan(Math.max(...perItem[i + 1]!));
  });

  it('new-first: an unowned item comes up about 3× as often as an owned one of its tier', () => {
    const g = new Game();
    const commons = itemsInMachine('dogs').filter((c) => c.rarity === 'common').map((c) => c.id);
    const owned = commons.slice(0, Math.ceil(commons.length / 2));
    const s = ownAll(g.state, owned);
    const rng = mulberry32(99);
    const counts = new Map<string, number>();
    for (let i = 0; i < 40_000; i++) {
      const it = gacha.pickInTier(rng, gacha.machinePool('dogs', s.collection).filter((p) => p.rarity === 'common'), s.collection);
      counts.set(it.id, (counts.get(it.id) ?? 0) + 1);
    }
    const avg = (ids: string[]) => ids.reduce((a, id) => a + (counts.get(id) ?? 0), 0) / ids.length;
    const ratio = avg(commons.filter((c) => !owned.includes(c))) / avg(owned);
    expect(ratio).toBeGreaterThan(2.8);
    expect(ratio).toBeLessThan(3.2);
  });
});

describe('spending shows up as events, and a Special Order is committed before it animates (M1 audit)', () => {
  it('a paid capsule emits its spend: coins on a coin series, stamps on No. 07 Night', () => {
    const g = new Game({ seed: 5 });
    g.setWallet({ coins: 60, stars: 5 });
    const r = pull(g, 'dogs');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.events).toEqual([{ type: 'coins', amount: -25, reason: 'spend' }]);
    expect(g.lastOf('coins')).toContainEqual({ type: 'coins', amount: -25, reason: 'spend' });
    g.run((tx) => gacha.finishReveal(tx));
    pull(g, 'night');
    expect(g.lastOf('stars')).toContainEqual({ type: 'stars', amount: -3, reason: 'spend' });
  });

  it('a Special Order spends its stamps as an event and writes pendingReveal (order: true) until finishReveal', () => {
    const g = new Game();
    g.setWallet({ stars: 20 });
    const id = COLLECTIBLES.find((c) => c.rarity === 'uncommon' && c.category === 'wearable' && c.source === 'cats')!.id;
    const out = g.run((tx) => gacha.wish(tx, id));
    expect(out).toMatchObject({ ok: true, itemId: id, stars: 4, events: [{ type: 'stars', amount: -4, reason: 'spend' }] });
    expect(g.state.pendingReveal).toMatchObject({ machineId: 'cats', itemId: id, isNew: true, order: true });
    expect(g.lastOf('stars')).toEqual([{ type: 'stars', amount: -4, reason: 'spend' }]);
    g.run((tx) => gacha.finishReveal(tx));
    expect(g.state.pendingReveal).toBeUndefined();
  });

  it('a capsule reveal already waiting keeps its place when something is ordered', () => {
    const g = new Game({ seed: 2 });
    g.setWallet({ coins: 25, stars: 20 });
    const r = g.run((tx) => gacha.pull(tx, 'cows')); // not revealed yet
    expect(r.ok).toBe(true);
    const waiting = g.state.pendingReveal;
    expect(waiting).toMatchObject({ machineId: 'cows' });
    const id = COLLECTIBLES.find((c) => c.rarity === 'common' && c.category === 'decor' && c.source === 'pond')!.id;
    expect(g.run((tx) => gacha.wish(tx, id)).ok).toBe(true);
    expect(g.state.pendingReveal).toEqual(waiting);
  });
});
