import { describe, expect, it } from 'vitest';
import { COLLECTIBLES, MACHINES, itemsInMachine, TEMPLATES, BADGES } from '@/catalog';

describe('catalog integrity', () => {
  it('ids are unique and correctly prefixed', () => {
    const ids = new Set<string>();
    const prefix = { pet: 'pet-', wearable: 'wear-', treat: 'treat-', decor: 'decor-', plant: 'plant-', pot: 'pot-' } as const;
    for (const c of COLLECTIBLES) {
      expect(ids.has(c.id), `duplicate ${c.id}`).toBe(false);
      ids.add(c.id);
      expect(c.id.startsWith(prefix[c.category]), c.id).toBe(true);
    }
  });
  it('machine odds sum to 100 and every machine has items in every rarity', () => {
    for (const m of MACHINES) {
      const sum = Object.values(m.odds).reduce((a, b) => a + b, 0);
      expect(sum, m.id).toBe(100);
      const items = itemsInMachine(m.id);
      expect(items.length, m.id).toBeGreaterThanOrEqual(14);
      for (const r of ['common', 'uncommon', 'rare', 'ultra'] as const) {
        expect(items.some((i) => i.rarity === r), `${m.id} has ${r}`).toBe(true);
      }
    }
  });
  it('templates and badges have unique ids', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
});

import { SECRET_IDS, MACHINES as ALL_MACHINES, itemsInMachine as inMachine } from '@/catalog';

describe('series tiers (M0 economy audit)', () => {
  it('each machine has one ultra-rarity Secret and rarer tiers are smaller', () => {
    for (const m of ALL_MACHINES) {
      const items = inMachine(m.id);
      const secrets = items.filter((i) => SECRET_IDS.has(i.id));
      expect(secrets.length, m.id).toBe(1);
      expect(secrets[0]!.rarity, m.id).toBe('ultra');
      const n = (r: string) => items.filter((i) => i.rarity === r).length;
      expect(n('common') >= n('uncommon'), m.id).toBe(true);
      expect(n('ultra') <= n('rare'), m.id).toBe(true);
      expect(n('ultra') >= 2, m.id).toBe(true);
    }
  });
});

import { HARVEST_BY_PLANT, PLANTS, POTS, PETS, STARTER_IDS, PLACES, PERSONALITIES, NAME_SUGGESTIONS, getCollectible, COLLECTIBLE_BY_ID } from '@/catalog';
import type { PlantSpeciesId, PotId } from '@/catalog';

/** DESIGN §12: words catkin never uses. ("Behind" is allowed here: a ribbon tied behind one ear is not a judgement.) */
const BANNED = /\b(purr-?fect|moo-?tivation|yay|bestie|cozy|cosy|you got this|missed|failed|lost|broken|streak)\b|!/i;

describe('catkin catalog (DESIGN §7–§8, §12)', () => {
  it('flavor text follows the voice: short, no exclamation marks, no banned words, no emoji', () => {
    for (const c of COLLECTIBLES) {
      expect(c.flavor.length, c.id).toBeLessThanOrEqual(90);
      expect(c.flavor, c.id).not.toMatch(BANNED);
      expect(c.name, c.id).not.toMatch(BANNED);
      expect(c.flavor, c.id).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('pets carry no pronouns in their flavor text (every owner decides who their pet is)', () => {
    for (const p of PETS) expect(p.flavor, p.id).not.toMatch(/\b(she|her|hers|he|him|his)\b/i);
  });

  it('pet captions are third person: the animals never speak', () => {
    for (const p of PERSONALITIES) {
      expect(p.lines.length, p.id).toBeGreaterThanOrEqual(4);
      for (const line of p.lines) {
        expect(line.startsWith('{name} '), line).toBe(true);
        expect(line, line).not.toMatch(/\b(I|I'm|me|my)\b|!|\{you\}/);
      }
    }
  });

  it('is pet-safe: no chocolate, no lilies, and only edible plants are harvested', () => {
    for (const c of COLLECTIBLES) {
      if (c.category === 'treat') expect(c.name, c.id).not.toMatch(/chocolate|cocoa|xylitol|grape|raisin|onion|macadamia/i);
      expect(c.name, c.id).not.toMatch(/\blil(y|ies)\b(?! pad)/i);
    }
    const edible: PlantSpeciesId[] = ['catgrass', 'catnip', 'strawberry', 'lavender'];
    expect(Object.keys(HARVEST_BY_PLANT).sort()).toEqual([...edible].sort());
    for (const id of Object.values(HARVEST_BY_PLANT)) expect(COLLECTIBLE_BY_ID.get(id!)?.category, id).toBe('treat');
  });

  it('every plant species and pot is obtainable, and the five free cuttings are starters', () => {
    const species = new Set(PLANTS.map((p) => p.plant));
    const allSpecies: PlantSpeciesId[] = ['pothos', 'pilea', 'begonia', 'snakeplant', 'catgrass', 'monstera', 'strawberry', 'lavender', 'catnip', 'hoya', 'orchid', 'calathea', 'violet', 'tulip', 'xmascactus', 'sunflower'];
    for (const s of allSpecies) expect(species.has(s), s).toBe(true);
    const pots = new Set(POTS.map((p) => p.pot));
    const allPots: PotId[] = ['terracotta', 'cream', 'blush', 'speckled', 'ticking', 'mug', 'teacup', 'midnight', 'gourd', 'rosy', 'eggshell', 'tincan'];
    for (const p of allPots) expect(pots.has(p), p).toBe(true);
    for (const free of ['pothos', 'pilea', 'begonia', 'snakeplant', 'catgrass']) expect(STARTER_IDS).toContain(`plant-${free}`);
  });

  it('templates only use the free starter plants, so a new habit never needs a capsule', () => {
    const free = new Set(['pothos', 'pilea', 'begonia', 'snakeplant', 'catgrass']);
    for (const t of TEMPLATES) expect(free.has(t.plant), t.id).toBe(true);
  });

  it('at least 70% of pets are real coats and breeds (fantasy only in colour and pattern)', () => {
    const fantasy = new Set(['pet-cow-strawberry', 'pet-cow-nightsky', 'pet-cow-spice', 'pet-cat-heartspot']);
    expect(1 - fantasy.size / PETS.length).toBeGreaterThanOrEqual(0.7);
    for (const id of fantasy) expect(COLLECTIBLE_BY_ID.has(id), id).toBe(true);
  });

  it('default pet names are unique across the whole catalog', () => {
    const names = PETS.map((p) => p.defaultName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('numbered series run No. 01 to No. 07, and seasonal editions carry dates instead', () => {
    const numbered = MACHINES.filter((m) => m.number).map((m) => m.number);
    expect(numbered).toEqual(['No. 01', 'No. 02', 'No. 03', 'No. 04', 'No. 05', 'No. 06', 'No. 07']);
    for (const m of MACHINES) expect(Boolean(m.number) !== Boolean(m.seasonal), m.id).toBe(true);
  });

  it('Moonlit variants resolve for pets only, as rare No. 07 Night items', () => {
    const moon = getCollectible('moonlit:pet-cat-calico');
    expect(moon).toMatchObject({ name: 'Moonlit Calico', rarity: 'rare', source: 'night', category: 'pet' });
    expect(getCollectible('moonlit:wear-cowbell')).toBeUndefined();
  });

  it('places run from the free Sill to the Quilt, 18 pets out in all', () => {
    expect(PLACES.map((p) => p.price)).toEqual([0, 400, 700, 1000, 1500, 2500]);
    expect(PLACES.reduce((n, p) => n + p.petsOut, 0)).toBe(18);
  });

  it('name suggestions avoid puns and the old mascot', () => {
    for (const names of Object.values(NAME_SUGGESTIONS)) {
      expect(new Set(names).size).toBe(names.length);
      for (const n of names) expect(n).not.toMatch(/mochi|moo|quack|ribbit/i);
    }
  });
});
