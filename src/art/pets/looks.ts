import type { PetLook } from './types';
import { getCollectible } from '@/catalog/collectibles';

/**
 * Visual definition of every pet variant, keyed by collectible id.
 * Palettes are pastel; saturated color only for tiny accents (see DESIGN §10.4).
 */
export const LOOKS: Record<string, PetLook> = {
  'pet-mochi': {
    species: 'cat',
    pattern: 'cow',
    traits: ['sprout'],
    palette: { body: '#FFF9F0', pattern: '#6E5250', earInner: '#FFC4D3', nose: '#F58CAA' },
  },
  'pet-cat-orange': {
    species: 'cat',
    pattern: 'tabby',
    palette: { body: '#FFD3A3', pattern: '#F2A764', earInner: '#FFB9C6', nose: '#F58CAA', tail: '#FFC88E' },
  },
  'pet-cat-grey': {
    species: 'cat',
    pattern: 'tabby',
    palette: { body: '#D9D6E3', pattern: '#B3AEC4', earInner: '#FFC4D3', nose: '#F29AB2' },
  },
  'pet-cat-tuxedo': {
    species: 'cat',
    pattern: 'tuxedo',
    palette: { body: '#5B5063', belly: '#FFFFFF', earInner: '#F7A8BC', nose: '#F58CAA', feet: '#FFFFFF', eye: '#2E2430' },
  },
  'pet-cat-cream': {
    species: 'cat',
    pattern: 'none',
    palette: { body: '#FFF4E4', earInner: '#FFCBD6', nose: '#F7A1B5' },
  },
  'pet-cat-calico': {
    species: 'cat',
    pattern: 'calico',
    palette: { body: '#FFFBF4', pattern: '#F6B67C', pattern2: '#6E5250', earInner: '#FFC4D3', nose: '#F58CAA' },
  },
};

/** Look for any pet id. Unknown ids get a neutral look of the right species. */
export function getLook(petId: string): PetLook {
  const found = LOOKS[petId];
  if (found) return found;
  const def = getCollectible(petId);
  const species = def && def.category === 'pet' ? def.species : 'cat';
  return { species, pattern: 'none', palette: { body: '#F4ECE6', earInner: '#FFC4D3', nose: '#F58CAA' } };
}
