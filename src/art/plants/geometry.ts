/**
 * Where things are on a plant's 100-unit canvas, for modules that place residents or props around a plant: a cat
 * loafing on the rim, a tag in the soil, the empty pot beside a cutting in its glass.
 */
import type { PotId } from '@/catalog/types';
import { POTS, FOOT_Y } from './pots';
import type { Mouth } from './types';

export interface PotGeometry {
  /** The top of the rim, where a resident can sit: y and its left and right ends. */
  rim: { y: number; x0: number; x1: number };
  /** The soil line and half-width of the opening. */
  mouth: Mouth;
  /** The pot stands on this line. */
  foot: { y: number; hw: number };
}

export const POT_GEOMETRY: Readonly<Record<PotId, PotGeometry>> = Object.fromEntries(
  (Object.keys(POTS) as PotId[]).map((id) => {
    const { mouth, foot } = POTS[id];
    return [id, { rim: { y: mouth.y - 0.4, x0: 50 - mouth.hw - 1.6, x1: 50 + mouth.hw + 1.6 }, mouth, foot: { y: FOOT_Y, hw: foot } }];
  }),
) as Record<PotId, PotGeometry>;

/**
 * Where a plant tag's stake goes into the soil, in canvas units: on the soil line, a little right of the stem, so
 * the tag stands beside the plant rather than in front of it. Position the tag so its stake's foot lands here.
 */
export function tagAnchor(pot: PotId): { x: number; y: number } {
  const { mouth } = POT_GEOMETRY[pot] ?? POT_GEOMETRY.terracotta;
  return { x: 50 + mouth.hw * 0.5, y: mouth.y };
}
