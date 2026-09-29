import { computed } from '@preact/signals';
import type { Species } from '@/catalog/types';
import { state } from '@/state/store';
import { closestPet } from '@/state/views/pets';
import type { TabId } from './routes';

/**
 * The Shelf tab draws your closest pet's species on the pot rim (DESIGN §1 Many animals): null
 * before the first pet (a sprig in the pot).
 */
export const shelfTabSpecies = computed<Species | null>(() => closestPet(state.value)?.species ?? null);

/** The `species` a tab's icon takes: only the Shelf's has one. */
export const tabSpecies = (id: TabId): Species | null | undefined => (id === 'shelf' ? shelfTabSpecies.value : undefined);
