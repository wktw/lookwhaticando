/**
 * Pure petal model (no DOM). Celebrations are petals and leaves in the plants' own colours,
 * never confetti (DESIGN §10.5): at most 12, drifting down with a gentle turn. Each petal's
 * whole flight is planned up front and played as one compositor animation (transform + opacity).
 * Units: px and milliseconds.
 */
export type Intensity = 'tiny' | 'small' | 'medium' | 'big' | 'epic';

/** Shapes callers may ask for. Only petals and leaves are drawn: the older names map onto them. */
export type ParticleShape = 'petal' | 'leaf' | 'heart' | 'star' | 'circle' | 'sparkle' | 'coin';
export type PetalKind = 'petal' | 'leaf';

/** Never more than this many in one celebration. */
export const MAX_PETALS = 12;

/** Petals per burst: delight scales with meaning, and even the biggest moment stays at 12. */
export const BUDGET: Record<Intensity, number> = { tiny: 4, small: 6, medium: 8, big: 11, epic: MAX_PETALS };

/** Flower colours from the sill: strawberry-milk blush, begonia pink, violet, wisteria, butter. */
export const PETAL_COLOURS = ['#EFB4C1', '#F2C3CD', '#DDB6DA', '#C8BAE6', '#F2D98A', '#E8A9B8'] as const;
/** Leaf greens from the same plants (light, mid, deep). */
export const LEAF_COLOURS = ['#BCD3A3', '#9CBC87', '#8AAE77'] as const;

