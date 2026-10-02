/**
 * Cross-pet vignettes (DESIGN §9.4): small scenes two or more pets fall into on their own — a cat
 * asleep on a cow's back, ducks walking in a line, a nap pile at night, a rabbit sniffing a new leaf.
 * Each is a registry entry: who can play it, where everyone goes, and for how long. Add more with
 * `registerVignette`.
 */
import type { PlaceId, Species } from '@/catalog/types';
import type { FriendshipProfile, PetSpot } from '../model';
import { groundSpot, nearestFree, routineAt, type Ground } from '../arrange';
import { baseline, depthScale, depthZ } from '../room';
import { COW_BACK, WORLD_SCALE } from '@/art/pets/world';
import type { Moment } from '../time';

export interface VignetteActor {
  key: string;
  species: Species;
  spot: PetSpot;
  bond?: FriendshipProfile;
}

export interface VignetteContext {
  place: PlaceId;
  ground: Ground;
  moment: Moment;
  actors: readonly VignetteActor[];
}

export interface Vignette {
  id: string;
  /** A caption for the gallery, in the narrator's voice. */
  caption: string;
  /** Who plays it (keys, lead first), or null when it cannot happen now. */
  cast: (ctx: VignetteContext) => string[] | null;
  /** Where each cast member goes. */
  stage: (ctx: VignetteContext, cast: readonly string[]) => Map<string, PetSpot>;
  /** How long it holds before everyone goes back to their own business (ms). */
  hold: number;
  /** Cast members walk there together, in order (ducks in a line). */
  procession?: boolean;
  /** Chance per check that it starts when it can (0…1). */
  weight: number;
  /** Whether it may play at all yet (art it depends on has landed). Absent: always. */
  ready?: () => boolean;
  /** Cast members set off one after another, this many ms apart (a line of ducks). */
  stagger?: number;
}

/**
 * A lying cow's back, as shares of its canvas (the pets module's anchor, read from the cow rig's loaf): `y` above its
 * feet, `x` from its middle toward its tail. The scene's cow canvas is the pet size × WORLD_SCALE.cow.
 */
export { COW_BACK } from '@/art/pets/world';

/** The pets module's long, low lying cow has landed: a cat can sleep on its back without hiding it. */
export const LYING_COW_READY = true;

/** A duck's body length, as a share of the pet canvas. */
const DUCK_BODY = 0.5;

const bySpecies = (ctx: VignetteContext, species: Species) => ctx.actors.filter((a) => a.species === species && !a.spot.perch);
const asleep = (ctx: VignetteContext) => ctx.moment.light.night && routineAt(ctx.moment.hour) === 'sleep';

const catOnCow: Vignette = {
  id: 'cat-on-cow',
  caption: 'A cat asleep on a cow’s back.',
  weight: 0.5,
  hold: 60000,
  ready: () => LYING_COW_READY,
  cast: (ctx) => {
    const cow = bySpecies(ctx, 'cow')[0];
    const cat = bySpecies(ctx, 'cat')[0];
    return cow && cat ? [cow.key, cat.key] : null;
  },
  stage: (ctx, [cowKey, catKey]) => {
    const g = ctx.ground;
    const cow = ctx.actors.find((a) => a.key === cowKey)!;
    const want = g.beam && !ctx.moment.light.night ? (g.beam.x0 + g.beam.x1) / 2 + g.beam.slant * 0.5 : cow.spot.x;
    const x = nearestFree(g, want, []);
    const depth = Math.max(g.d0 + 0.2, Math.min(g.d1 - 0.1, cow.spot.depth));
    const cowSpot = groundSpot(g, x, depth, 'loaf', asleep(ctx), x < (g.x0 + g.x1) / 2 ? 'right' : 'left');
    const cowSize = g.petSize * WORLD_SCALE.cow * depthScale(depth);
    const back = cowSpot.y - COW_BACK.y * cowSize;
    // Curled up over the middle of its back, toward the tail, clear of its head.
    const catSpot: PetSpot = { x: x - (cowSpot.facing === 'right' ? 1 : -1) * COW_BACK.x * cowSize, depth, y: back, pose: 'sleep', facing: cowSpot.facing, asleep: true, perch: 'back', z: (cowSpot.z ?? depthZ(depth)) + 1 };
    return new Map([
      [cowKey!, cowSpot],
      [catKey!, catSpot],
    ]);
  },
};

const duckLine: Vignette = {
  id: 'duck-line',
  caption: 'Ducks walking in a line.',
  weight: 0.6,
  hold: 20000,
  procession: true,
  stagger: 260,
  cast: (ctx) => {
    if (ctx.moment.light.night) return null;
    const ducks = bySpecies(ctx, 'duck');
    return ducks.length >= 2 ? ducks.slice(0, 5).map((d) => d.key) : null;
  },
  stage: (ctx, cast) => {
    const g = ctx.ground;
    const lead = ctx.actors.find((a) => a.key === cast[0])!;
    const facing = lead.spot.x < (g.x0 + g.x1) / 2 ? 'right' : 'left';
    const dir = facing === 'right' ? 1 : -1;
    // Single file, each a body length and nearly another behind the one in front.
    const gap = g.petSize * DUCK_BODY * 1.9;
    const span = gap * (cast.length - 1);
    const leadX = facing === 'right' ? Math.min(g.x1 - g.petSize * 0.5, lead.spot.x + g.petSize * 2.5) : Math.max(g.x0 + g.petSize * 0.5 + span, lead.spot.x - g.petSize * 2.5);
    const depth = Math.min(g.d1, Math.max(g.d0 + 0.2, lead.spot.depth));
    return new Map(cast.map((key, i) => [key, { ...groundSpot(g, leadX - dir * i * gap, depth, 'walk', false, facing), z: depthZ(depth) + (cast.length - i) }] as const));
  },
};

