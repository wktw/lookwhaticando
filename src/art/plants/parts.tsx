/**
 * Drawing primitives for plants: canvas layout, palette, leaves, stems, blobs, flowers.
 * Everything lives on the pets' 100×100 canvas and speaks the same outline language
 * (cocoa outline, round joins, pastel fills, one soft top-left highlight).
 */
import { OUTLINE, STROKE } from '../pets/geometry';
import { f } from './math';

export { OUTLINE, STROKE };
/** Outline for small parts (leaves, petals, thin stems), matching the pets' sprout and bows. */
export const FINE = 2;

/** Stems start here, tucked under the soil mound (which peaks at y≈60.5). */
export const BASE_Y = 64;

export const GREEN = {
  leaf: '#9CCB86',
  light: '#B9DDA2',
  back: '#82B96F',
  vein: '#6FA35C',
  stem: '#8EC07C',
} as const;

export const SOIL = '#9C7564';

/* ------------------------------------------------------------------ */
/* Leaves                                                              */
/* ------------------------------------------------------------------ */

/**
 * Leaf outlines, drawn with the base at the origin pointing up (−y).
 * `bend` shifts the tip sideways (fraction of the length) for a lively curl.
 */
export type LeafShape = 'oval' | 'round' | 'strap' | 'spade' | 'lance';

export function leafD(shape: LeafShape, L: number, W: number, bend = 0): string {
  const bx = bend * L;
  switch (shape) {
    case 'round':
      return `M0 0 C${f(W * 1.5)} ${f(-L * 0.08)} ${f(W * 1.35 + bx)} ${f(-L * 0.92)} ${f(bx)} ${f(-L)} C${f(-W * 1.35 + bx)} ${f(-L * 0.92)} ${f(-W * 1.5)} ${f(-L * 0.08)} 0 0 Z`;
    case 'strap':
      return `M${f(-W)} 0 C${f(-W * 1.1)} ${f(-L * 0.45)} ${f(-W * 0.5 + bx * 0.6)} ${f(-L * 0.86)} ${f(bx)} ${f(-L)} C${f(W * 0.5 + bx * 0.6)} ${f(-L * 0.86)} ${f(W * 1.1)} ${f(-L * 0.45)} ${f(W)} 0 Z`;
    case 'spade':
      return `M0 0 C${f(W * 1.75)} ${f(-L * 0.02)} ${f(W * 1.3 + bx)} ${f(-L * 0.72)} ${f(bx)} ${f(-L)} C${f(-W * 1.3 + bx)} ${f(-L * 0.72)} ${f(-W * 1.75)} ${f(-L * 0.02)} 0 0 Z`;
    case 'lance':
      return `M0 0 C${f(W * 1.2)} ${f(-L * 0.28)} ${f(W * 0.8 + bx)} ${f(-L * 0.8)} ${f(bx)} ${f(-L)} C${f(-W * 0.8 + bx)} ${f(-L * 0.8)} ${f(-W * 1.2)} ${f(-L * 0.28)} 0 0 Z`;
    default:
      return `M0 0 C${f(W * 1.3)} ${f(-L * 0.18)} ${f(W * 1.15 + bx)} ${f(-L * 0.8)} ${f(bx)} ${f(-L)} C${f(-W * 1.15 + bx)} ${f(-L * 0.8)} ${f(-W * 1.3)} ${f(-L * 0.18)} 0 0 Z`;
  }
}

export interface LeafProps {
  x: number;
  y: number;
  /** Degrees clockwise from straight up. */
  rot: number;
  L: number;
  W: number;
  shape?: LeafShape;
  bend?: number;
  fill?: string;
  /** Midrib color; `null` hides it. */
  vein?: string | null;
}

