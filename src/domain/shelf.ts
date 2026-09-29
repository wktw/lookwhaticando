/**
 * The Shelf: places, pets out and decor (DESIGN §8.3, §8.4, §9.4).
 *
 * - Places are the long-term coin goal. The Sill is free and always first; the others are bought
 *   with coins at the catalog price, in any order, and each adds room for 2 more pets out
 *   (8 + 2 per extra place: 8 → 18). Prices are always shown.
 * - Pets out: at most `petsOutCapacity` pets have `inMeadow` (internal name for "out on the
 *   Shelf"). A pet obtained while the Shelf is full starts indoors. Every pet can be brought in
 *   or out; there is no pet that must stay out.
 * - Each pet out spends the day in a place (places.ts): `setPetPlace` moves it (the place must be
 *   open and have room), "Let {name} choose" picks by species (`suggestPlaceFor`), and opening a
 *   place moves in the never-placed pets who love it most, up to its room (`buyPlace` → `movedIn`).
 * - Decor is placed freely: one placement per owned copy, up to 24 per place, coordinates 0..1
 *   within the place, optionally flipped. Placement ids are unique and stable. A companion's
 *   keepsake (§14.1) places like decor, as 'keepsake:<id>' (one copy).
 */
import { getCollectible } from '@/catalog/collectibles';
import { PLACES, PLACE_BY_ID } from '@/catalog/places';
import type { PlaceId } from '@/catalog/types';
import type { PlacePurchase } from '@/state/api';
import type { AppState, PlacedDecor } from '@/state/types';
import { owns } from './collection';
import type { Tx } from './tx';
import { spendCoins } from './wallet';
import { keepsakeOfItem, setCompanion, suggestHabitFor } from './company';
import { hasRoomIn, lovedPlaces, petPlace, placeRoom, petsInPlace, speciesOfPet, suggestPlaceFor } from './places';

export const MAX_DECOR_PER_PLACE = 24;

/** Pets allowed out at once: 8 on the Sill + 2 per extra place (catalog `petsOut`). */
export function petsOutCapacity(s: Pick<AppState, 'shelf'>): number {
  let n = 0;
  for (const p of PLACES) if (s.shelf.places.includes(p.id)) n += p.petsOut;
  return n;
}

export function petsOutCount(s: Pick<AppState, 'pets'>): number {
  let n = 0;
  for (const p of Object.values(s.pets)) if (p.inMeadow) n++;
  return n;
}

export function hasRoomOut(s: Pick<AppState, 'pets' | 'shelf'>): boolean {
  return petsOutCount(s) < petsOutCapacity(s);
}

/**
 * Opens a place with coins. Places stay in Shelf order (left to right) whatever order they were
 * bought in. The pets out who love it and have never been placed move in, up to its room (the
 * closest friends first; a companion stays with its pot): `movedIn`, for "The Saucer Pond is open.
 * {name} went straight to the lily pad."
 */
export function buyPlace(tx: Tx, place: PlaceId): PlacePurchase {
  const def = PLACE_BY_ID.get(place);
  if (!def || tx.s.shelf.places.includes(place)) return { ok: false, error: 'owned' };
  if (!spendCoins(tx, def.price)) return { ok: false, error: 'not-enough-coins' };
  tx.emit({ type: 'coins', amount: -def.price, reason: 'spend' });
  const shelf = tx.section('shelf');
  shelf.places = PLACES.map((p) => p.id).filter((id) => id === place || shelf.places.includes(id));
  return { ok: true, place, movedIn: settleNewPlace(tx, place) };
}

/** Moves the never-placed pets out who love `place` into it, up to its room. Returns their ids. */
function settleNewPlace(tx: Tx, place: PlaceId): string[] {
  const busy = new Set(tx.s.habits.filter((h) => h.archivedOn === undefined).map((h) => h.companionId));
  const room = placeRoom(place) - petsInPlace(tx.s, place).length;
  const movers = Object.values(tx.s.pets)
    .filter((p) => p.inMeadow && p.place === undefined && !busy.has(p.id) && lovedPlaces(tx.s, speciesOfPet(p.id)).includes(place))
    .sort((a, b) => b.xp - a.xp || a.obtainedAt - b.obtainedAt || (a.id < b.id ? -1 : 1))
    .slice(0, Math.max(0, room));
  for (const p of movers) tx.pet(p.id).place = place;
  return movers.map((p) => p.id);
}

/**
 * Moves a pet to a place ("Move {name}"; null = back to the Sill). The place must be open and have
 * room. Returns false when refused.
 */
export function setPetPlace(tx: Tx, petId: string, place: PlaceId | null): boolean {
  const pet = tx.s.pets[petId];
  const to = place ?? 'sill';
  if (!pet || !tx.s.shelf.places.includes(to)) return false;
  if (pet.place === to) return true;
  if (!hasRoomIn(tx.s, to, petId)) return false;
  tx.pet(petId).place = to;
  return true;
}

