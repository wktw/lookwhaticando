import type { Species } from '@/catalog/types';
import { NAME_SUGGESTIONS } from '@/catalog/personalities';

/**
 * Name suggestions for a pet that just came home (DESIGN §7.2): the catalog's real, gentle pet
 * names (NAME_SUGGESTIONS), offered five at a time with "Another name". Never puns.
 */
export const NAME_IDEAS: Readonly<Record<Species, readonly string[]>> = NAME_SUGGESTIONS;

/** Five suggestions for `species`, a different five for each `round`, never including `current`. */
export function nameIdeas(species: Species, round: number, current = ''): string[] {
  const all = NAME_IDEAS[species].filter((n) => n.toLowerCase() !== current.trim().toLowerCase());
  const start = (round * 5) % all.length;
  return Array.from({ length: Math.min(5, all.length) }, (_, i) => all[(start + i) % all.length]!);
}
