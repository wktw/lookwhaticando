/**
 * Plant art (DESIGN §5.5, §10.4): every habit is a real houseplant, drawn from life at eight stages, from a cutting in
 * a glass of water to an Evergreen specimen, in any of the pots, lit by the one window (or the lamp at night).
 */
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import { PLANT_SPECIES } from './species';
import { POTS } from './pots';

export { PlantArt, PotArt, PLANT_STAGE_NAMES, MAX_BLOOMS, bloomCount, type PlantArtProps, type PotArtProps, type PlantFit, type PlantLayer } from './PlantArt';
export { PETAL_INKS, PASTEL_HEX, lookInk, type PlantLookArt } from './looks';
export { FLOURISHES, MAX_FLOURISHES, type Flourish } from './flourishes';
export { iconFrame, ICON_FRAMES, SCENE_FRAME } from './iconFrames';
export { PlantTag, type PlantTagProps } from './PlantTag';
export { POT_GEOMETRY, tagAnchor, type PotGeometry } from './geometry';

/** Registries used by the coverage test. */
export const PLANT_SPECIES_WITH_ART: ReadonlySet<PlantSpeciesId> = new Set(Object.keys(PLANT_SPECIES) as PlantSpeciesId[]);
export const POTS_WITH_ART: ReadonlySet<PotId> = new Set(Object.keys(POTS) as PotId[]);
