/**
 * The Shelf's geometry and light: layout of the Sill and the band, depth order, the sunbeam against
 * the sun, placement bounds in every place, the night lamp, and the band's collapse math.
 */
import { describe, expect, it } from 'vitest';
import { NIGHT_LIGHT, windowLight } from '@/art/light';
import { PLACES } from '@/catalog/places';
import type { PlaceId } from '@/catalog/types';
import { baseline, byDepth, depthOf, depthScale, depthZ, PLANT_BASELINE } from './room';
import { BAND_MAX_POTS, BAND_SPEC, SILL_SPEC, beamQuad, castVector, inBeam, sillLayout, sunbeam } from './sill/layout';
import { sillWorld } from './sill/world';
import { FACADE_PAINTS, skyFor, starCount, streetFor, terraceFor } from './sill/scenery';
import { childLight, lightAtSun } from './lighting';
import { mirrored } from './fit';
import { momentAt, seasonAt, skyTime, type Moment } from './time';
import { ROOM, outsidePalette } from './palette';
import { bandCollapse, BAND_CLOSED_PX, BAND_OPEN_PX } from './band';
import { POND } from './places/shapes';
import { jarLevel, JAR_LEVELS } from './props/CoinJar';
import { PLACE_SCENES, type RoomPlaceId } from './places';
import { arrangePets } from './arrange';
import type { ShelfPet, SillPot } from './model';

const pot = (i: number, stage = 4): SillPot => ({ habitId: `h${i}`, name: `Habit ${i}`, species: 'pothos', stage, pot: 'terracotta' });
const POTS = Array.from({ length: 6 }, (_, i) => pot(i));

const at = (sun: number, night = false, hour = night ? 23.5 : 8 + sun * 10): Moment => {
  const light = lightAtSun(sun, night);
  return { light, time: skyTime(light), season: 'autumn', hour };
};

const PETS: ShelfPet[] = [
  { petId: 'pet-cat-calico', personality: 'sunny' },
  { petId: 'pet-cow-beltie', personality: 'sleepy' },
  { petId: 'pet-cat-grey', personality: 'sassy', home: 'h1' },
  { petId: 'pet-frog-tree', personality: 'curious' },
  { petId: 'pet-duck-yellow', personality: 'playful' },
  { petId: 'pet-duck-pekin', personality: 'gentle' },
  { petId: 'pet-bunny-lop', personality: 'shy' },
  { petId: 'pet-hamster-syrian', personality: 'foodie' },
];

