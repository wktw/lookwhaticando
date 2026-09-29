/**
 * Acceptance test for the art modules: every catalog item must have real art.
 * Each describe block is owned by one art module.
 */
import { describe, expect, it } from 'vitest';
import { PETS, WEARABLES, TREATS, DECOR, PLANTS, POTS } from '@/catalog/collectibles';
import { SPECIES, type PlantSpeciesId, type PotId } from '@/catalog/types';
import { LOOKS } from '@/art/pets/looks';
import { SPECIES_ART, PLACEHOLDER_SPECIES } from '@/art/pets/species';
import { WEARABLE_ART } from '@/art/wearables';
import { TREAT_ART, DECOR_ART } from '@/art/items';
import { PLANT_SPECIES_WITH_ART, POTS_WITH_ART } from '@/art/plants';

describe('pets art', () => {
  it('every species has real art', () => {
    for (const s of SPECIES) expect(SPECIES_ART[s], s).not.toBe(PLACEHOLDER_SPECIES);
  });
  it('every pet has an explicit look matching its species', () => {
    for (const p of PETS) {
      expect(LOOKS[p.id], p.id).toBeDefined();
      expect(LOOKS[p.id]!.species, p.id).toBe(p.species);
    }
  });
});

describe('wearables art', () => {
  it('every wearable renders on pets and has an icon', () => {
    for (const w of WEARABLES) {
      expect(WEARABLE_ART[w.id], w.id).toBeDefined();
      expect(WEARABLE_ART[w.id]!.icon, `${w.id} icon`).toBeTypeOf('function');
    }
  });
});

describe('item art', () => {
  it('every treat has art', () => {
    for (const t of TREATS) expect(TREAT_ART[t.id], t.id).toBeTypeOf('function');
  });
  it('every decor has art', () => {
    for (const d of DECOR) expect(DECOR_ART[d.id], d.id).toBeTypeOf('function');
  });
});

describe('garden art', () => {
  it('every plant species has art', () => {
    const species = new Set<PlantSpeciesId>(PLANTS.map((p) => p.plant));
    for (const s of species) expect(PLANT_SPECIES_WITH_ART.has(s), s).toBe(true);
  });
  it('every pot has art', () => {
    const pots = new Set<PotId>(POTS.map((p) => p.pot));
    for (const p of pots) expect(POTS_WITH_ART.has(p), p).toBe(true);
  });
});