/**
 * "Let {name} choose" (§7.2, VOICE.md §10): the pet picks a plant to keep company (by its species'
 * routines, `suggestHabitFor`) when it has none, and a place its species loves (`suggestPlaceFor`).
 * Returns what it chose ("{name} chose {plant}, for the sun." / "{name} chose the Saucer Pond.").
 */
export function letPetChoose(tx: Tx, petId: string): { habitId: string | null; place: PlaceId } | null {
  if (!tx.s.pets[petId]) return null;
  const has = tx.s.habits.some((h) => h.companionId === petId && h.archivedOn === undefined);
  let habitId: string | null = null;
  if (!has) {
    const suggested = suggestHabitFor(tx.s, petId);
    if (suggested && setCompanion(tx, suggested, petId)) habitId = suggested;
  }
  const place = suggestPlaceFor(tx.s, petId);
  setPetPlace(tx, petId, place);
  return { habitId, place: petPlace(tx.s, tx.s.pets[petId]!) };
}

/** Brings a pet in, or out onto the Shelf when there is room (back to the Sill if its place is full). */
export function togglePetOut(tx: Tx, petId: string): boolean {
  const pet = tx.s.pets[petId];
  if (!pet) return false;
  if (!pet.inMeadow && !hasRoomOut(tx.s)) return false;
  const out = !pet.inMeadow;
  if (out && pet.place !== undefined && pet.place !== 'sill' && !hasRoomIn(tx.s, petPlace(tx.s, pet), petId)) tx.pet(petId).place = 'sill';
  tx.pet(petId).inMeadow = out;
  return true;
}

/* ------------------------------------------------------------------ */
/* Decor                                                               */
/* ------------------------------------------------------------------ */

const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0.5);

export function placementsOf(s: Pick<AppState, 'shelf'>, itemId: string): number {
  return s.shelf.decor.filter((d) => d.itemId === itemId).length;
}

export function decorInPlace(s: Pick<AppState, 'shelf'>, place: PlaceId): number {
  return s.shelf.decor.filter((d) => d.place === place).length;
}

/** Owned copies of a decor item not yet placed (a keepsake, 'keepsake:<id>', is one copy). */
export function unplacedCopies(s: Pick<AppState, 'shelf' | 'collection'> & Partial<Pick<AppState, 'keepsakes'>>, itemId: string): number {
  const owned = keepsakeOfItem(s, itemId) ? 1 : (s.collection[itemId]?.count ?? 0);
  return Math.max(0, owned - placementsOf(s, itemId));
}

function newPlacementId(tx: Tx): string {
  const taken = new Set(tx.s.shelf.decor.map((d) => d.id));
  for (;;) {
    const id = `d-${Math.floor(tx.env.rng() * 36 ** 6).toString(36).padStart(6, '0')}`;
    if (!taken.has(id)) return id;
  }
}

/** Places one owned copy of a decor item. Returns the placement id, or null when not allowed. */
export function placeDecor(tx: Tx, itemId: string, place: PlaceId, x: number, y: number, flip = false): string | null {
  const keepsake = keepsakeOfItem(tx.s, itemId);
  if (!keepsake && (getCollectible(itemId)?.category !== 'decor' || !owns(tx.s.collection, itemId))) return null;
  if (!tx.s.shelf.places.includes(place)) return null;
  if (unplacedCopies(tx.s, itemId) < 1 || decorInPlace(tx.s, place) >= MAX_DECOR_PER_PLACE) return null;
  const placement: PlacedDecor = { id: newPlacementId(tx), itemId, place, x: clamp01(x), y: clamp01(y), ...(flip ? { flip: true } : {}) };
  const shelf = tx.section('shelf');
  shelf.decor = [...shelf.decor, placement];
  return placement.id;
}

/** Moves / flips a placement (a change of place must fit the target place). Returns false when refused. */
export function moveDecor(tx: Tx, placementId: string, patch: Partial<Pick<PlacedDecor, 'x' | 'y' | 'place' | 'flip'>>): boolean {
  const i = tx.s.shelf.decor.findIndex((d) => d.id === placementId);
  if (i < 0) return false;
  const cur = tx.s.shelf.decor[i]!;
  const place = patch.place ?? cur.place;
  if (place !== cur.place && (!tx.s.shelf.places.includes(place) || decorInPlace(tx.s, place) >= MAX_DECOR_PER_PLACE)) return false;
  const next: PlacedDecor = {
    id: cur.id,
    itemId: cur.itemId,
    place,
    x: patch.x === undefined ? cur.x : clamp01(patch.x),
    y: patch.y === undefined ? cur.y : clamp01(patch.y),
  };
  if (patch.flip ?? cur.flip) next.flip = true;
  const shelf = tx.section('shelf');
  shelf.decor = shelf.decor.map((d, j) => (j === i ? next : d));
  return true;
}

export function removeDecor(tx: Tx, placementId: string): boolean {
  if (!tx.s.shelf.decor.some((d) => d.id === placementId)) return false;
  const shelf = tx.section('shelf');
  shelf.decor = shelf.decor.filter((d) => d.id !== placementId);
  return true;
}
