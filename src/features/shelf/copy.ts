/**
 * Words for the Shelf screen and its sheets. Every line that VOICE.md or lines.ts already has comes
 * from there (PET_CARD, PLACE_LINES, EMPTY, COMPANION, CATEGORY_LABELS…). The chrome below (section
 * names, a few buttons and counts) is plain and follows VOICE §1: sentence case, numerals, no
 * exclamation marks, curly apostrophes, never a count of what is undone. NOTES-w2-shelf.md asks for
 * each of these to get a row in VOICE.md.
 */
import type { PlaceId } from '@/catalog/types';
import { PLACE_BY_ID } from '@/catalog/places';
import { EMPTY, KEEPSAKE_THINGS, PLACE_LINES, capitalise, fillLine } from '@/catalog/lines';
import type { KeepsakeKind } from '@/state/types';
import { num, placePhrase } from '@/catalog/format';

export const SHELF_COPY = {
  title: 'Shelf',
  sceneLabel: 'The Shelf: the sill and the places you have opened',
  /** The row of place names under the scene: a jump to each. */
  placesNav: 'Go to a place on the Shelf',
  decorate: 'Decorate',
  done: 'Done',
  basket: 'Basket',
  fieldGuide: 'Field Guide',
  pets: 'Pets',
  out: 'Out on the Shelf',
  indoors: 'Indoors',
  places: 'Places',
  /** Decor edit mode (DESIGN §9.4). */
  decor: {
    title: 'Decorate',
    hint: 'Drag a thing to move it. Tap one to flip it or put it away.',
    /** A thing's button in edit mode, after its name (screen readers). */
    keys: 'Arrow keys move it, F flips it, Delete removes it.',
    add: 'Add to {place}',
    flip: 'Flip',
    putAway: 'Put away',
    full: '{Place} has room for 24 things.',
    keepsake: 'Keepsake',
    placed: '{thing}, on {place}.',
    removed: '{thing}, put away.',
    /** She owns things, and every one of them is already out. */
    allOut: 'Everything you have is out. More comes from the capsules.',
  },
  /** The basket and the pantry (DESIGN §8.2). */
  basketSheet: {
    title: 'Basket and pantry',
    basket: 'The basket',
    pantry: 'The pantry',
    servings: { one: '1 serving', other: '{count} servings' },
    none: 'More in the morning',
    restock: 'Each treat restocks 2 servings every morning, up to 5.',
  },
  fieldGuideSheet: {
    title: 'Field Guide',
    pages: 'Pages',
    notYet: 'not yet',
    secret: 'Secret',
    of: '{owned} of {total}',
    visits: 'Visits {from} to {to}',
    pageFull: 'This page is full.',
    moonlit: 'Moonlit',
  },
  placeMap: {
    here: '{count} here',
    short: '{Place} is {price} coins. There are {count} in the jar.',
    shortOne: '{Place} is {price} coins. There’s 1 in the jar.',
    shortNone: '{Place} is {price} coins. Watering fills the jar.',
    go: 'Go to {place}',
    visit: 'Go there',
    confirm: 'Open {place}?',
    /** Said once, under Places, while a place is out of reach. */
    jar: 'There are {count} coins in the jar.',
    jarOne: 'There’s 1 coin in the jar.',
    jarNone: 'Watering fills the jar.',
  },
  /** The found thing on the sill, for VoiceOver: "A button, from Pudding". */
  foundLabel: '{A}, from {name}',
  capsules: 'Go to Capsules',
} as const;

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
