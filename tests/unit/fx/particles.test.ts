import { describe, expect, it } from 'vitest';
import { alphaOf, BUDGET, spawn, spawnStill, step } from '@/fx/particles';
import { arcControl, easeInOutCubic, quadAt, spriteCount } from '@/fx/arc';

/** Deterministic PRNG (mulberry32) so particle tests are stable. */
function rng(seed = 7) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('confetti particles', () => {
  it('budgets grow with meaning: tiny 10 … epic 160', () => {
    expect(BUDGET).toEqual({ tiny: 10, small: 24, medium: 50, big: 90, epic: 160 });
  });

  it('spawns the requested count, launched upward within the cone', () => {
    const ps = spawn({ x: 100, y: 500, count: 50, shapes: ['petal', 'heart'], colors: ['#FFC4D3'], rng: rng() });
    expect(ps).toHaveLength(50);
    for (const p of ps) {
      expect(p.vy).toBeLessThan(0);
      expect(['petal', 'heart']).toContain(p.shape);
    }
  });

  it('coins are heavier: fall faster than petals', () => {
    const [coin] = spawn({ x: 0, y: 0, count: 1, shapes: ['coin'], colors: ['#fff'], rng: rng(1) });
    const [petal] = spawn({ x: 0, y: 0, count: 1, shapes: ['petal'], colors: ['#fff'], rng: rng(1) });
    expect(coin!.color).toBe('#F6C544');
    expect(coin!.gravity).toBeGreaterThan(petal!.gravity);
  });

  it('gravity wins: particles rise, slow, fall, and expire off-screen or by age', () => {
    const [p] = spawn({ x: 200, y: 400, count: 1, shapes: ['circle'], colors: ['#fff'], angle: -Math.PI / 2, spread: 0, speed: [0.8, 0.8], rng: rng() });
    let minY = p!.y;
    let alive = true;
    let t = 0;
    while (alive && t < 10_000) {
      alive = step(p!, 16, 800);
      minY = Math.min(minY, p!.y);
      t += 16;
    }
    expect(minY).toBeLessThan(400);
    expect(alive).toBe(false);
    expect(t).toBeLessThan(3000);
  });

  it('fades in quickly and out over the last quarter of life', () => {
    const [p] = spawn({ x: 0, y: 0, count: 1, shapes: ['circle'], colors: ['#fff'], rng: rng() });
    p!.age = p!.life * 0.5;
    expect(alphaOf(p!)).toBe(1);
    p!.age = p!.life * 0.95;
    expect(alphaOf(p!)).toBeGreaterThan(0);
    expect(alphaOf(p!)).toBeLessThan(0.3);
  });

  it('reduced motion: still sparkles that never move, only breathe and fade', () => {
    const ps = spawnStill({ x: 50, y: 50, count: 8, radius: 40, colors: ['#FFE593'], rng: rng() });
    for (const p of ps) {
      const { x, y } = p;
      p.age = 0;
      step(p, 300, 800);
      expect([p.x, p.y]).toEqual([x, y]);
      expect(p.shape).toBe('sparkle');
      expect(Math.hypot(x - 50, y - 50)).toBeLessThanOrEqual(40);
    }
  });
});

describe('coin flight arcs', () => {
  it('starts and ends exactly on the endpoints', () => {
    const a = { x: 10, y: 400 };
    const b = { x: 300, y: 30 };
    const c = arcControl(a, b, 120);
    expect(quadAt(a, c, b, 0)).toEqual(a);
    expect(quadAt(a, c, b, 1)).toEqual(b);
  });

  it('rises above the higher point but never off the top of the screen', () => {
    expect(arcControl({ x: 0, y: 500 }, { x: 0, y: 300 }, 100).y).toBe(200);
    expect(arcControl({ x: 0, y: 500 }, { x: 0, y: 30 }, 100).y).toBe(16);
  });

  it('eases in and out', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
  });

  it('flies a sensible number of sprites', () => {
    expect([0, -3, 1, 3, 5, 8, 24, 500].map(spriteCount)).toEqual([0, 0, 1, 1, 2, 2, 6, 8]);
  });
});
