// @vitest-environment jsdom
/**
 * The M1 art audit, pinned: residents sit among their plants without hiding them, decor keeps off the pots, the
 * store's decor fractions round-trip through the scene, keepsakes and routines have art, pets are buttons that answer
 * a touch, a box's front goes over its napper, and each light source has one halo.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { JSX } from 'preact';
import { createRef } from 'preact';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import { DECOR } from '@/catalog/collectibles';
import { NIGHT_LIGHT } from '@/art/light';
import { PlantArt } from '@/art/plants';
import { artBounds, type Box } from '@/art/plants/svgBounds.testutil';
import { poseBounds } from '@/art/pets/bounds';
import { SPECIES_ART } from '@/art/pets/species';
import { getLook } from '@/art/pets/looks';
import { COW_OVER_CAT } from '@/art/pets/world';
import { ROUTINES } from '@/domain/routines';
import { KEEPSAKE_FAMILIES } from '@/domain/routines';
import type { ShelfDecor, ShelfPet, SillPot } from './model';
import { SILL_SPEC, BAND_SPEC } from './sill/layout';
import { openScroll, sillWorld, type SillWorld } from './sill/world';
import { ROOM } from './palette';
import { arrangePets } from './arrange';
import { lightAtSun } from './lighting';
import { skyTime, type Moment } from './time';
import { depthScale } from './room';
import { decorEntry, decorToScene, fracToScene, sceneToFrac } from './decorPlace';
import { DECOR_ENTRIES } from './decor';
import { ROUTINE_ART } from './objects/routines';
import { KEEPSAKE_ART } from './objects/keepsakes';
import { FOUND_ART, foundFor } from './objects/found';
import { vineReach } from './objects/cutting';
import { classifyPress, gestureForKey, reactionFor, STROKE_PX } from './actors/touch';
import { DecorItem } from './actors/DecorItem';
import { actorSize } from './actors/PetActor';
import { nudge } from './actors/DecorEdit';
import { SillScene, type ShelfSceneHandle } from './SillScene';
import { WindowsillBand, type WindowsillBandHandle } from './WindowsillBand';

const at = (sun: number, night = false, hour = night ? 21.5 : 8 + sun * 10): Moment => {
  const light = lightAtSun(sun, night);
  return { light, time: skyTime(light), season: 'autumn', hour };
};

function inspect<T>(node: JSX.Element, read: (host: HTMLElement) => T): T {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(node, host);
  const out = read(host);
  render(null, host);
  host.remove();
  return out;
}

const area = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
const overlap = (a: Box, b: Box): Box => ({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });

/** The plant's foliage (everything that sways) in scene units, for a pot placed in a world. */
function crownBox(world: SillWorld, i: number, pot: SillPot): Box {
  const place = world.pots[i]!;
  const canvas = inspect(<PlantArt species={pot.species} stage={pot.stage} pot={pot.pot} size={100} />, (host) => {
    const sways = [...host.querySelectorAll('.plant-sway')];
    const boxes = sways.map((g) => artBounds(g));
    return boxes.reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }));
  });
  const S = place.size * place.scale;
  const sx = (x: number) => place.x + ((x - 50) / 100) * S;
  const sy = (y: number) => place.y + ((y - place.metrics.foot) / 100) * S;
  return { x0: sx(canvas.x0), x1: sx(canvas.x1), y0: sy(canvas.y0), y1: sy(canvas.y1) };
}

/** A pet's drawn box in scene units at its spot (a loaf on a rim is drawn at the pet size). */
function petBox(petId: string, spot: { x: number; y: number; depth: number; pose: string; perch?: string }, petSize: number): Box {
  const look = getLook(petId);
  const { id, rig } = SPECIES_ART[look.species].rigFor(look);
  const b = poseBounds(id, rig, spot.pose as 'loaf');
  const s = rig.scale * (look.scale ?? 1);
  const A = actorSize(petSize, look.species, spot.perch as 'rim', petId) * depthScale(spot.depth);
  const cx = (x: number) => spot.x + (((50 + (x - 50) * s) - 50) / 100) * A;
  const cy = (y: number) => spot.y + (((94 + (y - 94) * s) - 94) / 100) * A;
  return { x0: cx(b.x0), x1: cx(b.x1), y0: cy(b.y0), y1: cy(b.y1) };
}

