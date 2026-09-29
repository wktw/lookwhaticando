import type { Species } from '@/catalog/types';

/**
 * Name suggestions for a pet that just came home (DESIGN §7.2): real, gentle pet names, a few
 * per species, offered five at a time with a reroll. Never puns.
 */
export const NAME_IDEAS: Record<Species, readonly string[]> = {
  cat: ['Pudding', 'Juniper', 'Pepper', 'Biscuit', 'Miso', 'Olive', 'Clementine', 'Tofu', 'Hazel', 'Fig', 'Maple', 'Sage'],
  cow: ['Clover', 'Daisy', 'Buttercup', 'Marigold', 'Oat', 'Bramble', 'Honey', 'Poppy', 'Rosie', 'Barley', 'Nutmeg', 'Primrose'],
  dog: ['Scout', 'Toast', 'Pip', 'Juno', 'Rufus', 'Mabel', 'Hazel', 'Maple', 'Olive', 'Biscuit', 'Bramble', 'Otis'],
  bunny: ['Thistle', 'Clover', 'Willow', 'Button', 'Fern', 'Hazel', 'Moss', 'Pebble', 'Bramble', 'Dandelion', 'Pip', 'Sorrel'],
  frog: ['Moss', 'Pebble', 'Lily', 'Fern', 'Reed', 'Basil', 'Kelp', 'Minnow', 'Sprout', 'Juniper', 'Cress', 'Pond'],
  bear: ['Bruno', 'Honey', 'Acorn', 'Barley', 'Hazel', 'Maple', 'Rowan', 'Birch', 'Juniper', 'Cocoa', 'Burdock', 'Otto'],
  hamster: ['Peanut', 'Pip', 'Sesame', 'Button', 'Bean', 'Crumb', 'Nutmeg', 'Poppy', 'Oat', 'Fig', 'Toffee', 'Pepper'],
  duck: ['Puddle', 'Wren', 'Dot', 'Clementine', 'Pip', 'Reed', 'Marsh', 'Custard', 'Sunny', 'Tansy', 'Rain', 'Bramble'],
};

/** Five suggestions for `species`, a different five for each `round`, never including `current`. */
export function nameIdeas(species: Species, round: number, current = ''): string[] {
  const all = NAME_IDEAS[species].filter((n) => n.toLowerCase() !== current.trim().toLowerCase());
  const start = (round * 5) % all.length;
  return Array.from({ length: Math.min(5, all.length) }, (_, i) => all[(start + i) % all.length]!);
}
