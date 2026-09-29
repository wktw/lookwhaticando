import type { ComponentChildren, JSX } from 'preact';
import type { WearCtx, WearableArt } from '../pets/types';
import type { WearableSlot } from '@/catalog/types';
import { fmt } from '../pets/shape';

/**
 * Shared plumbing for wearables: small real objects in the same flat, outline-free language as
 * the pets (DESIGN §10.4). Head items are drawn for a 20-unit crown with the origin where the
 * item meets the head; face items for eyes 14 units apart; neck items for a collar 10 units each
 * side of the throat; body items in the canonical body frame. Each item also draws its icon.
 */

/** Real-object colours (the tokens' pastel families, deepened where an object needs it). */
export const C = {
  cream: '#FBF4E8',
  /** Cream wool: a step warmer than paper, so it still reads on a white coat. */
  wool: '#F0E1C6',
  woolDeep: '#D9C4A0',
  oat: '#E9DCC6',
  linen: '#EEDDB9',
  linenDeep: '#D9C193',
  blush: '#EFB4C1',
  blushDeep: '#DE8FA2',
  rose: '#E07F8F',
  butter: '#F2D98A',
  straw: '#E7CB86',
  strawDeep: '#D4B06A',
  sage: '#B5CC9C',
  sageDeep: '#8FAE7E',
  leaf: '#8DB07A',
  leafDeep: '#6F9463',
  mint: '#A9D3C0',
  sky: '#B3D1E8',
  denim: '#8FA9C8',
  lavender: '#C8BAE6',
  lavenderDeep: '#A898D0',
  lilac: '#DDB6DA',
  navy: '#3F4A6E',
  red: '#D8625E',
  redDeep: '#B94E4C',
  rust: '#C8734A',
  mustard: '#E0B04F',
  pumpkin: '#E39A55',
  brass: '#D8B769',
  brassDeep: '#B8954A',
  silver: '#C9CDD4',
  silverDeep: '#A3A9B3',
  leather: '#9A6B4E',
  leatherDeep: '#7E5540',
  heather: '#B3ADB6',
  ink: '#3B3236',
  paper: '#FFFDF9',
  white: '#FFFFFF',
} as const;

/** The shade for wear: the same lavender ink as the pets' crescents. */
export const SHADE = 'var(--shade)';

/** +1 when the shade falls on the right (light from the left), −1 when it falls left, 0 from above. */
export const shadeDir = (ctx: WearCtx) => (ctx.light.from === 'left' ? 1 : ctx.light.from === 'right' ? -1 : 0);

/** A shade shape authored for the right-hand side, mirrored or dropped to follow the light. */
export function Shade({ ctx, d, under }: { ctx: WearCtx | null; d: string; under?: string }) {
  const dir = ctx ? shadeDir(ctx) : 1;
  if (dir === 0) return under ? <path d={under} fill={SHADE} /> : null;
  return <path d={d} fill={SHADE} transform={dir < 0 ? 'scale(-1 1)' : undefined} />;
}

const t = (x: number, y: number, s = 1, r = 0) => `translate(${fmt(x)} ${fmt(y)})${r ? ` rotate(${fmt(r)})` : ''}${s !== 1 ? ` scale(${fmt(s)})` : ''}`;

/** Places a head item on the crown. */
export function AtHat({ ctx, children, s = 1, dx = 0, dy = 0, r = 0 }: { ctx: WearCtx; children: ComponentChildren; s?: number; dx?: number; dy?: number; r?: number }) {
  const h = ctx.head.hat;
  const k = h.w / 20;
  return <g transform={t(h.x + dx * k, h.y + dy * k, k * s, h.r + r)}>{children}</g>;
}

/** Places a clip or a sprig by the far ear. */
export function AtEar({ ctx, children, s = 1 }: { ctx: WearCtx; children: ComponentChildren; s?: number }) {
  const e = ctx.head.ear;
  return <g transform={t(e.x, e.y, (ctx.head.hat.w / 20) * s, e.r)}>{children}</g>;
}

/** Places face wear on the eye line. */
export function AtEyes({ ctx, children }: { ctx: WearCtx; children: ComponentChildren }) {
  const e = ctx.head.eyes;
  return <g transform={t((e.left + e.right) / 2, e.y, (e.right - e.left) / 14)}>{children}</g>;
}

/**
 * Scales a collar-frame item to this neck. Anything hanging `hang` units below the collar line is
 * shortened (never below 60%) so a bandana tip or a bell stops above the floor on a low-slung pet.
 */
export function AtNeck({ ctx, children, hang = 0 }: { ctx: WearCtx; children: ComponentChildren; hang?: number }) {
  const s = ctx.neck.w / 10;
  const k = hang > 0 ? Math.max(0.6, Math.min(1, ctx.neck.drop / hang)) : 1;
  return <g transform={k < 1 ? `scale(${fmt(s)} ${fmt(s * k)})` : `scale(${fmt(s)})`}>{children}</g>;
}

/** The icon canvas placement for an item drawn in its wearing frame. */
export const Icon = ({ at, children }: { at: string; children: ComponentChildren }) => <g transform={at}>{children}</g>;

/** A flat-lay garment outline for body-wear icons: a small sweater, seen from the front. */
export const GARMENT = 'M36 22C40 26 46 28 50 28C54 28 60 26 64 22L80 30L88 50L78 54L74 46V82C66 86 34 86 26 82V46L22 54L12 50L20 30Z';
export const GARMENT_NECK = 'M36 22C40 26 46 28 50 28C54 28 60 26 64 22L61 21C58 24 54 25 50 25C46 25 42 24 39 21Z';

interface Spec {
  slot: WearableSlot;
  /** Draws the item in its wearing frame (see the file comment). */
  draw: (ctx: WearCtx | null) => JSX.Element;
  /** Head items: where it goes. */
  at?: 'hat' | 'ear' | 'eyes';
  front?: boolean;
  hideIn?: WearableArt['hideIn'];
  hood?: WearableArt['hood'];
  /** Icon placement of the wearing-frame drawing on the 100×100 icon canvas. */
  icon: string | (() => JSX.Element);
  /** Neck items: how far the item hangs below the collar line, in collar units. */
  hang?: number;
}

/** Builds a WearableArt from a drawing in its wearing frame. */
export function item(spec: Spec): WearableArt {
  const render = (ctx: WearCtx) => {
    const art = spec.draw(ctx);
    if (spec.slot === 'neck')
      return (
        <AtNeck ctx={ctx} hang={spec.hang}>
          {art}
        </AtNeck>
      );
    if (spec.slot === 'body') return art;
    if (spec.at === 'ear') return <AtEar ctx={ctx}>{art}</AtEar>;
    if (spec.at === 'eyes' || spec.slot === 'face') return <AtEyes ctx={ctx}>{art}</AtEyes>;
    return <AtHat ctx={ctx}>{art}</AtHat>;
  };
  const icon = typeof spec.icon === 'string' ? () => <Icon at={spec.icon as string}>{spec.draw(null)}</Icon> : spec.icon;
  return { slot: spec.slot, render, icon, front: spec.front, hideIn: spec.hideIn, hood: spec.hood };
}
