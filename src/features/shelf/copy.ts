/**
 * Words for the Shelf screen and its sheets. Every line that VOICE.md or lines.ts already has comes
 * from there (PET_CARD, PLACE_LINES, EMPTY, COMPANION, CATEGORY_LABELS…); the chrome (section
 * names, a few buttons and counts) is `SHELF_COPY` (lines.ts, VOICE §24), re-exported here.
 */
import type { PlaceId } from '@/catalog/types';
import { PLACE_BY_ID } from '@/catalog/places';
import { EMPTY, KEEPSAKE_THINGS, PLACE_LINES, capitalise, fillLine } from '@/catalog/lines';
import type { KeepsakeKind } from '@/state/types';
import { num, placePhrase } from '@/catalog/format';
import { SHELF_COPY } from '@/catalog/lines';

/** The chrome words live in lines.ts (VOICE.md §24); re-exported for this feature's modules. */
export { SHELF_COPY };

/** Section and place names are proper names: "The Sill", "Saucer Pond". */
export const placeName = (id: PlaceId): string => PLACE_BY_ID.get(id)?.name ?? id;

/** "Open for 400 coins". */
export const openForLine = (price: number): string => fillLine(PLACE_LINES.open, { price: num(price) });

/** "400 coins" (or "free" for the Sill): a place's price on its card. */
export const priceLine = (price: number): string => (price === 0 ? PLACE_LINES.free : fillLine(PLACE_LINES.price, { price: num(price) }));

/** The opening line after `buyPlace` (VOICE §11): with the pet who went straight there, or without. */
export function openedLine(place: PlaceId, movedInName: string | null): string {
  if (place === 'sill') return '';
  const lines = PLACE_LINES.opened[place];
  return movedInName ? fillLine(lines.withPet, { name: movedInName }) : lines.alone;
}

/** What is in the jar, once, above the places (never a count of 0). */
export function jarLine(coins: number): string {
  const t = coins <= 0 ? SHELF_COPY.placeMap.jarNone : coins === 1 ? SHELF_COPY.placeMap.jarOne : SHELF_COPY.placeMap.jar;
  return fillLine(t, { count: num(coins) });
}

/** Not enough coins for a place: what it costs and what is in the jar (never a count of 0). */
export function shortLine(place: PlaceId, price: number, coins: number): string {
  const Place = capitalise(placePhrase(place));
  const t = coins <= 0 ? SHELF_COPY.placeMap.shortNone : coins === 1 ? SHELF_COPY.placeMap.shortOne : SHELF_COPY.placeMap.short;
  return fillLine(t, { Place, price: num(price), count: num(coins) });
}

/** The Field Guide page with nothing on it yet: "Cows come from the No. 02 cabinet." */
export function emptyPageLine(pageName: string, number: string): string {
  return fillLine(EMPTY.fieldGuidePage, { Species: pageName, number });
}

/** A placed or owned thing by name: a keepsake by what it is ("A pebble from the path"). */
export function decorLabel(d: { name: string; keepsake?: { kind: KeepsakeKind } }): string {
  const thing = d.keepsake ? KEEPSAKE_THINGS[d.keepsake.kind as keyof typeof KEEPSAKE_THINGS] : undefined;
  return thing ? capitalise(thing) : d.keepsake ? SHELF_COPY.decor.keepsake : d.name;
}
