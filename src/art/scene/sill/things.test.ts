/**
 * The things on the Sill a person can open (a waiting note, a found thing) never lie over a pet. The Shelf's axe check
 * found a note's button over Fern, napping on the last pot's routine object beside the coin jar (9.4 px of her left to
 * touch, 12:30 to 14:30 on 30 September 2026); a found thing did the same to a pet by its pot.
 */
import { describe, expect, it } from 'vitest';
import { ROUTINES } from '@/domain/routines';
import { depthScale } from '../room';
import { ROOM } from '../palette';
import { nearestFree } from '../arrange';
import type { SillPot } from '../model';
import { SILL_SPEC } from './layout';
import { sillThings, sillWorld, withThings, type SillThingPlace, type SillWorld } from './world';

const pot = (i: number, stage = 4, routine?: SillPot['routine']): SillPot => ({ habitId: `h${i}`, name: `Habit ${i}`, species: 'pothos', stage, pot: 'terracotta', ...(routine ? { routine } : {}) });
const pots = (n: number, last?: Partial<Pick<SillPot, 'stage' | 'routine'>>) => Array.from({ length: n }, (_, i) => (i === n - 1 && last ? pot(i, last.stage ?? 4, last.routine) : pot(i)));

/** The x range a thing's button covers (as `SillThing` and `SillNote` draw it). */
const span = (t: SillThingPlace) => {
  const hw = (Math.max(t.size, 12) * depthScale(t.depth)) / 2;
  return [t.x - hw, t.x + hw] as const;
};
/** The x ranges a pet may sit on at sill level, with half a pet's footprint around each. */
const seats = (w: SillWorld) => w.ground.perches.filter((p) => p.kind !== 'rim').map((p) => [p.x - p.w / 2 - w.ground.petSize * 0.3, p.x + p.w / 2 + w.ground.petSize * 0.3] as const);
const overlaps = (a: readonly [number, number], b: readonly [number, number]) => a[0] < b[1] - 1e-6 && b[0] < a[1] - 1e-6;
/** The note's own spot: leaning on the coin jar's left. */
const noteHome = (w: SillWorld) => w.layout.jar.x - (w.layout.spec.scale.jar * depthScale(w.layout.jar.depth)) / 2;

describe('the things on the sill never lie over a pet', () => {
  it('with no seat by the jar, the note leans on the jar where it always has', () => {
    const w = sillWorld(SILL_SPEC, pots(6), [], ROOM.day, 0.5, 200);
    expect(sillThings(w, { note: true }).note!.x).toBeCloseTo(noteHome(w), 6);
  });

  it('a routine object by the jar (Fern on the hot-water bottle): the note moves along, clear of the seat', () => {
    // Few pots: the last one faces the jar, so its routine object stands where the note leans.
    const w = sillWorld(SILL_SPEC, pots(3, { routine: 'sleep' }), [], ROOM.day, 0.62, 200);
    const seat = w.ground.perches.find((p) => p.id === 'prop:h2')!;
    const note = sillThings(w, { note: true }).note!;
    const home = { ...note, x: noteHome(w) };
    // The case the Shelf hit: the seat is where the note leans.
    expect(overlaps(span(home), [seat.x - seat.w / 2, seat.x + seat.w / 2])).toBe(true);
    for (const s of seats(w)) expect(overlaps(span(note), s)).toBe(false);
    // Along the free sill, never back in front of the pots.
    expect(note.x).toBeGreaterThan(noteHome(w));
  });

  it('every routine, stage, light and width: neither thing covers a seat, and they never cover each other', () => {
    let moved = 0;
    for (const routine of [undefined, ...ROUTINES])
      for (const stage of [0, 1, 2, 4, 7])
        for (const [room, sun] of [[ROOM.day, 0.1], [ROOM.day, 0.5], [ROOM.day, 0.9], [ROOM.night, 1]] as const)
          for (const [n, width] of [[3, 0], [3, 200], [5, 130], [5, 400], [7, 320]] as const)
            for (const seed of [0, 3, 11]) {
              const w = sillWorld(SILL_SPEC, pots(n, { stage, routine }), [], room, sun, width);
              const t = sillThings(w, { note: true, found: seed });
              const where = `${routine ?? 'none'} stage ${stage} sun ${sun} ${n} pots width ${width} seed ${seed}`;
              for (const s of seats(w)) {
                expect(overlaps(span(t.note!), s), `note, ${where}`).toBe(false);
                expect(overlaps(span(t.found!), s), `found, ${where}`).toBe(false);
              }
              expect(overlaps(span(t.note!), span(t.found!)), where).toBe(false);
              expect(t.note!.x, where).toBeGreaterThanOrEqual(noteHome(w) - 1e-6);
              if (t.note!.x > noteHome(w) + 1e-6) moved++;
            }
    // The rule is exercised: some layouts do put a seat where the note leans.
    expect(moved).toBeGreaterThan(0);
  });

  it('pets roaming the sill keep clear of both, as they do of standing decor', () => {
    const w = sillWorld(SILL_SPEC, pots(5), [], ROOM.day, 0.5, 200);
    const t = sillThings(w, { note: true, found: 3 });
    const g = withThings(w, t).ground;
    const reach = g.petSize * 0.3;
    for (const thing of [t.note!, t.found!]) {
      const x = nearestFree(g, thing.x, []);
      expect(overlaps([x - reach, x + reach], span(thing))).toBe(false);
    }
    // Without anything to open, the ground is the sill's own.
    expect(withThings(w, {}).ground).toBe(w.ground);
  });
});
