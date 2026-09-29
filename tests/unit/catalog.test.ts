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
