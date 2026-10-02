/**
 * The Shelf screen's adapters: the store's views in the shapes the scene and the sheets take. Pure
 * functions of the view models (and, where a view has no field yet, of the read-only state), so they
 * are unit-tested without a DOM.
 */
import type { PlaceId, Species } from '@/catalog/types';
import { getCollectible } from '@/catalog/collectibles';
import { PLACE_BY_ID } from '@/catalog/places';
import type { ShelfDecor, ShelfPet, SillExtras, SillPot } from '@/art/scene';
import { decorToScene, sceneToFrac, type DecorFloor } from '@/art/scene/decorPlace';
import { PLACE_SCENES, type RoomPlaceId } from '@/art/scene/places';
import { ROOM } from '@/art/scene/palette';
import { SILL_SPEC } from '@/art/scene/sill/layout';
import { sillFloor } from '@/art/scene/sill/world';
import type { AppState, Habit } from '@/state/types';
import type { PetSummaryVM, ShelfVM, SillPotVM, MemoryShelfVM } from '@/state/selectors';
import { MAX_DECOR_PER_PLACE } from '@/domain/shelf';

export { MAX_DECOR_PER_PLACE };

/* ------------------------------------------------------------------ */
/* Pots                                                                */
/* ------------------------------------------------------------------ */

/** A habit's plant that is not in today's lists (paused): drawn as it stands, never damp. */
export interface RestingPot {
  habitId: string;
  name: string;
  species: Habit['plant'];
  pot: Habit['pot'];
  stage: number;
  progress: number;
  blooms: number | undefined;
}

/**
 * The Sill's pots, in her habit order (You › Habits), so a pot keeps its place on the sill all day
 * (Today's band follows the time blocks instead) and stored decor stays beside the same pots. Every
 * live habit has a pot: today's (`todaySill`, with its damp soil, look, routine and bow) or a
 * resting one (paused).
 */
export function shelfPots(habits: readonly Pick<Habit, 'id' | 'archivedOn'>[], todaySill: readonly SillPotVM[], resting: readonly RestingPot[] = []): SillPot[] {
  const byId = new Map(todaySill.map((p) => [p.habitId, p]));
  const rest = new Map(resting.map((p) => [p.habitId, p]));
  const out: SillPot[] = [];
  for (const h of habits) {
    if (h.archivedOn !== undefined) continue;
    const p = byId.get(h.id);
    if (p) {
      out.push({
        habitId: p.habitId,
        name: p.name,
        ...(p.note ? { note: p.note } : {}),
        species: p.species,
        stage: p.stage,
        progress: p.progress,
        ...(p.blooms !== undefined ? { blooms: p.blooms } : {}),
        pot: p.pot,
        damp: p.damp,
        pulse: p.pulse,
        ...(p.look ? { look: p.look } : {}),
        ...(p.routine ? { routine: p.routine.routine } : {}),
        ...(p.bow ? { bow: true } : {}),
      });
      continue;
    }
    const r = rest.get(h.id);
    if (r) out.push({ habitId: r.habitId, name: r.name, species: r.species, stage: r.stage, progress: r.progress, ...(r.blooms !== undefined ? { blooms: r.blooms } : {}), pot: r.pot });
  }
  return out;
}

/** Retired plants, living on the Balcony Box's shelf: as they last stood (plants never shrink). */
export function retiredPots(retired: MemoryShelfVM['retired'], bestStage: Readonly<Record<string, number>>): SillPot[] {
  return retired.map((r) => ({ habitId: r.habitId, name: r.name, species: r.plant, stage: bestStage[r.habitId] ?? 0, pot: r.pot as SillPot['pot'] }));
}

/* ------------------------------------------------------------------ */
/* Pets                                                                */
/* ------------------------------------------------------------------ */

/** The pet's favourite spot (L4, `PetState.spot`) as the scene reads it: a pot's rim or a place. */
export function favouriteSpotOf(spot: AppState['pets'][string]['spot'] | undefined): string | undefined {
  if (!spot) return undefined;
  return spot.kind === 'pot' ? `pot:${spot.habitId}` : spot.place;
}

