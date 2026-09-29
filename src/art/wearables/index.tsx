import type { WearableArt } from '../pets/types';
import { blossomClip, blossomCrown, crescentPin, daisyChain, earmuffs, flowerCrown, knitBeret, knitCap, laurelSprig, leafUmbrella, nightcap, partyHat, pompomHat, rainHat, ribbonBow, roseClip, strawHat, sunHat, thimbleHat, witchHat } from './head';
import { heartShades, sleepMask } from './face';
import { bellCollar, cowbell, dogBandana, flowerLei, ginghamBandana, heartLocket, knitScarf, leafScarf, petalCollar, tagCollar, winterScarf } from './neck';
import { clearRaincoat, dogRaincoat, duffleCoat, fairisleSweater, heartKnit, heatherShawl, knitSweater, linenApron, pumpkinCardigan, starryPajamas, stripedTee, woolRug } from './body';

/**
 * Wearable art by collectible id (DESIGN §8.3): small real things, fitted to every species and
 * posture through the head, collar and body frames (see kit.tsx). Each has an inventory icon.
 */
export const WEARABLE_ART: Record<string, WearableArt> = {
  // head
  'wear-laurel-sprig': laurelSprig,
  'wear-party-hat': partyHat,
  'wear-ribbon-bow': ribbonBow,
  'wear-thimble-hat': thimbleHat,
  'wear-straw-hat': strawHat,
  'wear-daisy-chain': daisyChain,
  'wear-knit-cap': knitCap,
  'wear-rain-hat': rainHat,
  'wear-leaf-umbrella': leafUmbrella,
  'wear-flower-crown': flowerCrown,
  'wear-knit-beret': knitBeret,
  'wear-nightcap': nightcap,
  'wear-crescent-pin': crescentPin,
  'wear-witch-hat': witchHat,
  'wear-pompom-hat': pompomHat,
  'wear-earmuffs': earmuffs,
  'wear-rose-clip': roseClip,
  'wear-blossom-clip': blossomClip,
  'wear-blossom-crown': blossomCrown,
  'wear-sun-hat': sunHat,
  // face
  'wear-sleep-mask': sleepMask,
  'wear-heart-shades': heartShades,
  // neck
  'wear-bell-collar': bellCollar,
  'wear-cowbell': cowbell,
  'wear-gingham-bandana': ginghamBandana,
  'wear-dog-bandana': dogBandana,
  'wear-tag-collar': tagCollar,
  'wear-knit-scarf': knitScarf,
  'wear-leaf-scarf': leafScarf,
  'wear-winter-scarf': winterScarf,
  'wear-heart-locket': heartLocket,
  'wear-petal-collar': petalCollar,
  'wear-flower-lei': flowerLei,
  // body
  'wear-knit-sweater': knitSweater,
  'wear-wool-rug': woolRug,
  'wear-dog-raincoat': dogRaincoat,
  'wear-duffle-coat': duffleCoat,
  'wear-clear-raincoat': clearRaincoat,
  'wear-linen-apron': linenApron,
  'wear-starry-pajamas': starryPajamas,
  'wear-heather-shawl': heatherShawl,
  'wear-pumpkin-cardigan': pumpkinCardigan,
  'wear-fairisle-sweater': fairisleSweater,
  'wear-heart-knit': heartKnit,
  'wear-striped-tee': stripedTee,
};
