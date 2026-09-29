import type { Species } from '@/catalog/types';
import type { Pose } from './types';
import type { Tone } from './palette';
import { fmt, tube, type P } from './shape';

/**
 * The rig: every species is static shape data per pose, drawn facing right on a 100×100 canvas
 * with the feet on y = 94. The head is drawn once in its own frame (origin at its centre) and
 * placed per pose, so head markings, faces and hats fit every posture exactly. The torso carries
 * a canonical frame (0–100 along the spine from rump to chest, 0–100 from back to belly) for
 * coat markings and body wear. The offline crescent generator reads the same data.
 */

export const BASELINE = 94;

/** A flat shape in one of the look's tones. */
export interface Layer {
  d: string;
  tone: Tone;
  /** The paw end of a leg, painted in the sock tone when the coat has socks. */
  sock?: string;
  /** Paint the paw end in this tone always (a cow's hoof), rather than only for socks. */
  sockTone?: Tone;
  /** Animation hook (see pet.css). */
  cls?: string;
  /** Gets its own crescent (near legs, so a white leg still reads against white paper). */
  lit?: boolean;
  /**
   * The leg below the elbow. When set, the whole shape is painted a step between the coat and the
   * leg tone and only this part in the leg tone, so a colourpoint's sitting foreleg reads as a
   * leg against the chest, darkening from the elbow down. Invisible when the legs are the coat colour.
   */
  lower?: string;
}

export interface Placement {
  x: number;
  y: number;
  /** Uniform scale of the head frame. */
  s: number;
  /** Tilt in degrees (positive = clockwise). */
  r?: number;
}

/**
 * The canonical body frame. (0, 0) is the rump end of the back; u runs along the spine toward
 * the chest for `w` units at angle `a` (degrees, 0 = pointing right), v runs from the back to the
 * belly for `h` units, perpendicular to u.
 */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  a?: number;
}

export interface TailRig {
  d: string;
  /** The tip, drawn in the tip tone and clipped to the tail (or, with `tuft`, standing proud of it). */
  tip: string;
  /** A band just before the tip, drawn half-way between the tail and tip tones, so the tip darkens in one step. */
  fade?: string;
  /** A cow's tuft is wider than the tail, so it is not clipped. */
  tuft?: boolean;
  /** Tabby rings across the tail, clipped to it. */
  rings?: string;
  /** Where the tail joins the body: the flick rotates about this point. */
  pivot: P;
  /** Behind the torso, over it, or over the head (a tail across the nose). */
  layer: 'back' | 'front' | 'over';
  /** False for a thin tail (a cow's) that needs no crescent. */
  lit?: boolean;
  /**
   * The flicking end of the tail, as its own piece: its shape (from the joint, with a round cap
   * back into the tail), the joint it pivots on, and `cut`, everything past the joint, from which
   * the generator splits the tail and its crescents in two.
   */
  end?: { d: string; pivot: P; cut: string };
}

export interface PoseRig {
  /** Torso outline. */
  body: string;
  frame: Frame;
  head: Placement;
  /** Behind the torso: far legs, a far wing. */
  back?: Layer[];
  /** Over the torso: near legs, paws, a near wing. */
  front?: Layer[];
  /** Walk only: the second key frame's legs (the first frame is `back` / `front`). */
  frameB?: { back?: Layer[]; front?: Layer[] };
  tail?: TailRig;
  /** The tail for breeds whose tail curls over the back (Shiba, Pomeranian, Samoyed). */
  tailCurl?: TailRig;
  /** Contact shadow centre and half-width on the baseline. */
  contact: { cx: number; rx: number };
  /** Collar line: centre, half-width, tilt (degrees). */
  neck: { x: number; y: number; w: number; r: number };
  /** The eyes are closed in this pose whatever the expression (sleep). */
  eyesClosed?: boolean;
  /** Walk only: the body's rhythm (a cow's one-unit bob, a duck's waddle, a cat's two-stage hop). */
  motion?: 'bob' | 'waddle' | 'hop';
  /** Crescent depth for the torso (default 4.2) and the tail (default 2.2), in canvas units. */
  depth?: { body?: number; tail?: number };
  /**
   * The pale chest and belly: the torso minus itself shifted by this vector, a crescent hugging
   * the front and underside. Defaults per pose (see crescents/jobs.ts); null for none.
   */
  chest?: readonly [number, number] | null;
}

/** Head-frame anchors, used by the face and by head and face wear. */
export interface HeadAnchors {
  /** The head outline in its own frame (origin at the head centre). */
  d: string;
  /** Where a hat sits: the centre of the crown, the usable width, a tilt. */
  hat: { x: number; y: number; w: number; r: number };
  eyes: { y: number; left: number; right: number; r: number };
  /** The nose (or bill tip, or muzzle centre). */
  nose: P;
  /** A clip or bow goes here (near the base of the far ear). */
  ear: { x: number; y: number; r: number };
  /** The highest point of ears, horns or crest in the head frame (for fitting the pet to a tile). */
  top: number;
  /** How far ears or horns reach out to either side of the head frame's centre, when past the head. */
  wide?: number;
}

export interface SpeciesRig {
  species: Species;
  /** Size relative to the canvas (a cow fills it; a hamster is small). */
  scale: number;
  head: HeadAnchors;
  poses: Record<Pose, PoseRig>;
}

/* ---------------------------------------------------------------- builders */

