import type { JSX } from 'preact';
import type { MachineDef } from '@/catalog/types';
import { STROKE } from '../geometry';
import { Face } from '../parts';

/**
 * Per-series dressing (DESIGN §6.2): each machine is the same gumball machine wearing its
 * own topper and decals. Layers, back to front:
 *   back → body (clipped to the body) → decal (at DECAL, local coords) → capBack (behind the
 *   dome cap) → cap (over the cap) → topper (replaces the default knob) → front
 */
export interface MotifCtx {
  theme: MachineDef['theme'];
  uid: string;
}

type Layer = (ctx: MotifCtx) => JSX.Element | null;

export interface Motif {
  back?: Layer;
  body?: Layer;
  decal?: Layer;
  capBack?: Layer;
  cap?: Layer;
  topper?: Layer;
  front?: Layer;
}

export const MIRROR = 'translate(240 0) scale(-1 1)';
export const PETAL = 'M0 0 C-3 -3 -3 -7 0 -8 L1 -6.6 L2 -8 C5 -7 4 -3 0 0 Z';
export const SW = STROKE;

/** Smooth closed blob through points around (cx, cy); `k` varies each radius for an organic spot. */
export function blob(cx: number, cy: number, rx: number, ry: number, k: number[]): string {
  const pts = k.map((f, i) => {
    const a = (i / k.length) * Math.PI * 2;
    return [cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f] as const;
  });
  const n = pts.length;
  let d = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]!.toFixed(1)} ${c1[1]!.toFixed(1)} ${c2[0]!.toFixed(1)} ${c2[1]!.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

/** A cute face sitting on the dome cap. */
export const capFace = (mouth: 'u' | 'cat' | 'none' = 'u') => <Face x={120} y={41} spread={11} scale={0.9} mouth={mouth} />;
