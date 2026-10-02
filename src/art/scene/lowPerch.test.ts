import { afterEach, describe, expect, it, vi } from 'vitest';
import { arrangePets, groundSpot, perchSpot, type Ground, type Perch } from './arrange';
import { Director } from './behavior/director';
import { lightAtSun } from './lighting';
import type { ShelfPet } from './model';
import type { Moment } from './time';

const moment: Moment = { hour: 17.25, time: 'golden', season: 'autumn', light: lightAtSun(0.88, false) };
const low: Perch = { id: 'bed', kind: 'bed', x: 80, y: 79, depth: 0.8, z: 420, w: 20 };
const ground = (perch = low): Ground => ({ rows: { glassBottom: 60, sillBack: 64, sillFront: 88, nosing: 93 }, x0: 0, x1: 180, d0: 0.42, d1: 0.96,
  surface: '#fff', beam: { x0: 70, x1: 90, slant: 0, bar: { x: 80, w: 1 }, rail: { depth: 0.3, h: 1 } }, perches: [perch], obstacles: [], petSize: 26 });
const sleeping: ShelfPet = { key: 'sleeper', petId: 'pet-hamster-black' };
const visitor: ShelfPet = { key: 'visitor', petId: 'pet-dog-corgi', bond: { sunBias: 0.9, frontBias: 0 } };
afterEach(() => vi.useRealTimers());

describe('floor destinations beside occupied perches', () => {
  it.each([false, true])('reserves a low bed before %s earned sunlight placement', earned => {
    const g = ground();
    const pet = earned ? visitor : { ...visitor, bond: undefined };
    const spots = arrangePets(g, [sleeping, pet], moment);
    expect(spots.get('sleeper')).toEqual(perchSpot(low, 'sleep', true, 'right'));
    expect(Math.abs(spots.get('visitor')!.x - low.x)).toBeGreaterThan(g.petSize / 2);
    expect(spots.get('visitor')!.perch).toBeUndefined();
  });

  it('also reserves a low shelf such as a pond lily pad', () => {
    const perch: Perch = { ...low, kind: 'shelf', likes: ['frog'] };
    const g = ground(perch);
    const spots = arrangePets(g, [{ key: 'sleeper', petId: 'pet-frog-tree' }, visitor], moment);
    expect(spots.get('sleeper')!.perch).toBe('shelf');
    expect(Math.abs(spots.get('visitor')!.x - perch.x)).toBeGreaterThan(g.petSize / 2);
  });

  it.each(['bed', 'rim'] as const)('keeps the floor below a genuinely raised %s available', kind => {
    const perch: Perch = { ...low, kind, y: 45.8, owner: 'home' };
    const g = ground(perch);
    const spots = arrangePets(g, [{ ...sleeping, home: 'home' }, visitor], moment);
    expect(spots.get('sleeper')!.perch).toBe(kind);
    expect(spots.get('visitor')!.x).toBeCloseTo(perch.x);
  });

  it('the live director keeps later earned destinations clear of the sleeping pet', () => {
    vi.useFakeTimers();
    const g = ground();
    const sleeper = perchSpot(low, 'sleep', true, 'right');
    const start = new Map([['sleeper', sleeper], ['visitor', groundSpot(g, 145, 0.7, 'sit', false, 'left')]]);
    const d = new Director([
      { key: 'visitor', species: 'dog', place: 'sill', ground: g, bond: { ...visitor.bond!, waits: true } },
      { key: 'sleeper', species: 'hamster', place: 'sill', ground: g },
    ], start, { moment, reduced: () => false, vignettes: false, seed: 11 });
    d.start(); d.hold('sleeper');
    try {
      vi.advanceTimersByTime(4_000);
      const destination = d.views.get('visitor')!.peek();
      expect(destination.x).not.toBe(start.get('visitor')!.x);
      expect(Math.abs(destination.x - low.x)).toBeGreaterThan(g.petSize / 2);
      expect(d.views.get('sleeper')!.peek()).toMatchObject(sleeper);
    } finally { d.stop(); }
  });
});
