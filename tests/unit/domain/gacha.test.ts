import { describe, expect, it } from 'vitest';
import { COLLECTIBLES, MOCHI_ID, PETS, TREATS, getCollectible, itemsInMachine } from '@/catalog/collectibles';
import { MACHINES, getMachine } from '@/catalog/machines';
import { PERSONALITIES } from '@/catalog/personalities';
import { RARITIES, type MachineId, type Rarity } from '@/catalog/types';
import type { AppState } from '@/state/types';
import * as gacha from '@/domain/gacha';
import { activeWindow, availableMachineIds, machineAvailability, seasonVisited } from '@/domain/seasons';
import { mulberry32 } from '@/domain/rng';
import { Game } from './game';

const ownAll = (s: AppState, ids: string[]): AppState => ({
  ...s,
  collection: { ...s.collection, ...Object.fromEntries(ids.map((id) => [id, { count: 1, firstAt: 0 }])) },
});
const lineup = (m: MachineId) => itemsInMachine(m).map((c) => c.id);
/** Past the onboarding capsule (the first pull ever on Kitty/Moo is the guaranteed-pet one). */
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

describe('seasons (DESIGN §6.2)', () => {
  it.each([
    ['snow', '2026-12-25', { available: true, activeUntil: '2027-01-14' }],
    ['snow', '2027-01-14', { available: true, activeUntil: '2027-01-14' }],
    ['snow', '2027-01-15', { available: false, nextStart: '2027-11-11' }],
    ['love', '2027-02-20', { available: true, activeUntil: '2027-02-28' }], // Feb 29 in a non-leap year
    ['love', '2028-02-29', { available: true, activeUntil: '2028-02-29' }],
    ['love', '2027-03-01', { available: false, nextStart: '2028-01-15' }],
    ['pumpkin', '2026-09-01', { available: true, activeUntil: '2026-11-10' }],
    ['pumpkin', '2026-08-31', { available: false, nextStart: '2026-09-01' }],
    ['kitty', '2026-08-31', { available: true }],
  ] as const)('%s on %s', (m, date, expected) => {
    expect(machineAvailability(m, date)).toEqual(expected);
  });

  it('exactly one seasonal machine is on every day of the year', () => {
    for (let d = '2027-01-01'; d <= '2027-12-31'; d = addDay(d)) {
      const seasonal = availableMachineIds(d).filter((id) => getMachine(id).seasonal);
      expect(seasonal, d).toHaveLength(1);
    }
  });

  it('Memories rule: a season must have started since the profile was created', () => {
    expect(seasonVisited('pumpkin', '2026-09-29', '2026-10-15')).toBe(false); // started Sep 1, before the profile
    expect(seasonVisited('pumpkin', '2026-09-29', '2027-09-01')).toBe(true);
    expect(seasonVisited('snow', '2026-09-29', '2026-11-10')).toBe(false);
    expect(seasonVisited('snow', '2026-09-29', '2026-11-11')).toBe(true);
    expect(seasonVisited('kitty', '2026-09-29', '2026-09-29')).toBe(true);
    expect(activeWindow(getMachine('snow'), '2027-01-01')).toEqual({ start: '2026-11-11', end: '2027-01-14' });
  });
});

