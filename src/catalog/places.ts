import type { PlaceId, Species } from './types';

/**
 * Places: where pets live, and the long-term coin goal (DESIGN §8.4). The order is the
 * left-to-right order of the scrolling Shelf. Species prefer places, but none is restricted.
 */
export interface PlaceDef {
  id: PlaceId;
  name: string;
  price: number;
  blurb: string;
  /** Room for this many more pets out when owned. */
  petsOut: number;
  /** Who is drawn to it (they wander there more often). Empty means everyone. */
  loves: readonly Species[];
}

export const PLACES: readonly PlaceDef[] = [
  { id: 'sill', name: 'The Sill', price: 0, blurb: 'The habit pots in a row, the coin jar, and the afternoon sunbeam.', petsOut: 8, loves: [] },
  { id: 'pond', name: 'Saucer Pond', price: 400, blurb: 'A terracotta saucer of water with a pebble island and one lily pad.', petsOut: 2, loves: ['frog', 'duck'] },
  { id: 'grass', name: 'Cat-grass Tray', price: 700, blurb: 'A long seed tray of oat grass. A pasture, at this size.', petsOut: 2, loves: ['cow', 'bunny'] },
  { id: 'bookshelf', name: 'Bookshelf', price: 1000, blurb: 'Two shelves of paperbacks, a trailing pothos and a reading lamp.', petsOut: 2, loves: ['cat'] },
  { id: 'balcony', name: 'Balcony Box', price: 1500, blurb: 'A window box outside the glass. Weather, seasons, and room to roam.', petsOut: 2, loves: [] },
  { id: 'quilt', name: 'The Quilt', price: 2500, blurb: 'A folded patchwork quilt at the end of the bed. The night nap pile.', petsOut: 2, loves: ['bear', 'hamster', 'dog'] },
];

export const PLACE_BY_ID: ReadonlyMap<PlaceId, PlaceDef> = new Map(PLACES.map((p) => [p.id, p]));
