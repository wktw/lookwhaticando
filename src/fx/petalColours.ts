/**
 * The plants' own colours for celebration petals (DESIGN §9.1, §10.5): a bloom lets fall its own
 * flowers, a perfect day the flowers and leaves of what is on the sill. Plants that never flower
 * indoors (pothos, monstera …) give leaves only. Near-white flowers (strawberry, catnip, hoya's
 * pale stars) vanish on paper, so their petals take the flower's warm centre or blush instead.
 */
import type { PlantSpeciesId } from '@/catalog/types';
import type { ParticleShape } from './particles';

interface SpeciesColours {
  /** Petal colours, strongest first. Empty: it does not flower on a sill. */
  flowers: readonly string[];
  /** Its leaf greens (light, deep). */
  leaves: readonly string[];
}

export const SPECIES_COLOURS: Record<PlantSpeciesId, SpeciesColours> = {
  pothos: { flowers: [], leaves: ['#BCD3A3', '#8AAE77'] },
  pilea: { flowers: [], leaves: ['#A9C98F', '#86AD72'] },
  begonia: { flowers: ['#EFB4C1', '#E8A9B8'], leaves: ['#9CBC87', '#7E9F6E'] },
  snakeplant: { flowers: [], leaves: ['#A7BF8E', '#7F9B6C'] },
  catgrass: { flowers: [], leaves: ['#BCD3A3', '#9CBC87'] },
  monstera: { flowers: [], leaves: ['#9CBC87', '#7E9F6E'] },
  strawberry: { flowers: ['#F2C3CD', '#F2D98A'], leaves: ['#9CBC87', '#8AAE77'] },
  lavender: { flowers: ['#C8BAE6', '#B6A5DC'], leaves: ['#B7C7A6', '#9DB08C'] },
  catnip: { flowers: ['#DDD4F1', '#C8BAE6'], leaves: ['#B5CC9C', '#9CBC87'] },
  hoya: { flowers: ['#F2C3CD', '#E8A9B8'], leaves: ['#9CBC87', '#86AD72'] },
  orchid: { flowers: ['#DDB6DA', '#E8A9B8'], leaves: ['#A9C98F', '#8AAE77'] },
  calathea: { flowers: [], leaves: ['#A9C98F', '#7E9F6E'] },
  violet: { flowers: ['#B6A5DC', '#C8BAE6'], leaves: ['#9CBC87', '#86AD72'] },
  tulip: { flowers: ['#EFB4C1', '#F2D98A'], leaves: ['#B5CC9C', '#9CBC87'] },
  xmascactus: { flowers: ['#E8A9B8', '#DDB6DA'], leaves: ['#A9C98F', '#8AAE77'] },
  sunflower: { flowers: ['#F2D98A', '#EBC96E'], leaves: ['#A9C98F', '#8AAE77'] },
};

/** What a celebration's petals are made of: burst()'s colour and shape options. */
export interface PetalMix {
  colors: string[];
  leafColors: string[];
  shapes: ParticleShape[];
}

const unique = (xs: readonly string[]) => [...new Set(xs)];

/**
 * The petal mix for the given plants: their flowers and leaves, or leaves only when none of them
 * flowers. Unknown or no plants fall back to plain sill greens (undefined colours = the defaults).
 */
export function petalMix(species: readonly (PlantSpeciesId | undefined)[]): PetalMix {
  const known = species.flatMap((id) => (id && SPECIES_COLOURS[id] ? [SPECIES_COLOURS[id]] : []));
  const flowers = unique(known.flatMap((c) => c.flowers));
  const leafColors = unique(known.flatMap((c) => c.leaves));
  return flowers.length ? { colors: flowers, leafColors, shapes: ['petal', 'leaf'] } : { colors: [], leafColors, shapes: ['leaf'] };
}
