import { describe, expect, it } from 'vitest';
import { CapsuleSim, DomeSim, mulberry32, type BoxConfig, type DomeConfig } from '@/fx/physics';

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

  it('removeOne can prefer a capsule near the exit, and falls back to the lowest', () => {
    const sim = new DomeSim(DOME);
    sim.settle();
    const exitScore = (b: { x: number; y: number }) => b.y - Math.abs(b.x - sim.cx) * 0.35;
    const lowest = sim.bodies.reduce((a, b) => (exitScore(b) > exitScore(a) ? b : a));
    const other = sim.removeOne((b) => b.id !== lowest.id);
    expect(other).not.toBeNull();
    expect(other!.id).not.toBe(lowest.id);
    expect(exitScore(other!)).toBeGreaterThanOrEqual(exitScore(lowest) - 2.2 * DOME.bodyRadius);
    // Nothing acceptable: the lowest capsule still leaves.
    const fallback = sim.removeOne(() => false);
    const lowestNow = Math.max(...[fallback!, ...sim.bodies].map(exitScore));
    expect(exitScore(fallback!)).toBe(lowestNow);
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

/** A capsule cabinet's window: a glass box the capsules tumble in. */
const WINDOW: BoxConfig = { box: { left: 48, top: 92, right: 192, bottom: 206 }, count: 20, bodyRadius: 12, tints: 5, seed: 3, exitX: 132 };

function expectInBox(sim: CapsuleSim, tolerance = 0.25) {
  const box = sim.box!;
  for (const b of sim.bodies) {
    expect(b.x - b.r).toBeGreaterThanOrEqual(box.left - tolerance);
    expect(b.x + b.r).toBeLessThanOrEqual(box.right + tolerance);
    expect(b.y - b.r).toBeGreaterThanOrEqual(box.top - tolerance);
    expect(b.y + b.r).toBeLessThanOrEqual(box.bottom + tolerance);
  }
}

describe('CapsuleSim in a cabinet window (box)', () => {
  it('is the same class as DomeSim, with a box and its center', () => {
    const sim = new CapsuleSim(WINDOW);
    expect(sim).toBeInstanceOf(DomeSim);
    expect(sim.box).toEqual(WINDOW.box);
    expect(sim.cx).toBe(120);
    expect(sim.floor).toBe(206);
    expect(sim.bodies).toHaveLength(20);
    expectInBox(sim, 1);
  });

  it('settles into a pile on the window floor without deep overlaps', () => {
    const sim = new CapsuleSim(WINDOW);
    const t = sim.settle(10);
    expect(sim.awake).toBe(false);
    expect(t).toBeLessThan(4);
    expectInBox(sim);
    const bodies = sim.bodies;
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i]!;
        const b = bodies[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r - 1);
      }
    }
    // A pile, not a tower: the lowest row touches the floor.
    expect(Math.max(...bodies.map((b) => b.y + b.r))).toBeGreaterThan(WINDOW.box.bottom - 0.5);
  });

  it('keeps every capsule inside the glass while the handle is turned hard', () => {
    const sim = new CapsuleSim(WINDOW);
    let frame = 0;
    run(sim, 6, (s) => {
      if (frame++ % 4 === 0) s.agitate(1.2, frame % 120 < 60 ? 1 : -1);
      expectInBox(s as CapsuleSim);
    });
    expectFinite(sim);
    // Six simulated seconds with a check every step: generous room for a loaded CI machine.
  }, 20_000);

  it('never produces NaN under absurd agitation and huge frame gaps', () => {
    const sim = new CapsuleSim({ ...WINDOW, seed: 99 });
    for (let i = 0; i < 200; i++) {
      sim.agitate(i % 7 === 0 ? 50 : 3, (i % 3) - 1);
      sim.step(i % 10 === 0 ? 5 : FRAME);
    }
    expectFinite(sim);
    expectInBox(sim);
  });

  it('releases the capsule nearest the chute (exitX), and a new one drops in from the top', () => {
    const sim = new CapsuleSim(WINDOW);
    sim.settle();
    const score = (b: { x: number; y: number }) => b.y - Math.abs(b.x - WINDOW.exitX!) * 0.35;
    const best = Math.max(...sim.bodies.map(score));
    const out = sim.removeOne()!;
    expect(score(out)).toBe(best);
    const added = sim.addOne();
    expect(added.y).toBeLessThan(WINDOW.box.top + 20);
    sim.settle();
    expect(sim.bodies).toHaveLength(20);
    expectInBox(sim);
  });

  it('is deterministic for a seed', () => {
    const a = new CapsuleSim(WINDOW);
    const b = new CapsuleSim(WINDOW);
    for (const s of [a, b]) {
      s.settle();
      s.agitate(1, 1);
      run(s, 1);
    }
    expect(snapshot(a)).toEqual(snapshot(b));
  });
});