/** A pet's contact shadow's x range in scene units at its spot (the part of it resting on what it sits on). */
function contactBox(petId: string, spot: { x: number; depth: number; pose: string; facing: 'left' | 'right'; perch?: string }, petSize: number): [number, number] {
  const look = getLook(petId);
  const { rig } = SPECIES_ART[look.species].rigFor(look);
  const c = rig.poses[spot.pose as 'loaf'].contact;
  const s = rig.scale * (look.scale ?? 1);
  const A = actorSize(petSize, look.species, spot.perch as 'rim', petId) * depthScale(spot.depth);
  const dir = spot.facing === 'left' ? -1 : 1;
  const at = (x: number) => spot.x + (dir * (x - 50) * s * A) / 100;
  const a = at(c.cx - c.rx);
  const b = at(c.cx + c.rx);
  return [Math.min(a, b), Math.max(a, b)];
}

describe('residents among their plants (M1 art audit)', () => {
  const combos: [PlantSpeciesId, PotId, number][] = [
    ['pilea', 'cream', 4],
    ['pothos', 'terracotta', 6],
    ['begonia', 'blush', 5],
    ['snakeplant', 'speckled', 3],
    ['catgrass', 'cream', 5],
    ['monstera', 'mug', 5],
    ['violet', 'teacup', 5],
    ['calathea', 'gourd', 6],
  ];
  for (const petId of ['pet-cat-grey', 'pet-cat-mainecoon', 'pet-cow-highland', 'pet-cow-holstein', 'pet-dog-beagle', 'pet-dog-corgi', 'pet-bunny-lop', 'pet-bear-brown']) {
    it(`never lets ${petId} cover more than 40% of its plant’s crown or sit in mid-air past its rim, on the Sill or in the band`, () => {
      for (const spec of [SILL_SPEC, BAND_SPEC]) {
        const pots: SillPot[] = combos.map(([species, pot, stage], i) => ({ habitId: `h${i}`, species, pot, stage }));
        const world = sillWorld(spec, pots, [], ROOM.day, 0.5, 200);
        const pets: ShelfPet[] = pots.map((p, i) => ({ key: `r${i}`, petId, home: p.habitId }));
        const spots = arrangePets(world.ground, pets, at(0.5));
        pots.forEach((p, i) => {
          const spot = spots.get(`r${i}`)!;
          expect(spot.perch).toBe('rim');
          // Seated on the pot's own rim line.
          expect(spot.y).toBeCloseTo(world.pots[i]!.rimY, 5);
          const crown = crownBox(world, i, p);
          const pet = petBox(petId, spot, spec.scale.pet);
          const share = area(overlap(pet, crown)) / area(crown);
          expect(share, `${p.species} in ${p.pot}`).toBeLessThanOrEqual(0.4);
          // And sat on the rim, not in mid-air past it: at least 60% of its contact over the rim.
          const place = world.pots[i]!;
          const half = (place.metrics.rimW * place.size * place.scale) / 2;
          const c = contactBox(petId, spot, spec.scale.pet);
          const on = Math.max(0, Math.min(c[1], place.x + half) - Math.max(c[0], place.x - half)) / (c[1] - c[0]);
          expect(on, `${petId} on the ${p.pot} rim`).toBeGreaterThanOrEqual(0.6);
        });
      }
    });
  }

  it('draws a rim resident between the plant’s back layer and the foliage that spills over the rim', () => {
    const pots: SillPot[] = [{ habitId: 'walk', species: 'pothos', stage: 6, pot: 'terracotta' }];
    inspect(<SillScene pots={pots} pets={[{ petId: 'pet-cat-grey', home: 'walk' }]} moment={at(0.5)} live={false} />, (host) => {
      const z = (sel: string) => Number((host.querySelector(sel) as HTMLElement).style.zIndex);
      expect(z('[data-habit="walk"]')).toBeLessThan(z('[data-pet="pet-cat-grey"]'));
      expect(z('[data-pet="pet-cat-grey"]')).toBeLessThan(z('[data-habit-front="walk"]'));
    });
  });

  it('shows a cutting beside its empty pot (DESIGN §5.5)', () => {
    const pots: SillPot[] = [{ habitId: 'new', species: 'pothos', stage: 0, pot: 'blush' }];
    inspect(<SillScene pots={pots} moment={at(0.5)} live={false} />, (host) => {
      expect(host.querySelector('[data-habit="new"] [data-empty-pot="blush"]')).not.toBeNull();
    });
  });

  it('draws a lying cow about 1.3 times a loafing cat', () => {
    expect(COW_OVER_CAT).toBeGreaterThan(1.22);
    expect(COW_OVER_CAT).toBeLessThan(1.4);
  });
});

