/**
 * How pets stand in a shared scene (a sill, a place): their true sizes relative to one another, and anchors other
 * art needs (the top of a lying cow's back, where a cat curls up in the cat-on-cow vignette).
 *
 * The rigs' own `scale` keeps each species inside its 100 canvas. A scene multiplies the canvas by `WORLD_SCALE` on
 * top, so a cow reads as a calf beside a cat (about 1.3× the cat's height when both loaf, DESIGN §8.1, the Pz_poses
 * frames) without clipping its drawing. The hamster and the call duck stay small.
 */
import type { Species } from '@/catalog/types';
import { pathBox, poseBounds } from './bounds';
import type { Pose } from './types';
import { RIGS } from './species/rigs';
import { BASELINE, type SpeciesRig } from './rig';
import { COW_RIG } from './species/cow.rig';
import { CAT_RIG } from './species/cat.rig';

/** A pet's canvas in a scene is the scene's pet size × this (1 for every species but the cow). */
export const WORLD_SCALE: Readonly<Record<Species, number>> = {
  cat: 1,
  cow: 1.15,
  dog: 1,
  bunny: 1,
  frog: 1,
  bear: 1,
  hamster: 1,
  duck: 1,
};

/** The loaf's height above the feet, as a share of the canvas (the body and the head, as drawn). */
function loafHeight(rig: SpeciesRig): number {
  const p = rig.poses.loaf;
  const body = pathBox(p.body);
  const headTop = p.head.y + rig.head.top * p.head.s;
  return ((BASELINE - Math.min(body.y0, headTop)) * rig.scale) / 100;
}

/** A loafing cow's height over a loafing cat's, in a scene (the art test pins it near 1.3). */
export const COW_OVER_CAT = (loafHeight(COW_RIG) * WORLD_SCALE.cow) / (loafHeight(CAT_RIG) * WORLD_SCALE.cat);

/**
 * The top of a lying cow's back on its own canvas, measured from the feet: `y` up and `x` from the canvas centre
 * toward the tail (the rump side, where a cat curls up clear of the head), both as shares of the canvas edge. It is
 * read from the cow rig's loaf, so it follows the drawing.
 */
export const COW_BACK: { readonly x: number; readonly y: number } = (() => {
  const body = pathBox(COW_RIG.poses.loaf.body);
  const s = COW_RIG.scale;
  // The back is flattest over the middle of the body, a little toward the rump.
  const mid = body.x0 + (body.x1 - body.x0) * 0.42;
  return { x: +(((50 - mid) * s) / 100).toFixed(3), y: +(((BASELINE - body.y0) * s) / 100 - 0.015).toFixed(3) };
})();

const reaches = new Map<string, number>();

/**
 * How far a pet's drawing reaches behind its canvas centre in a pose, as a share of the canvas (the tail and haunch
 * side when it faces right, before any flip). A scene seats pets on a pot rim by this edge, so a long cow or a beagle
 * sits as far into the plant as a cat does and no further (its bulk goes over the lip, not over the leaves).
 */
export function reachBehind(species: Species, pose: Pose = 'loaf'): number {
  const key = `${species}/${pose}`;
  let r = reaches.get(key);
  if (r === undefined) {
    const rig = RIGS[species] ?? CAT_RIG;
    const b = poseBounds(species, rig, pose);
    reaches.set(key, (r = ((50 - b.x0) * rig.scale) / 100));
  }
  return r;
}