/**
 * Pets out on the Shelf, for `ShelfScene` (NOTES-open "The Shelf screen, wired to the store"): each in
 * its place, a companion living in its habit's plant, and its favourite spot.
 */
export function shelfPets(out: readonly PetSummaryVM[], pets: AppState['pets']): ShelfPet[] {
  return out.map((p) => ({
    key: p.id,
    petId: p.id,
    name: p.name,
    personality: p.personality,
    ...(p.level >= 5 ? { bond: {
      sunBias: 0.9,
      frontBias: p.level >= 9 ? 0.95 : p.level >= 7 ? 0.85 : 0,
      ...(p.level >= 8 ? { napWith: p.bestFriend } : {}),
      ...(p.level >= 9 ? { waits: true } : {}),
    } } : {}),
    outfit: p.outfit,
    ...(p.habitId ? { home: p.habitId } : {}),
    place: p.place,
    ...(favouriteSpotOf(pets[p.id]?.spot) ? { favouriteSpot: favouriteSpotOf(pets[p.id]?.spot) } : {}),
  }));
}

/* ------------------------------------------------------------------ */
/* Decor                                                               */
/* ------------------------------------------------------------------ */

/** Placed decor for the scene: fractions go in as the store keeps them; a keepsake draws from its kind. */
export function shelfDecor(decor: ShelfVM['decor']): ShelfDecor[] {
  const kinds = new Map(decor.filter((d) => d.keepsake).map((d) => [d.itemId, d.keepsake!.kind]));
  return decor.map((d) => decorToScene(d, (id) => kinds.get(id)));
}

/** How many things stand in each place. */
export function decorCounts(decor: ShelfVM['decor']): Map<PlaceId, number> {
  const m = new Map<PlaceId, number>();
  for (const d of decor) m.set(d.place, (m.get(d.place) ?? 0) + 1);
  return m;
}

/** Where a newly added thing stands: spread across the floor so a few in a row don't stack. */
export function newDecorSpot(count: number): { x: number; y: number } {
  const xs = [0.5, 0.35, 0.65, 0.2, 0.8, 0.42, 0.58, 0.28, 0.72];
  return { x: xs[count % xs.length]!, y: count % 2 ? 0.45 : 0.7 };
}

/**
 * The floor a place's stored decor fractions are measured against, in that segment's room units: the
 * Sill's natural length for its pots (`sillFloor`, DESIGN §9.4), or a place's own ground.
 */
export function decorFloorOf(place: PlaceId, pots: number): DecorFloor {
  if (place === 'sill') return sillFloor(SILL_SPEC, pots);
  const g = PLACE_SCENES[place as RoomPlaceId].ground(ROOM.day, SILL_SPEC.scale.pet);
  return { x0: g.x0, x1: g.x1, d0: g.d0, d1: g.d1 };
}

/**
 * Where a new thing lands (a stored `x`): the middle of the view, measured on the place's own floor.
 * `viewMid` and `segLeft` are in room units along the scene (the scroll position over the unit).
 */
export function decorXAtView(place: PlaceId, pots: number, viewMid: number, segLeft: number, nudge = 0): number {
  const floor = decorFloorOf(place, pots);
  return +Math.min(0.95, Math.max(0.05, sceneToFrac(floor, viewMid - segLeft, floor.d0).x + nudge)).toFixed(4);
}

/* ------------------------------------------------------------------ */
/* Places                                                              */
/* ------------------------------------------------------------------ */

/** Pets out per place (by the place each spends the day in). */
export function petsByPlace(out: readonly Pick<PetSummaryVM, 'place'>[]): Map<PlaceId, number> {
  const m = new Map<PlaceId, number>();
  for (const p of out) m.set(p.place, (m.get(p.place) ?? 0) + 1);
  return m;
}