describe('decor keeps off the habit pots', () => {
  const pots: SillPot[] = ['pothos', 'pilea', 'begonia', 'snakeplant', 'catgrass', 'monstera'].map((species, i) => ({ habitId: `h${i}`, species: species as PlantSpeciesId, stage: 5, pot: 'terracotta' }));

  it('covers no more than 15% of any pot and its plant, even on the busiest Sill', () => {
    const ids = DECOR.map((d) => d.id).filter((id) => DECOR_ENTRIES[id] && !DECOR_ENTRIES[id]!.hang);
    // Every item, placed where she might drop it: in front of each pot in turn.
    for (let round = 0; round < 3; round++) {
      const decor: ShelfDecor[] = ids.slice(round * 12, round * 12 + 12).map((itemId, i) => ({ itemId, frac: { x: (i % 6) / 6 + 0.02, y: 0.5 } }));
      const world = sillWorld(SILL_SPEC, pots, decor, ROOM.day, 0.5, 130);
      pots.forEach((p, i) => {
        const place = world.pots[i]!;
        const crown = crownBox(world, i, p);
        const potBox: Box = { x0: place.x - (place.metrics.rimW * place.size * place.scale) / 2, x1: place.x + (place.metrics.rimW * place.size * place.scale) / 2, y0: place.rimY, y1: place.y };
        const whole: Box = { x0: Math.min(crown.x0, potBox.x0), y0: Math.min(crown.y0, potBox.y0), x1: Math.max(crown.x1, potBox.x1), y1: potBox.y1 };
        for (const d of world.decor) {
          const size = d.size * d.scale;
          const box: Box = { x0: d.x + ((d.entry.bounds[0] - 50) / 100) * size, x1: d.x + ((d.entry.bounds[1] - 50) / 100) * size, y0: d.y - size * 0.78, y1: d.y };
          expect(area(overlap(box, whole)) / area(whole), `${d.itemId} over pot ${i}`).toBeLessThanOrEqual(0.15);
        }
      });
    }
  });

  it('stands furniture bigger than a pot on the Sill at 0.6 of its size, and full size in the places', () => {
    const world = sillWorld(SILL_SPEC, pots, [{ itemId: 'decor-window-seat' }], ROOM.day, 0.5, 130);
    const seat = world.decor.find((d) => d.itemId === 'decor-window-seat')!;
    expect(seat.size).toBeCloseTo((DECOR_ENTRIES['decor-window-seat']!.size / 16) * SILL_SPEC.scale.pet * 0.6);
  });
});

