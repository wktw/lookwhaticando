/**
 * Every catalog decor item: its art and how it stands on the Shelf (DESIGN §8.3, §8.4).
 *
 * `size` is the edge of the item's 100×100 canvas in decor units, where a sitting cat is
 * PET_UNITS (16) tall, so things keep their real proportions at capsule scale: a matchbox bed is
 * one cat wide, a tennis ball is about the size of a dog's head, the Window Seat is a whole alcove.
 */
import type { DecorRenderer } from './kit';
import { cardboardBox, matchboxBed, spoolScratcher, windowHammock, yarnBall } from './cats';
import { hayBale, milkCan, milkCrate } from './cows';
import { dogBed, enamelBowl, tennisBall } from './dogs';
import { glassFloat, lilyPad, rubberDuck, wateringCan } from './pond';
import { seedPacket, stackedPots } from './garden';
import { breadBasket, copperKettle, jamJar, teacupBath } from './pantry';
import { hotWaterBottle, moonNightlight, readingLamp } from './night';
import {
  beachUmbrella,
  budVase,
  jackLantern,
  leafPile,
  loveLetter,
  miniPumpkin,
  oddMitten,
  paperStar,
  paperUmbrella,
  robinNest,
  sandcastle,
  seashell,
  seedTray,
  snowman,
  tinyBouquet,
} from './seasonal';
import { birthdayCake, pastureFence, readingChair, steppingStones, windowSeat } from './exclusive';

export type { DecorArtOptions, DecorRenderer } from './kit';

export interface DecorEntry {
  /** (opts?: { night?, light?, line? }) => JSX.Element, on the 100×100 canvas. */
  art: DecorRenderer;
  /** Canvas edge in decor units; a sitting cat is PET_UNITS (16) tall. */
  size: number;
  /** Left and right edges of the drawing on its canvas (0…100): keeps it in frame and maps its footprint. */
  bounds: readonly [number, number];
  /** How far back its base reaches from where it stands, in canvas units (for the pets' map). */
  deep: number;
  /** Lies flat (lily pad, stepping stones): pets stand on it. */
  flat?: boolean;
  /** Warm light at night: [cx, cy, r] on the art canvas. */
  glow?: readonly [number, number, number];
  /** Hangs from the window frame instead of standing (the top of its canvas meets the frame). */
  hang?: 'window';
}

/**
 * @deprecated Meadow-era placement hints. Never set; typed here only so the Meadow keeps compiling
 * until the shelf module deletes it.
 */
interface MeadowLegacy {
  sky?: 'canopy' | 'branch' | 'hills';
  tied?: readonly [number, number];
}

