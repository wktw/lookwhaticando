import type { JSX } from 'preact';
import type { ArtCtx, WearableArt } from '../pets/types';
import { ANCHORS, BODY_PATH, OUTLINE, STROKE, bodyHalfWidthAt } from '../pets/geometry';
import { headTransform } from '../pets/placement';

/**
 * Shared wearable plumbing. Head items are drawn once in head-local coordinates and placed on
 * any species via placement.ts; neck and face items draw from ctx anchors; body items draw a
 * "fabric" from the body-wear line down (PetArt clips it to the silhouette) and reuse the same
 * fabric inside a flat-lay garment for their icon.
 */

export const INK = OUTLINE;
export const SW = STROKE;

interface HeadItemOptions {
  /** Placement on the pet (canvas units / degrees / relative scale). */
  dx?: number;
  dy?: number;
  rotate?: number;
  scale?: number;
  /** Icon placement: the head-local origin lands at (iconX, iconY), scaled by iconScale. */
  iconX?: number;
  iconY?: number;
  iconScale?: number;
  iconRotate?: number;
  /** Sit in front of ears and horns (see WearableArt.overEars). */
  overEars?: boolean;
}

/** A head item drawn in head-local coordinates: (0, 0) is the top-center of the head, 40 wide. */
export function headItem(draw: (uid: string) => JSX.Element, o: HeadItemOptions = {}): WearableArt {
  return {
    overEars: o.overEars,
    render: (ctx) => <g transform={headTransform(ctx.anchors, o)}>{draw(ctx.uid)}</g>,
    icon: () => <g transform={`translate(${o.iconX ?? 50} ${o.iconY ?? 62}) rotate(${o.iconRotate ?? 0}) scale(${o.iconScale ?? 1.8})`}>{draw('icon')}</g>,
  };
}

/** A generic cat-sized context for drawing neck and face items as icons, centered and large. */
export const ICON_CTX: ArtCtx = {
  uid: 'icon',
  bodyClip: 'none',
  expression: 'idle',
  anchors: {
    ...ANCHORS.cat,
    eyes: { y: 50, left: 39.5, right: 60.5 },
    mouth: { x: 50, y: 50 },
    neck: { y: 36, left: 20, right: 80 },
    body: { top: 36, bottom: 93 },
  },
  body: { path: BODY_PATH, halfWidthAt: (y) => (y < 30 ? bodyHalfWidthAt(y) : 30) },
  look: { species: 'cat', pattern: 'none', palette: { body: '#FFFFFF', earInner: '#FFC4D3', nose: '#F58CAA' } },
};

/** Icon for face/neck items: render on the icon context, optionally zoomed around (50, 50). */
export function ctxIcon(render: WearableArt['render'], zoom = 1, dy = 0) {
  return () => <g transform={`translate(50 ${50 + dy}) scale(${zoom}) translate(-50 -50)`}>{render(ICON_CTX)}</g>;
}

/** Flat-lay sweater silhouette (with sleeves) used for body-wear icons. Neckline dips at y≈26. */
export const TOP_PATH =
  'M31 21 C37 25.5 44 27 50 27 C56 27 63 25.5 69 21 L85.6 30.6 C87.6 31.8 88.2 34 87.2 36 L80.4 49.4 L71.6 45.8 L72 81 C72 84 70 86 67 86 L33 86 C30 86 28 84 28 81 L28.4 45.8 L19.6 49.4 L12.8 36 C11.8 34 12.4 31.8 14.4 30.6 Z';

/**
 * Icon for body wear: the garment's fabric clipped into a flat-lay silhouette, outlined,
 * with ribbed cuffs and hem. `extra` draws details on top (pockets, buttons).
 */
export function garmentIcon(id: string, fabric: (top: number) => JSX.Element, opts: { path?: string; rib?: string; extra?: JSX.Element } = {}) {
  const path = opts.path ?? TOP_PATH;
  return () => (
    <g stroke-linejoin="round" stroke-linecap="round">
      <clipPath id={`wi-${id}`}>
        <path d={path} />
      </clipPath>
      <g clip-path={`url(#wi-${id})`}>
        {fabric(22)}
        {opts.rib && (
          <g fill="none" stroke={opts.rib} stroke-width={3.4}>
            <path d="M29 84.4 L71 84.4" />
            <path d="M31 22.6 C37 27 44 28.6 50 28.6 C56 28.6 63 27 69 22.6" />
            <path d="M12.6 35.6 L20 49" />
            <path d="M87.4 35.6 L80 49" />
          </g>
        )}
      </g>
      <path d={path} fill="none" stroke={INK} stroke-width={SW} />
      {opts.extra}
    </g>
  );
}

/** A body-wear neckline: ribbed collar band following the body-wear top line. */
export function Neckline({ top, color, dip = 7 }: { top: number; color: string; dip?: number }) {
  return (
    <g fill="none">
      <path d={`M0 ${top} Q50 ${top + dip} 100 ${top}`} stroke={color} stroke-width={5} />
      <path d={`M0 ${top - 2.2} Q50 ${top + dip - 2.2} 100 ${top - 2.2}`} stroke={INK} stroke-width={SW * 0.8} />
    </g>
  );
}