describe('decor between the store and the scene', () => {
  const floor = { x0: 17, x1: 300, d0: 0.3, d1: 1 };

  it('round-trips a stored placement through the scene', () => {
    for (const frac of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0.37, y: 0.62 }, { x: 0.9, y: 0.1 }]) {
      const at = fracToScene(floor, frac);
      const back = sceneToFrac(floor, at.x, at.depth);
      expect(back.x).toBeCloseTo(frac.x, 3);
      expect(back.y).toBeCloseTo(frac.y, 3);
    }
  });

  it('spreads stored decor across the whole place instead of piling it at the left edge', () => {
    const decor = [0.1, 0.5, 0.9].map((x, i) => decorToScene({ id: `p${i}`, itemId: 'decor-yarn-ball', place: 'pond', x, y: 0.5 }));
    expect(decor[1]).toMatchObject({ key: 'p1', place: 'pond', frac: { x: 0.5, y: 0.5 } });
    const g = { x0: 20, x1: 130, d0: 0.4, d1: 1 };
    const xs = decor.map((d) => fracToScene(g, d.frac!).x);
    expect(xs[0]).toBeCloseTo(31);
    expect(xs[2]).toBeCloseTo(119);
  });

  it('keeps the store’s fractions when an item is nudged from the keyboard', () => {
    const to = nudge('ArrowRight', 100, 0.5, floor)!;
    expect(to.x).toBeGreaterThan(100);
    expect(nudge('ArrowDown', 100, 0.5, floor)!.depth).toBeGreaterThan(0.5);
    expect(nudge('q', 100, 0.5, floor)).toBeNull();
  });

  it('draws every keepsake kind, whether placed by id or by kind', () => {
    for (const kind of [...KEEPSAKE_FAMILIES, 'brass-seed' as const]) {
      expect(KEEPSAKE_ART[kind], kind).toBeDefined();
      expect(decorEntry({ itemId: `keepsake-${kind}` })).toBe(KEEPSAKE_ART[kind]);
      expect(decorEntry({ itemId: 'keepsake:k-walk-4', keepsake: kind })).toBe(KEEPSAKE_ART[kind]);
    }
    const placed = decorToScene({ id: 'x', itemId: 'keepsake:k-read-5', place: 'sill', x: 0.5, y: 0.5 }, () => 'read');
    expect(placed.keepsake).toBe('read');
    const world = sillWorld(SILL_SPEC, [], [placed], ROOM.day, 0.5, 130);
    expect(world.decor.map((d) => d.entry)).toEqual([KEEPSAKE_ART.read]);
  });
});

describe('routines, found things and the Cutting', () => {
  it('has an object for every routine, and seats the companion on it', () => {
    for (const r of ROUTINES) expect(ROUTINE_ART[r], r).toBeDefined();
    const pots: SillPot[] = [{ habitId: 'read', species: 'begonia', stage: 5, pot: 'blush', routine: 'read' }];
    const world = sillWorld(SILL_SPEC, pots, [], ROOM.day, 0.5, 130);
    expect(world.decor.map((d) => d.routine)).toEqual(['read']);
    const spots = arrangePets(world.ground, [{ petId: 'pet-cat-grey', home: 'read' }], at(0.5));
    expect(spots.get('pet-cat-grey')).toMatchObject({ perch: 'prop', perchId: 'prop:read' });
    // A day without the routine is an ordinary day: back on the rim.
    const plain = sillWorld(SILL_SPEC, [{ ...pots[0]!, routine: undefined }], [], ROOM.day, 0.5, 130);
    expect(arrangePets(plain.ground, [{ petId: 'pet-cat-grey', home: 'read' }], at(0.5)).get('pet-cat-grey')).toMatchObject({ perch: 'rim' });
  });

  it('picks one of seven found things by seed', () => {
    expect(FOUND_ART).toHaveLength(7);
    expect(foundFor(3)).toBe(FOUND_ART[3]);
    expect(foundFor(-1)).toBe(FOUND_ART[6]);
  });

  it('grows the vine along the frame from Leafy, and frames the window at the last stage', () => {
    expect(vineReach(2, 0.3)).toBe(0);
    expect(vineReach(3, 3 / 7)).toBeGreaterThan(0);
    expect(vineReach(5, 5 / 7)).toBeGreaterThan(vineReach(4, 4 / 7));
    expect(vineReach(7, 1)).toBe(1);
  });
});

