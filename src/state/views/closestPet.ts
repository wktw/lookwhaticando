import { getCollectible } from '@/catalog/collectibles';
import type { Species } from '@/catalog/types';
import { closestPetId } from '@/domain/friendship';
import type { AppState } from '../types';

/**
 * Your closest pet (most friendship, then the oldest friend) and its species: the Shelf tab's
 * silhouette (DESIGN §1 Many animals). In a module of its own so the app shell reads it without
 * the whole pets view (./pets re-exports it), which stays off the first paint.
 */
export function closestPet(s: Pick<AppState, 'pets'>): { id: string; species: Species | null } | null {
  const id = closestPetId(s);
  if (!id) return null;
  const def = getCollectible(id);
  return { id, species: def?.category === 'pet' ? def.species : null };
}
