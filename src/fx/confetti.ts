/**
 * Celebration petals (DESIGN §10.5): at most 12 petals and leaves in the plants' own colours,
 * drifting down with a gentle turn. Never confetti, sparkles, stars or hearts. The name and the
 * `burst()` API stay from the older confetti, so every caller keeps working.
 *
 * Each petal is one small element on a shared, click-through layer, animated once with
 * Element.animate (transform + opacity only, on the compositor): no canvas, no per-frame JS.
 * Reduced motion: the petals appear in place and crossfade away.
 */
import { BUDGET, MAX_PETALS, planPetals, petalKeyframes, type Intensity, type ParticleShape, type Petal, type PetalKind } from './particles';
import { prefersReducedMotion } from './motion';

export interface BurstOptions {
  /** Viewport coordinates of the origin. Without one, petals drift down from the top edge. */
  x?: number;
  y?: number;
  /** How much the moment means: tiny 4 petals … epic 12. */
  intensity?: Intensity;
  /** 'petal' and 'leaf' are drawn; older names (heart, star, circle, sparkle, coin) become petals. */
  shapes?: ParticleShape[];
  /** Petal colours (near-white ones are skipped). */
  colors?: string[];
  /** Leaf greens (default: the sill's greens). */
  leafColors?: string[];
  /** Kept for older callers; petals always drift down. */
  spread?: number;
}

/** Below celebration cards (the petals fall behind a note, never across its words). */
const Z_PETALS = 245;

/** Flat two-ink shapes on a 20-unit box: the body and its hard shade crescent (light from the left). */
export const PETAL_SHAPES: Record<PetalKind, { body: string; shade: string }> = {
  petal: {
    body: 'M0 -9.2C4.9 -8.8 7.1 -3.9 6.3 1.1C5.5 5.6 2.7 8.7 0 9.5C-2.7 8.7-5.5 5.6-6.3 1.1C-7.1-3.9-4.9-8.8-1.3-9.1L0-7.5Z',
    shade: 'M1.9-8.8C5.7-7.5 7.1-3.5 6.3 1.1C5.5 5.6 2.7 8.7 0 9.5C2.5 7.3 4.3 4.5 4.7 0.9C5.1-3.2 4-6.7 1.9-8.8Z',
  },
  leaf: {
    body: 'M0-9.6C4.7-6.1 6.1-1.4 5.1 3C4.1 6.7 1.9 8.9 0 9.6C-1.9 8.9-4.1 6.7-5.1 3C-6.1-1.4-4.7-6.1 0-9.6Z',
    shade: 'M0-9.6C4.7-6.1 6.1-1.4 5.1 3C4.1 6.7 1.9 8.9 0 9.6C1.1 5.8 1.3 1.2 0-9.6Z',
  },
};

let layer: HTMLDivElement | null = null;
/** Petals in the air right now, across every burst: overlapping moments never exceed MAX_PETALS. */
let live = 0;

/** How many petals a new burst may add while `inAir` are still falling. */
export function petalAllowance(wanted: number, inAir: number): number {
  return Math.max(0, Math.min(wanted, MAX_PETALS - inAir));
}

function petalLayer(): HTMLDivElement {
  if (layer?.isConnected) return layer;
  layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = `position:fixed;inset:0;z-index:${Z_PETALS};pointer-events:none;overflow:hidden;contain:strict`;
  document.body.appendChild(layer);
  return layer;
}

function petalElement(p: Petal): HTMLDivElement {
  const el = document.createElement('div');
  const shape = PETAL_SHAPES[p.kind];
  el.style.cssText = `position:absolute;top:0;left:0;width:${p.size.toFixed(1)}px;height:${p.size.toFixed(1)}px;margin:${(-p.size / 2).toFixed(1)}px 0 0 ${(-p.size / 2).toFixed(1)}px;opacity:0;will-change:transform,opacity`;
  el.innerHTML = `<svg viewBox="-10 -10 20 20" width="100%" height="100%" style="display:block;max-width:none;overflow:visible"><path d="${shape.body}" fill="${p.color}"/><path d="${shape.shade}" fill="${p.shade}"/></svg>`;
  return el;
}

/** Let petals drift down from a point (a card, a pot) or, without one, from the top edge. */
export function burst(opts: BurstOptions = {}): void {
  if (typeof window === 'undefined' || document.hidden) return;
  try {
    if (typeof Element.prototype.animate !== 'function') return;
    const count = petalAllowance(BUDGET[opts.intensity ?? 'medium'], live);
    if (count <= 0) return;
    const petals = planPetals({
      x: opts.x,
      y: opts.y,
      width: innerWidth,
      height: innerHeight,
      intensity: opts.intensity ?? 'medium',
      count,
      shapes: opts.shapes,
      colors: opts.colors,
      leafColors: opts.leafColors,
      still: prefersReducedMotion(),
    });
    const host = petalLayer();
    for (const p of petals) {
      const el = petalElement(p);
      host.appendChild(el);
      live++;
      const frames: Keyframe[] = petalKeyframes(p).map(({ offset, transform, opacity }) => ({ offset, transform, opacity }));
      el.animate(frames, { duration: p.duration, delay: p.delay, easing: 'linear', fill: 'both' })
        .finished.catch(() => undefined)
        .then(() => {
          live--;
          el.remove();
        });
    }
  } catch {
    /* Petals are decoration. */
  }
}

/** The older name for the same celebration. */
export const confetti = burst;
