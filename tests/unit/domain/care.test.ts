import { describe, expect, it } from 'vitest';
import { PLACES } from '@/catalog/places';
import type { AppState, PetState } from '@/state/types';
import * as friendship from '@/domain/friendship';
import * as logging from '@/domain/logging';
import { FOUND_THING_LEVEL, LEVEL_PERKS, LEVEL_XP, levelForXp, levelProgress, levelsCrossed, memoriesFor } from '@/domain/levels';
import * as shelf from '@/domain/shelf';
import * as pantry from '@/domain/pantry';
import { compactSave } from '@/domain/rollover';
import { validateState } from '@/state/validate';
import { Game } from './game';

const addPet = (g: Game, id: string, over: Partial<PetState> = {}): void => {
  const pet: PetState = {
    id,
    name: 'Tofu',
    personality: 'playful',
    favoriteTreat: 'treat-fish-crackers',
    favoriteKnown: false,
    xp: 0,
    outfit: {},
    inMeadow: true,
    favorite: false,
    obtainedAt: g.now,
    daily: { date: g.today, pets: 0, treats: 0 },
    ...over,
  };
  g.state = { ...g.state, pets: { ...g.state.pets, [id]: pet }, collection: { ...g.state.collection, [id]: { count: 1, firstAt: g.now } } };
};
const own = (g: Game, ids: string[], servings = 5): void => {
  const collection: AppState['collection'] = { ...g.state.collection };
  const pan: AppState['pantry'] = { ...g.state.pantry };
  for (const id of ids) {
    collection[id] = { count: 1, firstAt: g.now };
    if (id.startsWith('treat-')) pan[id] = { servings, restockedOn: g.today };
  }
  g.state = { ...g.state, collection, pantry: pan };
};

describe('friendship levels (DESIGN §8.2)', () => {
  it('levels 1–10 then bond levels 11–15', () => {
    expect(LEVEL_XP).toEqual([0, 20, 50, 100, 170, 260, 380, 540, 750, 1000, 1300, 1650, 2050, 2500, 3000]);
    expect([0, 19, 20, 999, 1000, 2999, 3000, 9999].map(levelForXp)).toEqual([1, 1, 2, 9, 10, 14, 15, 15]);
    expect(levelProgress(60)).toMatchObject({ level: 3, into: 10, span: 50, toNext: 40, bond: false });
    expect(levelProgress(3100)).toMatchObject({ level: 15, bond: true, toNext: null, fraction: 1 });
    expect(levelsCrossed(15, 110)).toEqual([2, 3, 4]);
    expect([999, 1000, 1149, 1150, 1300].map(memoriesFor)).toEqual([0, 0, 0, 1, 2]);
  });

  it('levels change behaviour: ids for L2–L8 and best friends at L10', () => {
    expect(LEVEL_PERKS).toEqual({
      2: 'looks-up',
      3: 'slow-blink',
      4: 'favourite-spot',
      5: 'follows-sunbeam',
      6: 'found-things',
      7: 'naps-touching',
      8: 'best-friend-nap',
      10: 'best-friends',
    });
    expect(FOUND_THING_LEVEL).toBe(6);
  });
});

