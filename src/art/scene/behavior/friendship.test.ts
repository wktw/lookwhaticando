/** Friendship copy is a scene contract, through the real selector and Shelf adapter. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDemo } from '@/state/demo';
import { petSummary, petVM } from '@/state/views/pets';
import { shelfPets } from '@/features/shelf/model';
import { LEVEL_XP } from '@/domain/levels';
import { levelLine } from '@/features/pets/petCopy';
import type { AppState } from '@/state/types';
import { UTC } from '../../../../tests/unit/domain/game';
import { arrangePets, groundSpot, spotInSun, type Ground } from '../arrange';
import { lightAtSun } from '../lighting';
import { skyTime, type Moment } from '../time';
import { seeded } from '../sill/scenery';
import type { ShelfPet } from '../model';
import { planAct, type PlanInput } from './plan';
import { Director } from './director';
import { vignetteById } from './vignettes';

const env = { today: '2026-09-29', now: Date.parse('2026-09-29T14:00:00Z'), local: UTC };
const demo = buildDemo(env);
const ids = Object.keys(demo.pets).slice(0, 2);
const me = ids[0]!;
const friend = ids[1]!;
function state(level: number): AppState {
  return { ...demo, pets: Object.fromEntries(ids.map((id, i) => [id, { ...demo.pets[id]!, xp: LEVEL_XP[(i ? 4 : level) - 1]!, inMeadow: true, place: 'sill', bestFriend: i ? undefined : friend }])) };
}
function scene(level: number): ShelfPet[] {
  const s = state(level);
  return shelfPets(ids.map((id) => petSummary(s, s.pets[id]!)), s.pets);
}
const ground: Ground = {
  rows: { glassBottom: 50, sillBack: 65, sillFront: 85, nosing: 88 },
  x0: 0, x1: 180, d0: 0.2, d1: 0.95, surface: '#fff',
  beam: { x0: 24, x1: 65, slant: 18, bar: { x: 40, w: 1 }, rail: { depth: 0.5, h: 1 } }, perches: [], obstacles: [], petSize: 20,
};
const moment: Moment = { light: lightAtSun(0.6, false), time: skyTime(lightAtSun(0.6, false)), season: 'autumn', hour: 14 };
const from = groundSpot(ground, 140, 0.3, 'sit', false, 'left');
const friendAt = groundSpot(ground, 95, 0.88, 'sleep', true, 'right');
const bondOf = (pet: ShelfPet) => pet.bond;
const input = (level: number, seed: number, extra: object = {}): PlanInput => ({
  species: 'cat', petId: me, at: from, ground, hour: 14, night: false, taken: [friendAt.x], rnd: seeded(seed),
  bond: bondOf(scene(level)[0]!), friend: { key: friend, spot: friendAt }, ...extra,
} as PlanInput);
const last = (p: ReturnType<typeof planAct>) => p.steps[p.steps.length - 1]!.spot;

afterEach(() => vi.useRealTimers());

describe('friendship reaches the scene', () => {
  it('derives level 5 sunlight, level 7 front naps, level 8 chosen friend, and level 9 waiting without storing new data', () => {
    expect(bondOf(scene(4)[0]!)).toBeUndefined();
    expect(bondOf(scene(5)[0]!)).toMatchObject({ sunBias: expect.any(Number), frontBias: 0 });
    expect(bondOf(scene(7)[0]!)).toMatchObject({ frontBias: expect.any(Number) });
    expect(bondOf(scene(8)[0]!)).toMatchObject({ napWith: friend });
    expect(bondOf(scene(9)[0]!)).toMatchObject({ waits: true });
    expect(state(8).pets[me]!.bestFriend).toBe(friend);
  });

  it.each(['indoors', 'elsewhere', 'removed'] as const)('keeps friend identity but uses the existing solo line when the friend is %s', (where) => {
    const s = state(8);
    if (where === 'removed') delete s.pets[friend];
    else s.pets[friend] = { ...s.pets[friend]!, inMeadow: where !== 'indoors', place: where === 'elsewhere' ? 'pond' : 'sill' };
    s.shelf = { ...s.shelf, places: ['sill', 'pond'] };
    const vm = petVM(s, env, me)!;
    const napFriend = vm.napFriend;
    expect(napFriend).toBeNull();
    expect(levelLine(vm.name, vm.level, vm.species, napFriend ? s.pets[napFriend]!.name : null)).toBe(`${vm.name} naps in the same spot every afternoon now.`);
  });
});

describe('seeded friendship plans', () => {
  it('later levels keep their earned sunlight preference outside the afternoon nap', () => {
    for (const level of [7, 8, 9, 15]) {
      let sun = 0, n = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const p = planAct(input(level, seed, { hour: 11 }));
        if (p.kind === 'wander' || p.kind === 'sit') { n++; sun += Number(spotInSun(ground, last(p))); }
      }
      expect(sun / n, `level ${level}`).toBeGreaterThan(0.8);
    }
  });

  it('level 5 follows sunlight more often than level 4, while level 7 naps nearer the front', () => {
    const totals = (level: number) => {
      let sun = 0, n = 0, depth = 0, naps = 0;
      for (let seed = 1; seed <= 700; seed++) {
        const p = planAct(input(level, seed));
        if (p.kind === 'wander' || p.kind === 'sit') { n++; sun += Number(spotInSun(ground, last(p))); }
        if (p.kind === 'nap') { naps++; depth += last(p).depth; }
      }
      return { sun: sun / n, depth: depth / naps, naps };
    };
    const four = totals(4), five = totals(5), seven = totals(7);
    expect(four.naps).toBeGreaterThan(50);
    expect(five.sun).toBeGreaterThan(0.8);
    expect(five.sun - four.sun).toBeGreaterThan(0.3);
    expect(seven.depth - four.depth).toBeGreaterThan(0.2);
    expect(seven.depth).toBeGreaterThan(0.82);
  });

  it('at least 85% of level 8 afternoon naps settle beside the named friend, not a different pet', () => {
    let naps = 0, beside = 0;
    for (let seed = 1; seed <= 700; seed++) {
      const p = planAct(input(8, seed));
      if (p.kind !== 'nap') continue;
      naps++;
      const to = last(p);
      if (Math.abs(to.x - friendAt.x) >= ground.petSize * 0.5 && Math.abs(to.x - friendAt.x) <= ground.petSize && Math.abs(to.depth - friendAt.depth) < 0.05) beside++;
    }
    expect(naps).toBeGreaterThan(250);
    expect(beside / naps).toBeGreaterThanOrEqual(0.85);
  });

  it('an absent or mismatched friend uses the same safe solo nap spot instead of stale coordinates', () => {
    const spots = [undefined, { key: 'another-pet', spot: friendAt }].map((f) => {
      const naps = Array.from({ length: 100 }, (_, i) => planAct(input(8, i + 1, { friend: f }))).filter((p) => p.kind === 'nap').map(last);
      expect(naps.length).toBeGreaterThan(35);
      expect(new Set(naps.map((s) => `${s.x}/${s.depth}`)).size).toBe(1);
      expect(naps.every((s) => !s.perch && s.x >= ground.x0 && s.x <= ground.x1)).toBe(true);
      return naps[0];
    });
    expect(spots[0]).toEqual(spots[1]);
  });

  it('solo afternoon naps keep their spot as the sun moves, and never try to share a narrow pot rim', () => {
    const nap = (extra: object) => Array.from({ length: 100 }, (_, i) => planAct(input(8, i + 1, extra))).filter((p) => p.kind === 'nap').map(last);
    const alone = nap({ friend: undefined });
    expect(nap({ friend: undefined, ground: { ...ground, beam: { ...ground.beam!, x0: 105, x1: 145 } } })).toEqual(alone);
    expect(nap({ friend: { key: friend, spot: { ...friendAt, perch: 'rim', y: 30 } } })).toEqual(alone);
  });

  it('leaves the original plans exactly alone at level 4, including beds and night routines', () => {
    const baseline = { ...input(4, 1), bond: undefined, friend: undefined };
    for (const night of [false, true]) for (let seed = 1; seed <= 150; seed++) {
      expect(planAct({ ...input(4, seed), night })).toEqual(planAct({ ...baseline, night, rnd: seeded(seed) }));
      if (night) expect(planAct({ ...input(9, seed), night })).toEqual(planAct({ ...baseline, night, rnd: seeded(seed) }));
    }
  });

  it('level 9 spends most daytime acts resting at the front, including from a home perch', () => {
    let front = 0;
    for (let seed = 1; seed <= 500; seed++) {
      const p = planAct(input(9, seed, { at: { ...from, perch: 'rim', perchId: 'home', y: 50 }, hour: 11 }));
      if (!last(p).perch && last(p).depth >= 0.82) front++;
    }
    expect(front / 500).toBeGreaterThan(0.7);
  });
});

describe('still and reduced-motion friendship placement', () => {
  it.each([7, 9])('level %s starts in the front band even with a home rim', (level) => {
    const pets = scene(level);
    pets[0] = { ...pets[0]!, home: 'h' };
    const g: Ground = { ...ground, perches: [{ id: 'home', owner: 'h', kind: 'rim', x: 125, y: 50, depth: 0.3, z: 400, w: 12 }] };
    const a = arrangePets(g, pets, moment);
    expect(a.get(me)!.perch).toBeUndefined();
    expect(a.get(me)!.depth).toBeGreaterThan(0.82);
    expect(arrangePets(g, pets, moment)).toEqual(a);
  });

  it('a level 8 pair starts side by side, with a safe solo fallback after its friend leaves', () => {
    const pets = scene(8);
    const a = arrangePets(ground, pets, moment);
    expect(Math.abs(a.get(me)!.x - a.get(friend)!.x)).toBeLessThanOrEqual(ground.petSize);
    expect(a.get(me)!.depth).toBe(a.get(friend)!.depth);
    expect(a.get(me)!.asleep).toBe(true);
    const alone = arrangePets(ground, pets.slice(0, 1), moment);
    expect(alone.size).toBe(1);
    expect(alone.get(me)!.asleep).toBe(true);
    expect(alone).toEqual(arrangePets(ground, pets.slice(0, 1), moment));
  });

  it('reduced motion holds the earned front placement across relocation timers', () => {
    vi.useFakeTimers();
    const pets = scene(9);
    const spots = arrangePets(ground, pets, moment);
    const director = new Director(pets.map((p) => ({ key: p.key!, species: 'cat', ground, place: 'sill', bond: bondOf(p) })), spots, { moment, reduced: () => true, vignettes: false });
    director.start();
    const before = director.views.get(me)!.peek();
    vi.advanceTimersByTime(180_000);
    expect(director.views.get(me)!.peek()).toEqual(before);
    director.stop();
  });

  it('the existing nap pile keeps chosen friends together without changing its chance', () => {
    const v = vignetteById('nap-pile')!;
    const actors = ['a', 'b', 'c', 'd', 'e', 'f'].map((key, i) => ({ key, species: 'cat' as const, spot: { ...from, x: 20 + i * 23 }, ...(key === 'a' ? { bond: { napWith: 'f', sunBias: 0.9, frontBias: 0.85 } } : {}) }));
    const night = { ...moment, light: lightAtSun(1, true), hour: 23.5 };
    const cast = v.cast({ place: 'sill', ground, moment: night, actors })!;
    expect(v.weight).toBe(0.8);
    expect(cast.slice(0, 2)).toEqual(['a', 'f']);
  });
});
