/**
 * Every decor item: its art and how it stands in the Meadow.
 * `size` is the edge of the item's 100×100 canvas in decor units (see `DECOR_UNIT_CSS` in
 * layout.ts; 1% of the scene height on most screens) before depth scaling. For comparison a
 * pet is PET_UNITS (16) tall.
 */
import type { DecorRenderer } from './kit';
import { BALLOON_KNOT } from './love';
import { cardboardBox, catTree, yarnBasket } from './kitty';
import { hayBale, littleBarn, picnicBlanket } from './moo';
import { dogHouse, tennisBalls } from './puppy';
import { cherryTree, tulipBed } from './sakura';
import { teaParty } from './sweets';
import { fairyLights, moonLamp } from './dreamy';
import { jackLantern, pumpkinPile } from './pumpkin';
import { snowman, twinklyTree } from './snow';
import { heartBalloons, loveMailbox } from './love';
import { mushroomHouse, puddle, rainbow } from './rainy';
import { beachUmbrella, sandcastle } from './beach';

export type { DecorArtOptions, DecorRenderer } from './kit';

export interface DecorEntry {
  art: DecorRenderer;
  size: number;
  /** Left and right edges of the drawing on its canvas (0…100): keeps it in frame and maps its footprint. */
  bounds: readonly [number, number];
  /** How far back its base reaches from where it stands, in canvas units (for the pets' map). */
  deep: number;
  /** Lies flat on the ground, so pets always stand on top of it. */
  flat?: boolean;
  /** Floats on a string tied down at this canvas point, swaying about it. */
  tied?: readonly [number, number];
  /** Warm light cast at night: [cx, cy, r] on the art canvas. */
  glow?: readonly [number, number, number];
  /**
   * Where sky decor hangs by default: draped over the big tree's canopy, tied to the tip of its
   * swing branch, or rising from behind the far hills (drawn behind them).
   */
  sky?: 'canopy' | 'branch' | 'hills';
  /**
   * catkin: hangs instead of standing, from the window frame (a window hammock, a paper star, a moon night-light).
   * Replaces `sky` and `tied`, which are Meadow-era and will be removed by the catkin restyle.
   */
  hang?: 'window';
}

export const DECOR_ENTRIES: Record<string, DecorEntry> = {
  'decor-cardboard-box': { art: cardboardBox, size: 15, bounds: [4, 96], deep: 14 },
  'decor-yarn-basket': { art: yarnBasket, size: 12, bounds: [10, 85], deep: 10 },
  'decor-cat-tree': { art: catTree, size: 26, bounds: [16, 83], deep: 10 },
  'decor-hay-bale': { art: hayBale, size: 16, bounds: [5, 89], deep: 14 },
  'decor-picnic-blanket': { art: picnicBlanket, size: 28, bounds: [5, 95], deep: 29, flat: true },
  'decor-little-barn': { art: littleBarn, size: 34, bounds: [10, 90], deep: 16, glow: [50, 64, 56] },
  'decor-tennis-balls': { art: tennisBalls, size: 9, bounds: [16, 82], deep: 12 },
  'decor-dog-house': { art: dogHouse, size: 22, bounds: [10, 92], deep: 14 },
  'decor-tulip-bed': { art: tulipBed, size: 22, bounds: [6, 94], deep: 12 },
  'decor-cherry-tree': { art: cherryTree, size: 40, bounds: [11, 90], deep: 10 },
  'decor-tea-party': { art: teaParty, size: 21, bounds: [16, 84], deep: 14 },
  'decor-moon-lamp': { art: moonLamp, size: 20, bounds: [36, 90], deep: 6, glow: [68, 42, 44] },
  'decor-fairy-lights': { art: fairyLights, size: 28, bounds: [0, 100], deep: 0, glow: [50, 50, 60], sky: 'canopy' },
  'decor-pumpkin-pile': { art: pumpkinPile, size: 16, bounds: [10, 88], deep: 14 },
  'decor-jack-lantern': { art: jackLantern, size: 12, bounds: [14, 86], deep: 12, glow: [50, 68, 56] },
  'decor-snowman': { art: snowman, size: 20, bounds: [19, 81], deep: 8 },
  'decor-twinkly-tree': { art: twinklyTree, size: 28, bounds: [16, 82], deep: 10, glow: [50, 50, 60] },
  'decor-heart-balloons': { art: heartBalloons, size: 22, bounds: [22, 80], deep: 0, tied: BALLOON_KNOT, sky: 'branch' },
  'decor-love-mailbox': { art: loveMailbox, size: 18, bounds: [14, 94], deep: 8 },
  'decor-puddle': { art: puddle, size: 26, bounds: [5, 95], deep: 38, flat: true },
  'decor-rainbow': { art: rainbow, size: 40, bounds: [4, 96], deep: 0, sky: 'hills' },
  'decor-mushroom-house': { art: mushroomHouse, size: 30, bounds: [8, 92], deep: 14, glow: [50, 74, 50] },
  'decor-beach-umbrella': { art: beachUmbrella, size: 28, bounds: [7, 90], deep: 10 },
  'decor-sandcastle': { art: sandcastle, size: 18, bounds: [5, 95], deep: 14 },
};

const FALLBACK_SIZE = 16;

/** How big an item stands in the Meadow: its canvas edge in decor units. Unknown ids get a mid size. */
export function decorFootprint(itemId: string): number {
  return DECOR_ENTRIES[itemId]?.size ?? FALLBACK_SIZE;
}
