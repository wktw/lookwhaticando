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

export const PLANT_SPECIES: Record<PlantSpeciesId, PlantSpeciesArt> = {
  tulip,
  daisy,
  sunflower,
  succulent,
  monstera,
  sakura,
  strawberry,
  lavender,
  cactus,
  lily,
  mushroom,
  lemon,
};