describe('Sill layout', () => {
  it('stands the pots in a row along the window, then the jar, with the lamp against the wall', () => {
    const l = sillLayout(SILL_SPEC, 6, 0);
    const xs = l.pots.map((p) => p.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(new Set(xs.map((x, i) => (i ? +(x - xs[i - 1]!).toFixed(6) : 0)).values()).size).toBeLessThanOrEqual(2);
    expect(l.jar.x).toBeGreaterThan(xs[5]!);
    expect(l.lamp.x).toBeGreaterThan(l.window.x1);
    expect(l.lamp.x).toBeLessThan(l.width);
    for (const x of l.window.stiles) {
      expect(x).toBeGreaterThan(l.window.x0);
      expect(x).toBeLessThan(l.window.x1);
    }
  });

  it('fills the screen and grows with more pots', () => {
    expect(sillLayout(SILL_SPEC, 2, 500).width).toBe(500);
    expect(sillLayout(SILL_SPEC, 12, 0).width).toBeGreaterThan(sillLayout(SILL_SPEC, 6, 0).width);
    expect(sillLayout(SILL_SPEC, 0, 0).pots).toEqual([]);
  });

  it('spreads the band’s pots when there is room, but never past the most generous pitch', () => {
    const tight = sillLayout(BAND_SPEC, 4, 0);
    const wide = sillLayout(BAND_SPEC, 4, 600);
    const pitch = (l: typeof tight) => l.pots[1]!.x - l.pots[0]!.x;
    expect(pitch(wide)).toBeGreaterThan(pitch(tight));
    expect(pitch(wide)).toBeLessThanOrEqual(BAND_SPEC.maxPitch + 1e-9);
    expect(BAND_MAX_POTS).toBe(6);
  });
});

describe('depth', () => {
  it('maps depth to a baseline and back, nearer is lower, larger and in front', () => {
    const rows = SILL_SPEC.rows;
    for (const d of [0, 0.25, 0.5, 1]) expect(depthOf(rows, baseline(rows, d))).toBeCloseTo(d);
    expect(baseline(rows, 1)).toBeGreaterThan(baseline(rows, 0));
    expect(depthScale(1)).toBeGreaterThan(depthScale(0));
    expect(depthZ(0.8)).toBeGreaterThan(depthZ(0.2));
  });

  it('lays flat things under standing ones, and perches just above what they sit on', () => {
    expect(depthZ(0.5, 'flat')).toBeLessThan(depthZ(0.5));
    expect(depthZ(0.5, 'perch')).toBeGreaterThan(depthZ(0.5));
    expect(depthZ(0.4, 'stand')).toBeLessThan(depthZ(0.41, 'flat') + 100);
  });

  it('sorts back to front, then left to right', () => {
    const items = [
      { x: 5, depth: 0.9 },
      { x: 9, depth: 0.1 },
      { x: 1, depth: 0.1 },
    ];
    expect([...items].sort(byDepth)).toEqual([items[2], items[1], items[0]]);
  });
});

describe('the sunbeam', () => {
  const l = sillLayout(SILL_SPEC, 6, 0);
  const rows = SILL_SPEC.rows;

  it('crosses the sill left to right with the sun', () => {
    const xs = [0, 0.25, 0.5, 0.75, 1].map((s) => sunbeam(l.window, rows, s).x0);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    const morning = sunbeam(l.window, rows, 0);
    const evening = sunbeam(l.window, rows, 1);
    expect(morning.x0).toBeCloseTo(l.window.x0);
    expect(evening.x1).toBeCloseTo(l.window.x1);
  });

  it('leans away from the sun, and stays on the window’s stretch of sill', () => {
    expect(sunbeam(l.window, rows, 0.1).slant).toBeGreaterThan(0);
    expect(Math.abs(sunbeam(l.window, rows, 0.5).slant)).toBeLessThan(1e-9);
    expect(sunbeam(l.window, rows, 0.9).slant).toBeLessThan(0);
    for (const sun of [0, 0.3, 0.7, 1]) {
      for (const [x] of beamQuad(sunbeam(l.window, rows, sun), rows)) {
        expect(x).toBeGreaterThanOrEqual(l.window.x0 - 1e-9);
        expect(x).toBeLessThanOrEqual(l.window.x1 + 1e-9);
      }
    }
  });

  it('knows what is in the sun, and casts shadows away from it', () => {
    const b = sunbeam(l.window, rows, 0.5);
    expect(inBeam(b, (b.x0 + b.x1) / 2, 0.5)).toBe(true);
    expect(inBeam(b, b.x0 - 5, 0.5)).toBe(false);
    expect(inBeam(null, 0, 0)).toBe(false);
    expect(castVector(0.1)[0]).toBeGreaterThan(0);
    expect(castVector(0.9)[0]).toBeLessThan(0);
    expect(castVector(0.5)[1]).toBeGreaterThan(0);
  });
});

describe('night flips the light', () => {
  it('hands every child the lamp from the right after dark', () => {
    const night = windowLight(new Date(2026, 8, 29, 22));
    expect(childLight(night)).toEqual(NIGHT_LIGHT);
    expect(childLight(windowLight(new Date(2026, 8, 29, 9))).from).toBe('left');
    expect(momentAt(new Date(2026, 8, 29, 22)).time).toBe('night');
  });

  it('puts the beam out and lights the lamp', () => {
    expect(ROOM.night.beam).toBeNull();
    expect(sillWorld(SILL_SPEC, POTS, [], ROOM.night, 1, 0).beam).toBeNull();
    expect(sillWorld(SILL_SPEC, POTS, [], ROOM.day, 0.5, 0).beam).not.toBeNull();
  });

  it('mirrors the light for flipped art, so its crescent still falls away from the window', () => {
    expect(mirrored({ from: 'left', night: false }).from).toBe('right');
    expect(mirrored({ from: 'top', night: false }).from).toBe('top');
  });

  it('knows the season in both hemispheres', () => {
    expect(seasonAt(new Date(2026, 8, 29))).toBe('autumn');
    expect(seasonAt(new Date(2026, 8, 29), 'south')).toBe('spring');
    expect(seasonAt(new Date(2026, 0, 5))).toBe('winter');
  });
});

describe('the view through the glass', () => {
  it('shows at most twelve stars, whatever the window', () => {
    for (const w of [60, 200, 900, 3000]) expect(starCount(skyFor(0, w, 60))).toBeLessThanOrEqual(12);
  });

  it('is the same street every time', () => {
    expect(streetFor(0, 300, 60)).toBe(streetFor(0, 300, 60));
    expect(outsidePalette('night', 'winter').moon).toBeTruthy();
    expect(outsidePalette('day', 'summer').moon).toBeNull();
  });

  it('paints the terrace across the road in every facade colour the palette has, and keeps the sky open', () => {
    const t = terraceFor(0, 600, 60);
    expect(terraceFor(0, 600, 60)).toBe(t);
    expect(t.walls).toHaveLength(FACADE_PAINTS);
    for (const time of ['dawn', 'day', 'golden', 'night'] as const) expect(outsidePalette(time, 'spring').facades).toHaveLength(FACADE_PAINTS);
    // Rooflines stay in the lower half of the glass: the top of every wall is below y 30 of 60.
    const tops = [...t.walls.join('').matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2]));
    expect(tops.length).toBeGreaterThan(5);
    for (const y of tops) expect(y).toBeGreaterThanOrEqual(30);
    expect(t.awnings.length).toBeGreaterThan(0);
  });
});

