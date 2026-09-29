/**
 * Shared layout of every capsule machine (one parametric gumball machine, themed per series).
 * The art, the dome physics and the interactive pull all use these coordinates, so a capsule's
 * physics position is also its SVG position.
 *
 *   y≈8–58    topper motif + dome cap
 *   y=44–212  glass globe (center 120,128), its bottom hidden by the collar
 *   y=196–214 collar with the price plate
 *   y=210–306 body: decal · crank · coin slot, chute below
 *   y≈306–318 two little mochi feet; the capsule rolls out onto the ground in front
 */

export const VIEW_W = 240;
export const VIEW_H = 350;
export const VIEWBOX = `0 0 ${VIEW_W} ${VIEW_H}`;

export const OUTLINE = '#5A3E45';
/** Outline width: matches the pets' 2.4 / 100 at the sizes machines are shown. */
export const STROKE = 2.8;

export const DOME = { cx: 120, cy: 128, r: 86 } as const;
/** Glass thickness: capsules live inside this radius. */
export const DOME_INNER = DOME.r - 4;
/** Capsules rest on this line (just inside the collar's top edge). */
export const DOME_FLOOR = 200;

export const CAP = { cx: 120, top: 30, bottom: 54, halfWidth: 38 } as const;
export const COLLAR = { x: 56, y: 194, w: 128, h: 22, r: 11 } as const;
export const BODY = { top: 208, bottom: 306, halfTop: 70, halfBottom: 80, r: 22 } as const;

export const CRANK = { cx: 120, cy: 244, r: 24 } as const;
/** Handle angle at rest (degrees; 0 = knob straight up). */
export const CRANK_REST = 35;
/** Invisible hit area around the crank (touch target ≫ 44px at every machine size). */
export const CRANK_HIT_R = 42;
export const SLOT = { cx: 168, cy: 240, w: 18, h: 30 } as const;
export const DECAL = { cx: 72, cy: 240 } as const;
export const CHUTE = { cx: 120, cy: 286, w: 48, h: 26 } as const;
export const FEET = { y: 311, dx: 44, rx: 17, ry: 8 } as const;
export const GROUND_Y = 318;

/** Capsule radius inside the dome, and the rolled-out capsule. */
export const CAPSULE_R = 14;
export const OUT_CAPSULE_R = 17;
/** Where the dropped capsule comes to rest. */
export const REST = { x: 150, y: 344 - OUT_CAPSULE_R } as const;

export const CAPSULE_COUNT = 20;

/** Rounded trapezoid body path. */
export function bodyPath(): string {
  const { top, bottom, halfTop, halfBottom, r } = BODY;
  const l0 = 120 - halfTop;
  const r0 = 120 + halfTop;
  const l1 = 120 - halfBottom;
  const r1 = 120 + halfBottom;
  return [
    `M${l0 + r} ${top}`,
    `L${r0 - r} ${top}`,
    `Q${r0} ${top} ${r0 + 1.5} ${top + r}`,
    `L${r1 - 0.5} ${bottom - r}`,
    `Q${r1} ${bottom} ${r1 - r} ${bottom}`,
    `L${l1 + r} ${bottom}`,
    `Q${l1} ${bottom} ${l1 + 0.5} ${bottom - r}`,
    `L${l0 - 1.5} ${top + r}`,
    `Q${l0} ${top} ${l0 + r} ${top}`,
    'Z',
  ].join(' ');
}

/** The dome cap: a soft half-dome sitting on the globe. */
export function capPath(): string {
  const { cx, top, bottom, halfWidth: w } = CAP;
  return `M${cx - w} ${bottom} C${cx - w} ${top + 4} ${cx - w * 0.55} ${top} ${cx} ${top} C${cx + w * 0.55} ${top} ${cx + w} ${top + 4} ${cx + w} ${bottom} Z`;
}
