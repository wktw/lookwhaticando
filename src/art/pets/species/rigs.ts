import type { SpeciesRig } from '../rig';
import { CAT_RIG } from './cat.rig';
import { COW_RIG } from './cow.rig';
import { FROG_RIG } from './frog.rig';
import { DOG_FLAT_RIG, DOG_LONG_RIG, DOG_RIG } from './dog.rig';
import { BUNNY_RIG } from './bunny.rig';
import { BEAR_RIG } from './bear.rig';
import { HAMSTER_RIG } from './hamster.rig';
import { DUCK_RIG, DUCK_RUNNER_RIG } from './duck.rig';

/** Every rig by crescent id (species, plus body variants such as the long-bodied dogs). */
export const RIGS: Readonly<Record<string, SpeciesRig>> = {
  cat: CAT_RIG,
  cow: COW_RIG,
  frog: FROG_RIG,
  dog: DOG_RIG,
  'dog-long': DOG_LONG_RIG,
  'dog-flat': DOG_FLAT_RIG,
  bunny: BUNNY_RIG,
  bear: BEAR_RIG,
  hamster: HAMSTER_RIG,
  duck: DUCK_RIG,
  'duck-runner': DUCK_RUNNER_RIG,
};