describe('touching a pet', () => {
  it('reads a tap, a stroke, a boop on the face and a long press', () => {
    const face = { x: 0.75, y: 0.15 };
    expect(classifyPress({ at: { x: 0.5, y: 0.6 }, travel: 2, held: 120, facing: 'right' })).toBe('tap');
    expect(classifyPress({ at: face, travel: 2, held: 120, facing: 'right' })).toBe('boop');
    expect(classifyPress({ at: face, travel: 2, held: 120, facing: 'left' })).toBe('tap');
    expect(classifyPress({ at: face, travel: STROKE_PX + 5, held: 500, facing: 'right' })).toBe('stroke');
    expect(classifyPress({ at: face, travel: 3, held: 400, facing: 'right' })).toBe('carry');
    expect(classifyPress({ at: face, travel: 20, held: 100, facing: 'right' })).toBeNull();
    expect(gestureForKey('Enter')).toBe('tap');
    expect(gestureForKey('b')).toBe('boop');
    expect(gestureForKey('s')).toBe('stroke');
  });

  it('answers in character, and never grumpily', () => {
    expect(reactionFor('boop', 'cat', false).expression).toBe('blep');
    expect(reactionFor('boop', 'cow', false).expression).toBe('chew');
    expect(reactionFor('tap', 'dog', true).expression).toBe('yawn');
    expect(reactionFor('stroke', 'bunny', false)).toMatchObject({ expression: 'happy', move: 'lean' });
  });

  it('makes each pet a button named after it, reports touches, and floats up its name tag', () => {
    const touches: string[] = [];
    const opened: string[] = [];
    const ref = createRef<ShelfSceneHandle>();
    const host = document.createElement('div');
    document.body.appendChild(host);
    act(() => {
      render(
        <SillScene ref={ref} pots={[]} pets={[{ key: 'p1', petId: 'pet-cat-calico', name: 'Juniper' }]} moment={at(0.5)} live={false} onPet={(k, _r, g) => touches.push(`${k}:${g}`)} onOpenPet={(k) => opened.push(k)} />,
        host,
      );
    });
    const button = host.querySelector<HTMLButtonElement>('[data-pet="p1"] button')!;
    expect(button.getAttribute('aria-label')).toBe('Juniper');
    act(() => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));
    });
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    });
    expect(touches).toEqual(['p1:boop', 'p1:tap']);
    const tag = host.querySelector<HTMLButtonElement>('[data-pet="p1"] button[aria-label="Juniper’s card"]')!;
    expect(tag.textContent).toBe('Juniper');
    act(() => tag.click());
    expect(opened).toEqual(['p1']);
    expect(ref.current!.spotOf('p1')).not.toBeNull();
    expect(ref.current!.spotOf('nobody')).toBeNull();
    render(null, host);
    host.remove();
  });

  it('turns decor into buttons in edit mode: F flips, Delete removes', () => {
    const calls: string[] = [];
    inspect(
      <SillScene pots={[]} decor={[{ key: 'd1', itemId: 'decor-yarn-ball' }]} moment={at(0.5)} live={false} editDecor={{ onMove: (k) => calls.push(`move ${k}`), onFlip: (k) => calls.push(`flip ${k}`), onRemove: (k) => calls.push(`remove ${k}`) }} />,
      (host) => {
        const b = host.querySelector<HTMLButtonElement>('[data-edit="d1"]')!;
        expect(b.getAttribute('aria-label')).toMatch(/^Yarn Ball\. Arrow keys move it/);
        for (const key of ['f', 'Delete', 'ArrowLeft']) b.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      },
    );
    expect(calls).toEqual(['flip d1', 'remove d1', 'move d1']);
  });
});

