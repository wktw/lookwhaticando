import { describe, expect, it } from 'vitest';
import { MOCHI_ID } from '@/catalog/collectibles';
import { ZONES } from '@/catalog/zones';
import type { AppState, PetState } from '@/state/types';
import * as friendship from '@/domain/friendship';
import { LEVEL_XP, levelForXp, levelProgress, levelsCrossed, memoriesFor } from '@/domain/levels';
import * as meadow from '@/domain/meadow';
import * as pantry from '@/domain/pantry';
import { Game } from './game';

const addPet = (g: Game, id: string, over: Partial<PetState> = {}): void => {
  const pet: PetState = {
    id,
    name: 'Tofu',
    personality: 'playful',
    favoriteTreat: 'treat-cookie',
    favoriteKnown: false,
    xp: 0,
    outfit: {},
    inMeadow: true,
    favorite: false,
    obtainedAt: g.now,
    daily: { date: g.today, pets: 0, treats: 0, buddy: 0 },
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

describe('friendship levels (DESIGN §13.10 thresholds)', () => {
  it('levels 1–10 then bond levels 11–15', () => {
    expect(LEVEL_XP).toEqual([0, 20, 50, 100, 170, 260, 380, 540, 750, 1000, 1300, 1650, 2050, 2500, 3000]);
    expect([0, 19, 20, 999, 1000, 2999, 3000, 9999].map(levelForXp)).toEqual([1, 1, 2, 9, 10, 14, 15, 15]);
    expect(levelProgress(60)).toMatchObject({ level: 3, into: 10, span: 50, toNext: 40, bond: false });
    expect(levelProgress(3100)).toMatchObject({ level: 15, bond: true, toNext: null, fraction: 1 });
    expect(levelsCrossed(15, 110)).toEqual([2, 3, 4]);
    expect([999, 1000, 1149, 1150, 1300].map(memoriesFor)).toEqual([0, 0, 0, 1, 2]);
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
    expect(r).toMatchObject({ leveledUp: true, level: 10 });
    expect(g.lastOf('petLevel')).toEqual([{ type: 'petLevel', petId: 'pet-cat-orange', level: 10 }]);
    expect(g.state.badges['best-friends']).toBeDefined();
  });
});

describe('treats (+4, favorite +12 once a day, 3 counted a day)', () => {
  it('pays 4, the first favorite 12, then "so full" without using a serving', () => {
    const g = new Game();
    own(g, ['treat-cookie', 'treat-donut']);
    addPet(g, 'pet-cat-orange', { favoriteTreat: 'treat-cookie' });
    const r1 = g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-donut'));
    const r2 = g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-cookie'));
    const r3 = g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-cookie'));
    const r4 = g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-cookie'));
    expect([r1, r2, r3, r4].map((r) => [r.reaction, r.xpGained])).toEqual([
      ['happy', 4],
      ['love', 12],
      ['love', 4],
      ['full', 0],
    ]);
    expect(g.state.pantry['treat-cookie']!.servings).toBe(3);
    expect(g.state.pets['pet-cat-orange']).toMatchObject({ xp: 20, favoriteKnown: true });
    expect(g.allOf('favoriteFound')).toEqual([{ type: 'favoriteFound', petId: 'pet-cat-orange', treatId: 'treat-cookie' }]);
    expect(g.state.badges['first-treat']).toBeDefined();
    expect(g.state.badges['favorite-found']).toBeDefined();
  });

  it('no servings → "none"; unowned treats can’t be fed', () => {
    const g = new Game();
    own(g, ['treat-cookie'], 0);
    addPet(g, 'pet-cat-orange');
    expect(g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-cookie')).reaction).toBe('none');
    expect(g.run((tx) => friendship.feedPet(tx, 'pet-cat-orange', 'treat-boba')).reaction).toBe('none');
  });
});

describe('Mochi (DESIGN §13.10)', () => {
  it('is Sunny, loves Strawberry Milk (known from day one), keeps her name and never leaves the meadow', () => {
    const g = new Game();
    expect(g.state.pets[MOCHI_ID]).toMatchObject({ personality: 'sunny', favoriteTreat: 'treat-strawberry-milk', favoriteKnown: true, inMeadow: true, name: 'Mochi' });
    expect(g.state.profile.buddy).toBe(MOCHI_ID);
    expect(g.run((tx) => friendship.renamePet(tx, MOCHI_ID, 'Bob'))).toBe(false);
    expect(g.run((tx) => meadow.toggleInMeadow(tx, MOCHI_ID))).toBe(false);
    expect(g.state.pets[MOCHI_ID]!.name).toBe('Mochi');
  });
});

describe('pet profile', () => {
  it('rename (trimmed, ≤ 24 chars), favorite, buddy, outfits of owned items in their slot', () => {
    const g = new Game();
    addPet(g, 'pet-cat-orange');
    expect(g.run((tx) => friendship.renamePet(tx, 'pet-cat-orange', '   '))).toBe(false);
    g.run((tx) => friendship.renamePet(tx, 'pet-cat-orange', '  Sir Fluffington the Third of Meadow  '));
    expect(g.state.pets['pet-cat-orange']!.name).toBe('Sir Fluffington the Thir');
    g.run((tx) => friendship.toggleFavoritePet(tx, 'pet-cat-orange'));
    g.run((tx) => friendship.setBuddy(tx, 'pet-cat-orange'));
    expect(g.state.profile.buddy).toBe('pet-cat-orange');
    expect(g.run((tx) => friendship.setOutfit(tx, 'pet-cat-orange', 'head', 'wear-pink-bow'))).toBe(false); // not owned
    own(g, ['wear-pink-bow']);
    expect(g.run((tx) => friendship.setOutfit(tx, 'pet-cat-orange', 'neck', 'wear-pink-bow'))).toBe(false); // wrong slot
    expect(g.run((tx) => friendship.setOutfit(tx, 'pet-cat-orange', 'head', 'wear-pink-bow'))).toBe(true);
    expect(g.run((tx) => friendship.setOutfit(tx, MOCHI_ID, 'head', 'wear-pink-bow'))).toBe(true); // several pets at once
    expect(g.state.badges['first-outfit']).toBeDefined();
    g.run((tx) => friendship.setOutfit(tx, 'pet-cat-orange', 'head', null));
    expect(g.state.pets['pet-cat-orange']!.outfit).toEqual({});
  });
});

describe('pantry (DESIGN §13.10: 2 servings every morning, bank up to 5)', () => {
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
    expect(g.run((tx) => pantry.bakeTray(tx, 'treat-boba'))).toEqual({ ok: false }); // not owned
    expect(g.run((tx) => pantry.bakeTray(tx, 'treat-strawberry'))).toEqual({ ok: true });
    expect(g.state.pantry['treat-strawberry']!.servings).toBe(7);
    expect(g.coins).toBe(5);
  });
});

describe('meadow (DESIGN §13.7 zones, §13.10 decor)', () => {
  it('zones cost their catalog price, any order, once', () => {
    const g = new Game();
    g.setWallet({ coins: 1200 });
    expect(g.run((tx) => meadow.buyZone(tx, 'meadow'))).toEqual({ ok: false, error: 'owned' });
    expect(g.run((tx) => meadow.buyZone(tx, 'orchard'))).toEqual({ ok: true, zone: 'orchard' });
    expect(g.run((tx) => meadow.buyZone(tx, 'pond'))).toEqual({ ok: true, zone: 'pond' });
    expect(g.run((tx) => meadow.buyZone(tx, 'porch'))).toEqual({ ok: false, error: 'not-enough-coins' });
    expect(g.coins).toBe(1200 - 700 - 400);
    expect(g.state.meadow.zones).toEqual(['meadow', 'pond', 'orchard']);
    expect(ZONES.map((z) => z.price)).toEqual([0, 400, 700, 1000, 1500, 2500]);
  });

  it('pets out: 8 + 2 per extra zone; a full meadow sends newcomers to nap', () => {
    const g = new Game();
    expect(meadow.petsOutCapacity(g.state)).toBe(8);
    for (let i = 0; i < 9; i++) addPet(g, `pet-x${i}`, { inMeadow: false });
    let out = 1; // Mochi
    for (let i = 0; i < 9; i++) if (g.run((tx) => meadow.toggleInMeadow(tx, `pet-x${i}`))) out++;
    expect(out).toBe(8);
    expect(meadow.petsOutCount(g.state)).toBe(8);
    g.setWallet({ coins: 400 });
    g.run((tx) => meadow.buyZone(tx, 'pond'));
    expect(meadow.petsOutCapacity(g.state)).toBe(10);
    expect(g.run((tx) => meadow.toggleInMeadow(tx, 'pet-x8'))).toBe(true);
  });

  it('decor: one placement per owned copy, owned zones only, 24 per zone, clamped coordinates', () => {
    const g = new Game();
    own(g, ['decor-cardboard-box']);
    expect(g.run((tx) => meadow.placeDecor(tx, 'decor-cardboard-box', 'pond', 0.5, 0.5))).toBeNull(); // zone not owned
    const id = g.run((tx) => meadow.placeDecor(tx, 'decor-cardboard-box', 'meadow', 1.7, -2, true));
    expect(id).toMatch(/^d-/);
    expect(g.state.meadow.decor[0]).toEqual({ id, itemId: 'decor-cardboard-box', zone: 'meadow', x: 1, y: 0, flip: true });
    expect(g.run((tx) => meadow.placeDecor(tx, 'decor-cardboard-box', 'meadow', 0.2, 0.2))).toBeNull(); // only one copy
    expect(g.run((tx) => meadow.moveDecor(tx, id!, { x: 0.25, flip: false }))).toBe(true);
    expect(g.state.meadow.decor[0]).toEqual({ id, itemId: 'decor-cardboard-box', zone: 'meadow', x: 0.25, y: 0 });
    expect(g.run((tx) => meadow.moveDecor(tx, id!, { zone: 'starhill' }))).toBe(false);
    expect(g.run((tx) => meadow.removeDecor(tx, id!))).toBe(true);
    expect(g.state.meadow.decor).toEqual([]);
    // 24 per zone
    g.state = { ...g.state, collection: { ...g.state.collection, 'decor-cardboard-box': { count: 30, firstAt: 0 } } };
    let placed = 0;
    for (let i = 0; i < 30; i++) if (g.run((tx) => meadow.placeDecor(tx, 'decor-cardboard-box', 'meadow', 0.5, 0.5))) placed++;
    expect(placed).toBe(meadow.MAX_DECOR_PER_ZONE);
    expect(new Set(g.state.meadow.decor.map((d) => d.id)).size).toBe(24);
  });
});
