/** The pets' behaviour: act weights by personality and hour, plans that stay on the ground, the vignette registry and the director's timing. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lightAtSun } from '../lighting';
import { skyTime, type Moment } from '../time';
import { ROOM } from '../palette';
import { SILL_SPEC } from '../sill/layout';
import { sillWorld } from '../sill/world';
import { seeded } from '../sill/scenery';
import { arrangePets, routineAt, type Ground } from '../arrange';
import type { SillPot, ShelfPet } from '../model';
import { PLACE_SCENES } from '../places';
import { ACT_KINDS, actWeights, pickAct, planAct } from './plan';
import { findVignette, registerVignette, VIGNETTES, vignetteById, type VignetteContext } from './vignettes';
import { stageVignette } from './stage';
import { Director, REDUCED_RELOCATE_MS } from './director';

const at = (sun: number, night = false, hour = night ? 23.5 : 8 + sun * 10): Moment => {
  const light = lightAtSun(sun, night);
  return { light, time: skyTime(light), season: 'autumn', hour };
};
const POTS: SillPot[] = [0, 1, 2].map((i) => ({ habitId: `h${i}`, species: 'pothos', stage: 4, pot: 'cream' }));
const sill = (night = false): Ground => sillWorld(SILL_SPEC, POTS, [], night ? ROOM.night : ROOM.day, night ? 1 : 0.5, 0).ground;

describe('act weights', () => {
  it('follow the personality', () => {
    const sleepy = actWeights('sleepy', 14, false);
    const playful = actWeights('playful', 14, false);
    expect(sleepy.nap).toBeGreaterThan(playful.nap);
    expect(playful.play).toBeGreaterThan(sleepy.play);
  });

  it('send everyone to sleep from eleven, and toward sitting under the lamp in the evening', () => {
    expect(routineAt(23.2)).toBe('sleep');
    expect(routineAt(3)).toBe('sleep');
    expect(routineAt(21)).toBe('lamp');
    expect(routineAt(15)).toBe('day');
    const late = actWeights('playful', 23.5, true);
    const total = ACT_KINDS.reduce((s, k) => s + late[k], 0);
    expect(late.nap / total).toBeGreaterThan(0.8);
    expect(late.play).toBe(0);
  });

  it('pick in proportion to the weights', () => {
    const w = { idle: 1, wander: 0, sit: 0, nap: 3, play: 0 };
    expect(pickAct(w, 0.1)).toBe('idle');
    expect(pickAct(w, 0.5)).toBe('nap');
    expect(pickAct(w, 0.9999)).toBe('nap');
  });
});

describe('plans', () => {
  it('stay on the ground or on a perch, and end holding still', () => {
    const g = sill();
    const rnd = seeded(5);
    const pet: ShelfPet = { petId: 'pet-cat-calico', personality: 'playful' };
    let spot = arrangePets(g, [pet], at(0.5)).get('pet-cat-calico')!;
    for (let i = 0; i < 200; i++) {
      const { steps } = planAct({ species: 'cat', personality: 'playful', at: spot, ground: g, hour: 14, night: false, taken: [], rnd });
      expect(steps.length).toBeGreaterThan(0);
      const last = steps[steps.length - 1]!;
      expect(last.move).toBe(0);
      expect(last.spot.pose).not.toBe('walk');
      for (const s of steps) {
        if (s.spot.perch) continue;
        expect(s.spot.x).toBeGreaterThanOrEqual(g.x0);
        expect(s.spot.x).toBeLessThanOrEqual(g.x1);
      }
      spot = last.spot;
    }
  });

  it('walk at the species’ pace: a cow takes longer than a cat over the same distance', () => {
    const g = sill();
    const from = { x: g.x0 + 10, depth: 0.6, y: 80, pose: 'sit' as const, facing: 'right' as const, asleep: false };
    const walk = (species: 'cat' | 'cow') => {
      for (let seed = 1; seed < 200; seed++) {
        const { kind, steps } = planAct({ species, at: from, ground: g, hour: 14, night: false, taken: [], rnd: seeded(seed) });
        if (kind === 'wander' && steps[0]!.walk) return steps[0]!.move / Math.abs(steps[0]!.spot.x - from.x);
      }
      return 0;
    };
    expect(walk('cow')).toBeGreaterThan(walk('cat'));
  });
});

describe('vignettes', () => {
  const ctx = (species: string[], moment = at(0.5), place: VignetteContext['place'] = 'sill', ground = sill(moment.light.night)): VignetteContext => ({
    place,
    ground,
    moment,
    actors: species.map((s, i) => ({ key: `${s}${i}`, species: s as never, spot: { x: ground.x0 + 20 + i * 30, depth: 0.6, y: 80, pose: 'sit', facing: 'right', asleep: false } })),
  });

  it('live in a registry with at least two cross-pet scenes', () => {
    const ids = VIGNETTES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['cat-on-cow', 'duck-line', 'nap-pile']));
  });

  it('put a cat to sleep on a cow’s back', () => {
    const c = ctx(['cow', 'cat']);
    const v = vignetteById('cat-on-cow')!;
    const cast = v.cast(c)!;
    expect(cast).toEqual(['cow0', 'cat1']);
    const spots = v.stage(c, cast);
    const cow = spots.get('cow0')!;
    const cat = spots.get('cat1')!;
    expect(cat.y).toBeLessThan(cow.y);
    expect(cat.z!).toBeGreaterThan(cow.z!);
    expect(cat).toMatchObject({ asleep: true, perch: 'back' });
    expect(v.cast(ctx(['cat', 'cat']))).toBeNull();
  });

  it('line ducks up one behind another, all facing the same way', () => {
    const c = ctx(['duck', 'duck', 'duck', 'cat']);
    const v = vignetteById('duck-line')!;
    const cast = v.cast(c)!;
    expect(cast).toHaveLength(3);
    const spots = cast.map((k) => v.stage(c, cast).get(k)!);
    expect(new Set(spots.map((s) => s.facing)).size).toBe(1);
    const dir = spots[0]!.facing === 'right' ? 1 : -1;
    // Single file with clear space between: nearly a body length (half the canvas) apart.
    for (let i = 1; i < spots.length; i++) expect((spots[i - 1]!.x - spots[i]!.x) * dir).toBeGreaterThan(c.ground.petSize * 0.9);
    expect(v.stagger).toBeGreaterThan(0);
    expect(v.cast(ctx(['duck', 'cat']))).toBeNull();
    expect(v.cast(ctx(['duck', 'duck'], at(1, true)))).toBeNull();
  });

  it('pile everyone up for a nap late at night, on the Quilt when it is there', () => {
    const quilt = PLACE_SCENES.quilt.ground(ROOM.night, 26);
    const c = ctx(['bear', 'dog', 'hamster', 'cat'], at(1, true, 23.5), 'quilt', quilt);
    const v = vignetteById('nap-pile')!;
    const cast = v.cast(c)!;
    expect(cast).toHaveLength(4);
    const spots = [...v.stage(c, cast).values()];
    for (const s of spots) expect(s.asleep).toBe(true);
    const bed = quilt.perches.find((p) => p.kind === 'bed')!;
    for (const s of spots) expect(Math.abs(s.x - bed.x)).toBeLessThan(26);
    expect(v.cast(ctx(['bear', 'dog', 'cat'], at(0.5)))).toBeNull();
  });

  it('can be added to, and are found only when they can play and pass their chance', () => {
    registerVignette({ id: 'test-only', caption: 'Test.', weight: 1, hold: 1, cast: (c) => (c.actors.length === 9 ? ['x'] : null), stage: () => new Map() });
    expect(vignetteById('test-only')).toBeDefined();
    VIGNETTES.splice(VIGNETTES.findIndex((v) => v.id === 'test-only'), 1);
    const c = ctx(['duck', 'duck', 'cat']);
    expect(findVignette(c, 0)?.vignette.id).toBe('duck-line');
    expect(findVignette(c, 0.99)).toBeNull();
    // The cat on a cow's back waits for the lying cow (the round cow would hide under the cat).
    expect(findVignette(ctx(['cow', 'cat']), 0)).toBeNull();
  });

  it('can be staged on a still scene', () => {
    const g = sill();
    const pets: ShelfPet[] = [{ petId: 'pet-bunny-lop' }];
    const spots = stageVignette('bunny-leaf', 'sill', g, at(0.5), pets, arrangePets(g, pets, at(0.5)));
    const bunny = spots.get('pet-bunny-lop')!;
    const rim = g.perches.filter((p) => p.kind === 'rim').reduce((a, b) => (Math.abs(a.x - bunny.x) < Math.abs(b.x - bunny.x) ? a : b));
    // Up on the nearest pot's rim at its edge, facing the plant, stretched up and leaning in.
    expect(Math.abs(bunny.x - rim.x)).toBeLessThan(g.petSize);
    expect(Math.abs(bunny.x - rim.x)).toBeLessThanOrEqual(rim.w / 2);
    expect(bunny.y).toBeCloseTo(rim.y);
    expect(bunny.perch).toBe('rim');
    expect(bunny.reach).toBe(true);
    expect(bunny.facing).toBe(bunny.x > rim.x ? 'left' : 'right');
    expect(bunny.pose).toBe('sit');
    // Not staged while it waits for its art.
    const still = stageVignette('cat-on-cow', 'sill', g, at(0.5), [{ petId: 'pet-cow-beltie' }, { petId: 'pet-cat-calico' }], new Map());
    expect(still.size).toBe(0);
  });
});

describe('the director', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const cast = (g: Ground) => [
    { key: 'a', species: 'cat' as const, personality: 'playful' as const, place: 'sill' as const, ground: g },
    { key: 'b', species: 'cow' as const, personality: 'curious' as const, place: 'sill' as const, ground: g },
  ];

  it('moves pets on a timer, a signal update per step, and stops cleanly', () => {
    const g = sill();
    const pets = cast(g);
    const start = arrangePets(g, pets.map((p) => ({ petId: p.key === 'a' ? 'pet-cat-calico' : 'pet-cow-beltie', key: p.key })), at(0.5));
    const d = new Director(pets, start, { moment: at(0.5), reduced: () => false, vignettes: false });
    const before = JSON.stringify([...d.views.values()].map((v) => v.peek()));
    d.start();
    vi.advanceTimersByTime(60000);
    expect(JSON.stringify([...d.views.values()].map((v) => v.peek()))).not.toBe(before);
    d.stop();
    const frozen = JSON.stringify([...d.views.values()].map((v) => v.peek()));
    vi.advanceTimersByTime(60000);
    expect(JSON.stringify([...d.views.values()].map((v) => v.peek()))).toBe(frozen);
  });

  it('under reduced motion holds still, then relocates one pet at most every 30 s', () => {
    const g = sill();
    const pets = cast(g);
    const start = arrangePets(g, pets.map((p) => ({ petId: 'pet-cat-calico', key: p.key })), at(0.5));
    const d = new Director(pets, start, { moment: at(0.5), reduced: () => true });
    const snap = () => [...d.views.values()].map((v) => JSON.stringify(v.peek()));
    const first = snap();
    d.start();
    vi.advanceTimersByTime(REDUCED_RELOCATE_MS - 10);
    expect(snap()).toEqual(first);
    vi.advanceTimersByTime(20);
    const changed = snap().filter((s, i) => s !== first[i]).length;
    expect(changed).toBeLessThanOrEqual(1);
    for (const v of d.views.values()) expect(v.peek().move ?? 0).toBe(0);
    d.stop();
  });
});