const napPile: Vignette = {
  id: 'nap-pile',
  caption: 'A nap pile, late at night.',
  weight: 0.8,
  hold: 240000,
  cast: (ctx) => {
    if (!asleep(ctx) && !(ctx.place === 'quilt' && ctx.moment.light.night)) return null;
    const free = ctx.actors.filter((a) => a.spot.perch !== 'rim');
    if (free.length < 3) return null;
    // Keep the first chosen pair together, even when the friend was beyond the five-pet cast.
    // With no earned friendship the original cast and probability are unchanged.
    const lead = free.find((a) => a.bond?.napWith && a.bond.napWith !== a.key && free.some((b) => b.key === a.bond!.napWith));
    const ordered = lead ? [lead, free.find((a) => a.key === lead.bond!.napWith)!, ...free.filter((a) => a.key !== lead.key && a.key !== lead.bond!.napWith)] : free;
    return ordered.slice(0, 5).map((a) => a.key);
  },
  stage: (ctx, cast) => {
    const g = ctx.ground;
    const bed = g.perches.find((p) => p.kind === 'bed' || p.kind === 'shelf');
    const cx = bed ? bed.x : nearestFree(g, g.lampX ? g.lampX - g.petSize * 1.4 : (g.x0 + g.x1) / 2, []);
    const out = new Map<string, PetSpot>();
    cast.forEach((key, i) => {
      // Alternate either side of the middle, the latecomer curled on top.
      const side = i === 0 ? 0 : (i % 2 === 1 ? -1 : 1) * Math.ceil(i / 2);
      const onTop = i === cast.length - 1 && cast.length >= 3;
      const base = bed ? { x: cx, y: bed.y, depth: bed.depth, z: bed.z } : groundSpot(g, cx, 0.7, 'sleep', true, 'right');
      out.set(key, {
        // Side by side a little over half a body apart; the latecomer curled across two of them.
        x: cx + (onTop ? 0.27 : side * 0.52) * g.petSize,
        depth: base.depth,
        y: base.y - (onTop ? 0.2 * g.petSize : 0),
        pose: 'sleep',
        facing: side < 0 ? 'right' : 'left',
        asleep: true,
        perch: bed ? 'bed' : onTop ? 'back' : undefined,
        z: (base.z ?? depthZ(base.depth)) + 2 + (onTop ? 5 : Math.abs(side)),
      });
    });
    return out;
  },
};

const bunnyLeaf: Vignette = {
  id: 'bunny-leaf',
  caption: 'A rabbit sniffing a new leaf, very gently.',
  weight: 0.4,
  hold: 14000,
  cast: (ctx) => {
    if (ctx.moment.light.night) return null;
    const bunny = bySpecies(ctx, 'bunny')[0];
    const rim = ctx.ground.perches.find((p) => p.kind === 'rim');
    return bunny && rim ? [bunny.key] : null;
  },
  stage: (ctx, [key]) => {
    const g = ctx.ground;
    // A pot nobody is sitting on, nearest the rabbit.
    const taken = new Set(ctx.actors.filter((a) => a.key !== key && a.spot.perch === 'rim').map((a) => a.spot.perchId));
    const all = g.perches.filter((p) => p.kind === 'rim');
    const rims = all.filter((p) => !taken.has(p.id));
    const bunny = ctx.actors.find((a) => a.key === key)!;
    const pool = rims.length ? rims : all;
    const rim = pool.reduce((best, p) => (Math.abs(p.x - bunny.spot.x) < Math.abs(best.x - bunny.spot.x) ? p : best), pool[0]!);
    // Up on the pot's rim at its edge, stretched tall and leaning in, nose to the lowest leaves.
    const side = bunny.spot.x >= rim.x ? 1 : -1;
    const x = rim.x + side * rim.w * BUNNY_ON_RIM;
    const spot: PetSpot = { x, depth: rim.depth, y: rim.y, pose: 'sit', facing: side > 0 ? 'left' : 'right', asleep: false, perch: 'rim', perchId: rim.id, reach: true, z: rim.z + 3 };
    return new Map([[key!, spot]]);
  },
};

/** How far out from the pot's middle the rabbit stands on the rim, as a share of the rim's width. */
const BUNNY_ON_RIM = 0.4;

export const VIGNETTES: Vignette[] = [catOnCow, duckLine, napPile, bunnyLeaf];

export function registerVignette(v: Vignette): void {
  const i = VIGNETTES.findIndex((x) => x.id === v.id);
  if (i >= 0) VIGNETTES[i] = v;
  else VIGNETTES.push(v);
}

export function vignetteById(id: string): Vignette | undefined {
  return VIGNETTES.find((v) => v.id === id);
}

/** The first vignette that can play now (and passes its chance, given `roll` 0…1), with its cast. */
export function findVignette(ctx: VignetteContext, roll = 0): { vignette: Vignette; cast: string[] } | null {
  for (const v of VIGNETTES) {
    if (v.ready && !v.ready()) continue;
    const cast = v.cast(ctx);
    if (cast && roll <= v.weight) return { vignette: v, cast };
  }
  return null;
}