/** Walks `frac` of the way along a polyline; returns the point and the direction there. */
function along(spine: readonly P[], frac: number): { p: P; dir: P } {
  const lens = spine.slice(1).map((q, i) => Math.hypot(q[0] - spine[i]![0], q[1] - spine[i]![1]));
  let d = frac * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    const a = spine[i]!;
    const b = spine[i + 1]!;
    if (d <= lens[i]! || i === lens.length - 1) {
      const t = Math.min(1, d / lens[i]!);
      const len = lens[i]! || 1;
      return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], dir: [(b[0] - a[0]) / len, (b[1] - a[1]) / len] };
    }
    d -= lens[i]!;
  }
  return { p: spine[spine.length - 1]!, dir: [1, 0] };
}

/**
 * A tail along a spine, tapering from `w0` to `w1`. Its tip is a short capsule over the end, so
 * its edge across the tail reads as a rounded cap (not a square-cut block), with a half-tone band
 * before it, and three tabby rings sit across it; both are clipped to the tail when drawn. With `joint`, the last part of the tail
 * past that fraction of its length is also given as its own piece, so a tip flick moves only it.
 */
export function tailRig(spine: readonly P[], w0: number, w1: number, pivot: P, layer: TailRig['layer'], tipFrac = 0.28, joint?: number): TailRig {
  const total = spine.slice(1).reduce((n, q, i) => n + Math.hypot(q[0] - spine[i]![0], q[1] - spine[i]![1]), 0);
  const end = spine[spine.length - 1]!;
  const rings = [0.42, 0.56, 0.7]
    .map((f) => {
      const { p, dir } = along(spine, f);
      const n: P = [-dir[1], dir[0]];
      const k = Math.max(w0, w1) * 1.2;
      return tube([[p[0] - n[0] * k, p[1] - n[1] * k], [p[0] + n[0] * k, p[1] + n[1] * k]], 2.3, 2.3);
    })
    .join('');
  // The tip is a short tube laid over the end of the tail: its round back cap makes the colour
  // boundary a rounded cap rather than a square-cut block.
  // The tip covers about the last 15% of the tail (with its round end), after a half-tone band.
  const len = Math.min(total * Math.min(tipFrac, 0.15), w1 * 1.2);
  const back = along(spine, Math.max(0, 1 - len / total)).p;
  const fade = along(spine, Math.max(0, 1 - (len * 2.3) / total)).p;
  const out: TailRig = {
    d: tube(spine, w0, w1),
    tip: tube([back, end], w1 * 1.2, w1 * 1.2),
    fade: tube([fade, end], w1 * 1.3, w1 * 1.3),
    rings,
    pivot,
    layer,
  };
  if (joint !== undefined) {
    const { p: j, dir } = along(spine, joint);
    const n: P = [-dir[1], dir[0]];
    const k = Math.max(w0, w1) * 3;
    const q = (a: number, b: number): string => `${fmt(j[0] + n[0] * a + dir[0] * b)} ${fmt(j[1] + n[1] * a + dir[1] * b)}`;
    // Everything past the joint (a band across the tail, reaching well beyond its end).
    const cut = `M${q(-k, 0)}L${q(k, 0)}L${q(k, total + 10)}L${q(-k, total + 10)}Z`;
    const wj = w0 + (w1 - w0) * joint;
    const rest = spine.filter((pt) => (pt[0] - j[0]) * dir[0] + (pt[1] - j[1]) * dir[1] > 0.5);
    out.end = { d: tube([j, ...rest], wj, w1), pivot: j, cut };
  }
  return out;
}

/** A leg as a soft tube from hip to paw, with its sock (the paw end). */
export function leg(spine: readonly P[], w0: number, w1: number, tone: Tone, sockLen = 5): Layer {
  return { ...legShape(spine, w0, w1, sockLen), tone, lit: tone === 'leg' };
}

function legShape(spine: readonly P[], w0: number, w1: number, sockLen: number) {
  const end = spine[spine.length - 1]!;
  const prev = spine[spine.length - 2]!;
  const len = Math.hypot(end[0] - prev[0], end[1] - prev[1]);
  const t = Math.min(1, sockLen / len);
  const from: P = [end[0] + (prev[0] - end[0]) * t, end[1] + (prev[1] - end[1]) * t];
  return { d: tube(spine, w0, w1), sock: tube([from, end], w1 + 0.4, w1 + 0.4) };
}

/** The SVG transform for the canonical body frame. */
export function frameTransform(fr: Frame): string {
  const a = fr.a ?? 0;
  return `translate(${fr.x} ${fr.y})${a ? ` rotate(${a})` : ''} scale(${(fr.w / 100).toFixed(4)} ${(fr.h / 100).toFixed(4)})`;
}

/* ---------------------------------------------------------------- light */

/** Directions toward each light position (unit vectors; y up is negative). */
export const TOWARD: Record<'left' | 'top' | 'right', P> = {
  left: [-0.8, -0.6],
  // A hair off vertical so vertical edges never sit exactly on their own offset copy.
  top: [0.05, -1],
  right: [0.8, -0.6],
};

export type ShadeKey = 'left' | 'right' | 'under';
export type LitKey = 'left' | 'right' | 'top';

/** The side the crescent falls on, for a light position (art frame, before any flip). */
export const SHADE_FOR: Record<LitKey, ShadeKey> = { left: 'right', top: 'under', right: 'left' };