export const DECOR_ENTRIES: Record<string, DecorEntry & MeadowLegacy> = {
  // Exclusive
  'decor-window-seat': { art: windowSeat, size: 60, bounds: [0, 100], deep: 22 },
  'decor-birthday-cake': { art: birthdayCake, size: 17, bounds: [0, 100], deep: 14, glow: [50, 22, 30] },
  'decor-reading-chair': { art: readingChair, size: 34, bounds: [0, 100], deep: 24 },
  'decor-pasture-fence': { art: pastureFence, size: 30, bounds: [0, 100], deep: 6 },
  'decor-stepping-stones': { art: steppingStones, size: 34, bounds: [4, 96], deep: 26, flat: true },
  // No. 01 Cats
  'decor-cardboard-box': { art: cardboardBox, size: 26, bounds: [3, 96], deep: 16 },
  'decor-yarn-ball': { art: yarnBall, size: 15, bounds: [11, 98], deep: 20 },
  'decor-matchbox-bed': { art: matchboxBed, size: 24, bounds: [0, 100], deep: 16 },
  'decor-spool-scratcher': { art: spoolScratcher, size: 22, bounds: [9, 91], deep: 14 },
  'decor-window-hammock': { art: windowHammock, size: 26, bounds: [7, 93], deep: 0, hang: 'window' },
  // No. 02 Cows
  'decor-hay-bale': { art: hayBale, size: 22, bounds: [2, 98], deep: 18 },
  'decor-milk-crate': { art: milkCrate, size: 24, bounds: [0, 100], deep: 20 },
  'decor-milk-can': { art: milkCan, size: 21, bounds: [22, 78], deep: 12 },
  // No. 03 Dogs
  'decor-tennis-ball': { art: tennisBall, size: 9, bounds: [16, 84], deep: 30 },
  'decor-dog-bed': { art: dogBed, size: 30, bounds: [0, 100], deep: 30 },
  'decor-enamel-bowl': { art: enamelBowl, size: 14, bounds: [8, 92], deep: 20 },
  // No. 04 Pond
  'decor-lily-pad': { art: lilyPad, size: 26, bounds: [0, 100], deep: 30, flat: true },
  'decor-watering-can': { art: wateringCan, size: 20, bounds: [18, 95], deep: 12 },
  'decor-rubber-duck': { art: rubberDuck, size: 12, bounds: [5, 93], deep: 20 },
  'decor-glass-float': { art: glassFloat, size: 13, bounds: [11.5, 88.5], deep: 22 },
  // No. 05 Garden
  'decor-seed-packet': { art: seedPacket, size: 15, bounds: [16, 88], deep: 6 },
  'decor-stacked-pots': { art: stackedPots, size: 18, bounds: [18, 82], deep: 18 },
  // No. 06 Pantry
  'decor-teacup-bath': { art: teacupBath, size: 15, bounds: [2, 98], deep: 12 },
  'decor-jam-jar': { art: jamJar, size: 14, bounds: [20, 80], deep: 14, glow: [50, 66, 44] },
  'decor-bread-basket': { art: breadBasket, size: 22, bounds: [2, 98], deep: 22 },
  'decor-copper-kettle': { art: copperKettle, size: 22, bounds: [9, 97], deep: 16 },
  // No. 07 Night
  'decor-hot-water-bottle': { art: hotWaterBottle, size: 20, bounds: [20, 80], deep: 14 },
  'decor-reading-lamp': { art: readingLamp, size: 30, bounds: [10, 92], deep: 10, glow: [43, 56, 48] },
  'decor-moon-nightlight': { art: moonNightlight, size: 16, bounds: [12, 74], deep: 0, glow: [44, 58, 46], hang: 'window' },
  // Autumn
  'decor-mini-pumpkin': { art: miniPumpkin, size: 13, bounds: [3, 97], deep: 24 },
  'decor-leaf-pile': { art: leafPile, size: 24, bounds: [0, 100], deep: 22 },
  'decor-jack-lantern': { art: jackLantern, size: 15, bounds: [3, 97], deep: 22, glow: [50, 64, 44] },
  // Winter
  'decor-snowman': { art: snowman, size: 22, bounds: [20, 86], deep: 16 },
  'decor-odd-mitten': { art: oddMitten, size: 20, bounds: [0, 100], deep: 18 },
  'decor-paper-star': { art: paperStar, size: 16, bounds: [17, 83], deep: 0, glow: [50, 54, 46], hang: 'window' },
  // Valentine
  'decor-love-letter': { art: loveLetter, size: 15, bounds: [9, 91], deep: 6 },
  'decor-bud-vase': { art: budVase, size: 18, bounds: [27, 73], deep: 10 },
  'decor-tiny-bouquet': { art: tinyBouquet, size: 20, bounds: [15, 74], deep: 8 },
  // Spring
  'decor-paper-umbrella': { art: paperUmbrella, size: 14, bounds: [0, 80], deep: 20 },
  'decor-robin-nest': { art: robinNest, size: 16, bounds: [5, 96], deep: 22 },
  'decor-seed-tray': { art: seedTray, size: 28, bounds: [0, 100], deep: 28 },
  // Summer
  'decor-sandcastle': { art: sandcastle, size: 20, bounds: [5, 95], deep: 16 },
  'decor-beach-umbrella': { art: beachUmbrella, size: 36, bounds: [6, 99], deep: 10 },
  'decor-seashell': { art: seashell, size: 14, bounds: [9, 91], deep: 14 },
};

/** A mid size for an id that has no entry (never a catalog id; the tests make sure of that). */
const FALLBACK_SIZE = 16;

/** How big an item stands on the Shelf: its canvas edge in decor units. */
export function decorFootprint(itemId: string): number {
  return DECOR_ENTRIES[itemId]?.size ?? FALLBACK_SIZE;
}
