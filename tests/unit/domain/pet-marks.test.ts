/**
 * What friendship levels leave on a pet (DESIGN §8.2, M1 audit): the favourite spot at level 4,
 * a best friend at level 8, the day you became best friends at level 10, and a dated Memory for
 * every 150 XP after it. Plus the sticky "Known for" line (§14.1) and the stored place (§8.4).
 */
import { describe, expect, it, vi } from 'vitest';
import type { AppState } from '@/state/types';
import { validateState } from '@/state/validate';
import * as company from '@/domain/company';
import { addDays } from '@/domain/dates';
import { addXp, newPetState } from '@/domain/friendship';
import { LEVEL_XP, XP_PER_MEMORY } from '@/domain/levels';
import { chooseBestFriend, claimSpot, petPlace, suggestPlaceFor } from '@/domain/places';
import * as shelf from '@/domain/shelf';
import { petVM } from '@/state/views/pets';
import { memoryText } from '@/catalog/format';
import { Game, UTC } from './game';

vi.setConfig({ testTimeout: 30_000 });

function addPet(g: Game, id: string, out = true): string {
  g.state = { ...g.state, pets: { ...g.state.pets, [id]: newPetState(id, g.rng, g.now, g.today, out) }, collection: { ...g.state.collection, [id]: { count: 1, firstAt: g.now } } };
  return id;
}
const xpTo = (level: number) => LEVEL_XP[level - 1]!;
const give = (g: Game, petId: string, xp: number) => g.run((tx) => addXp(tx, petId, xp));
const valid = (s: AppState) => {
  const v = validateState(s);
  return v.ok ? [] : v.errors;
};

describe('friendship leaves marks that stay (§8.2)', () => {
  it('level 4 claims a favourite spot: the pot of the habit it keeps company', () => {
    const g = new Game();
    const walk = g.addHabit({ name: 'Walk' });
    const cat = addPet(g, 'pet-cat-tortie');
    g.run((tx) => company.setCompanion(tx, walk, cat));
    give(g, cat, xpTo(4) - 1);
    expect(g.state.pets[cat]!.spot).toBeUndefined();
    give(g, cat, 1);
    expect(g.state.pets[cat]!.spot).toEqual({ kind: 'pot', habitId: walk });
    // Kept, even when the pairing changes later.
    g.run((tx) => company.setCompanion(tx, walk, null));
    give(g, cat, 10);
    expect(g.state.pets[cat]!.spot).toEqual({ kind: 'pot', habitId: walk });
    expect(valid(g.state)).toEqual([]);
  });

  it('without a plant, the spot is its place, else the place its species loves, else the Sill', () => {
    const g = new Game();
    g.setWallet({ coins: 5_000 });
    const duck = addPet(g, 'pet-duck-mallard');
    const cat = addPet(g, 'pet-cat-orange');
    expect(claimSpot(g.state, cat)).toEqual({ kind: 'place', place: 'sill' });
    g.run((tx) => shelf.buyPlace(tx, 'pond'));
    expect(petPlace(g.state, g.state.pets[duck]!)).toBe('pond'); // moved in when it opened
    expect(claimSpot(g.state, duck)).toEqual({ kind: 'place', place: 'pond' });
    g.run((tx) => shelf.setPetPlace(tx, duck, null));
    expect(claimSpot(g.state, duck)).toEqual({ kind: 'place', place: 'pond' }); // the species' favourite open place
    give(g, duck, xpTo(4));
    expect(g.state.pets[duck]!.spot).toEqual({ kind: 'place', place: 'pond' });
  });

  it('level 8 picks a best friend (same place, then same species); alone it waits for one', () => {
    const g = new Game();
    const cat = addPet(g, 'pet-cat-tortie');
    give(g, cat, xpTo(8));
    expect(g.state.pets[cat]!.bestFriend).toBeUndefined(); // alone on the Shelf
    const cow = addPet(g, 'pet-cow-jersey');
    const cat2 = addPet(g, 'pet-cat-orange');
    expect(chooseBestFriend(g.state, cat)).toBe(cat2); // same place (the Sill), same species
    give(g, cat, 5);
    expect(g.state.pets[cat]!.bestFriend).toBe(cat2);
    // Chosen once, kept.
    give(g, cow, xpTo(8));
    expect(g.state.pets[cow]!.bestFriend).toBeDefined();
    expect(g.state.pets[cat]!.bestFriend).toBe(cat2);
    expect(valid(g.state)).toEqual([]);
  });

  it('level 10 dates best friends; each 150 XP after it records a dated Memory', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit({ name: 'Walk' });
    const cat = addPet(g, 'pet-cat-tortie');
    g.run((tx) => company.setCompanion(tx, walk, cat));
    g.goTo('2026-03-10');
    give(g, cat, xpTo(10));
    expect(g.state.pets[cat]!.bestFriendsOn).toBe('2026-03-10');
    expect(g.state.pets[cat]!.memories ?? []).toEqual([]);
    give(g, cat, XP_PER_MEMORY);
    g.goTo('2026-03-11');
    give(g, cat, XP_PER_MEMORY * 2);
    const memories = g.state.pets[cat]!.memories!;
    expect(memories.map((m) => m.kind)).toEqual(['best-friends', 'came-home', 'moved-in']);
    expect(memories[0]).toEqual({ kind: 'best-friends', date: '2026-03-10' });
    expect(memories[1]).toEqual({ kind: 'came-home', date: '2026-03-02' });
    expect(memories[2]).toMatchObject({ kind: 'moved-in', habitId: walk });
    // With nothing new to remember, a quiet day on the sill (today), once per day.
    give(g, cat, XP_PER_MEMORY);
    expect(g.state.pets[cat]!.memories!.at(-1)).toEqual({ kind: 'day', date: '2026-03-11' });
    expect(memoryText({ kind: 'best-friends', date: '2026-03-10' })).toBe('Best friends, Mar 10');
    expect(memoryText({ kind: 'came-home', date: '2026-03-02' })).toBe('Came home Mar 2');
    expect(valid(g.state)).toEqual([]);
  });

  it('the Pet Card shows spot, best friend, dated memories, likes and the suggested place', () => {
    const g = new Game();
    const cat = addPet(g, 'pet-cat-tortie');
    const cat2 = addPet(g, 'pet-cat-orange');
    const env = { today: g.today, now: g.now, local: UTC };
    let vm = petVM(g.state, env, cat)!;
    expect(vm).toMatchObject({ spot: null, bestFriend: null, memories: [], place: 'sill', suggestedPlace: 'sill' });
    expect(vm.likes).not.toBeNull(); // the hint before the favourite is found
    give(g, cat, xpTo(10) + XP_PER_MEMORY);
    vm = petVM(g.state, { ...env, today: g.today }, cat)!;
    expect(vm.spot).toEqual({ kind: 'place', place: 'sill' });
    expect(vm.bestFriend).toBe(cat2);
    expect(vm.memories).toHaveLength(1);
    g.state = { ...g.state, pets: { ...g.state.pets, [cat]: { ...g.state.pets[cat]!, favoriteKnown: true } } };
    expect(petVM(g.state, env, cat)!.likes).toEqual({ kind: 'treat', treatId: g.state.pets[cat]!.favoriteTreat });
  });
});

