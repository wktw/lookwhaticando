/**
 * Universal places (domain-d5, WP-B7, DEC-P10). A place whose `loves` is empty is loved by everyone
 * (catalog/places.ts), so the Balcony Box is a place every species is drawn to: after the places its
 * own species loves, never ahead of them, and never the Sill. It drives "Let {name} choose", opening
 * a place, the daily settling of never-placed pets and the level-4 claim, always within each place's
 * room. An existing save whose Balcony was already open settles its never-placed pets there once,
 * with a one-time notice, and never again.
 */
import { describe, expect, it, vi } from 'vitest';
import { PETS } from '@/catalog/collectibles';
import { PLACES } from '@/catalog/places';
import { SPECIES, type PlaceId, type Species } from '@/catalog/types';
import * as company from '@/domain/company';
import { addXp, newPetState } from '@/domain/friendship';
import { LEVEL_XP } from '@/domain/levels';
import { claimSpot, lovedPlaces, petPlace, placeRoom, petsInPlace, suggestPlaceFor } from '@/domain/places';
import * as shelf from '@/domain/shelf';
import type { AppState } from '@/state/types';
import { validateState } from '@/state/validate';
import { Game } from './game';

vi.setConfig({ testTimeout: 30_000 });

/** Each species' own place (the one whose `loves` names it). */
const OWN: Record<Species, PlaceId> = Object.fromEntries(SPECIES.map((sp) => [sp, PLACES.find((p) => p.loves.includes(sp))!.id])) as Record<Species, PlaceId>;
const petsOf = (sp: Species): string[] => PETS.filter((p) => p.species === sp).map((p) => p.id);

function addPet(g: Game, id: string, xp = 0, out = true): string {
  g.state = {
    ...g.state,
    pets: { ...g.state.pets, [id]: { ...newPetState(id, g.rng, g.now, g.today, out), xp } },
    collection: { ...g.state.collection, [id]: { count: 1, firstAt: g.now } },
  };
  return id;
}
/** Opens places without a purchase (no pet moves): a save as it was before this change. */
function openPlaces(g: Game, ...ids: PlaceId[]): void {
  g.state = { ...g.state, shelf: { ...g.state.shelf, places: PLACES.map((p) => p.id).filter((id) => id === 'sill' || ids.includes(id) || g.state.shelf.places.includes(id)) } };
}
const valid = (s: AppState) => {
  const v = validateState(s);
  return v.ok ? [] : v.errors;
};