describe('the band', () => {
  it('drops a coin in the jar when the watered pot is not on the band', () => {
    const ref = createRef<WindowsillBandHandle>();
    const host = document.createElement('div');
    document.body.appendChild(host);
    act(() => {
      render(<WindowsillBand ref={ref} pots={[{ habitId: 'a', species: 'pothos', stage: 3, pot: 'terracotta' }]} coins={3} moment={at(0.5)} />, host);
    });
    const coins = () => host.querySelectorAll('svg[class*="coin"], div[class*="coinStill"]').length;
    const before = coins();
    act(() => ref.current!.pour('not-on-the-band'));
    expect(coins()).toBeGreaterThan(before);
    render(null, host);
    host.remove();
  });

  it('shows a note on the sill as a button that opens it, and the cake on her birthday', () => {
    let opened = 0;
    inspect(<WindowsillBand pots={[]} coins={0} moment={at(0.5)} note={{ kind: 'sundayNote', onOpen: () => opened++ }} cake cutting={{ stage: 4, overall: 0.6 }} />, (host) => {
      const note = host.querySelector<HTMLButtonElement>('button[data-sill="note"]')!;
      expect(note.getAttribute('aria-label')).toBe('A note on the sill');
      note.click();
      expect(host.querySelector('[data-decor="cake"]')).not.toBeNull();
      expect(host.querySelector('[data-cutting="4"]')).not.toBeNull();
    });
    expect(opened).toBe(1);
  });
});

