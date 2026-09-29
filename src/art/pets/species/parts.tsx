import type { ArtCtx, TraitId } from '../types';
import { OUTLINE, STROKE } from '../geometry';

/**
 * Night-theme rim light for a silhouette part: spread onto a copy of the part's shape, drawn just
 * before it. It has no stroke by day; pet.css lights it in Moonlight Meadow. `width` is the part's
 * own stroke width.
 */
export const rim = (width: number = STROKE) => ({
  class: 'pet-rim',
  fill: 'none',
  'stroke-width': width + 2.6,
  'stroke-linejoin': 'round' as const,
  'stroke-linecap': 'round' as const,
});

/** A stroke with a cocoa outline (outline + fill), perfectly smooth at any size: tails, stems, ribbons. */
export function OutlinedStroke({ d, color, width, rimmed }: { d: string; color: string; width: number; rimmed?: boolean }) {
  return (
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      {rimmed && <path d={d} {...rim(width + STROKE * 2)} />}
      <path d={d} stroke={OUTLINE} stroke-width={width + STROKE * 2} />
      <path d={d} stroke={color} stroke-width={width} />
    </g>
  );
}

/** A swaying tail (class "pet-tail") pivoting around `origin` (canvas px). */
export function StrokeTail({ d, color, width = 7.5, origin = '76px 88px' }: { d: string; color: string; width?: number; origin?: string }) {
  return (
    <g class="pet-tail" style={{ '--tail-origin': origin }}>
      <OutlinedStroke d={d} color={color} width={width} rimmed />
    </g>
  );
}

/** Mirror a left-side part onto the right side of the 100-wide canvas. */
export const MIRROR = 'translate(100 0) scale(-1 1)';

export const hasTrait = (ctx: ArtCtx, trait: TraitId) => ctx.look.traits?.includes(trait) ?? false;

/** A round puff with `n` soft bumps (pom tails, pom-poms, clouds). `bulge` is how far bumps swell past r. */
export function puffPath(cx: number, cy: number, r: number, n = 7, bulge = 0.35): string {
  const pt = (a: number, rr: number) => `${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`;
  const step = (Math.PI * 2) / n;
  let d = `M${pt(-Math.PI / 2, r)}`;
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * step;
    d += ` Q${pt(a0 + step / 2, r * (1 + bulge * 1.6))} ${pt(a0 + step, r)}`;
  }
  return `${d} Z`;
}
