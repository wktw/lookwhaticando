/**
 * Legacy shape helpers kept for the treat art (`src/art/items/treats.tsx`), which still imports them from here.
 * The catkin plant art no longer uses them: plants are outline-free (see `leaves.tsx`, `geom.ts`). The items module
 * owns treats; once it stops importing these, this file can go (NOTES-plants.md, request 2).
 * @deprecated Do not use in new art.
 */
import { f } from './math';

/** The old cocoa outline, local so this file no longer depends on the pets module. */
const OUTLINE = '#5A3E45';
const STROKE = 2.4;
/** Outline for small parts. */
export const FINE = 2;

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

export const SPARKLE_D = 'M0 -4 C0.6 -1 1 -0.6 4 0 C1 0.6 0.6 1 0 4 C-0.6 1 -1 0.6 -4 0 C-1 -0.6 -0.6 -1 0 -4 Z';

/** Soft white highlight stroke (the "one top-left highlight" of the style guide). */
export function Shine({ d, w = 1.6, opacity = 0.75 }: { d: string; w?: number; opacity?: number }) {
  return <path d={d} fill="none" stroke="#fff" stroke-width={w} stroke-linecap="round" opacity={opacity} />;
}
