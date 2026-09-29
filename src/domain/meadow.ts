/**
 * The meadow (DESIGN §7.2, §13.7 "Meadow zones", §13.10 "Creativity").
 *
 * - Zones are the long-term coin goal: bought with coins at the catalog price (any order), each
 *   adding room for 2 more pets out (8 → 18). Prices are always shown.
 * - Pets out: at most `petsOutCapacity` pets have `inMeadow`; Mochi is always out (she counts
 *   toward the capacity) and can never nap in the cottage. A pet obtained while the meadow is full
 *   starts napping.
 * - Decor is placed freely: one placement per owned copy, up to 24 per zone, coordinates 0..1
 *   within the zone, optionally flipped. Placement ids are unique and stable.
 */
import { MOCHI_ID, getCollectible } from '@/catalog/collectibles';
import { ZONES, ZONE_BY_ID } from '@/catalog/zones';
import type { ZonePurchase } from '@/state/api';
import type { AppState, MeadowZoneId, PlacedDecor } from '@/state/types';
import { owns } from './collection';
import type { Tx } from './tx';
import { spendCoins } from './wallet';

export const MAX_DECOR_PER_ZONE = 24;

/** Pets allowed out at once: 8 for the starting meadow + 2 per extra zone. */
export function petsOutCapacity(s: Pick<AppState, 'meadow'>): number {
  let n = 0;
  for (const z of ZONES) if (s.meadow.zones.includes(z.id)) n += z.petsOut;
  return n;
}

export function petsOutCount(s: Pick<AppState, 'pets'>): number {
  let n = 0;
  for (const p of Object.values(s.pets)) if (p.inMeadow) n++;
  return n;
}

export function hasMeadowRoom(s: Pick<AppState, 'pets' | 'meadow'>): boolean {
  return petsOutCount(s) < petsOutCapacity(s);
}

export function buyZone(tx: Tx, zone: MeadowZoneId): ZonePurchase {
  const def = ZONE_BY_ID.get(zone);
  if (!def || tx.s.meadow.zones.includes(zone)) return { ok: false, error: 'owned' };
  if (!spendCoins(tx, def.price)) return { ok: false, error: 'not-enough-coins' };
  const meadow = tx.section('meadow');
  // Keep zones in map order (left to right) whatever order they were bought in.
  meadow.zones = ZONES.map((z) => z.id).filter((id) => id === zone || meadow.zones.includes(id));
  return { ok: true, zone };
}

/** Moves a pet between the meadow and the cottage. Mochi always stays out; capacity is enforced. */
export function toggleInMeadow(tx: Tx, petId: string): boolean {
  const pet = tx.s.pets[petId];
  if (!pet || petId === MOCHI_ID) return false;
  if (!pet.inMeadow && !hasMeadowRoom(tx.s)) return false;
  tx.pet(petId).inMeadow = !pet.inMeadow;
  return true;
}

/* ------------------------------------------------------------------ */
/* Decor                                                               */
/* ------------------------------------------------------------------ */

const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0.5);

export function placementsOf(s: Pick<AppState, 'meadow'>, itemId: string): number {
  return s.meadow.decor.filter((d) => d.itemId === itemId).length;
}

export function decorInZone(s: Pick<AppState, 'meadow'>, zone: MeadowZoneId): number {
  return s.meadow.decor.filter((d) => d.zone === zone).length;
}

/** Owned copies of a decor item not yet placed. */
export function unplacedCopies(s: Pick<AppState, 'meadow' | 'collection'>, itemId: string): number {
  return Math.max(0, (s.collection[itemId]?.count ?? 0) - placementsOf(s, itemId));
}

function newPlacementId(tx: Tx): string {
  const taken = new Set(tx.s.meadow.decor.map((d) => d.id));
  for (;;) {
    const id = `d-${Math.floor(tx.env.rng() * 36 ** 6).toString(36).padStart(6, '0')}`;
    if (!taken.has(id)) return id;
  }
}

/** Places one owned copy of a decor item. Returns the placement id, or null when not allowed. */
export function placeDecor(tx: Tx, itemId: string, zone: MeadowZoneId, x: number, y: number, flip = false): string | null {
  if (getCollectible(itemId)?.category !== 'decor' || !owns(tx.s.collection, itemId)) return null;
  if (!tx.s.meadow.zones.includes(zone)) return null;
  if (unplacedCopies(tx.s, itemId) < 1 || decorInZone(tx.s, zone) >= MAX_DECOR_PER_ZONE) return null;
  const placement: PlacedDecor = { id: newPlacementId(tx), itemId, zone, x: clamp01(x), y: clamp01(y), ...(flip ? { flip: true } : {}) };
  const meadow = tx.section('meadow');
  meadow.decor = [...meadow.decor, placement];
  return placement.id;
}

/** Moves / flips a placement (a zone change must fit the target zone). Returns false when refused. */
export function moveDecor(tx: Tx, placementId: string, patch: Partial<Pick<PlacedDecor, 'x' | 'y' | 'zone' | 'flip'>>): boolean {
  const i = tx.s.meadow.decor.findIndex((d) => d.id === placementId);
  if (i < 0) return false;
  const cur = tx.s.meadow.decor[i]!;
  const zone = patch.zone ?? cur.zone;
  if (zone !== cur.zone && (!tx.s.meadow.zones.includes(zone) || decorInZone(tx.s, zone) >= MAX_DECOR_PER_ZONE)) return false;
  const next: PlacedDecor = {
    id: cur.id,
    itemId: cur.itemId,
    zone,
    x: patch.x === undefined ? cur.x : clamp01(patch.x),
    y: patch.y === undefined ? cur.y : clamp01(patch.y),
  };
  if (patch.flip ?? cur.flip) next.flip = true;
  const meadow = tx.section('meadow');
  meadow.decor = meadow.decor.map((d, j) => (j === i ? next : d));
  return true;
}

export function removeDecor(tx: Tx, placementId: string): boolean {
  if (!tx.s.meadow.decor.some((d) => d.id === placementId)) return false;
  const meadow = tx.section('meadow');
  meadow.decor = meadow.decor.filter((d) => d.id !== placementId);
  return true;
}
