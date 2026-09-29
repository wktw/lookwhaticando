import type { PlantSpeciesId } from '@/catalog/types';
import type { SpeciesArt } from '../types';
import { pothos } from './pothos';
import { pilea } from './pilea';
import { begonia } from './begonia';
import { snakeplant } from './snakeplant';
import { catgrass } from './catgrass';
import { monstera } from './monstera';
import { strawberry } from './strawberry';
import { lavender } from './lavender';
import { catnip } from './catnip';
import { hoya } from './hoya';
import { orchid } from './orchid';
import { calathea } from './calathea';
import { violet } from './violet';
import { tulip } from './tulip';
import { xmascactus } from './xmascactus';
import { sunflower } from './sunflower';

/** Every species, drawn from life (DESIGN §5.5, §10.4). */
export const PLANT_SPECIES: Record<PlantSpeciesId, SpeciesArt> = {
  pothos,
  pilea,
  begonia,
  snakeplant,
  catgrass,
  monstera,
  strawberry,
  lavender,
  catnip,
  hoya,
  orchid,
  calathea,
  violet,
  tulip,
  xmascactus,
  sunflower,
};