describe('there is no mascot (DESIGN §1)', () => {
  it('a new save, onboarded, owns no pets and has no buddy', () => {
    const g = new Game();
    expect(g.state.pets).toEqual({});
    expect(Object.keys(g.state.collection).some((id) => id.startsWith('pet-'))).toBe(false);
    expect('buddy' in g.state.profile).toBe(false);
    expect(friendship.featuredPetId(g.state)).toBeNull();
  });

  it('every pet can be renamed and brought in or out', () => {
    const g = new Game();
    addPet(g, 'pet-cat-orange');
    expect(g.run((tx) => friendship.renamePet(tx, 'pet-cat-orange', 'Pudding'))).toBe(true);
    expect(g.run((tx) => shelf.togglePetOut(tx, 'pet-cat-orange'))).toBe(true);
    expect(g.state.pets['pet-cat-orange']).toMatchObject({ name: 'Pudding', inMeadow: false });
    expect(g.run((tx) => shelf.togglePetOut(tx, 'pet-cat-orange'))).toBe(true);
    expect(g.state.pets['pet-cat-orange']!.inMeadow).toBe(true);
  });

  it('the featured pet: a favourite out, then any favourite, then the closest friend out, then anyone', () => {
    const g = new Game();
    addPet(g, 'pet-a', { xp: 50, inMeadow: false, obtainedAt: 1 });
    expect(friendship.featuredPetId(g.state)).toBe('pet-a');
    addPet(g, 'pet-b', { xp: 10, obtainedAt: 2 });
    expect(friendship.featuredPetId(g.state)).toBe('pet-b'); // out beats closer but indoors
    addPet(g, 'pet-c', { xp: 30, obtainedAt: 3 });
    expect(friendship.featuredPetId(g.state)).toBe('pet-c'); // the closest friend out
    addPet(g, 'pet-d', { xp: 0, inMeadow: false, favorite: true, obtainedAt: 4 });
    expect(friendship.featuredPetId(g.state)).toBe('pet-d'); // a favourite, even indoors
    addPet(g, 'pet-e', { xp: 0, favorite: true, obtainedAt: 5 });
    expect(friendship.featuredPetId(g.state)).toBe('pet-e'); // a favourite out
  });
});

describe('petting (+1 XP, 5 a day; reactions never capped)', () => {
  it('caps the XP at 5 a day and resets on the next app day', () => {
    const g = new Game();
    addPet(g, 'pet-cat-orange');
    const reactions = Array.from({ length: 7 }, () => g.run((tx) => friendship.petPet(tx, 'pet-cat-orange')).reaction);
    expect(reactions).toEqual(['happy', 'happy', 'happy', 'happy', 'happy', 'capped', 'capped']);
    expect(g.state.pets['pet-cat-orange']!.xp).toBe(5);
    g.advance(1);
    expect(g.run((tx) => friendship.petPet(tx, 'pet-cat-orange')).xpGained).toBe(1);
  });

  it('levelling up emits petLevel and a pet reaching level 10 earns Best Friends', () => {
    const g = new Game();
    addPet(g, 'pet-cat-orange', { xp: 999 });
    const r = g.run((tx) => friendship.petPet(tx, 'pet-cat-orange'));
    expect(r).toEqual({ xpGained: 1, leveledUp: true, level: 10, reaction: 'happy' }); // no words: the screen picks the caption
    expect(g.lastOf('petLevel')).toEqual([{ type: 'petLevel', petId: 'pet-cat-orange', level: 10 }]);
    expect(g.state.badges['best-friends']).toBeDefined();
  });
});