describe('"Known for" stays once the routine has shown (§14.1)', () => {
  it('from the first watered day at Potted, the Pet Card keeps the line on days without one', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit({ name: 'Walk' });
    const cat = addPet(g, 'pet-cat-tortie');
    g.run((tx) => company.setCompanion(tx, walk, cat));
    for (let i = 0; i < 6; i++) {
      g.goTo(addDays('2026-03-02', i));
      g.checkIn(walk);
    }
    const d = addDays('2026-03-02', 6);
    const since = company.pairOf(g.state, cat, walk)!.knownForSince;
    expect(since).toBeDefined();
    // The next day, not watered yet: the line is still there.
    g.goTo(d);
    const vm = petVM(g.state, { today: g.today, now: g.now, local: UTC }, cat)!;
    expect(vm.company.knownFor).toMatchObject({ icon: 'walk', since });
    expect(valid(g.state)).toEqual([]);
  });
});

describe('places hold a few pets each (§8.4)', () => {
  it('a full place refuses one more; bringing a pet out whose place is full puts it on the Sill', () => {
    const g = new Game();
    g.setWallet({ coins: 5_000 });
    const ducks = ['pet-duck-mallard', 'pet-duck-call', 'pet-duck-mandarin'].map((id) => addPet(g, id));
    const r = g.run((tx) => shelf.buyPlace(tx, 'pond'));
    expect(r).toMatchObject({ ok: true });
    const moved = r.ok ? r.movedIn : [];
    expect(moved).toHaveLength(2); // the pond has room for 2
    const left = ducks.find((d) => !moved.includes(d))!;
    expect(suggestPlaceFor(g.state, left)).toBe('sill');
    expect(g.run((tx) => shelf.setPetPlace(tx, left, 'pond'))).toBe(false);
    // Bring one pond duck in, the third takes its place, and the first comes back out to the Sill.
    g.run((tx) => shelf.togglePetOut(tx, moved[0]!));
    expect(g.run((tx) => shelf.setPetPlace(tx, left, 'pond'))).toBe(true);
    g.run((tx) => shelf.togglePetOut(tx, moved[0]!));
    expect(petPlace(g.state, g.state.pets[moved[0]!]!)).toBe('sill');
    expect(valid(g.state)).toEqual([]);
  });
});

describe('never-placed pets settle into the places they love, once a day (§8.4)', () => {
  it('a duck that comes home after the pond opened moves in the next day; a pet that chose the Sill stays', () => {
    const g = new Game({ start: '2026-03-02' });
    g.setWallet({ coins: 5_000 });
    g.run((tx) => shelf.buyPlace(tx, 'pond'));
    const duck = addPet(g, 'pet-duck-mallard');
    const duck2 = addPet(g, 'pet-duck-call');
    g.run((tx) => shelf.setPetPlace(tx, duck2, null)); // chose the Sill
    expect(petPlace(g.state, g.state.pets[duck]!)).toBe('sill');
    g.advance(1);
    expect(g.state.pets[duck]!.place).toBe('pond');
    expect(g.state.pets[duck2]!.place).toBe('sill');
    expect(valid(g.state)).toEqual([]);
  });
});