export function Leaf({ x, y, rot, L, W, shape = 'oval', bend = 0, fill = GREEN.leaf, vein = GREEN.vein }: LeafProps) {
  const bx = bend * L;
  const start = shape === 'strap' ? L * 0.18 : L * 0.1;
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)})`}>
      <path d={leafD(shape, L, W, bend)} fill={fill} stroke={OUTLINE} stroke-width={FINE} stroke-linejoin="round" />
      {vein && L > 7 && (
        <path
          d={`M${f(bx * 0.05)} ${f(-start)} Q${f(bx * 0.35 + W * 0.12)} ${f(-L * 0.52)} ${f(bx * 0.8)} ${f(-L * 0.8)}`}
          fill="none"
          stroke={vein}
          stroke-width={1.2}
          stroke-linecap="round"
        />
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Stems & blobs                                                       */
/* ------------------------------------------------------------------ */

/**
 * Stems as doubled strokes (outline underneath, color on top). All stems share one outline path
 * and one color path, so branching stems merge into one clean shape and the DOM stays small.
 */
export function Stems({ paths, w = 2.6, color = GREEN.stem, line = FINE }: { paths: string[]; w?: number; color?: string; line?: number }) {
  if (!paths.length) return null;
  const d = paths.join(' ');
  return (
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d={d} stroke={OUTLINE} stroke-width={w + line * 2} />
      <path d={d} stroke={color} stroke-width={w} />
    </g>
  );
}

/** A gently curved stem from a soil point up to (x, y). */
export function stemD(x0: number, x: number, y: number, curl = 0): string {
  const my = (BASE_Y + y) / 2;
  return `M${f(x0)} ${BASE_Y + 2} C${f(x0)} ${f(my + 4)} ${f(x + curl)} ${f(my - 2)} ${f(x)} ${f(y)}`;
}

export type Circle = readonly [cx: number, cy: number, r: number];

/** A circle as a path (two arcs), so many circles can share one <path>. */
export const circleD = (cx: number, cy: number, r: number) =>
  `M${f(cx - r)} ${f(cy)} a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0 a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0 Z`;

/** A soft union of circles with a single outer outline (canopies, moss, clouds, whipped cream). Two elements total. */
export function Blob({ circles, fill, line = STROKE }: { circles: readonly Circle[]; fill: string; line?: number }) {
  return (
    <g>
      {line > 0 && <path d={circles.map(([x, y, r]) => circleD(x, y, r + line)).join(' ')} fill={OUTLINE} />}
      <path d={circles.map(([x, y, r]) => circleD(x, y, r)).join(' ')} fill={fill} />
    </g>
  );
}

export interface Shape {
  d: string;
  transform?: string;
}

/**
 * Any set of paths merged into one silhouette with a single outer outline. Shapes stay separate
 * elements so mixed winding directions can never punch holes in the union.
 */
export function Merged({ shapes, fill, line = FINE }: { shapes: readonly Shape[]; fill: string; line?: number }) {
  return (
    <g stroke-linejoin="round">
      <g fill={OUTLINE} stroke={OUTLINE} stroke-width={line * 2}>
        {shapes.map((s, i) => (
          <path key={i} d={s.d} transform={s.transform} />
        ))}
      </g>
      <g fill={fill}>
        {shapes.map((s, i) => (
          <path key={i} d={s.d} transform={s.transform} />
        ))}
      </g>
    </g>
  );
}

/**
 * A bumpy moss cushion lying on the soil, `w` either side of `cx`, rising `h` above the soil line.
 * Its base sits below the rim so the pot tucks it in (draw it in the `ground` layer).
 */
export function Moss({ cx = 50, w, h, fill = '#A8D38F' }: { cx?: number; w: number; h: number; fill?: string }) {
  const n = Math.max(3, Math.round((2 * w) / 5));
  const topAt = (x: number) => BASE_Y - h * (1 - ((x - cx) / w) ** 2);
  const xs = Array.from({ length: n + 1 }, (_, i) => cx - w + (2 * w * i) / n);
  const bumps = xs.slice(1).map((x1, i) => {
    const xm = (xs[i]! + x1) / 2;
    return `Q${f(xm)} ${f(topAt(xm) - 3.4)} ${f(x1)} ${f(topAt(x1))}`;
  });
  return (
    <g>
      <path d={`M${f(cx - w)} 68 L${f(cx - w)} ${f(topAt(cx - w))} ${bumps.join(' ')} L${f(cx + w)} 68 Z`} fill={fill} stroke={OUTLINE} stroke-width={1.8} stroke-linejoin="round" />
      <g fill="#C9E6B4">
        <circle cx={f(cx - w * 0.45)} cy={f(topAt(cx - w * 0.45) + 1.2)} r={0.9} />
        <circle cx={f(cx + w * 0.2)} cy={f(topAt(cx + w * 0.2) + 1.4)} r={0.8} />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Flowers & sparkle                                                   */
/* ------------------------------------------------------------------ */

/**
 * A ring of `n` petals radiating from (x, y), reaching radius `r`, merged into one silhouette.
 * `inner` is where petals start; `width` is each petal's half-width.
 */
export function PetalRing({
  x,
  y,
  r,
  n,
  inner = 0,
  width,
  fill,
  rot = 0,
  shape = 'round',
  line = FINE,
}: {
  x: number;
  y: number;
  r: number;
  n: number;
  inner?: number;
  width: number;
  fill: string;
  rot?: number;
  shape?: 'round' | LeafShape;
  line?: number;
}) {
  const len = r - inner;
  const petal = shape === 'round' ? `M0 0 C${f(width * 1.4)} 0 ${f(width * 1.4)} ${f(-len)} 0 ${f(-len)} C${f(-width * 1.4)} ${f(-len)} ${f(-width * 1.4)} 0 0 0 Z` : leafD(shape, len, width);
  // Every petal is the same shape turned around the center, so they all share one path per layer.
  const d = Array.from({ length: n }, (_, i) => {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return mapPoints(petal, (px, py) => [x + px * cos - (py - inner) * sin, y + px * sin + (py - inner) * cos]);
  }).join(' ');
  return (
    <g stroke-linejoin="round">
      <path d={d} fill={OUTLINE} stroke={OUTLINE} stroke-width={line * 2} />
      <path d={d} fill={fill} />
    </g>
  );
}

const POINT = /(-?\d*\.?\d+(?:e[-+]?\d+)?)[ ,]+(-?\d*\.?\d+(?:e[-+]?\d+)?)/g;

/** Maps every point of a path written with absolute M/L/C/Q/Z commands. */
function mapPoints(d: string, fn: (x: number, y: number) => [number, number]): string {
  return d.replace(POINT, (_, x: string, y: string) => {
    const [px, py] = fn(Number(x), Number(y));
    return `${f(px)} ${f(py)}`;
  });
}

/** Round-petalled blossom (sakura, strawberry, lemon) as one merged silhouette. */
export function Blossom({
  x,
  y,
  r,
  petal,
  center = '#FFD65C',
  n = 5,
  rot = 0,
  line = FINE,
}: {
  x: number;
  y: number;
  r: number;
  petal: string;
  center?: string;
  n?: number;
  rot?: number;
  line?: number;
}) {
  const pr = r * 0.52;
  const petals: Circle[] = Array.from({ length: n }, (_, i) => {
    const a = ((rot + (360 / n) * i - 90) * Math.PI) / 180;
    return [x + Math.cos(a) * (r - pr), y + Math.sin(a) * (r - pr), pr] as const;
  });
  return (
    <g>
      <Blob circles={petals} fill={petal} line={line} />
      <circle cx={f(x)} cy={f(y)} r={f(r * 0.3)} fill={center} stroke={OUTLINE} stroke-width={line * 0.7} />
    </g>
  );
}

export const SPARKLE_D = 'M0 -4 C0.6 -1 1 -0.6 4 0 C1 0.6 0.6 1 0 4 C-0.6 1 -1 0.6 -4 0 C-1 -0.6 -0.6 -1 0 -4 Z';

/** The universal 4-point "magic" sparkle (DESIGN §10.4). */
export function Sparkle({ x, y, s = 1, fill = '#FFE593', cls }: { x: number; y: number; s?: number; fill?: string; cls?: string }) {
  return (
    <g transform={`translate(${f(x)} ${f(y)}) scale(${f(s)})`}>
      <path class={cls} d={SPARKLE_D} fill={fill} stroke="#fff" stroke-width={0.7} stroke-linejoin="round" />
    </g>
  );
}

/** Soft white highlight stroke (the "one top-left highlight" of the style guide). */
export function Shine({ d, w = 1.6, opacity = 0.75 }: { d: string; w?: number; opacity?: number }) {
  return <path d={d} fill="none" stroke="#fff" stroke-width={w} stroke-linecap="round" opacity={opacity} />;
}