describe('treats (+4, favorite +12 once a day, 3 counted a day)', () => {
  it('pays 4, the first favorite 12, then "full" without using a serving', () => {
    const g = new Game();
    own(g, ['treat-fish-crackers', 'treat-salmon']);
    addPet(g, 'pet-cat-orange', { favoriteTreat: 'treat-fish-crackers' });
    const r1 = g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-salmon'));
    const r2 = g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-fish-crackers'));
    const r3 = g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-fish-crackers'));
    const r4 = g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-fish-crackers'));
    expect([r1, r2, r3, r4].map((r) => [r.reaction, r.xpGained])).toEqual([
      ['happy', 4],
      ['love', 12],
      ['love', 4],
      ['full', 0],
    ]);
    expect(g.state.pantry['treat-fish-crackers']!.servings).toBe(3);
    expect(g.state.pets['pet-cat-orange']).toMatchObject({ xp: 20, favoriteKnown: true });
    expect(g.allOf('favoriteFound')).toEqual([{ type: 'favoriteFound', petId: 'pet-cat-orange', treatId: 'treat-fish-crackers' }]);
    expect(g.state.badges['first-treat']).toBeDefined();
    expect(g.state.badges['favorite-found']).toBeDefined();
  });

  it('no servings → "none"; unowned treats can’t be fed', () => {
    const g = new Game();
    own(g, ['treat-fish-crackers'], 0);
    addPet(g, 'pet-cat-orange');
    expect(g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-fish-crackers')).reaction).toBe('none');
    expect(g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-cheese')).reaction).toBe('none');
  });
});

describe('pet profile', () => {
  it('rename (trimmed, ≤ 24 chars), favourite, outfits of owned items in their slot', () => {
    const g = new Game();
    addPet(g, 'pet-cat-orange');
    addPet(g, 'pet-cow-holstein');
    expect(g.run((tx) => friendship.renamePet(tx, 'pet-cat-orange', '   '))).toBe(false);
    g.run((tx) => friendship.renamePet(tx, 'pet-cat-orange', '  Sir Fluffington the Third of the Sill  '));
    expect(g.state.pets['pet-cat-orange']!.name).toBe('Sir Fluffington the Thir');
    g.run((tx) => friendship.toggleFavoritePet(tx, 'pet-cat-orange'));
    expect(g.state.pets['pet-cat-orange']!.favorite).toBe(true);
    expect(g.run((tx) => friendship.setOutfit(tx, 'pet-cat-orange', 'head', 'wear-ribbon-bow'))).toBe(false); // not owned
    own(g, ['wear-ribbon-bow']);
    expect(g.run((tx) => friendship.setOutfit(tx, 'pet-cat-orange', 'neck', 'wear-ribbon-bow'))).toBe(false); // wrong slot
    expect(g.run((tx) => friendship.setOutfit(tx, 'pet-cat-orange', 'head', 'wear-ribbon-bow'))).toBe(true);
    expect(g.run((tx) => friendship.setOutfit(tx, 'pet-cow-holstein', 'head', 'wear-ribbon-bow'))).toBe(true); // several pets at once
    expect(g.state.badges['first-outfit']).toBeDefined();
    g.run((tx) => friendship.setOutfit(tx, 'pet-cat-orange', 'head', null));
    expect(g.state.pets['pet-cat-orange']!.outfit).toEqual({});
  });
});

describe('found things (DESIGN §8.2: L6 leaves one on days you check in, 1 swap, never a chore)', () => {
  const L6 = LEVEL_XP[FOUND_THING_LEVEL - 1]!;

  it('one a day, on the first check-in, from an L6+ pet out on the Shelf, worth 1 swap', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit();
    const read = g.addHabit({ name: 'Read', icon: 'book' });
    addPet(g, 'pet-cat-orange', { xp: L6 });
    addPet(g, 'pet-cow-holstein', { xp: L6 - 1 }); // L5: not yet
    g.checkIn(walk);
    expect(g.lastOf('foundThing')).toEqual([{ type: 'foundThing', petId: 'pet-cat-orange', date: '2026-03-02', seed: expect.any(Number), swaps: 1 }]);
    expect(g.state.wallet.stardust).toBe(1);
    expect(g.state.found).toEqual([{ date: '2026-03-02', petId: 'pet-cat-orange', seed: expect.any(Number) }]);
    g.checkIn(read);
    g.undo(walk);
    g.checkIn(walk);
    expect(g.allOf('foundThing')).toHaveLength(1); // one a day, however the day goes
    expect(g.state.wallet.stardust).toBe(1); // and never taken back
    g.advance(1);
    g.checkIn(walk);
    expect(g.allOf('foundThing')).toHaveLength(2);
    expect(g.state.wallet.stardust).toBe(2);
  });

  it('no check-in, no found thing; nobody at L6, or only L6 pets indoors, none either', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit();
    addPet(g, 'pet-cat-orange', { xp: L6, inMeadow: false });
    g.advance(1);
    expect(g.allOf('foundThing')).toEqual([]);
    g.checkIn(walk);
    expect(g.allOf('foundThing')).toEqual([]);
    expect(friendship.foundThingFinders(g.state)).toEqual([]);
  });

  it('rests and history edits leave nothing; only a reward-path check-in does', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit();
    addPet(g, 'pet-cat-orange', { xp: L6 });
    g.rest(walk, '2026-03-02');
    expect(g.allOf('foundThing')).toEqual([]);
    g.goTo('2026-03-20');
    expect(g.run((tx) => logging.editHistory(tx, walk, '2026-03-05', true))).toBe(true);
    expect(g.allOf('foundThing')).toEqual([]);
  });

  it('are kept 14 app days, then compacted away; the save stays valid', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit();
    addPet(g, 'pet-cat-orange', { xp: L6 });
    for (let i = 0; i < 20; i++) {
      g.checkIn(walk);
      g.advance(1);
    }
    g.run((tx) => compactSave(tx));
    const found = g.state.found ?? [];
    expect(found.length).toBe(13); // today (not yet checked in) − 13 … yesterday
    expect(found.every((f) => f.date >= '2026-03-09')).toBe(true);
    expect(validateState(g.state).ok).toBe(true);
  });
});

