import type { PlantSpeciesId } from '@/catalog/types';
import type { PlantSpeciesArt } from '../types';
import { tulip } from './tulip';
import { daisy } from './daisy';
import { sunflower } from './sunflower';
import { succulent } from './succulent';
import { monstera } from './monstera';
import { sakura } from './sakura';
import { strawberry } from './strawberry';
import { lavender } from './lavender';
import { cactus } from './cactus';
import { lily } from './lily';
import { mushroom } from './mushroom';
import { lemon } from './lemon';

/** Placeholder mapping onto the Mochi-era drawings until the catkin plant restyle lands (DESIGN §10). */
export const PLANT_SPECIES: Record<PlantSpeciesId, PlantSpeciesArt> = {
  pothos: lily,
  pilea: succulent,
  begonia: daisy,
  snakeplant: cactus,
  catgrass: tulip,
  monstera,
  strawberry,
  lavender,
  catnip: lemon,
  hoya: sakura,
  orchid: lily,
  calathea: mushroom,
  violet: daisy,
  tulip,
  xmascactus: cactus,
  sunflower,
};
