import { createInitialState } from '@/state/defaults';
import { habit } from '../../../tests/unit/domain/helpers';
import { UTC, at } from '../../../tests/unit/domain/game';
import { describe, expect, it } from 'vitest';
import type { PetSummaryVM, ShelfVM, SillPotVM } from '@/state/selectors';
import { MAX_DECOR_PER_PLACE, favouriteSpotOf, newDecorSpot, pantryRows, petsByPlace, placeInView, retiredPots, roomIn, scrollToSegment, shelfDecor, shelfPets, shelfPots, sillExtras, speciesOfId } from './model';

const pot = (habitId: string, extra: Partial<SillPotVM> = {}): SillPotVM => ({
  habitId,
  icon: 'book',
  name: habitId,
  note: null,
  species: 'pothos',
  pot: 'terracotta',
  stage: 3,
  progress: 0.4,
  blooms: undefined,
  pulse: 2,
  done: false,
  damp: false,
  resident: null,
  routine: null,
  bow: false,
  look: null,
  ...extra,
});

const pet = (id: string, extra: Partial<PetSummaryVM> = {}): PetSummaryVM => ({
  id,
  name: id.toUpperCase(),
  variant: 'Calico',
  species: 'cat',
  personality: 'sleepy',
  personalityLabel: 'Sleepy',
  level: 3,
  bond: false,
  hearts: 3,
  fraction: 0.2,
  out: true,
  place: 'sill',
  outfit: {},
  favorite: false,
  featured: false,
  moonlit: false,
  obtainedAt: 0,
  habitId: null,
  ...extra,
});

describe('the Sill’s pots', () => {
  it('keep her habit order all day, not the time blocks’ order', () => {
    const habits = [{ id: 'walk' }, { id: 'read' }, { id: 'yoga' }];
    const todaySill = [pot('yoga'), pot('walk'), pot('read')];
    expect(shelfPots(habits, todaySill).map((p) => p.habitId)).toEqual(['walk', 'read', 'yoga']);
  });

  it('leave out archived habits and keep a paused one’s pot, as it stands', () => {
    const habits = [{ id: 'walk' }, { id: 'old', archivedOn: '2026-01-01' }, { id: 'paused' }];
    const out = shelfPots(habits, [pot('walk'), pot('old')], [{ habitId: 'paused', name: 'Paused', species: 'pilea', pot: 'cream', stage: 5, progress: 0.1, blooms: undefined, look: undefined, flourishes: 0 }]);
    expect(out.map((p) => p.habitId)).toEqual(['walk', 'paused']);
    expect(out[1]).toMatchObject({ species: 'pilea', stage: 5, pot: 'cream' });
    expect(out[1]!.damp).toBeUndefined();
  });

  it('carry the day’s damp soil, look, routine and bow, and leave blooms out below Evergreen', () => {
    const [p] = shelfPots([{ id: 'read' }], [pot('read', { damp: true, bow: true, look: { colour: 'dawn', shape: 'petite' }, routine: { petId: 'x', routine: 'read', phase: 'settled' }, note: 'after tea' })]);
    expect(p).toMatchObject({ damp: true, bow: true, look: { colour: 'dawn', shape: 'petite' }, routine: 'read', note: 'after tea' });
    expect('blooms' in p!).toBe(false);
    const [ever] = shelfPots([{ id: 'read' }], [pot('read', { stage: 7, blooms: 6 })]);
    expect(ever!.blooms).toBe(6);
  });

  it('retired plants stand on the balcony as they last grew', () => {
    const state = createInitialState(at('2026-01-02'));
    state.habits = [{ ...habit({ id: 'r', startedOn: '2025-01-01' }), plant: 'monstera', pot: 'cream', archivedOn: '2026-01-01' }];
    state.ledger.bestStage.r = 6;
    const out = retiredPots([{ habitId: 'r', name: 'Run', plant: 'monstera', pot: 'cream', archivedOn: '2026-01-01', ribbon: null }], state, { today: '2026-01-02', now: at('2026-01-02'), local: UTC });
    expect(out).toMatchObject([{ habitId: 'r', name: 'Run', species: 'monstera', stage: 6, pot: 'cream' }]);
  });
});

describe('the pets out', () => {
  it('map to the scene: key, look, companion’s home, place and favourite spot', () => {
    const out = shelfPets([pet('pet-cat-calico', { habitId: 'read', place: 'pond' }), pet('pet-cow-jersey')], {
      'pet-cat-calico': { spot: { kind: 'pot', habitId: 'read' } },
      'pet-cow-jersey': { spot: { kind: 'place', place: 'grass' } },
    } as never);
    expect(out[0]).toEqual({ key: 'pet-cat-calico', petId: 'pet-cat-calico', name: 'PET-CAT-CALICO', personality: 'sleepy', outfit: {}, home: 'read', place: 'pond', favouriteSpot: 'pot:read' });
    expect(out[1]).toMatchObject({ place: 'sill', favouriteSpot: 'grass' });
    expect('home' in out[1]!).toBe(false);
  });

  it('a favourite spot reads as the scene wants it', () => {
    expect(favouriteSpotOf(undefined)).toBeUndefined();
    expect(favouriteSpotOf({ kind: 'pot', habitId: 'h1' })).toBe('pot:h1');
    expect(favouriteSpotOf({ kind: 'place', place: 'quilt' })).toBe('quilt');
  });

  it('a Moonlit pet is its base species', () => {
    expect(speciesOfId('moonlit:pet-cow-jersey')).toBe('cow');
    expect(speciesOfId('pet-duck-yellow')).toBe('duck');
    expect(speciesOfId('decor-yarn-ball')).toBeNull();
  });
});

