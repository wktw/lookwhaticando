/**
 * GROUND COORDINATES: the one placement system shared by the Meadow scene, its decor and
 * the Meadow screen's pets.
 *
 *   x  0 = left edge … 1 = right edge of the scene.
 *   y  0 = the far horizon line, where the meadow meets the hills … 1 = the front (bottom) edge.
 *      Negative y is the sky: -1 = top edge … 0 = horizon.
 *
 * Sizes are in MEADOW UNITS: 1 unit = 1% of the scene height. All scene art scales with the
 * height, so a wider scene simply shows more meadow and nothing is ever stretched.
 * Things further back are drawn smaller (depth scale 0.7 at the horizon → 1.1 at the front)
 * and stack behind nearer ones (zIndex grows with y). Sky placements are not depth-scaled.
 */
import type { JSX } from 'preact';
import type { DecorSlot } from '@/catalog/types';

/** The horizon line, as a fraction of the scene height from the top. */
export const HORIZON = 0.46;

/** Suggested pet height in meadow units (before depth scaling). */
export const PET_UNITS = 16;

const DEPTH_NEAR = 0.7;
const DEPTH_FAR = 1.1;

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
    scale: DEPTH_NEAR + (DEPTH_FAR - DEPTH_NEAR) * d,
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
}

/**
 * Absolute-position CSS for an element standing at ground point (x, y) inside a scene.
 * Uses the individual `translate`/`scale` properties, so `transform` stays free for the
 * caller's own motion (hops, flips) and is applied on top of the depth scale.
 */
export function groundToStyle(x: number, y: number, opts: GroundStyleOptions = {}): JSX.CSSProperties {
  const p = groundPoint(x, y);
  const center = (opts.anchor ?? (y < 0 ? 'center' : 'bottom')) === 'center';
  const style: JSX.CSSProperties = {
    position: 'absolute',
    left: `${p.left}%`,
    top: `${p.top}%`,
    zIndex: p.zIndex,
    translate: center ? '-50% -50%' : '-50% -100%',
    scale: String(p.scale),
    transformOrigin: center ? '50% 50%' : '50% 100%',
  };
  if (opts.size != null) {
    style.height = `${opts.size}%`;
    style.aspectRatio = String(opts.aspect ?? 1);
  }
  return style;
}

/**
 * Where each decor slot sits by default. Back items stand in front of the big tree / fence,
 * ground items keep clear of the stepping-stone path and leave room for pets to roam, and sky
 * items float up high.
 */
export const DECOR_DEFAULT_POS: Record<DecorSlot, { x: number; y: number }> = {
  'back-left': { x: 0.19, y: 0.12 },
  'back-right': { x: 0.78, y: 0.05 },
  'ground-left': { x: 0.17, y: 0.48 },
  'ground-center': { x: 0.4, y: 0.7 },
  'ground-right': { x: 0.84, y: 0.42 },
  sky: { x: 0.66, y: -0.66 },
};