describe('the Today band framing', () => {
  it('keeps the top two fifths for the greeting chip and the wallet: no pot canvas reaches above them', () => {
    const top = baseline(BAND_SPEC.rows, BAND_SPEC.backRow) - (PLANT_BASELINE / 100) * BAND_SPEC.scale.pot * depthScale(BAND_SPEC.backRow);
    expect(top).toBeGreaterThanOrEqual(24);
    expect(BAND_SPEC.rows.glassBottom).toBeGreaterThanOrEqual(50);
  });

  it('still shows the pots when collapsed to 64 px', () => {
    const c = bandCollapse(1);
    const px = (units: number) => (units / 100) * BAND_OPEN_PX;
    const foot = px(baseline(BAND_SPEC.rows, BAND_SPEC.backRow));
    // Visible band content spans [clip - follow, clip - follow + 64] in the band's own pixels.
    const from = c.clip - c.follow;
    expect(foot).toBeGreaterThan(from);
    expect(foot).toBeLessThanOrEqual(from + BAND_CLOSED_PX);
  });
});

describe('the Saucer Pond', () => {
  it('lets a frog sit on the lily pad in front of the near water, while ducks swim behind it', () => {
    const scene = PLACE_SCENES.pond;
    const g = scene.ground(ROOM.day, 26);
    const pad = g.perches.find((p) => p.id === 'pond:pad')!;
    expect(pad.z).toBeGreaterThan(scene.frontZ!);
    for (const p of g.perches.filter((q) => q.kind === 'water')) {
      expect(p.z).toBeLessThan(scene.frontZ!);
      // Below the waterline (the water's middle), so the near half of the water hides the duck's body.
      expect(p.y).toBeGreaterThan(POND.cy + 2);
    }
  });
});

