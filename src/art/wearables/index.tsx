import type { WearableArt } from '../pets/types';
import { bakersHat, bucketHat, cowgirlHat, fishHat, frogHat, leafUmbrella, milkCarton, nightcap, pomBeanie, santaHat, strawberryHat, sunHat, witchHat } from './hats';
import { cherryClips, crescentClip, daisyCrown, earmuffs, evergreenCrown, halo, heartHeadband, mapleCrown, pinkBow, roseCrown, sakuraClip } from './headpieces';
import { heartGlasses, heartShades, milkMustache, readingGlasses, sleepMask, starShades } from './face';
import { autumnScarf, bellCollar, bowTie, cloudScarf, cowbell, flowerLei, ginghamBandana, heartLocket, knitScarf, pawBandana } from './neck';
import { cozyHoodie, cozyStripes, duckFloat, festiveSweater, frillyApron, gardenApron, overalls, pumpkinCardigan, raincoat, starryPajamas, tinyBackpack } from './body';

/**
 * Wearable art, keyed by collectible id. Each renderer draws in pet canvas coordinates using
 * ctx.anchors and ctx.body so the same item fits all eight species; each icon draws the item
 * alone, centered and large on a 100×100 canvas. Files are split by slot.
 */
export const WEARABLE_ART: Record<string, WearableArt> = {
  // head: hats
  'wear-pom-beanie': pomBeanie,
  'wear-bakers-hat': bakersHat,
  'wear-strawberry-hat': strawberryHat,
  'wear-nightcap': nightcap,
  'wear-witch-hat': witchHat,
  'wear-santa-hat': santaHat,
  'wear-cowgirl-hat': cowgirlHat,
  'wear-bucket-hat': bucketHat,
  'wear-frog-hat': frogHat,
  'wear-sun-hat': sunHat,
  'wear-leaf-umbrella': leafUmbrella,
  'wear-fish-hat': fishHat,
  'wear-milk-carton': milkCarton,
  // head: bows, clips, crowns
  'wear-pink-bow': pinkBow,
  'wear-daisy-crown': daisyCrown,
  'wear-rose-crown': roseCrown,
  'wear-maple-crown': mapleCrown,
  'wear-sakura-clip': sakuraClip,
  'wear-cherry-clips': cherryClips,
  'wear-crescent-clip': crescentClip,
  'wear-halo': halo,
  'wear-heart-headband': heartHeadband,
  'wear-earmuffs': earmuffs,
  'wear-evergreen-crown': evergreenCrown,
  // face
  'wear-reading-glasses': readingGlasses,
  'wear-milk-mustache': milkMustache,
  'wear-star-shades': starShades,
  'wear-sleep-mask': sleepMask,
  'wear-heart-glasses': heartGlasses,
  'wear-heart-shades': heartShades,
  // neck
  'wear-bell-collar': bellCollar,
  'wear-paw-bandana': pawBandana,
  'wear-gingham-bandana': ginghamBandana,
  'wear-cowbell': cowbell,
  'wear-bow-tie': bowTie,
  'wear-cloud-scarf': cloudScarf,
  'wear-autumn-scarf': autumnScarf,
  'wear-knit-scarf': knitScarf,
  'wear-heart-locket': heartLocket,
  'wear-flower-lei': flowerLei,
  // body
  'wear-cozy-stripes': cozyStripes,
  'wear-overalls': overalls,
  'wear-cozy-hoodie': cozyHoodie,
  'wear-tiny-backpack': tinyBackpack,
  'wear-garden-apron': gardenApron,
  'wear-frilly-apron': frillyApron,
  'wear-starry-pajamas': starryPajamas,
  'wear-pumpkin-cardigan': pumpkinCardigan,
  'wear-festive-sweater': festiveSweater,
  'wear-raincoat': raincoat,
  'wear-duck-float': duckFloat,
};
