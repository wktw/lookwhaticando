/**
 * Every decor item: its art and how big it stands in the Meadow.
 * `size` is the edge of the item's 100×100 canvas in meadow units (1 unit = 1% of the scene
 * height) before depth scaling; the art fills most of the canvas width, so size ≈ natural width.
 * For comparison a pet is PET_UNITS (16) tall.
 */
import type { DecorRenderer } from './kit';
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
  /** Gentle idle motion when placed in the scene. */
  motion?: 'bob';
  /** Lies flat on the ground, so pets always stand on top of it. */
  flat?: boolean;
  /** Warm light cast at night: [cx, cy, r] on the art canvas. */
  glow?: readonly [number, number, number];
}

export const DECOR_ENTRIES: Record<string, DecorEntry> = {
  'decor-cardboard-box': { art: cardboardBox, size: 15 },
  'decor-yarn-basket': { art: yarnBasket, size: 12 },
  'decor-cat-tree': { art: catTree, size: 27 },
  'decor-hay-bale': { art: hayBale, size: 16 },
  'decor-picnic-blanket': { art: picnicBlanket, size: 28, flat: true },
  'decor-little-barn': { art: littleBarn, size: 38, glow: [50, 64, 56] },
  'decor-tennis-balls': { art: tennisBalls, size: 9 },
  'decor-dog-house': { art: dogHouse, size: 22 },
  'decor-tulip-bed': { art: tulipBed, size: 22 },
  'decor-cherry-tree': { art: cherryTree, size: 44 },
  'decor-tea-party': { art: teaParty, size: 21 },
  'decor-moon-lamp': { art: moonLamp, size: 20, glow: [68, 42, 44] },
  'decor-fairy-lights': { art: fairyLights, size: 46 },
  'decor-pumpkin-pile': { art: pumpkinPile, size: 16 },
  'decor-jack-lantern': { art: jackLantern, size: 12, glow: [50, 68, 56] },
  'decor-snowman': { art: snowman, size: 20 },
  'decor-twinkly-tree': { art: twinklyTree, size: 30, glow: [50, 50, 60] },
  'decor-heart-balloons': { art: heartBalloons, size: 22, motion: 'bob' },
  'decor-love-mailbox': { art: loveMailbox, size: 18 },
  'decor-puddle': { art: puddle, size: 26, flat: true },
  'decor-rainbow': { art: rainbow, size: 44 },
  'decor-mushroom-house': { art: mushroomHouse, size: 32, glow: [50, 74, 50] },
  'decor-beach-umbrella': { art: beachUmbrella, size: 28 },
  'decor-sandcastle': { art: sandcastle, size: 18 },
};

/** How wide an item stands in the Meadow, in meadow units (see above). Unknown ids get a mid size. */
export function decorFootprint(itemId: string): number {
  return DECOR_ENTRIES[itemId]?.size ?? 16;
}