describe('light', () => {
  it('gives each glowing item one halo: its own, none added by the scene', () => {
    const html = inspect(
      <svg>
        <DecorItem entry={DECOR_ENTRIES['decor-jam-jar']!} itemId="decor-jam-jar" x={50} y={90} z={1} size={20} light={NIGHT_LIGHT} />
      </svg>,
      (host) => host.innerHTML,
    );
    expect(html.match(/<radialGradient/g)?.length ?? 0).toBe(1);
  });

  it('draws a box’s front again over whoever naps in it', () => {
    const box = DECOR_ENTRIES['decor-cardboard-box']!;
    expect(box.front).toBeDefined();
    expect(box.nap).toBeGreaterThan(0.3);
    const world = sillWorld(SILL_SPEC, [], [{ key: 'b', itemId: 'decor-cardboard-box' }], ROOM.night, 1, 130);
    const bed = world.ground.perches.find((p) => p.id === 'bed:b')!;
    const spots = arrangePets(world.ground, [{ petId: 'pet-cat-grey' }], at(1, true, 23.5));
    expect(spots.get('pet-cat-grey')).toMatchObject({ perch: 'bed', perchId: 'bed:b' });
    inspect(<SillScene pots={[]} decor={[{ key: 'b', itemId: 'decor-cardboard-box' }]} pets={[{ petId: 'pet-cat-grey' }]} moment={at(1, true, 23.5)} live={false} />, (host) => {
      const front = host.querySelector<SVGElement>('[data-decor="decor-cardboard-box"][data-part="front"]')!;
      const pet = host.querySelector<HTMLElement>('[data-pet="pet-cat-grey"]')!;
      expect(Number(front.style.zIndex)).toBeGreaterThan(Number(pet.style.zIndex));
      expect(bed.y).toBeLessThan(world.decor[0]!.y);
    });
  });

  it('opens a busy Sill on its pots by day and by lamplight, whatever the decor', () => {
    // The gallery's busiest Sill: twelve decor items, most of them tall enough to push the sill longer.
    const ids = DECOR.map((d) => d.id).filter((id) => DECOR_ENTRIES[id]);
    for (const id of Object.keys(DECOR_ENTRIES)) if (ids.length < 12 && !ids.includes(id)) ids.push(id);
    const pots: SillPot[] = Array.from({ length: 5 }, (_, i) => ({ habitId: `h${i}`, species: 'pothos', stage: 5, pot: 'terracotta' }));
    for (const count of [0, 3, 12]) {
      const decor: ShelfDecor[] = ids.slice(0, count).map((itemId) => ({ itemId }));
      for (const px of [390, 1200]) {
        const view = (px / 300) * 100;
        for (const [room, sun] of [[ROOM.day, 0.5], [ROOM.day, 0.1], [ROOM.day, 0.9], [ROOM.night, 1]] as const) {
          const world = sillWorld(SILL_SPEC, pots, decor, room, sun, view);
          const left = openScroll(world, view);
          const inFrame = world.pots.filter((p) => p.x > left && p.x < left + view);
          expect(inFrame.length, `${count} decor, ${px} px, ${room.night ? 'night' : `sun ${sun}`}`).toBeGreaterThanOrEqual(1);
          // After dark on a wide screen, the lamp is in view too.
          if (room.night && px >= 1200) expect(world.layout.lamp.x, `${count} decor`).toBeLessThan(left + view);
          // The sun and the lamp keep to the sill's own stretch, by the pots.
          if (world.beam) expect(world.beam.x1).toBeLessThanOrEqual(world.layout.homeX1 + 1e-6);
        }
      }
    }
  });

  it('keeps a stored spot on the Sill where it was on any screen, and when tall decor joins it', () => {
    const pots: SillPot[] = Array.from({ length: 4 }, (_, i) => ({ habitId: `h${i}`, species: 'pilea', stage: 4, pot: 'cream' }));
    const duck: ShelfDecor = { key: 'duck', itemId: 'decor-rubber-duck', frac: { x: 0.62, y: 0.9 } };
    const xOf = (w: SillWorld) => w.decor.find((d) => d.key === 'duck')!.x;
    const phone = sillWorld(SILL_SPEC, pots, [duck], ROOM.day, 0.5, 130);
    const desk = sillWorld(SILL_SPEC, pots, [duck], ROOM.day, 0.5, 480);
    expect(Math.abs(xOf(desk) - xOf(phone))).toBeLessThan(1);
    const tall = ['decor-window-seat', 'decor-reading-chair', 'decor-bookstack'].filter((id) => DECOR_ENTRIES[id]).map((itemId) => ({ itemId }));
    expect(tall.length).toBeGreaterThan(0);
    const busy = sillWorld(SILL_SPEC, pots, [duck, ...tall], ROOM.day, 0.5, 130);
    expect(busy.layout.width).toBeGreaterThan(phone.layout.width);
    expect(Math.abs(xOf(busy) - xOf(phone))).toBeLessThan(1);
    // A new habit lengthens the Sill by a pot; the spot moves along by no more than that.
    const more = sillWorld(SILL_SPEC, [...pots, { habitId: 'h9', species: 'pilea', stage: 4, pot: 'cream' }], [duck], ROOM.day, 0.5, 130);
    expect(xOf(more) - xOf(phone)).toBeGreaterThanOrEqual(0);
    expect(xOf(more) - xOf(phone)).toBeLessThanOrEqual(SILL_SPEC.pitch + 1e-6);
    // And an edit round-trips through the same floor.
    const at = fracToScene(phone.floor, duck.frac!);
    expect(fracToScene(desk.floor, duck.frac!).x).toBeCloseTo(at.x, 6);
    expect(sceneToFrac(desk.floor, at.x, at.depth).x).toBeCloseTo(0.62, 3);
  });

  it('opens after dark with the last pots in frame on a phone, and the lamp in view on a wide screen', () => {
    const pots: SillPot[] = Array.from({ length: 6 }, (_, i) => ({ habitId: `h${i}`, species: 'pothos', stage: 4, pot: 'terracotta' }));
    const world = sillWorld(SILL_SPEC, pots, [], ROOM.night, 1, 0);
    const phone = (390 / 300) * 100;
    const left = openScroll(world, phone);
    const last = world.pots[5]!;
    expect(last.x).toBeGreaterThan(left);
    expect(last.x).toBeLessThan(left + phone);
    const wide = (1200 / 300) * 100;
    const l2 = openScroll(world, wide);
    expect(world.layout.lamp.x).toBeLessThan(l2 + wide);
    expect(last.x).toBeGreaterThan(l2);
  });
});
