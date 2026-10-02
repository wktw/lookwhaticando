import { describe, expect, it } from 'vitest';
import { ABOUT_COPY, BLOOM_EVENTS, FLOURISH_LINES, FRIENDSHIP_LEVELS } from '@/catalog/lines';
import { FLOURISHES } from '@/art/plants/flourishes';
import { PLANT_SPECIES_WITH_ART } from '@/art/plants';
import { MACHINES } from '@/catalog/machines';
import { COLLECTIBLES, PETS } from '@/catalog/collectibles';
import { itemChances } from '@/domain/gacha';
import { mulberry32 } from '@/domain/rng';
import type { AppState } from '@/state/types';
import { Game } from './domain/game';
import { newPetState, petPet } from '@/domain/friendship';
import { levelForXp } from '@/domain/levels';
import { friendshipLine } from '@/fx/copy';

describe('WP-D4: catalogue promises match the things drawn', () => {
  it('a friendship earned entirely by petting makes no claim about waterings', () => {
    const g = new Game();
    const id = 'pet-cat-calico';
    g.state = { ...g.state, pets: { [id]: newPetState(id, g.rng, g.now, g.today, true) }, collection: { ...g.state.collection, [id]: { count: 1, firstAt: g.now } } };
    for (let day = 0; day < 410; day++) {
      if (day) g.advance();
      for (let stroke = 0; stroke < 5; stroke++) g.run((tx) => petPet(tx, id));
    }
    expect(g.state.lifetime.checkins).toBe(0);
    expect(g.state.habits).toHaveLength(0);
    expect(Object.keys(g.state.pets)).toHaveLength(1);
    expect(levelForXp(g.state.pets[id]!.xp)).toBe(13);
    expect(friendshipLine(g.state.pets[id]!.name, 13, 'cat')).not.toContain('waterings');
  });

  it('keys each flourish by the visitor actually drawn, so reorderings cannot relabel it', () => {
    expect(Object.keys(FLOURISH_LINES).sort()).toEqual([...FLOURISHES].sort());
    const words = FLOURISH_LINES as unknown as Record<string, string>;
    for (const id of FLOURISHES) expect(words[id], id).toMatch(new RegExp(id === 'shoot' ? 'shoot' : id, 'i'));
    expect(Object.values(words).join(' ')).not.toMatch(/robin|window latch/);
  });

  it('credits the verified type designers, including the extended Nunito family', () => {
    const text = ABOUT_COPY.credits.map((c) => c.text).join(' ');
    for (const name of ['John Hudson', 'Paul Hanslow', 'Kaja Słojewska', 'Vernon Adams', 'Jacques Le Bailly']) expect(text).toContain(name);
    expect(text).not.toContain('Wardle');
  });

  it('does not promise unimplemented furniture, petting, warm pots or a daily routine', () => {
    const late = FRIENDSHIP_LEVELS.filter((l) => l.level >= 11 && l.level <= 14);
    expect(late).toHaveLength(4);
    expect(JSON.stringify(late)).not.toMatch(/mid-stroke|cushion|after lunch|after dark|which ones are warm/);
  });

  it('has a Blooming observation for every drawn species, including the snake plant’s spike', () => {
    expect(Object.keys(BLOOM_EVENTS).sort()).toEqual([...PLANT_SPECIES_WITH_ART].sort());
    expect(BLOOM_EVENTS.snakeplant).toContain('spike of flowers');
    expect(BLOOM_EVENTS.monstera).toContain('split leaf');
    expect(BLOOM_EVENTS.pothos).toContain('trailed');
  });
});

describe('WP-D4: printed ordinary odds under mixed ownership', () => {
  it('sum to one and are unchanged by ownership enumeration order for every machine', () => {
    const rng = mulberry32(404);
    const ids = [...COLLECTIBLES.map((c) => c.id), ...PETS.map((p) => `moonlit:${p.id}`)];
    for (let round = 0; round < 60; round++) {
      const entries = ids.filter(() => rng() < round / 60).map((id) => [id, { count: 1, firstAt: 0 }] as const);
      const owned: AppState['collection'] = Object.fromEntries(entries);
      const reversed: AppState['collection'] = Object.fromEntries([...entries].reverse());
      for (const m of MACHINES) {
        const chance = itemChances(m.id, owned);
        const reverse = itemChances(m.id, reversed);
        expect([...chance.values()].reduce((a, b) => a + b, 0), `${round}/${m.id}`).toBeCloseTo(1, 12);
        expect(chance.size).toBe(reverse.size);
        for (const [id, probability] of chance) {
          expect(probability).toBeGreaterThan(0);
          expect(probability).toBeLessThanOrEqual(1);
          expect(reverse.get(id), `${round}/${m.id}/${id}`).toBeCloseTo(probability, 14);
        }
      }
    }
  });
});
