/**
 * Store-level checks for the M1 logic fixes: the four-cabinet first pick, pets and places, the
 * onboarding ids, the CSV and watering-time files.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCollectible } from '@/catalog/collectibles';
import { FIRST_CAPSULE_MACHINES } from '@/domain/gacha';
import { newPetState } from '@/domain/friendship';
import { mulberry32 } from '@/domain/rng';
import { SAVE_KEY, encodeEnvelope } from '@/state/persist';
import { createInitialState } from '@/state/defaults';
import { shelfView } from '@/state/selectors';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { at } from '../domain/game';
import { fakeBrowser } from './fixtures';

vi.setConfig({ testTimeout: 30_000 });

const input = (name = 'Walk', over: Record<string, unknown> = {}) => ({
  name,
  icon: 'walk',
  color: 'sage' as const,
  plant: 'pothos' as const,
  pot: 'terracotta' as const,
  schedule: { kind: 'daily' as const },
  target: 1,
  step: 1,
  effort: 'steady' as const,
  timeOfDay: 'anytime' as const,
  polarity: 'build' as const,
  ...over,
});

afterEach(() => vi.restoreAllMocks());

/** Boots the store on a save built from `patch` (onboarded, day opened on load). */
function bootWith(patch: (s: AppState) => AppState, start = '2026-09-29'): void {
  const b = fakeBrowser({ start });
  const base = createInitialState(at(start, 9));
  const s = patch({ ...base, profile: { ...base.profile, name: 'Sam', onboarded: true } });
  b.storage.setItem(SAVE_KEY, encodeEnvelope(s, 1, 0, 'test'));
  store.hydrate();
}

describe('the first capsule on all four cabinets (DESIGN §1 Many animals, §9.6)', () => {
  it.each([false, true])('after First Sprout: %s, every cabinet leaves the same coins and brings a pet home', (sprouted) => {
    const coins: number[] = [];
    for (const m of FIRST_CAPSULE_MACHINES) {
      fakeBrowser({ start: '2026-09-29' });
      store.hydrate();
      store.completeOnboarding({ name: 'Sam', templateIds: [] });
      if (sprouted) store.checkIn(store.createHabit(input()));
      const r = store.pull(m, { free: true });
      expect(r, m).toMatchObject({ ok: true, paidWith: 'free' });
      if (r.ok) expect(getCollectible(r.itemId)).toMatchObject({ category: 'pet', source: m });
      store.finishReveal();
      coins.push(store.state.value.wallet.coins);
    }
    expect(new Set(coins).size, coins.join(',')).toBe(1);
  });
});

describe('pets have a place on the Shelf (DESIGN §8.4)', () => {
  const duck = 'pet-duck-mallard';
  const cat = 'pet-cat-orange';
  const withPets = (s: AppState): AppState => ({
    ...s,
    wallet: { ...s.wallet, coins: 2_000 },
    pets: {
      [duck]: newPetState(duck, mulberry32(1), at('2026-09-01'), '2026-09-01', true),
      [cat]: newPetState(cat, mulberry32(2), at('2026-09-02'), '2026-09-02', true),
    },
    collection: { [duck]: { count: 1, firstAt: 0 }, [cat]: { count: 1, firstAt: 0 } },
    lifetime: { ...s.lifetime, pulls: 2 },
  });

  it('opening the Saucer Pond moves the duck in; the cat stays on the Sill', () => {
    expect(getCollectible(duck)).toMatchObject({ category: 'pet', species: 'duck' });
    bootWith(withPets);
    expect(shelfView.value.out.map((p) => [p.id, p.place])).toEqual([
      [duck, 'sill'],
      [cat, 'sill'],
    ]);
    const r = store.buyPlace('pond');
    expect(r).toEqual({ ok: true, place: 'pond', movedIn: [duck] });
    expect(shelfView.value.out.map((p) => [p.id, p.place])).toEqual([
      [duck, 'pond'],
      [cat, 'sill'],
    ]);
    expect(store.state.value.pets[duck]!.place).toBe('pond');
  });

  it('setPetPlace moves a pet to an open place with room, and back; letPetChoose picks by species', () => {
    bootWith(withPets);
    expect(store.setPetPlace(cat, 'bookshelf')).toBe(false); // not open
    store.buyPlace('pond');
    expect(store.setPetPlace(cat, 'pond')).toBe(true); // the pond has room for 2
    expect(store.setPetPlace(cat, null)).toBe(true);
    expect(store.state.value.pets[cat]!.place).toBe('sill');
    expect(store.letPetChoose(cat)).toEqual({ habitId: null, place: 'sill' }); // cats love the Bookshelf, not open
    expect(store.buyPlace('bookshelf')).toMatchObject({ ok: true, movedIn: [] }); // the cat was placed already
    expect(store.letPetChoose(cat)).toEqual({ habitId: null, place: 'bookshelf' });
    expect(shelfView.value.out.find((p) => p.id === cat)?.place).toBe('bookshelf');
  });
});

describe('onboarding returns the new habits (VOICE.md §16 "Find {name} a plant")', () => {
  it('starter chips and "Make my own" in one step, 3 at most, ids in order', () => {
    fakeBrowser({ start: '2026-09-29' });
    store.hydrate();
    const res = store.completeOnboarding({ name: 'Sam', templateIds: ['water', 'walk'], customHabits: [input('Sketch', { icon: 'palette' }), input('Call Mum', { icon: 'phone' })] });
    if (!res.ok) throw new Error(res.reason);
    expect(res.ids).toHaveLength(3);
    expect(res.ids.map((id) => store.state.value.habits.find((h) => h.id === id)?.name)).toEqual(['Drink water', 'Walk', 'Sketch']);
    expect(store.completeOnboarding({ name: 'Sam', templateIds: ['read'] })).toEqual({ ok: false, reason: 'already-onboarded' }); // once
  });
});

describe('the CSV and the watering-time file (DESIGN §9.5)', () => {
  it('exportCsv: one row per logged day, VOICE.md §21 columns and states', () => {
    fakeBrowser({ start: '2026-09-29' });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const walk = store.createHabit(input('Walk, then tea'));
    const water = store.createHabit(input('=Water', { icon: 'water', target: 8, unit: 'glasses' }));
    store.checkIn(walk);
    store.checkIn(water);
    const csv = store.exportCsv()!;
    expect(csv.name).toBe('little-by-little-waterings-2026-09-29.csv');
    expect(csv.text.split('\r\n')).toEqual(['date,habit,count,target,state', '2026-09-29,"Walk, then tea",1,1,watered', "2026-09-29,'=Water,1,8,partial", '']);
  });

  it('wateringTimeFile: the block’s habits, only when a time is set', () => {
    fakeBrowser({ start: '2026-09-29' });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    store.createHabit(input('Stretch', { timeOfDay: 'morning' }));
    store.createHabit(input('Read', { timeOfDay: 'evening' }));
    expect(store.wateringTimeFile('morning')).toBeNull();
    store.updateSettings({ reminders: { morning: '07:30' } });
    const f = store.wateringTimeFile('morning')!;
    expect(f.name).toBe('little-by-little-watering-time-morning.ics');
    expect(f.text).toContain('DTSTART:20260929T073000\r\n');
    expect(f.text).toContain('DESCRIPTION:Morning plants: Stretch.\r\n');
    expect(f.text).not.toContain('Read');
  });
});
