/**
 * GROUND COORDINATES: the one placement system shared by the Meadow scene, its decor and
 * the Meadow screen's pets.
 *
 *   x  0 = left edge … 1 = right edge of the scene.
 *   y  0 = the far horizon line, where the meadow meets the fence … 1 = the front (bottom) edge.
 *      Negative y is the sky: -1 = top edge … 0 = horizon.
 *
 * Sizes are in MEADOW UNITS (see layout.ts): 1U = 1% of the scene height (a little less on tall
 * portrait scenes). All scene art scales with U, so a wider scene shows more meadow and nothing
 * is ever stretched. Things further back are drawn smaller (depth scale 0.7 at the horizon → 1.1
 * at the front) and stack behind nearer ones (zIndex grows with y). Sky placements are not
 * depth-scaled.
 */
import type { JSX } from 'preact';

/** The horizon line, as a fraction of the scene height from the top. */
export const HORIZON = 0.46;

/** Suggested pet height in meadow units (before depth scaling). */
export const PET_UNITS = 16;

const DEPTH_HORIZON = 0.7;
const DEPTH_FRONT = 1.1;

/** Depth scale at ground y: 0.7 at the horizon … 1.1 at the front edge, 1 in the sky. */
export function depthAt(y: number): number {
  if (y < 0) return 1;
  return DEPTH_HORIZON + (DEPTH_FRONT - DEPTH_HORIZON) * Math.min(1, y);
}

export interface GroundPoint {
  /** % of the scene width. */
  left: number;
  /** % of the scene height. */
  top: number;
  /** Depth scale, 0.7 (horizon) … 1.1 (front). 1 in the sky. */
  scale: number;
  zIndex: number;
}

/** Numeric placement for a ground point: handy for rAF loops that write styles directly. */
export function groundPoint(x: number, y: number): GroundPoint {
  if (y < 0) return { left: x * 100, top: HORIZON * (1 + Math.max(-1, y)) * 100, scale: 1, zIndex: 1 };
  const d = Math.min(1, y);
  return {
    left: x * 100,
    top: (HORIZON + d * (1 - HORIZON)) * 100,
    scale: depthAt(d),
    zIndex: 10 + Math.round(d * 1000),
  };
}

/** The ground point under a pointer, or null above the horizon. `rect` is the scene's box. */
export function pointToGround(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } | null {
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  if (fy < HORIZON || fx < 0 || fx > 1 || fy > 1) return null;
  return { x: fx, y: (fy - HORIZON) / (1 - HORIZON) };
}

export interface GroundStyleOptions {
  /** Element height in meadow units (before depth scaling). Width follows `aspect`. */
  size?: number;
  /** Width ÷ height of the element. Default 1 (square art canvases). */
  aspect?: number;
  /** The point of the element that sits on (x, y). Default: bottom-center on the ground, center in the sky. */
  anchor?: 'bottom' | 'center';
  /**
   * Keep the art in frame: the left and right edges of the drawing on its canvas (0…100 across).
   * The element slides inward just enough to keep them inside the scene. Needs `size`.
   */
  inside?: readonly [number, number];
  /** CSS length of one size unit: the meadow unit `var(--u)` (default), or `var(--du)` for decor. */
  unit?: string;
}

/** How far (in U) the art reaches left and right of its anchor, after depth scaling. */
function reach(y: number, size: number, aspect: number, inside: readonly [number, number]): [number, number] {
  const w = size * aspect * depthAt(y);
  return [(0.5 - inside[0] / 100) * w, (inside[1] / 100 - 0.5) * w];
}

/**
 * The ground x where an element placed with `groundToStyle(x, y, { size, inside })` actually
 * stands, in a scene of aspect `sceneAspect` (width ÷ height) whose size unit is `unit` % of its
 * height (see `unitScale` / `decorUnitScale` in layout.ts). `aspect` is the element's own.
 */
export function insideX(x: number, y: number, size: number, inside: readonly [number, number], sceneAspect: number, unit: number, aspect = 1): number {
  const [l, r] = reach(y, size, aspect, inside);
  const toX = (u: number) => (u * unit) / 100 / sceneAspect;
  return Math.max(toX(l), Math.min(1 - toX(r), x));
}

/**
 * Absolute-position CSS for an element standing at ground point (x, y) inside a scene.
 * Uses the individual `translate`/`scale` properties, so `transform` stays free for the
 * caller's own motion (hops, flips) and is applied on top of the depth scale.
 */
export function groundToStyle(x: number, y: number, opts: GroundStyleOptions = {}): JSX.CSSProperties {
  const p = groundPoint(x, y);
  const center = (opts.anchor ?? (y < 0 ? 'center' : 'bottom')) === 'center';
  const unit = opts.unit ?? 'var(--u)';
  let left = `${p.left}%`;
  if (opts.size != null && opts.inside) {
    const [l, r] = reach(y, opts.size, opts.aspect ?? 1, opts.inside);
    left = `clamp(${l.toFixed(2)} * ${unit}, ${left}, 100% - ${r.toFixed(2)} * ${unit})`;
  }
  const style: JSX.CSSProperties = {
    position: 'absolute',
    left,
    top: `${p.top}%`,
    zIndex: p.zIndex,
    translate: center ? '-50% -50%' : '-50% -100%',
    scale: String(p.scale),
    transformOrigin: center ? '50% 50%' : '50% 100%',
  };
  if (opts.size != null) {
    style.height = `calc(${opts.size} * ${unit})`;
    style.aspectRatio = String(opts.aspect ?? 1);
  }
  return style;
}
