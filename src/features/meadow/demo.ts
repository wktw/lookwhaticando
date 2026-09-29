/**
 * Demo Shelf until the screen is wired to the store: a few habit plants, the household out, and two
 * places opened. Everything is catalog ids, so it renders with whatever art the modules ship.
 */
import type { PlaceId } from '@/catalog/types';
import type { ShelfDecor, ShelfPet, SillPot } from '@/art/scene';

export const DEMO_POTS: SillPot[] = [
  { habitId: 'walk', name: 'Walk', note: 'after lunch', species: 'pothos', stage: 6, pot: 'terracotta', damp: true },
  { habitId: 'water', name: 'Drink water', note: 'after coffee', species: 'pilea', stage: 4, pot: 'cream', damp: true },
  { habitId: 'read', name: 'Read', note: 'before bed', species: 'begonia', stage: 5, pot: 'blush' },
  { habitId: 'stretch', name: 'Stretch', species: 'snakeplant', stage: 3, pot: 'speckled' },
  { habitId: 'yoga', name: 'Yoga', species: 'pothos', stage: 1, pot: 'blush' },
];

export const DEMO_PETS: ShelfPet[] = [
  { petId: 'pet-cat-grey', name: 'Earl', personality: 'sleepy', home: 'walk' },
  { petId: 'pet-cow-highland', name: 'Tuppence', personality: 'gentle', home: 'water' },
  { petId: 'pet-cat-calico', name: 'Juniper', personality: 'sunny' },
  { petId: 'pet-cow-beltie', name: 'Humbug', personality: 'dreamy' },
  { petId: 'pet-frog-tree', name: 'Fern', personality: 'curious', place: 'pond' },
  { petId: 'pet-duck-yellow', name: 'Sunny', personality: 'playful', place: 'pond' },
  { petId: 'pet-cat-black', name: 'Olive', personality: 'shy', place: 'bookshelf' },
];

export const DEMO_DECOR: ShelfDecor[] = [
  { itemId: 'decor-matchbox-bed', x: 250, depth: 0.82 },
  { itemId: 'decor-yarn-ball' },
  { itemId: 'decor-window-hammock' },
  { itemId: 'decor-rubber-duck', place: 'pond' },
];

export const DEMO_PLACES: PlaceId[] = ['pond', 'bookshelf'];

export const DEMO_COINS = 142;
