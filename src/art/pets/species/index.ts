import type { Species } from '@/catalog/types';
import type { SpeciesArt } from '../types';
import { cat } from './cat';
import { placeholder } from './placeholder';

/** Species renderers. Every entry must be real art before release (see tests/unit/art-coverage.test.ts). */
export const SPECIES_ART: Record<Species, SpeciesArt> = {
  cat,
  cow: placeholder,
  dog: placeholder,
  bunny: placeholder,
  frog: placeholder,
  bear: placeholder,
  hamster: placeholder,
  duck: placeholder,
};

export { placeholder as PLACEHOLDER_SPECIES };