describe('placement bounds per place', () => {
  const places = PLACES.map((p) => p.id).filter((id): id is RoomPlaceId => id !== 'sill');
  const moments = [at(0.2), at(0.6), at(1, true, 21), at(1, true, 23.5)];

  it('every place has a ground inside its own segment', () => {
    for (const id of places) {
      const scene = PLACE_SCENES[id];
      const g = scene.ground(ROOM.day, 26);
      expect(g.x0, id).toBeGreaterThanOrEqual(0);
      expect(g.x1, id).toBeLessThanOrEqual(scene.width);
      expect(g.x0, id).toBeLessThan(g.x1);
      expect(g.d0, id).toBeLessThanOrEqual(g.d1);
      for (const p of g.perches) {
        expect(p.x, `${id} ${p.id}`).toBeGreaterThan(0);
        expect(p.x, `${id} ${p.id}`).toBeLessThan(scene.width);
        expect(p.y, `${id} ${p.id}`).toBeGreaterThan(0);
        expect(p.y, `${id} ${p.id}`).toBeLessThan(100);
      }
      const [cx, cy, cw, ch] = scene.crop;
      expect(cx + cw, id).toBeLessThanOrEqual(scene.width + 1e-9);
      expect(cy + ch, id).toBeLessThanOrEqual(100 + 1e-9);
      expect(cw / ch, id).toBeCloseTo(1.5, 1);
    }
  });

  it('puts every pet on the ground or a perch, in every place and at every hour', () => {
    const grounds: [PlaceId, ReturnType<typeof PLACE_SCENES.pond.ground>][] = [
      ['sill', sillWorld(SILL_SPEC, POTS, [], ROOM.day, 0.5, 0).ground],
      ...places.map((id) => [id, PLACE_SCENES[id].ground(ROOM.day, 26)] as [PlaceId, ReturnType<typeof PLACE_SCENES.pond.ground>]),
    ];
    for (const [id, g] of grounds) {
      for (const m of moments) {
        const spots = arrangePets(g, PETS, m);
        expect(spots.size, id).toBe(PETS.length);
        for (const [key, s] of spots) {
          if (s.perch) {
            expect(g.perches.some((p) => p.id === s.perchId), `${id} ${key}`).toBe(true);
          } else {
            expect(s.x, `${id} ${key}`).toBeGreaterThanOrEqual(g.x0);
            expect(s.x, `${id} ${key}`).toBeLessThanOrEqual(g.x1);
            expect(s.depth, `${id} ${key}`).toBeGreaterThanOrEqual(g.d0);
            expect(s.depth, `${id} ${key}`).toBeLessThanOrEqual(g.d1);
          }
        }
      }
    }
  });

  it('seats a resident on its own pot’s rim, and everyone asleep after eleven', () => {
    const g = sillWorld(SILL_SPEC, POTS, [], ROOM.day, 0.5, 0).ground;
    const day = arrangePets(g, PETS, at(0.5));
    expect(day.get('pet-cat-grey')).toMatchObject({ perch: 'rim', perchId: 'rim:h1' });
    const late = arrangePets(sillWorld(SILL_SPEC, POTS, [], ROOM.night, 1, 0).ground, PETS, at(1, true, 23.5));
    for (const s of late.values()) expect(s.asleep).toBe(true);
  });

  it('keeps a cutting in its glass free of residents (no rim yet)', () => {
    const world = sillWorld(SILL_SPEC, [pot(0, 1), pot(1, 5)], [], ROOM.day, 0.5, 0);
    expect(world.ground.perches.map((p) => p.owner)).toEqual(['h1']);
  });
});

describe('the Today band collapse', () => {
  it('clamps between open and collapsed', () => {
    expect(bandCollapse(-1)).toMatchObject({ t: 0, clip: 0, height: BAND_OPEN_PX });
    expect(bandCollapse(2)).toMatchObject({ t: 1, clip: BAND_OPEN_PX - BAND_CLOSED_PX, height: BAND_CLOSED_PX });
    expect(bandCollapse(Number.NaN)).toMatchObject({ t: 0, clip: 0 });
  });

  it('crops and follows in proportion, so the pots stay in view', () => {
    const half = bandCollapse(0.5);
    expect(half.clip).toBeCloseTo((BAND_OPEN_PX - BAND_CLOSED_PX) / 2);
    expect(half.follow).toBeGreaterThan(0);
    expect(half.follow).toBeLessThan(half.clip);
    expect(bandCollapse(1).follow).toBeGreaterThan(half.follow);
  });
});

describe('the coin jar', () => {
  it('shows the first coins, fills with the wallet and stops at full', () => {
    expect(jarLevel(0)).toBe(0);
    expect(jarLevel(-5)).toBe(0);
    expect(jarLevel(1)).toBeGreaterThanOrEqual(1);
    const levels = [5, 25, 142, 400, 1000].map(jarLevel);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(jarLevel(1_000_000)).toBe(JAR_LEVELS);
    expect(jarLevel(Number.NaN)).toBe(0);
  });
});
