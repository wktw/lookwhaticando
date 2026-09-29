/**
 * SCENE LAYOUT: where the Meadow's fixed scenery stands, written once and used twice: rendered
 * to CSS (so the scene lays itself out at any size with no JS) and evaluated in JS (so default
 * decor positions and the pets' map agree with what is drawn).
 *
 * Lengths are measured in MEADOW UNITS (U). 1U = 1% of the scene height, shrinking to 0.8% on
 * tall portrait scenes (narrower than 0.7 : 1) so they gain sky and grass instead of cropping art.
 * Inside the scene the unit is the CSS variable `--u`. Horizontal positions mix the scene width
 * and U: a tree hugs the left edge, a gate sits halfway along the fence, and so on.
 */

/** Aspect (width ÷ height) at and above which 1U is exactly 1% of the height. */
const BASE_ASPECT = 0.7;
/** The unit never shrinks below this share of 1% of the height. */
const MIN_UNIT = 0.8;

/** Decor shrinks to this share of U at the base aspect, so pets keep their room on phones. */
const DECOR_NARROW = 0.85;

/** The meadow unit as a CSS length; the scene sets it as `--u`. */
export const UNIT_CSS = `clamp(${MIN_UNIT}cqh, ${+(1 / BASE_ASPECT).toFixed(4)}cqw, 1cqh)`;
/** The decor unit: U on wide scenes, a little less on narrow ones. The scene sets it as `--du`. */
export const DECOR_UNIT_CSS = `min(var(--u), ${+(DECOR_NARROW / BASE_ASPECT).toFixed(4)}cqw)`;

/** 1U for a scene of this aspect, in % of its height (0.8 … 1). */
export function unitScale(aspect: number): number {
  return Math.min(1, Math.max(MIN_UNIT, aspect / BASE_ASPECT));
}

/** One decor unit for a scene of this aspect, in % of its height. */
export function decorUnitScale(aspect: number): number {
  return Math.min(unitScale(aspect), (DECOR_NARROW * aspect) / BASE_ASPECT);
}

/** A horizontal length or position: `at(aspect)` in scene heights, `css` for inline styles. */
export interface Len {
  at: (aspect: number) => number;
  css: string;
}

/** `w` scene widths plus `u` meadow units. */
export function len(w: number, u: number): Len {
  return {
    at: (a) => w * a + (u * unitScale(a)) / 100,
    css: `calc(${+(w * 100).toFixed(3)}cqw + ${+u.toFixed(3)} * var(--u))`,
  };
}

export function plus(a: Len, b: Len): Len {
  return { at: (x) => a.at(x) + b.at(x), css: `calc(${a.css} + ${b.css})` };
}

/** The point `t` of the way from `a` to `b`. */
export function mix(a: Len, b: Len, t: number): Len {
  return { at: (x) => a.at(x) * (1 - t) + b.at(x) * t, css: `calc(${a.css} * ${1 - t} + ${b.css} * ${t})` };
}

export function clampLen(lo: Len, v: Len, hi: Len): Len {
  return { at: (x) => Math.min(hi.at(x), Math.max(lo.at(x), v.at(x))), css: `clamp(${lo.css}, ${v.css}, ${hi.css})` };
}

/** A Len as a ground x (0 = left edge … 1 = right edge). */
export function groundX(l: Len, aspect: number): number {
  return l.at(aspect) / aspect;
}

/* ── Landmarks ─────────────────────────────────────────────────────────────────────────── */

/**
 * The big tree's box (70U wide, 100U tall, canvas 700×1000 with its trunk on the horizon).
 * On narrow portrait scenes it slides partly out of frame so the meadow keeps its room; on
 * wide ones it steps a little inward.
 */
export const TREE_LEFT = clampLen(len(0, -24), len(0.46, -41), len(0, 4));
/** A point on the tree canvas (x in canvas units, 0…700). */
export const onTree = (x: number): Len => plus(TREE_LEFT, len(0, x / 10));
/** Right end of the swing: nothing tall should stand left of this at the back. */
export const SWING_END = onTree(390);

/**
 * The land (hills, cottage, meadow floor, path, fence and gate) is one wide canvas centred on
 * the scene, 10 canvas units to 1U, its horizon at canvas y = 460.
 */
export const LAND_CENTER = 3000;
/** A point on the land canvas (x in canvas units). */
export const onLand = (x: number): Len => len(0.5, (x - LAND_CENTER) / 10);

/** The garden gate in the fence (with the cottage on the hill behind it), where the path ends. */
export const GATE_X = 3150;
export const GATE = onLand(GATE_X);
/** Half the gate's width (posts included), in meadow units. */
export const GATE_HALF = 5.5;
/** Where the path meets the front edge. */
export const PATH_FRONT = onLand(3040);

/** Where the open sky begins: the right edge of the big tree's canopy. */
export const OPEN_SKY = onTree(400);
/** A point `t` of the way across the open sky, from the canopy to the right edge. */
export const openSky = (t: number): Len => mix(OPEN_SKY, len(1, 0), t);
/**
 * Sky decor keeps to the left of the open sky (a rainbow rises here; balloons float here from
 * the branch tip), so the sun and moon keep to the right of it.
 */
export const RAINBOW_SKY = openSky(0.26);

/** A height in the scene: `pct` % of the scene height plus `u` meadow units (CSS `top`). */
export function top(pct: number, u: number): string {
  return `calc(${pct}% + ${u} * var(--u))`;
}