describe('pantry (DESIGN §8.2: 2 servings every morning, bank up to 5)', () => {
  it('restocks each morning up to 5, catching up after days away, never lowering a bigger stack', () => {
    expect(pantry.restocked(undefined, '2026-03-02')).toEqual({ servings: 2, restockedOn: '2026-03-02' });
    expect(pantry.restocked({ servings: 0, restockedOn: '2026-03-01' }, '2026-03-02')).toEqual({ servings: 2, restockedOn: '2026-03-02' });
    expect(pantry.restocked({ servings: 4, restockedOn: '2026-03-01' }, '2026-03-02')).toEqual({ servings: 5, restockedOn: '2026-03-02' });
    expect(pantry.restocked({ servings: 1, restockedOn: '2026-02-20' }, '2026-03-02')).toEqual({ servings: 5, restockedOn: '2026-03-02' });
    expect(pantry.restocked({ servings: 9, restockedOn: '2026-03-01' }, '2026-03-02')).toEqual({ servings: 9, restockedOn: '2026-03-02' });
    const same = { servings: 1, restockedOn: '2026-03-02' };
    expect(pantry.restocked(same, '2026-03-02')).toBe(same);
  });

  it('the starter recipes restock on a new day and emit one restock event', () => {
    const g = new Game({ start: '2026-03-02' });
    expect(g.state.pantry['treat-strawberry']).toEqual({ servings: 2, restockedOn: '2026-03-02' });
    g.state = { ...g.state, pantry: { ...g.state.pantry, 'treat-strawberry': { servings: 0, restockedOn: '2026-03-02' } } };
    g.advance(1);
    expect(g.state.pantry['treat-strawberry']).toEqual({ servings: 2, restockedOn: '2026-03-03' });
    expect(g.lastOf('restock')).toEqual([{ type: 'restock', treats: 2 }]);
  });

  it('bake a tray: 5 servings of an owned recipe for 10 coins', () => {
    const g = new Game();
    expect(g.run((tx) => pantry.bakeTray(tx, 'treat-strawberry'))).toEqual({ ok: false }); // no coins
    g.setWallet({ coins: 15 });
    expect(g.run((tx) => pantry.bakeTray(tx, 'treat-cheese'))).toEqual({ ok: false }); // not owned
    expect(g.run((tx) => pantry.bakeTray(tx, 'treat-strawberry'))).toEqual({ ok: true });
    expect(g.state.pantry['treat-strawberry']!.servings).toBe(7);
    expect(g.coins).toBe(5);
  });
});

