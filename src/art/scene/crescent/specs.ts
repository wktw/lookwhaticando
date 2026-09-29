/** Every crescent the scene draws, gathered for the offline generator (imported by tests only). */
import type { CrescentSpec } from './generate';
import { PROP_CRESCENTS } from '../props/shapes';
import { PLACE_CRESCENTS } from '../places/shapes';

export const ALL_CRESCENT_SPECS: Record<string, CrescentSpec> = {
  ...PROP_CRESCENTS,
  ...PLACE_CRESCENTS,
};