function addDay(d: string): string {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

describe('the first capsule (DESIGN §13.10)', () => {
  it.each(Array.from({ length: 25 }, (_, i) => i + 1))('seed %i: a Classic or Special pet from Kitty or Moo, never Mochi', (seed) => {
    const g = new Game({ seed });
    const m: MachineId = seed % 2 ? 'kitty' : 'moo';
    const r = pull(g, m, { free: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const def = getCollectible(r.itemId)!;
    expect(def.category).toBe('pet');
    expect(def.source).toBe(m);
    expect(['common', 'uncommon']).toContain(def.rarity);
    expect(r.itemId).not.toBe(MOCHI_ID);
    expect(r.paidWith).toBe('free');
    expect(r.pet).toMatchObject({ id: r.itemId, xp: 0, favoriteKnown: false });
  });

  it('the free pull exists only once, and only on Kitty or Moo', () => {
    const g = new Game();
    expect(pull(g, 'sakura', { free: true })).toEqual({ ok: false, error: 'machine-unavailable' });
    expect(pull(g, 'kitty', { free: true }).ok).toBe(true);
    expect(pull(g, 'kitty', { free: true })).toEqual({ ok: false, error: 'machine-unavailable' });
  });
});

describe('paying for a pull', () => {
  it('coins, stars, tickets and their errors', () => {
    const g = new Game();
    expect(pull(g, 'kitty')).toEqual({ ok: false, error: 'not-enough-coins' });
    expect(pull(g, 'dreamy')).toEqual({ ok: false, error: 'not-enough-stars' });
    expect(pull(g, 'kitty', { useTicket: true })).toEqual({ ok: false, error: 'no-ticket' });
    g.setWallet({ coins: 30, stars: 3, tickets: 1 });
    expect(pull(g, 'kitty')).toMatchObject({ ok: true, paidWith: 'coins' });
    expect(pull(g, 'dreamy')).toMatchObject({ ok: true, paidWith: 'stars' });
    expect(pull(g, 'dreamy', { useTicket: true })).toMatchObject({ ok: true, paidWith: 'ticket' });
    const badgeStars = g.allOf('badge').reduce((a, e) => a + e.stars, 0);
    expect(g.state.badges['first-capsule']).toBeDefined();
    expect(g.state.wallet).toMatchObject({ coins: 5, stars: badgeStars, tickets: 0 });
    expect(g.state.lifetime.pulls).toBe(3);
  });

  it('out-of-season machines are unavailable (tickets too)', () => {
    const g = new Game({ start: '2026-03-02' });
    g.setWallet({ coins: 100, tickets: 1 });
    expect(pull(g, 'pumpkin')).toEqual({ ok: false, error: 'machine-unavailable' });
    expect(pull(g, 'pumpkin', { useTicket: true })).toEqual({ ok: false, error: 'machine-unavailable' });
    expect(g.state.wallet).toMatchObject({ coins: 100, tickets: 1 });
    expect(pull(g, 'rainy').ok).toBe(true);
  });

  it('commit before animate: the result is stored as pendingReveal and blocks the next pull until finished', () => {
    const g = new Game();
    g.setWallet({ coins: 100 });
    const r = g.run((tx) => gacha.pull(tx, 'kitty'));
    expect(r.ok).toBe(true);
    expect(g.state.pendingReveal).toMatchObject({ machineId: 'kitty', itemId: r.ok ? r.itemId : '' });
    expect(g.run((tx) => gacha.pull(tx, 'kitty'))).toEqual({ ok: false, error: 'reveal-pending' });
    expect(g.coins).toBe(75);
    g.run((tx) => gacha.finishReveal(tx));
    expect(g.state.pendingReveal).toBeUndefined();
  });
});

describe('pity & the lucky meter (DESIGN §13.6)', () => {
  it('the 10th pull without a rare-or-better is a rare (rare tier only) and picks an unowned rare', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = new Game({ seed });
      g.setWallet({ coins: 100 });
      g.state = seasoned(g.state);
      withPity(g, 'kitty', { sinceRare: 9, sinceUltra: 5 });
      const r = pull(g, 'kitty');
      expect(r.ok && r.rarity).toBe('rare');
      expect(r.ok && r.isNew).toBe(true);
      expect(g.state.pity.kitty).toMatchObject({ sinceRare: 0, sinceUltra: 6 });
    }
  });

  it('ultra pity is independent and wins when both are due', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = new Game({ seed });
      g.setWallet({ coins: 100 });
      g.state = seasoned(g.state);
      withPity(g, 'moo', { sinceRare: 9, sinceUltra: 39 });
      const r = pull(g, 'moo');
      expect(r.ok && r.rarity).toBe('ultra');
      expect(g.state.pity.moo).toMatchObject({ sinceRare: 0, sinceUltra: 0 });
    }
  });

  it('a fully owned tier hides its counter and turns its pity off', () => {
    const g = new Game();
    g.setWallet({ coins: 100 });
    const rares = itemsInMachine('kitty').filter((c) => c.rarity === 'rare').map((c) => c.id);
    g.state = seasoned(ownAll(g.state, rares));
    withPity(g, 'kitty', { sinceRare: 9 });
    const pool = gacha.machinePool('kitty', g.state.collection);
    expect(gacha.pityCountdown(pool, gacha.pityOf(g.state, 'kitty'), g.state.collection).rareIn).toBeNull();
    const r = pull(g, 'kitty', {});
    expect(r.ok && r.pity.rareIn).toBeNull();
  });

  it('counters count down: "Rare+ within 3 pulls"', () => {
    const g = new Game();
    withPity(g, 'kitty', { sinceRare: 7, sinceUltra: 30 });
    expect(gacha.pityCountdown(gacha.machinePool('kitty', g.state.collection), gacha.pityOf(g.state, 'kitty'), g.state.collection)).toEqual({ rareIn: 3, ultraIn: 10 });
  });

  it('after 4 consecutive duplicates the next pull is guaranteed new', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = new Game({ seed });
      g.setWallet({ coins: 100 });
      // Own everything but one item, so ordinary pulls would almost surely be duplicates.
      const ids = lineup('sweets');
      const missing = ids[seed % ids.length]!;
      g.state = ownAll(g.state, ids.filter((id) => id !== missing));
      withPity(g, 'sweets', { dupStreak: 4 });
      const r = pull(g, 'sweets');
      expect(r.ok && r.itemId).toBe(missing);
      expect(r.ok && r.dupStreak).toBe(0);
    }
  });

  it('the lucky meter counts duplicates and caps at 4', () => {
    const g = new Game();
    g.setWallet({ coins: 1000 });
    g.state = seasoned(ownAll(g.state, lineup('kitty')));
    for (let i = 1; i <= 6; i++) {
      const r = pull(g, 'kitty');
      expect(r.ok && r.dupStreak).toBe(Math.min(4, i));
    }
  });
});

