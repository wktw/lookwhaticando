import { lighting as machineLighting } from '@/art/machines/lighting';
import { paint } from './decor/kit';
import { CONTACT_DAY, CONTACT_LAMP, SHADE_DAY, SHADE_LAMP } from '@/art/shade';
/**
 * The Shelf's geometry and light: layout of the Sill and the band, depth order, the sunbeam against
 * the sun, placement bounds in every place, the night lamp, and the band's collapse math.
 */
import { describe, expect, it } from 'vitest';
import { DAY_LIGHT, NIGHT_LIGHT, windowLight } from '@/art/light';
import { PLACES } from '@/catalog/places';
import type { PlaceId } from '@/catalog/types';
import { baseline, byDepth, depthOf, depthScale, depthZ, potMetrics } from './room';
import { BAND_MAX_POTS, BAND_SPEC, SILL_SPEC, beamQuad, castVector, inBeam, potCut, sillLayout, sunbeam } from './sill/layout';
import { BEAM_BY_SEASON, openScroll, sillWorld } from './sill/world';
import { GLASS_CLIP, nightMoonX, WindowView } from './sill/Backdrop';
import { BAND_MOON_INSET, bandMoonX } from './WindowsillBand';
import { readdirSync } from 'node:fs';
import { boughsFor, FACADE_PAINTS, skyFor, starCount, streetFor, terraceFor } from './sill/scenery';
import { childLight, lightAtSun } from './lighting';
import { mirrored } from './fit';
import { momentAt, seasonAt, skyTime, type Moment } from './time';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ROOM, outsidePalette, type RoomPalette } from './palette';
import { msToNextQuarter } from './hooks';
import { TAG_MAX_POT_SHARE, TAG_NOTE_MIN_SCENE_PX, tagBox } from './actors/PotSlot';
import { scrollKeyTarget } from './ScrollFrame';
import { SEASONS } from './time';
import { bandCollapse, BAND_CLOSED_PX, BAND_OPEN_PX } from './band';
import { POND } from './places/shapes';
import { jarLevel, JAR_LEVELS } from './props/CoinJar';
import { PLACE_SCENES, type RoomPlaceId } from './places';
import { arrangePets, headBox } from './arrange';
import type { ShelfDecor, ShelfPet, SillPot } from './model';

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

describe('the glass clips the view', () => {
  it('clips the street and the boughs to the glass with an inline style (the global svg rule beats the attribute)', () => {
    const el = WindowView({ x0: 20, x1: 200, bottom: 60, view: outsidePalette('night', 'autumn'), fill: '#000' }) as unknown as { type: string; props: { style?: { overflow?: string } } };
    expect(el.type).toBe('svg');
    expect(el.props.style?.overflow).toBe('hidden');
  });

  it('never leans on an overflow attribute alone anywhere in the Shelf', () => {
    const dir = fileURLToPath(new URL('.', import.meta.url));
    const files = (sub: string): string[] =>
      readdirSync(dir + sub, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'decor' ? [] : files(`${sub}${e.name}/`)) : e.name.endsWith('.tsx') ? [`${sub}${e.name}`] : []));
    for (const file of files('')) {
      for (const line of readFileSync(dir + file, 'utf8').split('\n')) {
        if (line.includes('overflow="hidden"')) expect(line, file).toContain(`style={GLASS_CLIP}`);
      }
    }
    expect(GLASS_CLIP.overflow).toBe('hidden');
  });
});

