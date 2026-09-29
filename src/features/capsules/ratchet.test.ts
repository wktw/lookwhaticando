import { describe, expect, it } from 'vitest';
import { Ratchet, TURN_TARGET, angleDelta } from './ratchet';

describe('angleDelta', () => {
  it('takes the short way round across ±180°', () => {
    expect(angleDelta(170, -170)).toBe(20);
    expect(angleDelta(-170, 170)).toBe(-20);
    expect(angleDelta(10, 40)).toBe(30);
    expect(angleDelta(0, 180)).toBe(180);
  });
});

describe('Ratchet', () => {
  it('commits a direction only after a deliberate bit of turning', () => {
    const r = new Ratchet();
    expect(r.turn(5)).toBe(0);
    expect(r.dir).toBe(0);
    expect(r.turn(8)).toBe(13);
    expect(r.dir).toBe(1);
    expect(r.progress).toBe(13);
  });

  it('counts counter-clockwise turning just the same', () => {
    const r = new Ratchet();
    r.turn(-15);
    expect(r.dir).toBe(-1);
    for (let i = 0; i < 30; i++) r.turn(-10);
    expect(r.done).toBe(true);
  });

  it('ignores backing up: progress never goes down', () => {
    const r = new Ratchet();
    r.turn(20);
    r.turn(40);
    expect(r.turn(-30)).toBe(0);
    expect(r.progress).toBe(60);
    r.turn(10);
    expect(r.progress).toBe(70);
  });

  it('jitter before committing cancels out', () => {
    const r = new Ratchet();
    r.turn(8);
    r.turn(-8);
    r.turn(6);
    expect(r.dir).toBe(0);
    expect(r.progress).toBe(0);
  });

  it('stops exactly at the target', () => {
    const r = new Ratchet();
    r.turn(20);
    expect(r.push(1000)).toBe(TURN_TARGET - 20);
    expect(r.progress).toBe(TURN_TARGET);
    expect(r.push(10)).toBe(0);
  });

  it('auto-turn commits clockwise when nothing was dragged yet, and resets cleanly', () => {
    const r = new Ratchet();
    expect(r.push(30)).toBe(30);
    expect(r.dir).toBe(1);
    r.reset();
    expect(r.progress).toBe(0);
    expect(r.dir).toBe(0);
    expect(r.turn(-12)).toBe(12);
    expect(r.dir).toBe(-1);
  });
});
