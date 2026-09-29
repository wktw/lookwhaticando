import type { CollectibleDef, MachineId, Rarity } from '@/catalog/types';
import { RARITIES } from '@/catalog/types';
import { SECRET_IDS, itemsInMachine } from '@/catalog/collectibles';

/** One printed line of a series' lineup leaflet (DESIGN §7.1). */
export interface LeafletEntry {
  item: CollectibleDef;
  /** "01", "02"… in leaflet order (Classic first, the Secret last). */
  number: string;
  tier: Rarity;
  secret: boolean;
  /** How many you have (0 = no tick yet). */
  count: number;
  /** A Secret stays a "?" on the leaflet until it has been pulled. */
  hidden: boolean;
}

/**
 * The lineup as its leaflet prints it: every item, numbered, grouped by tier from Classic up,
 * with the Secret last in its tier. Everything is shown, like a real leaflet, except the Secret,
 * which is a "?" until you have it.
 */
export function leafletEntries(machineId: MachineId, collection: Record<string, { count: number } | undefined>): LeafletEntry[] {
  const items = itemsInMachine(machineId);
  const ordered = RARITIES.flatMap((r) => items.filter((i) => i.rarity === r).sort((a, b) => Number(SECRET_IDS.has(a.id)) - Number(SECRET_IDS.has(b.id))));
  return ordered.map((item, i) => {
    const count = collection[item.id]?.count ?? 0;
    const secret = SECRET_IDS.has(item.id);
    return { item, number: String(i + 1).padStart(2, '0'), tier: item.rarity, secret, count, hidden: secret && count === 0 };
  });
}

/** Entries grouped by tier, in order, skipping empty tiers. */
export function byTier(entries: LeafletEntry[]): { tier: Rarity; entries: LeafletEntry[] }[] {
  return RARITIES.map((tier) => ({ tier, entries: entries.filter((e) => e.tier === tier) })).filter((g) => g.entries.length > 0);
}
