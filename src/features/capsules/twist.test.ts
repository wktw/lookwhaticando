import { describe, expect, it } from 'vitest';
import { TWIST_STEP, TwistTracker } from './twist';

describe('twist to open', () => {
  it('opens after a quarter turn, either way round', () => {
    for (const dir of [1, -1]) {
      const t = new TwistTracker();
      for (let i = 0; i < 8; i++) t.turn(dir * 10);
      expect(t.done).toBe(false);
      t.turn(dir * 10);
      expect(t.progress).toBe(TWIST_STEP);
      expect(t.done).toBe(true);
    }
  });

  it('wobbling back never undoes a twist', () => {
    const t = new TwistTracker();
    t.turn(40);
    t.turn(-30);
    expect(t.progress).toBe(40);
    t.turn(20);
    expect(t.progress).toBe(40);
    t.turn(40);
    expect(t.progress).toBe(70);
  });

  it('ignores a finger jumping straight across the centre', () => {
    const t = new TwistTracker();
    t.turn(170);
    t.turn(-175);
    expect(t.progress).toBe(0);
  });

  it('a tap is one whole step; a Secret takes three', () => {
    const t = new TwistTracker(3);
    t.tap();
    expect(t.stepsDone).toBe(1);
    t.tap();
    expect(t.stepsDone).toBe(2);
    expect(t.done).toBe(false);
    t.tap();
    expect(t.done).toBe(true);
    t.tap();
    expect(t.stepsDone).toBe(3);
  });

  it('drags and taps add up across releases', () => {
    const t = new TwistTracker(3);
    for (let i = 0; i < 10; i++) t.turn(10);
    t.release();
    expect(t.stepsDone).toBe(1);
    t.tap();
    expect(t.stepsDone).toBe(2);
    for (let i = 0; i < 9; i++) t.turn(-10);
    expect(t.done).toBe(true);
  });

  it('turns the clear half with the fingers, up to a limit, signed', () => {
    const t = new TwistTracker();
    t.turn(-20);
    expect(t.angle).toBeLessThan(0);
    expect(Math.abs(t.angle)).toBeGreaterThan(2);
    t.turn(-60);
    expect(t.angle).toBeGreaterThanOrEqual(-12);
  });
});