describe('the Shelf (DESIGN §8.3 decor, §8.4 places)', () => {
  it('places cost their catalog price, any order, once, and stay in Shelf order', () => {
    const g = new Game();
    g.setWallet({ coins: 1200 });
    expect(g.run((tx) => shelf.buyPlace(tx, 'sill'))).toEqual({ ok: false, error: 'owned' });
    expect(g.run((tx) => shelf.buyPlace(tx, 'grass'))).toEqual({ ok: true, place: 'grass', movedIn: [] });
    expect(g.run((tx) => shelf.buyPlace(tx, 'pond'))).toEqual({ ok: true, place: 'pond', movedIn: [] });
    expect(g.run((tx) => shelf.buyPlace(tx, 'bookshelf'))).toEqual({ ok: false, error: 'not-enough-coins' });
    expect(g.coins).toBe(1200 - 700 - 400);
    expect(g.state.shelf.places).toEqual(['sill', 'pond', 'grass']);
    expect(PLACES.map((p) => [p.id, p.price])).toEqual([
      ['sill', 0],
      ['pond', 400],
      ['grass', 700],
      ['bookshelf', 1000],
      ['balcony', 1500],
      ['quilt', 2500],
    ]);
  });

  it('pets out: 8 + 2 per extra place (8 → 18); a full Shelf keeps newcomers indoors', () => {
    const g = new Game();
    expect(shelf.petsOutCapacity(g.state)).toBe(8);
    for (let i = 0; i < 9; i++) addPet(g, `pet-x${i}`, { inMeadow: false });
    let out = 0;
    for (let i = 0; i < 9; i++) if (g.run((tx) => shelf.togglePetOut(tx, `pet-x${i}`))) out++;
    expect(out).toBe(8);
    expect(shelf.petsOutCount(g.state)).toBe(8);
    expect(shelf.hasRoomOut(g.state)).toBe(false);
    g.setWallet({ coins: 400 });
    g.run((tx) => shelf.buyPlace(tx, 'pond'));
    expect(shelf.petsOutCapacity(g.state)).toBe(10);
    expect(g.run((tx) => shelf.togglePetOut(tx, 'pet-x8'))).toBe(true);
    g.state = { ...g.state, shelf: { ...g.state.shelf, places: PLACES.map((p) => p.id) } };
    expect(shelf.petsOutCapacity(g.state)).toBe(18);
  });

  it('decor: one placement per owned copy, owned places only, 24 per place, clamped coordinates', () => {
    const g = new Game();
    own(g, ['decor-cardboard-box']);
    expect(g.run((tx) => shelf.placeDecor(tx, 'decor-cardboard-box', 'pond', 0.5, 0.5))).toBeNull(); // place not owned
    const id = g.run((tx) => shelf.placeDecor(tx, 'decor-cardboard-box', 'sill', 1.7, -2, true));
    expect(id).toMatch(/^d-/);
    expect(g.state.shelf.decor[0]).toEqual({ id, itemId: 'decor-cardboard-box', place: 'sill', x: 1, y: 0, flip: true });
    expect(g.run((tx) => shelf.placeDecor(tx, 'decor-cardboard-box', 'sill', 0.2, 0.2))).toBeNull(); // only one copy
    expect(g.run((tx) => shelf.moveDecor(tx, id!, { x: 0.25, flip: false }))).toBe(true);
    expect(g.state.shelf.decor[0]).toEqual({ id, itemId: 'decor-cardboard-box', place: 'sill', x: 0.25, y: 0 });
    expect(g.run((tx) => shelf.moveDecor(tx, id!, { place: 'quilt' }))).toBe(false);
    expect(g.run((tx) => shelf.removeDecor(tx, id!))).toBe(true);
    expect(g.state.shelf.decor).toEqual([]);
    // 24 per place
    g.state = { ...g.state, collection: { ...g.state.collection, 'decor-cardboard-box': { count: 30, firstAt: 0 } } };
    let placed = 0;
    for (let i = 0; i < 30; i++) if (g.run((tx) => shelf.placeDecor(tx, 'decor-cardboard-box', 'sill', 0.5, 0.5))) placed++;
    expect(placed).toBe(shelf.MAX_DECOR_PER_PLACE);
    expect(new Set(g.state.shelf.decor.map((d) => d.id)).size).toBe(24);
  });
});
