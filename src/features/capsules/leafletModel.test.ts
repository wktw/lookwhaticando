import { describe, expect, it } from 'vitest';
import { SECRET_IDS, itemsInMachine } from '@/catalog/collectibles';
import { MACHINES } from '@/catalog/machines';
import { byTier, leafletEntries } from './leafletModel';

describe('the lineup leaflet', () => {
  it('prints every item of the series once, numbered 01 onward, Classic first', () => {
    for (const m of MACHINES) {
      const entries = leafletEntries(m.id, {});
      expect(entries.map((e) => e.item.id).sort()).toEqual(
        itemsInMachine(m.id)
          .map((i) => i.id)
          .sort(),
      );
      expect(entries.map((e) => e.number)).toEqual(entries.map((_, i) => String(i + 1).padStart(2, '0')));
      const tiers = entries.map((e) => e.tier);
      expect(tiers).toEqual([...tiers].sort((a, b) => ['common', 'uncommon', 'rare', 'ultra'].indexOf(a) - ['common', 'uncommon', 'rare', 'ultra'].indexOf(b)));
    }
  });

  it('keeps the Secret a "?" until it has been pulled, and only the Secret', () => {
    const cats = leafletEntries('cats', {});
    const hidden = cats.filter((e) => e.hidden);
    expect(hidden).toHaveLength(1);
    expect(SECRET_IDS.has(hidden[0]!.item.id)).toBe(true);
    // Everything else is printed, owned or not.
    expect(cats.filter((e) => !e.secret).every((e) => !e.hidden)).toBe(true);

    const owned = leafletEntries('cats', { [hidden[0]!.item.id]: { count: 1 } });
    expect(owned.some((e) => e.hidden)).toBe(false);
    expect(owned.find((e) => e.secret)!.count).toBe(1);
  });

  it('puts the Secret last in its tier', () => {
    for (const m of MACHINES) {
      const top = byTier(leafletEntries(m.id, {})).at(-1)!;
      expect(top.entries.at(-1)!.secret, m.id).toBe(true);
    }
  });

  it('ticks what you have, with the count', () => {
    const entries = leafletEntries('cows', { 'pet-cow-holstein': { count: 2 } });
    expect(entries.find((e) => e.item.id === 'pet-cow-holstein')!.count).toBe(2);
    expect(entries.filter((e) => e.count > 0)).toHaveLength(1);
  });
});
