/** Staging a vignette on a still scene: the arrangement, with the vignette's cast moved into place. */
import type { PlaceId } from '@/catalog/types';
import type { Ground } from '../arrange';
import type { PetSpot, ShelfPet } from '../model';
import { petKey, speciesOf } from '../model';
import type { Moment } from '../time';
import { vignetteById } from './vignettes';

export function stageVignette(id: string, place: PlaceId, ground: Ground, moment: Moment, pets: readonly ShelfPet[], spots: ReadonlyMap<string, PetSpot>): Map<string, PetSpot> {
  const out = new Map(spots);
  const v = vignetteById(id);
  if (!v || (v.ready && !v.ready())) return out;
  const ctx = { place, ground, moment, actors: pets.filter((p) => spots.has(petKey(p))).map((p) => ({ key: petKey(p), species: speciesOf(p.petId), bond: p.bond, spot: spots.get(petKey(p))! })) };
  const cast = v.cast(ctx);
  if (!cast) return out;
  for (const [key, spot] of v.stage(ctx, cast)) out.set(key, spot);
  return out;
}
