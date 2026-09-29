import type { Species } from '@/catalog/types';
import type { SpeciesArt } from '../types';
import { cat } from './cat';
import { cow } from './cow';
import { dog } from './dog';
import { bunny } from './bunny';
import { frog } from './frog';
import { bear } from './bear';
import { hamster } from './hamster';
import { duck } from './duck';
import { placeholder } from './placeholder';

/** Species renderers. Every entry must be real art before release (see tests/unit/art-coverage.test.ts). */
export const SPECIES_ART: Record<Species, SpeciesArt> = { cat, cow, dog, bunny, frog, bear, hamster, duck };

export { placeholder as PLACEHOLDER_SPECIES };
