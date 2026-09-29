import type { TraitArt, TraitId } from '../types';
import { acornCap, antlers, bangs, crown, flower, forelock, frosting, haloGlow, lilypadHat, mushroomCap, nightcap, rose, sprout, starfish, strawberryCap, witchHat } from './head';
import { cheeks, cloudFluff, daifukuBean, fluffy, ghostSheet, ghostTail, gingerbread, mermaidTail, nori, pumpkinShell, rainbowBelly } from './body';
import { golden, heartHold, kissy, luckyPaw, redNose, ribbon, sailorCollar, wings } from './accents';

/**
 * Trait renderers. Style traits that change a species' own parts live in the species art instead:
 * lop-ears (bunny) and the dog ear/tail styles (pointy-ears, floppy-ears, bat-ears, curly-tail).
 */
export const TRAITS: Partial<Record<TraitId, TraitArt>> = {
  sprout,
  golden,
  'strawberry-cap': strawberryCap,
  'lucky-paw': luckyPaw,
  'mushroom-cap': mushroomCap,
  crown,
  frosting,
  'lilypad-hat': lilypadHat,
  'acorn-cap': acornCap,
  'ghost-sheet': ghostSheet,
  'pumpkin-shell': pumpkinShell,
  'ghost-tail': ghostTail,
  antlers,
  ribbon,
  wings,
  'heart-hold': heartHold,
  bangs,
  'mermaid-tail': mermaidTail,
  'sailor-collar': sailorCollar,
  flower,
  nightcap,
  'halo-glow': haloGlow,
  'cloud-fluff': cloudFluff,
  kissy,
  'rainbow-belly': rainbowBelly,
  'daifuku-bean': daifukuBean,
  cheeks,
  gingerbread,
  fluffy,
  'witch-hat': witchHat,
  'red-nose': redNose,
  forelock,
  starfish,
  rose,
  nori,
};
