import type { Outfit } from '@/state/types';
import { WEARABLE_ART } from '../wearables';
import type { WearableArt, WearCtx } from './types';
import type { DrawCtx } from './species/art';
import { place } from './shape';

/**
 * Where wearables go on a pet. Head and face wear draw in the head frame (so they follow every
 * pose and tilt), neck wear in a collar frame at the pose's neck line, and body wear in the
 * canonical body frame, clipped to the torso by PetArt.
 */

export function wearCtxFor(c: DrawCtx): WearCtx {
  const h = c.rig.head;
  return {
    species: c.look.species,
    pose: c.pose,
    light: { from: c.lit, night: c.night },
    uid: c.uid,
    head: { hat: h.hat, eyes: h.eyes, ear: h.ear },
    neck: { w: c.p.neck.w },
    body: { aspect: c.p.frame.w / c.p.frame.h },
  };
}

/** Head and face wear. Face wear always sits in front; `front` picks the head layer (hats behind ears or clips in front). */
export function WearHead({ outfit, ctx, front }: { outfit: Outfit; ctx: WearCtx; front: boolean }) {
  const items: WearableArt[] = [];
  const face = outfit.face ? WEARABLE_ART[outfit.face] : undefined;
  const head = outfit.head ? WEARABLE_ART[outfit.head] : undefined;
  if (!front && face) items.push(face);
  if (head && !!head.front === front && !head.hideIn?.includes(ctx.pose)) items.push(head);
  if (!items.length) return null;
  return (
    <>
      {items.map((w, i) => (
        <g key={i} class={`pet-wear pet-wear-${w.slot}`}>
          {w.render(ctx)}
        </g>
      ))}
    </>
  );
}

export function WearNeck({ id, ctx, neck }: { id: string; ctx: WearCtx; neck: { x: number; y: number; r: number } }) {
  const w = WEARABLE_ART[id];
  if (!w || w.hideIn?.includes(ctx.pose)) return null;
  return (
    <g class="pet-wear pet-wear-neck" transform={place(neck.x, neck.y, 1, neck.r)}>
      {w.render(ctx)}
    </g>
  );
}

export function WearBody({ art, ctx }: { art: WearableArt; ctx: WearCtx }) {
  return <g class="pet-wear pet-wear-body">{art.render(ctx)}</g>;
}