describe('the Balcony Box is loved by everyone, after each species’ own place (domain-d5)', () => {
  it('every species loves its own open place first, then the Balcony, and never the Sill', () => {
    const g = new Game();
    openPlaces(g, ...PLACES.map((p) => p.id));
    for (const sp of SPECIES) expect(lovedPlaces(g.state, sp), sp).toEqual([OWN[sp], 'balcony']);
    openPlaces(g);
    g.state = { ...g.state, shelf: { ...g.state.shelf, places: ['sill', 'balcony'] } };
    for (const sp of SPECIES) expect(lovedPlaces(g.state, sp), sp).toEqual(['balcony']);
    g.state = { ...g.state, shelf: { ...g.state.shelf, places: ['sill'] } };
    for (const sp of SPECIES) expect(lovedPlaces(g.state, sp), sp).toEqual([]);
    expect(lovedPlaces(g.state, null)).toEqual([]);
  });

  it('"Let {name} choose" suggests the Balcony when it is the only open place a pet loves, for every species', () => {
    for (const sp of SPECIES) {
      const g = new Game();
      openPlaces(g, 'balcony');
      const [a, b, c] = petsOf(sp);
      addPet(g, a!);
      expect(suggestPlaceFor(g.state, a!), sp).toBe('balcony');
      expect(g.run((tx) => shelf.letPetChoose(tx, a!))?.place, sp).toBe('balcony');
      // Full: the Sill.
      addPet(g, b!);
      g.run((tx) => shelf.setPetPlace(tx, b!, 'balcony'));
      addPet(g, c!);
      expect(suggestPlaceFor(g.state, c!), sp).toBe('sill');
    }
  });

  it('a species’ own place with room comes before the Balcony; when it is full, the Balcony', () => {
    for (const sp of SPECIES) {
      const g = new Game();
      openPlaces(g, OWN[sp], 'balcony');
      const ids = petsOf(sp).slice(0, 5);
      for (const id of ids) addPet(g, id);
      expect(suggestPlaceFor(g.state, ids[0]!), sp).toBe(OWN[sp]);
      g.run((tx) => shelf.setPetPlace(tx, ids[0]!, OWN[sp]));
      g.run((tx) => shelf.setPetPlace(tx, ids[1]!, OWN[sp]));
      expect(suggestPlaceFor(g.state, ids[2]!), sp).toBe('balcony');
      g.run((tx) => shelf.setPetPlace(tx, ids[2]!, 'balcony'));
      g.run((tx) => shelf.setPetPlace(tx, ids[3]!, 'balcony'));
      expect(suggestPlaceFor(g.state, ids[4]!), sp).toBe('sill');
    }
  });

  it('opening the Balcony moves in never-placed pets of every species, the closest friends first, up to its room', () => {
    for (const sp of SPECIES) {
      const g = new Game();
      g.setWallet({ coins: 5_000 });
      const [a, b, c] = petsOf(sp);
      addPet(g, a!, 10);
      addPet(g, b!, 30);
      addPet(g, c!, 20);
      const r = g.run((tx) => shelf.buyPlace(tx, 'balcony'));
      expect(r, sp).toEqual({ ok: true, place: 'balcony', movedIn: [b, c] });
      expect(g.state.pets[a!]!.place, sp).toBeUndefined();
      expect(valid(g.state)).toEqual([]);
    }
  });

  it('opening the Balcony leaves a pet whose own place has room for its own place', () => {
    const g = new Game();
    g.setWallet({ coins: 5_000 });
    openPlaces(g, 'quilt');
    const bear = addPet(g, petsOf('bear')[0]!); // came home today: settles into the Quilt tomorrow
    const cat = addPet(g, petsOf('cat')[0]!);
    const r = g.run((tx) => shelf.buyPlace(tx, 'balcony'));
    expect(r).toEqual({ ok: true, place: 'balcony', movedIn: [cat] });
    g.advance(1);
    expect(g.state.pets[bear]!.place).toBe('quilt');
  });

  it('each new day a never-placed pet of every species settles on the Balcony when its own place is not open', () => {
    for (const sp of SPECIES) {
      const g = new Game({ start: '2026-03-02' });
      g.setWallet({ coins: 5_000 });
      g.run((tx) => shelf.buyPlace(tx, 'balcony'));
      const [a, b] = petsOf(sp);
      addPet(g, a!);
      addPet(g, b!);
      g.run((tx) => shelf.setPetPlace(tx, b!, null)); // chose the Sill
      g.advance(1);
      expect(g.state.pets[a!]!.place, sp).toBe('balcony');
      expect(g.state.pets[b!]!.place, sp).toBe('sill');
    }
  });

  it('each new day a never-placed pet settles in its own place before the Balcony, whatever their Shelf order', () => {
    for (const sp of SPECIES) {
      const g = new Game({ start: '2026-03-02' });
      openPlaces(g, OWN[sp], 'balcony');
      const ids = petsOf(sp).slice(0, 5);
      ids.forEach((id, i) => addPet(g, id, 50 - i));
      g.advance(1);
      expect(ids.map((id) => g.state.pets[id]!.place ?? null), sp).toEqual([OWN[sp], OWN[sp], 'balcony', 'balcony', null]);
      expect(valid(g.state)).toEqual([]);
    }
  });

  it('settling never fills a place past its room, at every place', () => {
    const g = new Game({ start: '2026-03-02' });
    openPlaces(g, ...PLACES.map((p) => p.id));
    for (const sp of SPECIES) for (const id of petsOf(sp).slice(0, 4)) addPet(g, id);
    // Room out on the Shelf is not the question here: every pet is out.
    g.advance(1);
    for (const p of PLACES) expect(petsInPlace(g.state, p.id).length, p.id).toBeLessThanOrEqual(placeRoom(p.id));
    expect(petsInPlace(g.state, 'balcony')).toHaveLength(2);
    g.advance(1);
    for (const p of PLACES) expect(petsInPlace(g.state, p.id).length, p.id).toBeLessThanOrEqual(placeRoom(p.id));
  });

  it('companions, pets placed on purpose and pets that chose the Sill never move', () => {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit({ name: 'Walk' });
    const [c1, c2, c3] = petsOf('cat');
    addPet(g, c1!);
    addPet(g, c2!);
    addPet(g, c3!);
    g.run((tx) => company.setCompanion(tx, walk, c1!));
    g.run((tx) => shelf.setPetPlace(tx, c2!, null));
    openPlaces(g, 'pond');
    g.run((tx) => shelf.setPetPlace(tx, c3!, 'pond'));
    openPlaces(g, 'balcony');
    g.advance(1);
    expect([c1, c2, c3].map((id) => g.state.pets[id!]!.place ?? null)).toEqual([null, 'sill', 'pond']);
    expect(petsInPlace(g.state, 'balcony')).toEqual([]);
  });

  it('the level-4 claim: its own open place first, else the Balcony; a claim already made stays', () => {
    const g = new Game();
    const [cat, cat2] = petsOf('cat');
    addPet(g, cat!);
    addPet(g, cat2!);
    const claimOf = (id: string) => claimSpot(g.state, id);
    expect(claimOf(cat!)).toEqual({ kind: 'place', place: 'sill' });
    openPlaces(g, 'balcony');
    expect(claimOf(cat!)).toEqual({ kind: 'place', place: 'balcony' });
    openPlaces(g, 'bookshelf');
    expect(claimOf(cat!)).toEqual({ kind: 'place', place: 'bookshelf' });
    // A spot claimed before the Balcony counted (the Sill) is kept as it was.
    g.state = { ...g.state, shelf: { ...g.state.shelf, places: ['sill'] } };
    g.run((tx) => addXp(tx, cat2!, LEVEL_XP[3]!));
    expect(g.state.pets[cat2!]!.spot).toEqual({ kind: 'place', place: 'sill' });
    openPlaces(g, 'bookshelf', 'balcony');
    g.run((tx) => addXp(tx, cat2!, 10));
    expect(g.state.pets[cat2!]!.spot).toEqual({ kind: 'place', place: 'sill' });
    expect(petPlace(g.state, g.state.pets[cat2!]!)).not.toBe('balcony');
  });
});

