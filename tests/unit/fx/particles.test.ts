import { describe, expect, it } from 'vitest';
import { BUDGET, LEAF_COLOURS, MAX_PETALS, PETAL_COLOURS, petalAt, petalKeyframes, petalOpacity, planPetals, type Intensity } from '@/fx/particles';
import { arcControl, easeInOutCubic, quadAt, spriteCount } from '@/fx/arc';

/** Deterministic PRNG (mulberry32) so petal tests are stable. */
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

const INTENSITIES: Intensity[] = ['tiny', 'small', 'medium', 'big', 'epic'];

describe('celebration petals (never confetti)', () => {
  it('are at most 12, whatever the moment or the caller asks for', () => {
    for (const intensity of INTENSITIES) {
      expect(BUDGET[intensity]).toBeLessThanOrEqual(MAX_PETALS);
      expect(planPetals({ width: 390, height: 844, intensity, rng: rng() }).length).toBe(BUDGET[intensity]);
    }
    expect(planPetals({ width: 390, height: 844, count: 160, rng: rng() })).toHaveLength(MAX_PETALS);
    expect(MAX_PETALS).toBe(12);
  });

  it('grow with meaning: a bigger moment never gets fewer petals', () => {
    const counts = INTENSITIES.map((i) => BUDGET[i]);
    for (let i = 1; i < counts.length; i++) expect(counts[i]!).toBeGreaterThanOrEqual(counts[i - 1]!);
  });

  it('are petals and leaves in the plants’ own colours; stars, hearts and sparkles become petals', () => {
    const ps = planPetals({ width: 390, height: 844, intensity: 'epic', rng: rng() });
    expect(new Set(ps.map((p) => p.kind))).toEqual(new Set(['petal', 'leaf']));
    for (const p of ps) expect(p.kind === 'leaf' ? LEAF_COLOURS : PETAL_COLOURS).toContain(p.color as never);
    const legacy = planPetals({ width: 390, height: 844, shapes: ['star', 'heart', 'sparkle', 'coin'], rng: rng() });
    expect(legacy.every((p) => p.kind === 'petal')).toBe(true);
  });

  it('skip colours that would vanish on cream paper', () => {
    const ps = planPetals({ width: 390, height: 844, shapes: ['petal'], colors: ['#FFFFFF', '#FFFDF9', '#EFB4C1'], rng: rng() });
    expect(ps.every((p) => p.color === '#EFB4C1')).toBe(true);
  });

  it('drift down with a gentle turn, and fade out by the end', () => {
    for (const p of planPetals({ width: 390, height: 844, x: 195, y: 300, intensity: 'big', rng: rng(3) })) {
      const end = petalAt(p, 1);
      expect(end.dy).toBeGreaterThan(100);
      expect(Math.abs(end.rot - p.rot)).toBeGreaterThan(30);
      expect(Math.abs(end.rot - p.rot)).toBeLessThan(360);
      expect(petalOpacity(1, false)).toBe(0);
      expect(petalOpacity(0.5, false)).toBe(1);
    }
  });

  it('animate only transform and opacity', () => {
    const [p] = planPetals({ width: 390, height: 844, rng: rng() });
    const frames = petalKeyframes(p!);
    expect(frames[0]!.offset).toBe(0);
    expect(frames.at(-1)!.offset).toBe(1);
    for (const f of frames) expect(Object.keys(f).sort()).toEqual(['offset', 'opacity', 'transform']);
  });

  it('reduced motion: petals hold still where they can be seen, and crossfade', () => {
    for (const p of planPetals({ width: 390, height: 844, still: true, rng: rng() })) expect(p.y).toBeGreaterThan(0);
    for (const p of planPetals({ width: 390, height: 844, x: 100, y: 100, still: true, rng: rng() })) {
      const frames = petalKeyframes(p);
      expect(new Set(frames.map((f) => f.transform)).size).toBe(1);
      expect(Math.max(...frames.map((f) => f.opacity))).toBe(1);
      expect(frames.at(-1)!.opacity).toBe(0);
    }
  });
});

describe('the coin flight', () => {
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

  it('flies one brass coin per reward, whatever its size', () => {
    expect([0, -3, 1, 3, 5, 8, 24, 500].map(spriteCount)).toEqual([0, 0, 1, 1, 1, 1, 1, 1]);
  });
});