describe('the Today band framing', () => {
  it('hangs the night moon whole inside the glass, clear of the pinned jamb', () => {
    for (let view = 140; view <= 300; view += 10) {
      const world = sillWorld(BAND_SPEC, POTS.slice(0, 4), [], ROOM.night, 1, view);
      const win = world.layout.window;
      const sky = skyFor(win.x0, win.x1, BAND_SPEC.rows.glassBottom, 3, bandMoonX(view));
      // The crescent reaches one radius either side of its centre.
      expect(sky.moon.x + sky.moon.r, `${view} units`).toBeLessThanOrEqual(view - 3);
      expect(sky.moon.x - sky.moon.r).toBeGreaterThanOrEqual(win.x0);
    }
    expect(BAND_MOON_INSET).toBeGreaterThan(0);
  });

  it('keeps the top two fifths for the greeting chip and the wallet: no pot canvas reaches above them', () => {
    const top = baseline(BAND_SPEC.rows, BAND_SPEC.backRow) - (potMetrics('terracotta').foot / 100) * BAND_SPEC.scale.pot * depthScale(BAND_SPEC.backRow);
    expect(top).toBeGreaterThanOrEqual(24);
    expect(BAND_SPEC.rows.glassBottom).toBeGreaterThanOrEqual(50);
  });

  it('keeps the pot rims and the residents’ heads in the lower 40 px when collapsed to 64 px', () => {
    const c = bandCollapse(1);
    const px = (units: number) => (units / 100) * BAND_OPEN_PX;
    const s = depthScale(BAND_SPEC.backRow);
    const foot = baseline(BAND_SPEC.rows, BAND_SPEC.backRow);
    const rim = px(foot - potMetrics('terracotta').height * BAND_SPEC.scale.pot * s);
    // A resident loafing on the rim: its head rises about a third of its canvas above the rim.
    const head = rim - px(0.36 * BAND_SPEC.scale.pet);
    // Visible band content spans [clip - follow, clip - follow + 64] in the band's own pixels.
    const from = c.clip - c.follow;
    expect(head).toBeGreaterThanOrEqual(from + BAND_CLOSED_PX - 40 - 2);
    expect(rim).toBeLessThanOrEqual(from + BAND_CLOSED_PX - 8);
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

  it('seats a resident on its own pot’s rim, and everyone asleep after eleven but the hamster, who is up at night', () => {
    const g = sillWorld(SILL_SPEC, POTS, [], ROOM.day, 0.5, 0).ground;
    const day = arrangePets(g, PETS, at(0.5));
    expect(day.get('pet-cat-grey')).toMatchObject({ perch: 'rim', perchId: 'rim:h1' });
    // A hamster naps through the day (DESIGN §8.2 routines, bent for a nocturnal species).
    expect(day.get('pet-hamster-syrian')?.asleep).toBe(true);
    const late = arrangePets(sillWorld(SILL_SPEC, POTS, [], ROOM.night, 1, 0).ground, PETS, at(1, true, 23.5));
    for (const [key, s] of late) expect(s.asleep, key).toBe(key !== 'pet-hamster-syrian');
  });

  it('seats a cutting’s resident on the sill beside its glass (no rim yet), on the side away from its empty pot', () => {
    const world = sillWorld(SILL_SPEC, [pot(0, 1), pot(1, 5)], [], ROOM.day, 0.2, 0);
    expect(world.ground.perches.map((p) => `${p.kind}:${p.owner}`)).toEqual(['glass:h0', 'rim:h1']);
    const glass = world.ground.perches[0]!;
    // Morning light from the left: the empty pot stands to the right, the resident to the left of the glass.
    expect(glass.x).toBeLessThan(world.layout.pots[0]!.x);
    expect(glass.y).toBeCloseTo(baseline(SILL_SPEC.rows, world.layout.pots[0]!.depth));
    const spots = arrangePets(world.ground, [{ petId: 'pet-cat-grey', home: 'h0' }], at(0.2));
    expect(spots.get('pet-cat-grey')).toMatchObject({ perch: 'glass', perchId: 'glass:h0' });
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

describe('the Today band’s pinned end', () => {
  it('never slices a pot at the start of the row, whatever the screen width', () => {
    for (const n of [4, 5, 6]) {
      for (let view = 140; view <= 300; view += 1) {
        const l = sillLayout(BAND_SPEC, n, view);
        for (const p of l.pots) expect(potCut(BAND_SPEC, p.x, view), `${n} pots, ${view} units, pot at ${p.x}`).toBe(false);
      }
    }
  });
});

describe('the night sky', () => {
  it('hangs the moon where the scene opens after dark (a phone, 390×300)', () => {
    const viewU = (390 / 300) * 100;
    for (const pots of [1, 3, 6, 9]) {
      const world = sillWorld(SILL_SPEC, POTS.slice(0, pots).concat(Array.from({ length: Math.max(0, pots - 6) }, (_, i) => pot(10 + i))), [], ROOM.night, 1, pots <= 3 ? viewU : 0);
      const left = openScroll(world, viewU);
      const win = world.layout.window;
      const sky = skyFor(win.x0, win.x1, SILL_SPEC.rows.glassBottom, 3, nightMoonX(world.layout));
      expect(sky.moon.x - sky.moon.r, `${pots} pots`).toBeGreaterThanOrEqual(left);
      expect(sky.moon.x + sky.moon.r, `${pots} pots`).toBeLessThanOrEqual(left + viewU);
      expect(starCount(sky)).toBeLessThanOrEqual(12);
    }
  });

  it('keeps the tree’s boughs off the moon', () => {
    const b = boughsFor(0, 400, 60, 11, 300);
    const xs = [...b.wood.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));
    for (const x of xs) expect(Math.abs(x - 300)).toBeGreaterThan(8);
  });
});

describe('the seasons through the glass', () => {
  it('paints the view differently in every season, and a bare tree in winter', () => {
    const noon = SEASONS.map((season) => outsidePalette('day', season));
    expect(new Set(noon.map((v) => v.sky.join())).size).toBe(4);
    expect(new Set(noon.map((v) => JSON.stringify(v.bough))).size).toBe(4);
    expect(outsidePalette('day', 'winter').bough).toMatchObject({ leaf: null, snow: expect.any(String) });
    expect(outsidePalette('day', 'spring').bough.dots).toBeTruthy();
    expect(boughsFor(0, 300, 60).wood.length).toBeGreaterThan(0);
  });

  it('keeps every season apart after dark too: its own sky, and boughs a clear step off it', () => {
    const nights = SEASONS.map((season) => outsidePalette('night', season));
    expect(new Set(nights.map((v) => v.sky.join())).size).toBe(4);
    expect(new Set(nights.map((v) => JSON.stringify(v.bough))).size).toBe(4);
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
    };
    for (const v of nights) {
      const leaf = v.bough.leaf ?? v.bough.snow!;
      expect(Math.abs(lum(leaf) - lum(v.sky[0])), leaf).toBeGreaterThan(12);
    }
    expect(outsidePalette('night', 'winter').snow).toBe(true);
  });

  it('throws a long low patch of sun in winter and a short one in summer', () => {
    expect(BEAM_BY_SEASON.winter).toBeGreaterThan(BEAM_BY_SEASON.spring);
    expect(BEAM_BY_SEASON.summer).toBeLessThan(BEAM_BY_SEASON.spring);
    const w = sillWorld(SILL_SPEC, POTS, [], ROOM.day, 0.5, 0, 'winter').beam!;
    const su = sillWorld(SILL_SPEC, POTS, [], ROOM.day, 0.5, 0, 'summer').beam!;
    expect(w.x1 - w.x0).toBeGreaterThan(su.x1 - su.x0);
  });
});

describe('the clock', () => {
  it('re-reads the window at the next quarter hour', () => {
    expect(msToNextQuarter(new Date(2026, 8, 29, 10, 0, 0))).toBe(15 * 60000);
    expect(msToNextQuarter(new Date(2026, 8, 29, 10, 14, 30))).toBe(30000);
    expect(msToNextQuarter(new Date(2026, 8, 29, 23, 59, 59, 500))).toBe(1000);
  });
});

describe('plant tags', () => {
  const named = POTS.map((p) => ({ ...p, name: 'Drink water', note: 'after coffee' }));

  it('never cover a resident’s head, day or night', () => {
    const pets: ShelfPet[] = POTS.map((p, i) => ({ petId: i % 2 ? 'pet-cow-highland' : 'pet-cat-grey', home: p.habitId }));
    for (const [room, m] of [
      [ROOM.day, at(0.5)],
      [ROOM.night, at(1, true)],
    ] as const) {
      const world = sillWorld(SILL_SPEC, named, [], room, m.light.sun, 130);
      const spots = arrangePets(world.ground, pets, m);
      for (const place of world.pots) {
        const tag = tagBox(place, 'Drink water', 'after coffee', 300);
        for (const spot of spots.values()) {
          const [a, b, c, d] = headBox(spot, SILL_SPEC.scale.pet);
          const overlap = tag[0] < c && a < tag[2] && tag[1] < d && b < tag[3];
          expect(overlap, `tag ${place.habitId} over a head at ${spot.x}`).toBe(false);
        }
      }
    }
  });

  it('stand low against the pot, below the rim, no taller than a third of it (the Sill from 300 px; the band hides them)', () => {
    for (const spec of [SILL_SPEC]) {
      const world = sillWorld(spec, named, [], ROOM.day, 0.5, 130);
      for (const place of world.pots) {
        for (const sceneH of [300, 440, 520, 700]) {
          const [, y0, , y1] = tagBox(place, 'Drink water', 'after coffee', sceneH);
          expect(y0, `${sceneH} px`).toBeGreaterThan(place.rimY);
          expect(y1 - y0, `${sceneH} px`).toBeLessThanOrEqual(place.potH * TAG_MAX_POT_SHARE + 1e-6);
        }
      }
    }
  });

  it('use legible type and leave the note off a short scene rather than cut it', () => {
    const place = sillWorld(SILL_SPEC, named, [], ROOM.day, 0.5, 130).pots[0]!;
    const tall = tagBox(place, 'Read', 'before bed', TAG_NOTE_MIN_SCENE_PX);
    const short = tagBox(place, 'Read', 'before bed', 300);
    expect(short[3] - short[1]).toBeLessThan(tall[3] - tall[1]);
    // The name alone is at least 11 px tall on a 168 px scene.
    const band = tagBox(place, 'Read', undefined, 168);
    expect(((band[3] - band[1]) * 168) / 100).toBeGreaterThanOrEqual(11);
  });
});

describe('scrolling the Shelf from the keyboard', () => {
  it('steps with the arrows and jumps with Home and End, inside the range', () => {
    expect(scrollKeyTarget('ArrowRight', 0, 500, 120)).toBe(120);
    expect(scrollKeyTarget('ArrowRight', 450, 500, 120)).toBe(500);
    expect(scrollKeyTarget('ArrowLeft', 60, 500, 120)).toBe(0);
    expect(scrollKeyTarget('Home', 300, 500, 120)).toBe(0);
    expect(scrollKeyTarget('End', 0, 500, 120)).toBe(500);
    expect(scrollKeyTarget('a', 0, 500, 120)).toBeNull();
  });
});

describe('the scene’s art tokens', () => {
  const css = readFileSync(fileURLToPath(new URL('../../styles/tokens.css', import.meta.url)), 'utf8');
  const block = (selector: string) => css.slice(css.indexOf(selector), css.indexOf('}', css.indexOf(selector)));
  const token = (text: string, name: string) => text.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim();
  const norm = (v?: string) => v?.replace(/\s+/g, '').toLowerCase();

  it('match tokens.css by day and by lamplight, so they cannot drift', () => {
    const day = block(':root {');
    const night = block(":root[data-theme='night']");
    const check = (room: RoomPalette, text: string) => {
      expect(norm(room.tokens.shade)).toBe(norm(token(text, '--shade')));
      expect(norm(room.tokens.contact)).toBe(norm(token(text, '--contact')));
      expect(norm(room.tokens.sun)).toBe(norm(token(text, '--sun')));
    };
    for (const t of ['dawn', 'day', 'golden'] as const) check(ROOM[t], day);
    check(ROOM.night, night);
  });

  it('give the cabinets, the decor and the scenes one shade and one contact ink in each light', () => {
    const day = block(':root {');
    const night = block(":root[data-theme='night']");
    const lamp = machineLighting(NIGHT_LIGHT);
    expect(norm(lamp.shade)).toBe(norm(token(night, '--shade')));
    expect(norm(lamp.contact)).toBe(norm(token(night, '--contact')));
    expect(norm(machineLighting(DAY_LIGHT).shade)).toBe(norm(`var(--shade,${token(day, '--shade')})`));
    const decorNight = paint({ night: true });
    expect(norm(decorNight.shade)).toBe(norm(token(night, '--shade')));
    expect(norm(decorNight.contact)).toBe(norm(token(night, '--contact')));
    expect(norm(SHADE_DAY)).toBe(norm(token(day, '--shade')));
    expect(norm(CONTACT_DAY)).toBe(norm(token(day, '--contact')));
    // The named inks, for art that must look right whatever the page theme.
    expect(norm(token(day, '--shade-day'))).toBe(norm(SHADE_DAY));
    expect(norm(token(day, '--shade-lamp'))).toBe(norm(SHADE_LAMP));
    expect(norm(token(day, '--contact-day'))).toBe(norm(CONTACT_DAY));
    expect(norm(token(day, '--contact-lamp'))).toBe(norm(CONTACT_LAMP));
    expect(norm(SHADE_LAMP)).toBe(norm(token(night, '--shade')));
    expect(norm(CONTACT_LAMP)).toBe(norm(token(night, '--contact')));
  });
});

describe('the rituals on the sill', () => {
  const overlaps = (a: readonly [number, number], b: readonly [number, number]) => a[0] < b[1] && b[0] < a[1];
  const noteSpan = (w: ReturnType<typeof sillWorld>) => {
    const n = w.rituals.note!;
    const hw = (n.size * depthScale(n.depth)) / 2;
    return [n.x - hw, n.x + hw] as const;
  };

  it('the note leans by the coin jar when nothing is there', () => {
    const w = sillWorld(SILL_SPEC, POTS, [], ROOM.day, 0.5, 0, 'spring', { note: true });
    const jarS = SILL_SPEC.scale.jar * depthScale(w.layout.jar.depth);
    expect(w.rituals.note!.x).toBeCloseTo(w.layout.jar.x - jarS * 0.5, 5);
  });

  // The Shelf's axe check failed from late morning to mid-afternoon: the frog asleep in the hot-water bottle beside
  // the coin jar sat behind the note's button. This is the demo household as the Shelf drew it at 13:25.
  it('never stands in front of a pet, in the demo household at midday', () => {
    const pots: SillPot[] = [
      { habitId: 'h-c6cfc1kh', name: 'Drink water', species: 'pothos', stage: 5, pot: 'terracotta', routine: 'water' },
      { habitId: 'h-lr6ig8cq', name: 'Take vitamins', species: 'catgrass', stage: 6, pot: 'cream' },
      { habitId: 'h-4bbqamss', name: 'Go for a walk', species: 'snakeplant', stage: 5, pot: 'terracotta', routine: 'walk' },
      { habitId: 'h-n8kidz11', name: 'Read', species: 'begonia', stage: 5, pot: 'blush', routine: 'read' },
      { habitId: 'h-8d1oyy9t', name: 'Yoga', species: 'pilea', stage: 6, pot: 'terracotta', routine: 'mat' },
      { habitId: 'h-mi7f0ns7', name: 'Deep clean', species: 'snakeplant', stage: 4, pot: 'terracotta' },
      { habitId: 'h-tie9r1bj', name: 'Phone-free bedtime', species: 'catgrass', stage: 5, pot: 'terracotta', routine: 'sleep' },
    ];
    const decor: ShelfDecor[] = [
      { key: 'd-14fcpk', itemId: 'keepsake:k-h-n8kidz11-1', frac: { x: 0.308, y: 0.8 }, flip: false, keepsake: 'read' },
      { key: 'd-dve3kp', itemId: 'decor-yarn-ball', frac: { x: 0.704, y: 0.522 }, flip: false },
      { key: 'd-j1dab1', itemId: 'decor-lily-pad', frac: { x: 0.253, y: 0.749 }, flip: false },
      { key: 'd-ntetvu', itemId: 'keepsake:k-h-n8kidz11-4', frac: { x: 0.771, y: 0.8 }, flip: false, keepsake: 'read' },
      { key: 'd-y50a1c', itemId: 'decor-watering-can', frac: { x: 0.147, y: 0.421 }, flip: true },
      { key: 'd-3fuwmv', itemId: 'decor-hot-water-bottle', frac: { x: 0.585, y: 0.652 }, flip: true },
      { key: 'd-gpnb8g', itemId: 'decor-sandcastle', frac: { x: 0.357, y: 0.465 }, flip: false },
      { key: 'd-cjm1hz', itemId: 'decor-beach-umbrella', frac: { x: 0.664, y: 0.809 }, flip: false },
      { key: 'd-7ssfut', itemId: 'keepsake:k-h-n8kidz11-5', frac: { x: 0.649, y: 0.8 }, flip: false, keepsake: 'read' },
      { key: 'd-v8g0d2', itemId: 'keepsake:k-h-4bbqamss-5', frac: { x: 0.789, y: 0.8 }, flip: false, keepsake: 'move' },
      { key: 'd-8auax3', itemId: 'keepsake:k-h-mi7f0ns7-4', frac: { x: 0.56, y: 0.8 }, flip: false, keepsake: 'tidy' },
      { key: 'd-f4kmxv', itemId: 'keepsake:k-h-tie9r1bj-5', frac: { x: 0.427, y: 0.8 }, flip: false, keepsake: 'rest' },
    ];
    const pets: ShelfPet[] = [
      { petId: 'pet-cow-beltie', home: 'h-n8kidz11', favouriteSpot: 'pot:h-n8kidz11' },
      { petId: 'pet-cat-smoke', favouriteSpot: 'sill' },
      { petId: 'pet-bear-black', favouriteSpot: 'sill' },
      { petId: 'pet-cat-tuxedo', home: 'h-mi7f0ns7', favouriteSpot: 'pot:h-mi7f0ns7' },
      { petId: 'pet-dog-pom', home: 'h-4bbqamss', favouriteSpot: 'pot:h-4bbqamss' },
      { petId: 'pet-cat-russianblue' },
      { petId: 'pet-dog-golden', home: 'h-8d1oyy9t', favouriteSpot: 'pot:h-8d1oyy9t' },
      { petId: 'pet-cat-abyssinian' },
      { petId: 'pet-hamster-winterwhite', home: 'h-c6cfc1kh', favouriteSpot: 'pot:h-c6cfc1kh' },
      { petId: 'pet-frog-tree', home: 'h-tie9r1bj', favouriteSpot: 'pot:h-tie9r1bj' },
    ];
    const w = sillWorld(SILL_SPEC, pots, decor, ROOM.day, 0.53, 0, 'autumn', { note: true, found: 1368 });
    const half = SILL_SPEC.scale.pet * 0.2;
    for (const hour of [7, 10, 12, 13.4, 15, 18, 22]) {
      for (const [key, spot] of arrangePets(w.ground, pets, { ...at(0.53), hour })) {
        expect(overlaps(noteSpan(w), [spot.x - half, spot.x + half]), `${hour}h ${key}`).toBe(false);
      }
    }
  });

  it('pets roaming the sill keep off the rituals', () => {
    const w = sillWorld(SILL_SPEC, POTS, [], ROOM.day, 0.5, 0, 'spring', { note: true });
    const [a, b] = noteSpan(w);
    expect(w.ground.obstacles.some((o) => o.x0 <= a + 1e-6 && o.x1 >= b - 1e-6)).toBe(true);
  });
});