/** Lavender-ink shade for a colour: the hard crescent on the side away from the light. */
export function shadeOf(hex: string, t = 0.2): string {
  const n = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  const ink = [0x5a, 0x48, 0x70];
  return `#${c.map((v, i) => Math.round(v + (ink[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Relative luminance: petals that would vanish on cream paper (near-white) are skipped. */
export function luminance(hex: string): number {
  const n = hex.replace('#', '');
  if (n.length !== 6) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export const kindOf = (shape: ParticleShape): PetalKind => (shape === 'leaf' ? 'leaf' : 'petal');

export interface Petal {
  kind: PetalKind;
  color: string;
  shade: string;
  /** Start point (px, viewport). */
  x: number;
  y: number;
  /** Net sideways drift and fall over the flight (px). */
  drift: number;
  fall: number;
  /** A small rise before falling (bursts from a point). */
  lift: number;
  /** Side-to-side sway amplitude (px) and its phase. */
  sway: number;
  phase: number;
  /** Starting angle and total turn (degrees). */
  rot: number;
  spin: number;
  size: number;
  delay: number;
  duration: number;
  /** Reduced motion: appears in place and fades, never moves. */
  still: boolean;
}

export type Rng = () => number;

const range = (rng: Rng, a: number, b: number) => a + (b - a) * rng();
const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)]!;

export interface PlanOptions {
  /** Burst origin; without one, petals drift down from above the top edge across `width`. */
  x?: number;
  y?: number;
  width: number;
  height: number;
  intensity?: Intensity;
  /** Overrides the budget (still capped at 12). */
  count?: number;
  shapes?: readonly ParticleShape[];
  /** Petal colours (near-white ones are dropped); leaves keep their greens. */
  colors?: readonly string[];
  /** Hold still and crossfade (reduced motion). */
  still?: boolean;
  rng?: Rng;
}

/** Plan a celebration's petals: where each starts, how it drifts, turns and fades. */
export function planPetals({ x, y, width, height, intensity = 'medium', count, shapes, colors, still = false, rng = Math.random }: PlanOptions): Petal[] {
  const n = Math.max(0, Math.min(MAX_PETALS, Math.round(count ?? BUDGET[intensity])));
  const kinds = [...new Set((shapes?.length ? shapes : (['petal', 'petal', 'leaf'] as const)).map(kindOf))];
  // Two petals for every leaf when both are allowed.
  const kindAt = (i: number): PetalKind => (kinds.length === 1 ? kinds[0]! : i % 3 === 2 ? 'leaf' : 'petal');
  const petalColours = colors?.filter((c) => luminance(c) < 0.9) ?? [];
  const palette = petalColours.length ? petalColours : PETAL_COLOURS;
  const fromPoint = x !== undefined && y !== undefined;
  const out: Petal[] = [];
  for (let i = 0; i < n; i++) {
    const kind = kindAt(i);
    const color = kind === 'leaf' ? pick(rng, LEAF_COLOURS) : pick(rng, palette);
    // Spread evenly across the width (or around the point), with a little jitter.
    const slot = n > 1 ? i / (n - 1) - 0.5 : 0;
    const startX = fromPoint ? x + slot * 90 + range(rng, -14, 14) : width * (0.08 + 0.84 * (i + range(rng, 0.2, 0.8)) / n);
    // Still petals (reduced motion) appear where they can be seen; falling ones start above the edge.
    const startY = fromPoint ? y + range(rng, -10, 10) : still ? range(rng, 0.1, 0.4) * height : range(rng, -60, -16);
    out.push({
      kind,
      color,
      shade: shadeOf(color),
      x: startX,
      y: startY,
      drift: fromPoint ? slot * 120 + range(rng, -20, 20) : range(rng, -40, 40),
      fall: fromPoint ? range(rng, 170, 300) : range(rng, 0.45, 0.62) * height,
      lift: fromPoint ? range(rng, 18, 46) : 0,
      sway: range(rng, 8, 18),
      phase: range(rng, 0, Math.PI * 2),
      rot: range(rng, 0, 360),
      spin: range(rng, 70, 200) * (rng() < 0.5 ? -1 : 1),
      size: kind === 'leaf' ? range(rng, 17, 22) : range(rng, 18, 24),
      delay: Math.round(fromPoint ? i * 26 + range(rng, 0, 60) : range(rng, 0, 520)),
      duration: Math.round(still ? 1500 : range(rng, 2600, 3400)),
      still,
    });
  }
  return out;
}

export interface PetalFrame {
  offset: number;
  transform: string;
  opacity: number;
}

/** Opacity over a petal's flight: in quickly, hold, fade over the last third. */
export function petalOpacity(t: number, still: boolean): number {
  if (still) return t < 0.25 ? t / 0.25 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;
  if (t < 0.08) return t / 0.08;
  return t > 0.68 ? Math.max(0, (1 - t) / 0.32) : 1;
}

/** Where a petal is at t ∈ [0, 1] of its flight (px, relative to its start). */
export function petalAt(p: Petal, t: number): { dx: number; dy: number; rot: number; flutter: number } {
  if (p.still) return { dx: 0, dy: 0, rot: p.rot, flutter: 1 };
  const rise = t < 0.3 ? Math.sin((t / 0.3) * Math.PI) * p.lift : 0;
  return {
    dx: p.drift * t + Math.sin(p.phase + t * Math.PI * 2.2) * p.sway - Math.sin(p.phase) * p.sway,
    dy: p.fall * t ** 1.2 - rise,
    rot: p.rot + p.spin * t,
    // A petal turning over in the air: its width breathes between 60% and 100%.
    flutter: 0.8 + 0.2 * Math.cos(p.phase + t * Math.PI * 3),
  };
}

/** The petal's flight as keyframes (transform + opacity only, for Element.animate). */
export function petalKeyframes(p: Petal, steps = 12): PetalFrame[] {
  const frames: PetalFrame[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = petalAt(p, t);
    frames.push({
      offset: t,
      transform: `translate(${(p.x + a.dx).toFixed(1)}px, ${(p.y + a.dy).toFixed(1)}px) rotate(${a.rot.toFixed(1)}deg) scaleX(${a.flutter.toFixed(3)})`,
      opacity: Number(petalOpacity(t, p.still).toFixed(3)),
    });
  }
  return frames;
}
