/**
 * Layout of the tabletop capsule cabinet (DESIGN §7.1), one parametric drawing themed per
 * series. The art, the window physics and the interactive pull share these coordinates, so a
 * capsule's physics position is also its SVG position.
 *
 *   y≈26–50    the enamel number plate ("No. 02")
 *   y=56–92    the printed series label in its sleeve (two-colour motif + name)
 *   y=100–222  the glass window: capsules tumble on its floor (y=217)
 *   y=228–286  the brass handle (left) and the coin or stamp slot with its price (right)
 *   y=286–316  the chute port with its hinged flap
 *   y=316–340  the darker plinth on two small brass feet, and the contact shadow
 */

export const VIEW_W = 240;
export const VIEW_H = 350;
export const VIEWBOX = `0 0 ${VIEW_W} ${VIEW_H}`;

/** Corner radii, clockwise from the top left. */
export type Radii = readonly [number, number, number, number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** One radius for every corner, or [top-left, top-right, bottom-right, bottom-left]. */
  r: number | Radii;
}

/** The painted tin body. */
export const BODY: Rect = { x: 34, y: 20, w: 172, h: 298, r: [18, 18, 4, 4] };
/** The darker plinth the body stands on. */
export const PLINTH: Rect = { x: 26, y: 316, w: 188, h: 20, r: 5 };
/** Two small brass feet under the plinth. */
export const FEET = { xs: [42, 180], y: 335, w: 18, h: 5 } as const;
export const GROUND_Y = 340;

/** The enamel number plate: a brass rim around cream enamel. */
export const PLATE: Rect = { x: 84, y: 26, w: 72, h: 24, r: 8 };
/** The printed series label, slid into a sleeve under the plate. */
export const LABEL: Rect = { x: 46, y: 56, w: 148, h: 36, r: 3 };
/** Where the two-colour print motif sits on the label (a 28-unit square). */
export const MOTIF = { x: 52, y: 60, size: 28 } as const;

/** The pressed-tin bezel around the window, and the glass inside it. */
export const BEZEL: Rect = { x: 40, y: 100, w: 160, h: 122, r: 10 };
export const GLASS: Rect = { x: 45, y: 105, w: 150, h: 112, r: 6 };
/** The physics box: capsules tumble inside the glass and rest on its floor. */
export const WINDOW_BOX = { left: GLASS.x, top: GLASS.y, right: GLASS.x + GLASS.w, bottom: GLASS.y + GLASS.h } as const;

/** The brass handle: a recessed dish, a dial, and a grip bar that turns. */
export const HANDLE = { cx: 90, cy: 256, dish: 28, dial: 22, gripW: 52, gripH: 13 } as const;
/** Grip angle at rest (degrees; 0 = the bar lies level). */
export const HANDLE_REST = -18;
/** Invisible hit area around the handle (a target far above 44 px at every cabinet size). */
export const HANDLE_HIT_R = 44;

/** The brass slot plate (a vertical slit for coins, a horizontal one for stamps). */
export const SLOT: Rect & { cx: number; cy: number } = { x: 152, y: 230, w: 26, h: 34, r: 5, cx: 165, cy: 247 };
/** The printed price chip under the slot. */
export const PRICE: Rect = { x: 145, y: 270, w: 40, h: 16, r: 8 };

/** The chute port: a pressed lip, the dark opening, and the flap hinged along its top. */
export const CHUTE_LIP: Rect = { x: 94, y: 285, w: 68, h: 31, r: [12, 12, 6, 6] };
export const CHUTE: Rect = { x: 99, y: 289, w: 58, h: 24, r: [8, 8, 4, 4] };
/** The flap covers the upper part of the opening when it hangs shut. */
export const FLAP_H = 17;
/** Where a dropped capsule rests in the port. */
export const CHUTE_REST = { x: 128, y: 301.5 } as const;

/** Capsule radius inside the window, and the one waiting in the chute. */
export const CAPSULE_R = 11.5;
export const CHUTE_CAPSULE_R = 10.5;
/** Capsules in a full window. */
export const CAPSULE_COUNT = 20;
/** Capsules leave through the floor above the chute. */
export const EXIT_X = CHUTE_REST.x;

/** A seasonal edition's paper tag hangs on a thread from a pin at the window's top right corner. */
export const TAG_PIN = { x: 193, y: 102.5 } as const;

/* ------------------------------------------------------------------ */

const f = (n: number) => +n.toFixed(2);

export function radii(r: Rect['r']): Radii {
  return typeof r === 'number' ? [r, r, r, r] : r;
}

/** A rounded rectangle path with per-corner radii. */
export function rectPath({ x, y, w, h, r }: Rect): string {
  const [tl, tr, br, bl] = radii(r);
  const x1 = x + w;
  const y1 = y + h;
  return [
    `M${f(x + tl)} ${f(y)}`,
    `H${f(x1 - tr)}`,
    tr ? `A${tr} ${tr} 0 0 1 ${f(x1)} ${f(y + tr)}` : '',
    `V${f(y1 - br)}`,
    br ? `A${br} ${br} 0 0 1 ${f(x1 - br)} ${f(y1)}` : '',
    `H${f(x + bl)}`,
    bl ? `A${bl} ${bl} 0 0 1 ${f(x)} ${f(y1 - bl)}` : '',
    `V${f(y + tl)}`,
    tl ? `A${tl} ${tl} 0 0 1 ${f(x + tl)} ${f(y)}` : '',
    'Z',
  ]
    .filter(Boolean)
    .join(' ');
}

/** A rect shrunk by `d` on every side (grown for negative d), keeping its corners concentric. */
export function inset(rect: Rect, d: number): Rect {
  const [tl, tr, br, bl] = radii(rect.r);
  const k = (v: number) => Math.max(0, v - d);
  return { x: rect.x + d, y: rect.y + d, w: rect.w - 2 * d, h: rect.h - 2 * d, r: [k(tl), k(tr), k(br), k(bl)] };
}