/** A place has room for one more pet (the Sill holds everyone; `petId` itself doesn't count). */
export function roomIn(place: PlaceId, out: readonly Pick<PetSummaryVM, 'id' | 'place'>[], petId?: string): boolean {
  if (place === 'sill') return true;
  const room = PLACE_BY_ID.get(place)?.petsOut ?? 0;
  return out.filter((p) => p.place === place && p.id !== petId).length < room;
}

/**
 * The place most in view in a scrolled scene: the segment covering the scroller's middle. `segments`
 * are the `[data-place]` boxes, left to right, in the scroller's own coordinates.
 */
export function placeInView(segments: readonly { id: PlaceId; left: number; width: number }[], scrollLeft: number, viewWidth: number): PlaceId {
  const mid = scrollLeft + viewWidth / 2;
  const hit = segments.find((seg) => mid >= seg.left && mid < seg.left + seg.width);
  if (hit) return hit.id;
  const last = segments[segments.length - 1];
  return last && last.width > 0 && mid >= last.left + last.width ? last.id : (segments[0]?.id ?? 'sill');
}

/** Where to scroll to show a segment: centred, or its start when it is wider than the view. */
export function scrollToSegment(seg: { left: number; width: number }, viewWidth: number, maxScroll: number): number {
  const left = seg.width >= viewWidth ? seg.left : seg.left + seg.width / 2 - viewWidth / 2;
  return Math.max(0, Math.min(maxScroll, Math.round(left)));
}

/* ------------------------------------------------------------------ */
/* The pantry and the basket (DESIGN §8.2)                              */
/* ------------------------------------------------------------------ */

export interface TreatRow {
  id: string;
  name: string;
  servings: number;
  harvest: boolean;
}

/**
 * Harvest-only treats (the basket: cat grass, catnip, lavender shortbread) and every other owned recipe
 * (the pantry, strawberries included: a starter that her strawberry plant tops up), by name.
 */
export function pantryRows(collection: AppState['collection'], pantry: AppState['pantry']): { basket: TreatRow[]; pantry: TreatRow[] } {
  const rows: TreatRow[] = [];
  for (const [id, owned] of Object.entries(collection)) {
    if (!owned || owned.count <= 0) continue;
    const def = getCollectible(id);
    if (def?.category !== 'treat') continue;
    rows.push({ id, name: def.name, servings: pantry[id]?.servings ?? 0, harvest: def.source === 'harvest' });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return { basket: rows.filter((r) => r.harvest), pantry: rows.filter((r) => !r.harvest) };
}

/* ------------------------------------------------------------------ */
/* Sill extras                                                         */
/* ------------------------------------------------------------------ */

export interface ExtrasInput {
  cutting: { stage: number; overall: number };
  found: { petId: string; seed: number } | null;
  letterWaiting: { id: string; kind: 'sundayNote' | 'herbarium' | 'anniversary' } | null;
  storyWaiting: { habitId: string } | null;
  birthday: boolean;
}

/** The Cutting, today's found thing, a note waiting and the cake, with their taps. */
export function sillExtras(i: ExtrasInput, on: { found: () => void; note: (kind: 'letter' | 'story') => void }, labels: { found?: string; note?: string } = {}): SillExtras {
  return {
    cutting: { stage: i.cutting.stage, overall: i.cutting.overall },
    ...(i.found ? { found: { seed: i.found.seed, label: labels.found, onTap: on.found } } : {}),
    ...(i.letterWaiting
      ? { note: { kind: i.letterWaiting.kind, label: labels.note, onOpen: () => on.note('letter') } }
      : i.storyWaiting
        ? { note: { kind: 'story' as const, label: labels.note, onOpen: () => on.note('story') } }
        : {}),
    ...(i.birthday ? { cake: true } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                        */
/* ------------------------------------------------------------------ */

/** The species of a pet id (a Moonlit variant is its base species). */
export function speciesOfId(id: string): Species | null {
  const def = getCollectible(id);
  if (def?.category === 'pet') return def.species;
  const base = getCollectible(id.replace(/^moonlit:/, ''));
  return base?.category === 'pet' ? base.species : null;
}