describe('an existing save with the Balcony already open settles its never-placed pets there once, with a notice (DEC-P10)', () => {
  /** A save from before this change: the Balcony open, three never-placed cats and a cow on the Sill. */
  function oldSave(): { g: Game; ids: string[]; walk: string } {
    const g = new Game({ start: '2026-03-02' });
    const walk = g.addHabit({ name: 'Walk' });
    openPlaces(g, 'balcony');
    const ids = [addPet(g, petsOf('cat')[0]!, 5), addPet(g, petsOf('cat')[1]!, 40), addPet(g, petsOf('cow')[0]!, 20), addPet(g, petsOf('cat')[2]!, 1)];
    // A save written before the change has no record of the move.
    const once = { ...g.state.ledger.once };
    delete once['settle|universal'];
    for (const k of Object.keys(once)) if (k.startsWith('settled|')) delete once[k];
    g.state = { ...g.state, ledger: { ...g.state.ledger, once }, pets: Object.fromEntries(Object.entries(g.state.pets).map(([id, p]) => [id, (({ place: _p, ...rest }) => rest)(p)])) };
    return { g, ids, walk };
  }

  it('the next open (the same day) moves the two closest friends to the Balcony and leaves a notice for them', () => {
    const { g, ids } = oldSave();
    g.run(() => undefined);
    expect(ids.map((id) => g.state.pets[id]!.place ?? null)).toEqual([null, 'balcony', 'balcony', null]);
    expect(shelf.settledNotice(g.state)).toEqual([
      { petId: ids[1], place: 'balcony' },
      { petId: ids[2], place: 'balcony' },
    ]);
    expect(valid(g.state)).toEqual([]);
  });

  it('happens once: another open, the next day and a replay of the moved save change nothing more', () => {
    const { g, ids } = oldSave();
    g.run(() => undefined);
    const moved = g.state;
    g.run(() => undefined);
    expect(g.state.pets).toEqual(moved.pets);
    // The notice is seen: it is gone, and nothing brings it back.
    g.run((tx) => shelf.noteSettledNotice(tx));
    expect(shelf.settledNotice(g.state)).toEqual([]);
    g.advance(1);
    expect(shelf.settledNotice(g.state)).toEqual([]);
    expect(ids.map((id) => g.state.pets[id]!.place ?? null)).toEqual([null, 'balcony', 'balcony', null]);
    // A pet brought in frees a spot: the next never-placed pet settles quietly, like any new day.
    g.run((tx) => shelf.togglePetOut(tx, ids[1]!));
    g.advance(1);
    expect(g.state.pets[ids[0]!]!.place).toBe('balcony');
    expect(shelf.settledNotice(g.state)).toEqual([]);
  });

  it('an unseen notice lasts two weeks, then goes quietly', () => {
    const { g } = oldSave();
    g.run(() => undefined);
    g.advance(13);
    expect(shelf.settledNotice(g.state)).toHaveLength(2);
    g.advance(1);
    expect(shelf.settledNotice(g.state)).toEqual([]);
  });

  it('a pet that moved on from the Balcony before the notice was seen is not in it', () => {
    const { g, ids } = oldSave();
    g.run(() => undefined);
    g.run((tx) => shelf.setPetPlace(tx, ids[1]!, null));
    expect(shelf.settledNotice(g.state)).toEqual([{ petId: ids[2], place: 'balcony' }]);
  });

  it('a save without the Balcony open moves nothing and keeps no notice; opening it later is its own announcement', () => {
    const g = new Game({ start: '2026-03-02' });
    g.setWallet({ coins: 5_000 });
    const [a, b, c] = petsOf('cat');
    addPet(g, a!, 3);
    addPet(g, b!, 2);
    g.advance(1);
    expect(shelf.settledNotice(g.state)).toEqual([]);
    const r = g.run((tx) => shelf.buyPlace(tx, 'balcony'));
    expect(r).toMatchObject({ ok: true, movedIn: [a, b] });
    // Straight into the save (an action would open the day first): a new cat, and room for it.
    addPet(g, c!);
    g.state = { ...g.state, pets: { ...g.state.pets, [a!]: { ...g.state.pets[a!]!, inMeadow: false } } };
    g.advance(1);
    expect(g.state.pets[c!]!.place).toBe('balcony');
    expect(shelf.settledNotice(g.state)).toEqual([]);
  });

  it('a pet already placed, a companion and a claim already made never move', () => {
    const { g, ids, walk } = oldSave();
    const [c0, c1, cow, c2] = ids;
    // Straight into the old save (an action would run the open first): c0 keeps Walk company, c1
    // chose the Sill, and the cow claimed the Sill at level 4.
    g.state = {
      ...g.state,
      habits: g.state.habits.map((h) => (h.id === walk ? { ...h, companionId: c0 } : h)),
      pets: {
        ...g.state.pets,
        [c1!]: { ...g.state.pets[c1!]!, place: 'sill' },
        [cow!]: { ...g.state.pets[cow!]!, spot: { kind: 'place', place: 'sill' } },
      },
    };
    g.run(() => undefined);
    expect([c0, c1, cow, c2].map((id) => g.state.pets[id!]!.place ?? null)).toEqual([null, 'sill', 'balcony', 'balcony']);
    expect(g.state.pets[cow!]!.spot).toEqual({ kind: 'place', place: 'sill' });
  });
});
