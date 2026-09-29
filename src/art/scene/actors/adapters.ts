/**
 * Narrow adapters over the art modules' components for props they are adding in parallel.
 * TODO(integration): PetArt gains `pose` and `light` (pets module) and PlantArt gains `light` and
 * `damp` (plants module). Once they land, these casts become plain re-exports.
 */
import type { ComponentType } from 'preact';
import type { Light } from '@/art/light';
import { PetArt, type PetArtProps } from '@/art/pets/PetArt';
import { PlantArt, type PlantArtProps } from '@/art/plants';

/** True postures (DESIGN §10.4), as the pets module draws them. */
export type PetPose = 'sit' | 'loaf' | 'stand' | 'walk' | 'sleep';

export const Pet = PetArt as unknown as ComponentType<PetArtProps & { pose?: PetPose; light?: Light }>;
export const Plant = PlantArt as unknown as ComponentType<PlantArtProps & { light?: Light; damp?: boolean }>;
