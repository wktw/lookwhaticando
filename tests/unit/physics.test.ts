import { describe, expect, it } from 'vitest';
import { DomeSim, mulberry32, type DomeConfig } from '@/fx/physics';

const DOME: DomeConfig = { cx: 120, cy: 128, radius: 80, floor: 196, count: 24, bodyRadius: 12.5, tints: 5, seed: 7 };
const FRAME = 1 / 60;

function run(sim: DomeSim, seconds: number, each?: (sim: DomeSim) => void) {
  for (let t = 0; t < seconds; t += FRAME) {
    sim.step(FRAME);
    each?.(sim);
  }
}

function expectContained(sim: DomeSim, tolerance = 0.25) {
  for (const b of sim.bodies) {
    expect(Math.hypot(b.x - sim.cx, b.y - sim.cy)).toBeLessThanOrEqual(sim.radius - b.r + tolerance);
    expect(b.y + b.r).toBeLessThanOrEqual(sim.floor + tolerance);
  }
}

function expectFinite(sim: DomeSim) {
  for (const b of sim.bodies) {
    for (const v of [b.x, b.y, b.vx, b.vy, b.angle, b.spin]) expect(Number.isFinite(v)).toBe(true);
  }
}

function snapshot(sim: DomeSim) {
  return sim.bodies.map((b) => [b.id, b.x, b.y, b.angle]);
}

describe('mulberry32', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('DomeSim', () => {
  it('spawns the requested number of bodies inside the dome', () => {
    const sim = new DomeSim(DOME);
    expect(sim.bodies).toHaveLength(24);
    expectContained(sim, 1);
    expect(new Set(sim.bodies.map((b) => b.id)).size).toBe(24);
    for (const b of sim.bodies) (expect(b.tint).toBeGreaterThanOrEqual(0), expect(b.tint).toBeLessThan(5));
  });

  it('settles (sleeps) within a few seconds', () => {
    const sim = new DomeSim(DOME);
    const t = sim.settle(10);
    expect(sim.awake).toBe(false);
    expect(t).toBeLessThan(4);
    expectContained(sim);
  });

  it('settles into a pile without deep overlaps', () => {
    const sim = new DomeSim(DOME);
    sim.settle();
    const bodies = sim.bodies;
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i]!;
        const b = bodies[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r - 1);
      }
    }
  });

  it('keeps every body inside the dome while being shaken hard', () => {
    const sim = new DomeSim(DOME);
    let frame = 0;
    run(sim, 6, (s) => {
      if (frame++ % 4 === 0) s.agitate(1.2, frame % 120 < 60 ? 1 : -1);
      expectContained(s);
    });
  });

  it('never produces NaN, even under absurd agitation and huge frame gaps', () => {
    const sim = new DomeSim({ ...DOME, seed: 99 });
    for (let i = 0; i < 200; i++) {
      sim.agitate(i % 7 === 0 ? 50 : 3, (i % 3) - 1);
      sim.step(i % 10 === 0 ? 5 : FRAME);
    }
    expectFinite(sim);
    expectContained(sim);
  });

  it('agitation wakes a settled pile and moves bodies', () => {
    const sim = new DomeSim(DOME);
    sim.settle();
    const before = new Map(sim.bodies.map((b) => [b.id, { x: b.x, y: b.y }]));
    sim.agitate(0.8, 1);
    expect(sim.awake).toBe(true);
    run(sim, 0.25);
    let moved = 0;
    for (const b of sim.bodies) {
      const p = before.get(b.id)!;
      moved += Math.hypot(b.x - p.x, b.y - p.y);
    }
    expect(moved / sim.bodies.length).toBeGreaterThan(4);
  });

  it('comes back to rest after agitation stops', () => {
    const sim = new DomeSim(DOME);
    sim.settle();
    sim.agitate(1, -1);
    run(sim, 0.5, (s) => s.agitate(0.1, -1));
    const t = sim.settle(10);
    expect(sim.awake).toBe(false);
    expect(t).toBeLessThan(5);
  });

  it('agitating with zero strength does nothing', () => {
    const sim = new DomeSim(DOME);
    sim.settle();
    sim.agitate(0);
    expect(sim.awake).toBe(false);
  });

  it('is deterministic for a seed and varies across seeds', () => {
    const a = new DomeSim(DOME);
    const b = new DomeSim(DOME);
    const c = new DomeSim({ ...DOME, seed: 8 });
    for (const s of [a, b, c]) {
      s.settle();
      s.agitate(1, 1);
      run(s, 1);
    }
    expect(snapshot(a)).toEqual(snapshot(b));
    expect(snapshot(a)).not.toEqual(snapshot(c));
  });

  it('uses a fixed timestep: frame rate does not change the result', () => {
    const a = new DomeSim(DOME);
    const b = new DomeSim(DOME);
    for (let i = 0; i < 120; i++) a.step(1 / 60);
    for (let i = 0; i < 60; i++) b.step(1 / 30);
    expect(snapshot(a)).toEqual(snapshot(b));
  });

  it('removeOne takes the lowest capsule and the pile refills the gap', () => {
    const sim = new DomeSim(DOME);
    sim.settle();
    const lowest = Math.max(...sim.bodies.map((b) => b.y));
    const removed = sim.removeOne();
    expect(removed).not.toBeNull();
    expect(removed!.y).toBeGreaterThan(lowest - removed!.r);
    expect(sim.bodies).toHaveLength(23);
    expect(sim.bodies.some((b) => b.id === removed!.id)).toBe(false);
    expect(sim.awake).toBe(true);
    sim.settle();
    expect(sim.awake).toBe(false);
    expectContained(sim);
  });

  it('removeOne on an empty dome returns null', () => {
    const sim = new DomeSim({ ...DOME, count: 1 });
    expect(sim.removeOne()).not.toBeNull();
    expect(sim.removeOne()).toBeNull();
  });

  it('addOne drops a new capsule in with a fresh id', () => {
    const sim = new DomeSim(DOME);
    sim.settle();
    const ids = new Set(sim.bodies.map((b) => b.id));
    const added = sim.addOne();
    expect(ids.has(added.id)).toBe(false);
    expect(sim.bodies).toHaveLength(25);
    sim.settle();
    expectContained(sim);
  });
});
