import type { MeadowZoneId } from '@/state/types';

/** Meadow expansions: the long-term coin goal (DESIGN §13.7). Order = left-to-right in the scrolling meadow. */
export interface ZoneDef {
  id: MeadowZoneId;
  name: string;
  price: number;
  blurb: string;
  /** Extra pets allowed out when owned. */
  petsOut: number;
}

export const ZONES: readonly ZoneDef[] = [
  { id: 'meadow', name: 'The Meadow', price: 0, blurb: 'Where it all begins.', petsOut: 8 },
  { id: 'pond', name: 'Lily Pond', price: 400, blurb: 'A still pond with lily pads, reeds, and a little dock.', petsOut: 2 },
  { id: 'orchard', name: 'Orchard', price: 700, blurb: 'Apple and peach trees heavy with fruit, and a hammock.', petsOut: 2 },
  { id: 'porch', name: 'Cottage Porch', price: 1000, blurb: 'A cozy porch with a rocking chair, lanterns and a welcome mat.', petsOut: 2 },
  { id: 'greenhouse', name: 'Greenhouse', price: 1500, blurb: 'Glass walls, hanging plants, and warm afternoon light.', petsOut: 2 },
  { id: 'starhill', name: 'Star Hill', price: 2500, blurb: 'The best stargazing spot in the whole meadow.', petsOut: 2 },
];

export const ZONE_BY_ID: ReadonlyMap<MeadowZoneId, ZoneDef> = new Map(ZONES.map((z) => [z.id, z]));
