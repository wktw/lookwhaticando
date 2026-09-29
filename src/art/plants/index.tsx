/**
 * Plant & pot art (habits-as-plants, DESIGN §5.5 + §13.1): parametric plants for every
 * PlantSpeciesId at all 8 stages (with in-stage progress and post-Evergreen blooms), and every PotId.
 */
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import { PLANT_SPECIES } from './species';
import { POTS } from './pots';

export { PlantArt, PotArt, PLANT_STAGE_NAMES, MAX_BLOOMS, type PlantArtProps } from './PlantArt';

/** Registries used by the coverage test. */
export const PLANT_SPECIES_WITH_ART: ReadonlySet<PlantSpeciesId> = new Set(Object.keys(PLANT_SPECIES) as PlantSpeciesId[]);
export const POTS_WITH_ART: ReadonlySet<PotId> = new Set(Object.keys(POTS) as PotId[]);
