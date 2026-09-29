import type { Species } from '@/catalog/types';
import type { SpeciesArt } from './art';
import { CAT_ART } from './cat';
import { COW_ART } from './cow';
import { FROG_ART } from './frog';
import { DOG_ART } from './dog';
import { BUNNY_ART } from './bunny';
import { BEAR_ART } from './bear';
import { HAMSTER_ART } from './hamster';
import { DUCK_ART } from './duck';

/** A stand-in for species without art (never used by a catalog pet; the coverage test checks). */
export const PLACEHOLDER_SPECIES: SpeciesArt = { ...CAT_ART, species: 'cat' };

export const SPECIES_ART: Record<Species, SpeciesArt> = {
  cat: CAT_ART,
  cow: COW_ART,
  dog: DOG_ART,
  bunny: BUNNY_ART,
  frog: FROG_ART,
  bear: BEAR_ART,
  hamster: HAMSTER_ART,
  duck: DUCK_ART,
};

export type { SpeciesArt } from './art';