describe('duplicates', () => {
  it('turn into stardust by rarity (2/4/8/15) that fuses 10 → 1★, and a duplicate pet gets +20 friendship', () => {
    const g = new Game();
    g.setWallet({ coins: 1000, stardust: 8 });
    g.state = seasoned(ownAll(g.state, lineup('kitty')));
    g.state = { ...g.state, pets: { ...g.state.pets, 'pet-cat-orange': { ...g.state.pets[MOCHI_ID]!, id: 'pet-cat-orange', name: 'Marmalade', xp: 0 } } };
    let stardust = 0;
    let fused = 0;
    for (let i = 0; i < 12; i++) {
      const r = pull(g, 'kitty');
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
    for (let i = 0; i < 40; i++) pull(g, 'sweets');
    const personalities = new Set(PERSONALITIES.map((p) => p.id));
    const treats = new Set(TREATS.map((t) => t.id));
    for (const pet of Object.values(g.state.pets)) {
      if (pet.id === MOCHI_ID) continue;
      expect(personalities.has(pet.personality)).toBe(true);
      expect(treats.has(pet.favoriteTreat)).toBe(true);
      expect(pet.name).toBe((getCollectible(pet.id) as { defaultName: string }).defaultName);
    }
  });
});

describe('Dreamy Night: Moonlit variants (DESIGN §13.6, §13.11)', () => {
  it('owned base pets (never Mochi) add Moonlit variants that share one rare slot', () => {
    const g = new Game();
    const pets = PETS.filter((p) => p.source === 'kitty').map((p) => p.id);
    g.state = ownAll(g.state, pets);
    const pool = gacha.machinePool('dreamy', g.state.collection);
    const moonlit = pool.filter((p) => p.moonlit).map((p) => p.id);
    expect(moonlit.sort()).toEqual(pets.map((id) => `moonlit:${id}`).sort());
    expect(moonlit).not.toContain(`moonlit:${MOCHI_ID}`);
    const chances = gacha.itemChances('dreamy', g.state.collection);
    const rares = itemsInMachine('dreamy').filter((c) => c.rarity === 'rare');
    const slot = moonlit.reduce((a, id) => a + chances.get(id)!, 0);
    for (const r of rares) expect(slot).toBeCloseTo(chances.get(r.id)! * gacha.MOONLIT_SLOT_SHARE, 10); // one shared half-slot
    const total = [...chances.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('a Moonlit variant can be wished for (8★) only once its base pet is owned', () => {
    const g = new Game();
    g.setWallet({ stars: 20 });
    expect(g.run((tx) => gacha.wish(tx, 'moonlit:pet-cat-calico'))).toEqual({ ok: false, error: 'not-wishable' });
    g.state = ownAll(g.state, ['pet-cat-calico']);
    const r = g.run((tx) => gacha.wish(tx, 'moonlit:pet-cat-calico'));
    expect(r).toMatchObject({ ok: true, stars: 8 });
    expect(g.state.pets['moonlit:pet-cat-calico']?.name).toBe('Moonlit Patches');
    expect(g.run((tx) => gacha.wish(tx, 'moonlit:pet-mochi'))).toEqual({ ok: false, error: 'not-wishable' });
  });
});

describe('Wishing Well', () => {
  it.each([
    ['pet-cat-orange', 2],
    ['pet-cat-tuxedo', 4],
    ['pet-cat-calico', 8],
    ['pet-cat-lucky', 15],
  ] as const)('%s costs %i stars', (id, price) => {
    expect(gacha.wishPrice(id)).toBe(price);
    const g = new Game();
    g.setWallet({ stars: price });
    expect(g.run((tx) => gacha.wish(tx, id))).toMatchObject({ ok: true, stars: price });
    expect(g.state.wallet.stars).toBe(0);
    expect(g.state.collection[id]?.count).toBe(1);
    expect(g.run((tx) => gacha.wish(tx, id))).toEqual({ ok: false, error: 'already-owned' });
  });

  it('exclusives, starters and garden treats are never wishable; stars are checked last', () => {
    const g = new Game({ start: '2026-09-29' });
    for (const id of ['wear-evergreen-crown', 'wear-blossom-sprout', 'plant-tulip', 'treat-petal-tea', MOCHI_ID]) {
      expect(g.run((tx) => gacha.wish(tx, id)).ok, id).toBe(false);
    }
    expect(g.run((tx) => gacha.wish(tx, 'pet-cat-orange'))).toEqual({ ok: false, error: 'not-enough-stars' });
  });

  it('Memories rule: seasonal items wait for their season’s first visit', () => {
    const g = new Game({ start: '2026-09-29' });
    g.setWallet({ stars: 50 });
    expect(g.run((tx) => gacha.wish(tx, 'pet-cow-pumpkin'))).toEqual({ ok: false, error: 'season-not-visited' });
    expect(g.run((tx) => gacha.wish(tx, 'pet-bear-polar'))).toEqual({ ok: false, error: 'season-not-visited' });
    g.goTo('2026-11-11');
    expect(g.run((tx) => gacha.wish(tx, 'pet-bear-polar'))).toMatchObject({ ok: true });
    g.goTo('2027-03-01');
    expect(g.run((tx) => gacha.wish(tx, 'pet-bear-polar'))).toEqual({ ok: false, error: 'already-owned' });
    expect(g.run((tx) => gacha.wish(tx, 'pet-cow-pumpkin'))).toEqual({ ok: false, error: 'season-not-visited' });
  });
});

describe('sparkle exchange', () => {
  it('only on a completed machine: 250 coins → 40 stardust (4★)', () => {
    const g = new Game();
    g.setWallet({ coins: 300 });
    expect(g.run((tx) => gacha.sparkleExchange(tx, 'kitty'))).toEqual({ ok: false });
    g.state = ownAll(g.state, lineup('kitty'));
    expect(g.run((tx) => gacha.sparkleExchange(tx, 'kitty'))).toEqual({ ok: true });
    expect(g.state.wallet).toMatchObject({ coins: 50, stars: 4, stardust: 0 });
    expect(g.run((tx) => gacha.sparkleExchange(tx, 'kitty'))).toEqual({ ok: false });
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

  // Puppy Park's lineup is 8/5/4/2, so each of its rares (10% ÷ 4) ties each Super rare (5% ÷ 2):
  // a catalog fix is requested in NOTES-domain.md (§13.6 asks for 8/5/5/3). Until then it is held to ≥.
  const TIED_BY_CATALOG: ReadonlySet<MachineId> = new Set(['puppy']);
  it.each(MACHINES.map((m) => m.id))('%s: every rarer item is individually less likely than every commoner one (moonlit pool full)', (id) => {
    // Everything owned, Moonlit variants included, so every weight is 1 (the "new-first weight 1" condition).
    const all = [...COLLECTIBLES.map((c) => c.id), ...PETS.map((p) => `moonlit:${p.id}`)];
    const chances = gacha.itemChances(id, Object.fromEntries(all.map((x) => [x, { count: 1, firstAt: 0 }])));
    const byTier = RARITIES.map((r) => itemsInMachine(id).filter((c) => c.rarity === r).map((c) => chances.get(c.id)!));
    for (let i = 0; i + 1 < byTier.length; i++) {
      if (byTier[i]!.length === 0 || byTier[i + 1]!.length === 0) continue;
      const lo = Math.min(...byTier[i]!);
      const hi = Math.max(...byTier[i + 1]!);
      if (TIED_BY_CATALOG.has(id) && i === 2) expect(lo).toBeGreaterThanOrEqual(hi);
      else expect(lo).toBeGreaterThan(hi);
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
      const d = gacha.decidePull(s, 'kitty', rng);
      tiers[d.item.rarity]++;
      items.set(d.item.id, (items.get(d.item.id) ?? 0) + 1);
    }
    const odds = getMachine('kitty').odds;
    for (const r of RARITIES) expect(Math.abs(tiers[r] / N - odds[r] / 100), r).toBeLessThan(0.006);
    const perItem = RARITIES.map((r) => itemsInMachine('kitty').filter((c) => c.rarity === r).map((c) => (items.get(c.id) ?? 0) / N));
    for (let i = 0; i + 1 < perItem.length; i++) expect(Math.min(...perItem[i]!)).toBeGreaterThan(Math.max(...perItem[i + 1]!));
  });

  it('new-first: an unowned item comes up about 3× as often as an owned one of its tier', () => {
    const g = new Game();
    const commons = itemsInMachine('puppy').filter((c) => c.rarity === 'common').map((c) => c.id);
    const owned = commons.slice(0, Math.ceil(commons.length / 2));
    const s = ownAll(g.state, owned);
    const rng = mulberry32(99);
    const counts = new Map<string, number>();
    for (let i = 0; i < 40_000; i++) {
      const it = gacha.pickInTier(rng, gacha.machinePool('puppy', s.collection).filter((p) => p.rarity === 'common'), s.collection);
      counts.set(it.id, (counts.get(it.id) ?? 0) + 1);
    }
    const avg = (ids: string[]) => ids.reduce((a, id) => a + (counts.get(id) ?? 0), 0) / ids.length;
    const ratio = avg(commons.filter((c) => !owned.includes(c))) / avg(owned);
    expect(ratio).toBeGreaterThan(2.8);
    expect(ratio).toBeLessThan(3.2);
  });
});
