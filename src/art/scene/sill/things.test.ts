/**
 * The rituals on the Sill a person can open or see (a waiting note, a found thing, a birthday cake) never lie over a
 * pet, across every routine, stage, light, width and seed. The Shelf's axe check found a note's button over Fern,
 * napping on the last pot's routine object beside the coin jar, and a found thing over a pet by its pot; scene.test.ts
 * replays the first as the Shelf drew it, and e2e/shelf.spec.ts pins the moments the check caught.
 */
import { describe, expect, it } from 'vitest';
import { ROUTINES } from '@/domain/routines';
import { depthScale } from '../room';
import { ROOM } from '../palette';
import { nearestFree } from '../arrange';
import type { SillPot } from '../model';
import { SILL_SPEC } from './layout';
import { sillWorld, type RitualPlace, type SillWorld } from './world';

const pot = (i: number, stage = 4, routine?: SillPot['routine']): SillPot => ({ habitId: `h${i}`, name: `Habit ${i}`, species: 'pothos', stage, pot: 'terracotta', ...(routine ? { routine } : {}) });
const pots = (n: number, last?: Partial<Pick<SillPot, 'stage' | 'routine'>>) => Array.from({ length: n }, (_, i) => (i === n - 1 && last ? pot(i, last.stage ?? 4, last.routine) : pot(i)));

/** The x range a ritual's button covers (the whole square; a small thing still takes a 12-unit box). */
const span = (t: RitualPlace, box = t.size) => {
  const hw = (box * depthScale(t.depth)) / 2;
  return [t.x - hw, t.x + hw] as const;
};
/** The x ranges a pet may sit on at sill level, with half a pet's footprint around each. */
const seats = (w: SillWorld) => w.ground.perches.filter((p) => p.kind !== 'rim').map((p) => [p.x - p.w / 2 - w.ground.petSize * 0.3, p.x + p.w / 2 + w.ground.petSize * 0.3] as const);
const overlaps = (a: readonly [number, number], b: readonly [number, number]) => a[0] < b[1] - 1e-6 && b[0] < a[1] - 1e-6;
/** The note's own spot: leaning on the coin jar's left. */
const noteHome = (w: SillWorld) => w.layout.jar.x - (w.layout.spec.scale.jar * depthScale(w.layout.jar.depth)) / 2;

describe('the rituals on the sill never lie over a pet', () => {
  it('with no seat by the jar, the note leans on the jar where it always has', () => {
    const w = sillWorld(SILL_SPEC, pots(6), [], ROOM.day, 0.5, 200, 'autumn', { note: true });
    expect(w.rituals.note!.x).toBeCloseTo(noteHome(w), 6);
  });

  it('a routine object by the jar (Fern on the hot-water bottle): the note moves, clear of the seat', () => {
    // Few pots: the last one faces the jar, so its routine object stands where the note leans.
    const w = sillWorld(SILL_SPEC, pots(3, { routine: 'sleep' }), [], ROOM.day, 0.62, 200, 'autumn', { note: true });
    const seat = w.ground.perches.find((p) => p.id === 'prop:h2')!;
    const note = w.rituals.note!;
    expect(overlaps(span({ ...note, x: noteHome(w) }), [seat.x - seat.w / 2, seat.x + seat.w / 2])).toBe(true);
    for (const s of seats(w)) expect(overlaps(span(note), s)).toBe(false);
  });

  it('every routine, stage, light, width and seed: no ritual covers a seat, and none covers another', () => {
    let moved = 0;
    for (const routine of [undefined, ...ROUTINES])
      for (const stage of [0, 1, 2, 4, 7])
        for (const [room, sun] of [[ROOM.day, 0.1], [ROOM.day, 0.5], [ROOM.day, 0.9], [ROOM.night, 1]] as const)
          for (const [n, width] of [[3, 0], [3, 200], [5, 130], [5, 400], [7, 320]] as const)
            for (const seed of [0, 3, 11]) {
              const w = sillWorld(SILL_SPEC, pots(n, { stage, routine }), [], room, sun, width, 'autumn', { note: true, found: seed, cake: true });
              const { note, found, cake } = w.rituals;
              const where = `${routine ?? 'none'} stage ${stage} sun ${sun} ${n} pots width ${width} seed ${seed}`;
              const spans = [span(note!), span(found!, Math.max(found!.size, 12)), span(cake!)];
              for (const s of seats(w)) for (const t of spans) expect(overlaps(t, s), where).toBe(false);
              expect(overlaps(spans[0]!, spans[1]!), `note and found, ${where}`).toBe(false);
              expect(overlaps(spans[0]!, spans[2]!), `note and cake, ${where}`).toBe(false);
              expect(overlaps(spans[1]!, spans[2]!), `found and cake, ${where}`).toBe(false);
              if (Math.abs(note!.x - noteHome(w)) > 1e-6) moved++;
            }
    // The rule is exercised: some layouts do put a seat where the note leans.
    expect(moved).toBeGreaterThan(0);
    // 1,500 layouts: past the 5 s default on a loaded machine.
  }, 60_000);

  it('pets roaming the sill keep clear of them, as they do of standing decor', () => {
    const w = sillWorld(SILL_SPEC, pots(5), [], ROOM.day, 0.5, 200, 'autumn', { note: true, found: 3 });
    const g = w.ground;
    const reach = g.petSize * 0.3;
    for (const [t, box] of [[w.rituals.note!, w.rituals.note!.size], [w.rituals.found!, Math.max(w.rituals.found!.size, 12)]] as const) {
      const x = nearestFree(g, t.x, []);
      expect(overlaps([x - reach, x + reach], span(t, box))).toBe(false);
    }
    // Without rituals, nothing is placed and the ground has no extra obstacles.
    const bare = sillWorld(SILL_SPEC, pots(5), [], ROOM.day, 0.5, 200, 'autumn');
    expect(bare.rituals).toEqual({});
    expect(g.obstacles.length - bare.ground.obstacles.length).toBe(2);
  });
});