describe('places', () => {
  const out = [pet('a', { place: 'pond' }), pet('b', { place: 'pond' }), pet('c')];
  it('count who is where', () => {
    expect(petsByPlace(out)).toEqual(new Map([['pond', 2], ['sill', 1]]));
  });
  it('the Sill holds everyone; another place holds its room, the pet itself not counting', () => {
    expect(roomIn('sill', out)).toBe(true);
    expect(roomIn('pond', out)).toBe(false);
    expect(roomIn('pond', out, 'a')).toBe(true);
    expect(roomIn('grass', out)).toBe(true);
  });
  it('the place in view is the one under the middle of the scroller', () => {
    const segs = [
      { id: 'sill' as const, left: 0, width: 600 },
      { id: 'pond' as const, left: 600, width: 300 },
      { id: 'quilt' as const, left: 900, width: 300 },
    ];
    expect(placeInView(segs, 0, 390)).toBe('sill');
    expect(placeInView(segs, 500, 390)).toBe('pond');
    expect(placeInView(segs, 810, 390)).toBe('quilt');
  });
  it('going to a place centres it, or shows its start when it is wider than the view', () => {
    expect(scrollToSegment({ left: 600, width: 300 }, 390, 2000)).toBe(555);
    expect(scrollToSegment({ left: 600, width: 800 }, 390, 2000)).toBe(600);
    expect(scrollToSegment({ left: 0, width: 300 }, 390, 2000)).toBe(0);
    expect(scrollToSegment({ left: 1900, width: 300 }, 390, 1810)).toBe(1810);
  });
});

describe('decor', () => {
  it('goes to the scene as the store keeps it, a keepsake drawn from its kind', () => {
    const decor = [
      { id: 'd1', itemId: 'decor-yarn-ball', place: 'sill', x: 0.25, y: 0.5, name: 'Yarn Ball', toy: true },
      { id: 'd2', itemId: 'keepsake:k-read-1', place: 'pond', x: 2, y: -1, flip: true, name: 'read', toy: false, keepsake: { kind: 'read' } },
    ] as unknown as ShelfVM['decor'];
    expect(shelfDecor(decor)).toEqual([
      { key: 'd1', itemId: 'decor-yarn-ball', place: 'sill', frac: { x: 0.25, y: 0.5 }, flip: false },
      { key: 'd2', itemId: 'keepsake:k-read-1', place: 'pond', frac: { x: 1, y: 0 }, flip: true, keepsake: 'read' },
    ]);
  });
  it('new things spread across the floor, inside it', () => {
    const spots = Array.from({ length: MAX_DECOR_PER_PLACE }, (_, i) => newDecorSpot(i));
    expect(new Set(spots.slice(0, 5).map((s) => s.x)).size).toBe(5);
    for (const s of spots) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(1);
    }
  });
});

describe('the basket and the pantry', () => {
  it('harvests go in the basket, every other owned treat in the pantry, by name', () => {
    const rows = pantryRows(
      { 'treat-cat-grass': { count: 1, firstAt: 0 }, 'treat-strawberry': { count: 2, firstAt: 0 }, 'decor-yarn-ball': { count: 1, firstAt: 0 } } as never,
      { 'treat-cat-grass': { servings: 3, restockedOn: '2026-09-29' } },
    );
    expect(rows.basket.map((r) => [r.id, r.servings])).toEqual([['treat-cat-grass', 3]]);
    expect(rows.pantry.map((r) => r.id)).toEqual(['treat-strawberry']);
  });
});

describe('the sill’s extras', () => {
  const base = { cutting: { stage: 2, overall: 0.3 }, found: null, letterWaiting: null, storyWaiting: null, birthday: false };
  it('always has the Cutting, and a found thing, a note or a cake only when there is one', () => {
    const on = { found: () => {}, note: () => {} };
    expect(sillExtras(base, on)).toEqual({ cutting: { stage: 2, overall: 0.3 } });
    const all = sillExtras({ ...base, found: { petId: 'p', seed: 3 }, letterWaiting: { id: 'l', kind: 'sundayNote' }, birthday: true }, on);
    expect(all.found?.seed).toBe(3);
    expect(all.note?.kind).toBe('sundayNote');
    expect(all.cake).toBe(true);
  });
  it('a waiting story is a note too, when no letter is waiting', () => {
    let opened = '';
    const x = sillExtras({ ...base, storyWaiting: { habitId: 'h' } }, { found: () => {}, note: (k) => (opened = k) });
    expect(x.note?.kind).toBe('story');
    x.note!.onOpen();
    expect(opened).toBe('story');
  });
});

describe('decor lands where she is looking', () => {
  it('the Sill measures on its natural floor for the pots, so the stored x maps back to the view centre', async () => {
    const { decorXAtView, decorFloorOf } = await import('./model');
    const { fracToScene } = await import('@/art/scene/decorPlace');
    for (const pots of [3, 8, 20]) {
      const floor = decorFloorOf('sill', pots);
      for (const want of [0.2, 0.5, 0.8]) {
        const mid = fracToScene(floor, { x: want, y: 0.5 }).x;
        const x = decorXAtView('sill', pots, mid, 0);
        expect(fracToScene(floor, { x, y: 0.5 }).x).toBeCloseTo(mid, 1);
      }
    }
  });

  it('a place measures from its own segment and floor', async () => {
    const { decorXAtView, decorFloorOf } = await import('./model');
    const { fracToScene } = await import('@/art/scene/decorPlace');
    const floor = decorFloorOf('pond', 6);
    const segLeft = 300;
    const mid = segLeft + fracToScene(floor, { x: 0.3, y: 0 }).x;
    expect(decorXAtView('pond', 6, mid, segLeft)).toBeCloseTo(0.3, 3);
  });
});
