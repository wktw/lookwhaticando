/**
 * Pure particle model for confetti (no DOM): spawning by intensity budget and a
 * drag + gravity + wobble integrator. Units: px and milliseconds.
 */
export type ParticleShape = 'petal' | 'heart' | 'star' | 'circle' | 'sparkle' | 'coin';
export type Intensity = 'tiny' | 'small' | 'medium' | 'big' | 'epic';

/** Particles per burst (DESIGN: delight scales with meaning). */
export const BUDGET: Record<Intensity, number> = { tiny: 10, small: 24, medium: 50, big: 90, epic: 160 };
/** Hard cap on live particles across overlapping bursts. */
export const MAX_LIVE = 320;

export const PASTEL_CONFETTI = ['#FFC4D3', '#F58CAA', '#FFE593', '#F6C544', '#C3DFB4', '#B3E6D6', '#BBDCF6', '#D6C8F8', '#FFCBA8', '#FFFFFF'];

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  /** Flutter phase: drives sideways sway and the 3D "tumble" (scaleX). */
  wob: number;
  vw: number;
  size: number;
  shape: ParticleShape;
  color: string;
  age: number;
  life: number;
  /** Heavier particles (coins) fall faster and flutter less. */
  drag: number;
  gravity: number;
  /** Reduced motion: a still sparkle that only fades and breathes. */
  still?: boolean;
}

export type Rng = () => number;

const range = (rng: Rng, a: number, b: number) => a + (b - a) * rng();
const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)]!;

export interface SpawnOptions {
  x: number;
  y: number;
  count: number;
  shapes: readonly ParticleShape[];
  colors: readonly string[];
  /** Launch direction in radians (−π/2 = straight up) and cone half-angle. */
  angle?: number;
  spread?: number;
  /** Launch speed range in px/ms. */
  speed?: [number, number];
  rng?: Rng;
}

export function spawn({ x, y, count, shapes, colors, angle = -Math.PI / 2, spread = Math.PI / 2.4, speed = [0.35, 0.95], rng = Math.random }: SpawnOptions): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const shape = pick(rng, shapes);
    const a = angle + range(rng, -spread, spread);
    const v = range(rng, speed[0], speed[1]);
    const heavy = shape === 'coin';
    out.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: range(rng, 0, Math.PI * 2),
      vr: range(rng, -0.012, 0.012),
      wob: range(rng, 0, Math.PI * 2),
      vw: range(rng, 0.004, 0.011),
      size: shape === 'sparkle' ? range(rng, 9, 15) : shape === 'coin' ? range(rng, 12, 16) : range(rng, 8, 13),
      shape,
      color: shape === 'coin' ? '#F6C544' : pick(rng, colors),
      age: 0,
      life: range(rng, 1700, 2700),
      drag: heavy ? 0.0012 : 0.0026,
      gravity: heavy ? 0.0013 : 0.00075,
    });
  }
  return out;
}

/** Reduced motion: sparkles that appear in place around (x, y), breathe once and fade. */
export function spawnStill({ x, y, count, radius, colors, rng = Math.random }: { x: number; y: number; count: number; radius: number; colors: readonly string[]; rng?: Rng }): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const a = range(rng, 0, Math.PI * 2);
    const r = Math.sqrt(rng()) * radius;
    out.push({
      x: x + Math.cos(a) * r,
      y: y + Math.sin(a) * r,
      vx: 0,
      vy: 0,
      rot: 0,
      vr: 0,
      wob: 0,
      vw: 0,
      size: range(rng, 10, 16),
      shape: 'sparkle',
      color: pick(rng, colors),
      age: -range(rng, 0, 260),
      life: 900,
      drag: 0,
      gravity: 0,
      still: true,
    });
  }
  return out;
}

/** Advance a particle by dt ms. Returns false once it has expired or left the screen. */
export function step(p: Particle, dt: number, height: number): boolean {
  p.age += dt;
  if (p.still) return p.age < p.life;
  const k = Math.exp(-p.drag * dt);
  p.vx *= k;
  p.vy = p.vy * k + p.gravity * dt;
  p.wob += p.vw * dt;
  p.x += p.vx * dt + Math.sin(p.wob) * 0.05 * dt;
  p.y += p.vy * dt;
  p.rot += p.vr * dt;
  return p.age < p.life && p.y < height + 40;
}

/** Opacity over a particle's life: quick fade-in, fade out over the last quarter. */
export function alphaOf(p: Particle): number {
  if (p.age < 0) return 0;
  const t = p.age / p.life;
  if (p.still) return Math.sin(Math.min(1, t) * Math.PI);
  if (t < 0.04) return t / 0.04;
  return t > 0.75 ? Math.max(0, (1 - t) / 0.25) : 1;
}
