/**
 * Routines and keepsake families (DESIGN §14.1 "Routines, not performances", "Keepsakes").
 *
 * A companion relates to its habit's objects the way real animals do, and never performs the
 * human activity: it sleeps on the open book (Read), lies on the mat (Stretch), sits in the laundry
 * basket (Tidy)… There are 14 routine archetypes, mapped from the habit's icon. The ids and the
 * icon map are the voice module's (`ARCHETYPES` / `ARCHETYPE_BY_ICON` in src/catalog/lines.ts on
 * catkin/voice), repeated here so the logic layer doesn't depend on copy; a test pins every icon.
 *
 * - A routine shows only on days the habit was done, from Potted on, and is permanent from
 *   Blooming ('settled'). A day without it looks exactly like an ordinary day: there is no
 *   "missed" routine, only no routine.
 * - Keepsakes come from 12 activity families (the same activity art draws the routine props and
 *   the Sunday Note sketches), plus a brass seed at Evergreen.
 */
import type { Species } from '@/catalog/types';
import type { KeepsakeFamily, KeepsakeKind } from '@/state/types';
import { BLOOMING, BUDDING, EVERGREEN, POTTED, ROOTING } from './growth';

export const ROUTINES = ['read', 'learn', 'walk', 'mat', 'water', 'sleep', 'mind', 'create', 'tidy', 'cook', 'care', 'plan', 'connect', 'garden'] as const;
export type Routine = (typeof ROUTINES)[number];

/** Every habit icon's routine (unknown icons fall back to 'garden', the watering can). */
export const ROUTINE_BY_ICON: Readonly<Record<string, Routine>> = {
  book: 'read',
  lightbulb: 'learn',
  laptop: 'learn',
  language: 'learn',
  walk: 'walk',
  run: 'walk',
  bike: 'walk',
  swim: 'walk',
  sun: 'walk',
  stretch: 'mat',
  yoga: 'mat',
  dumbbell: 'mat',
  water: 'water',
  tea: 'water',
  'moon-sleep': 'sleep',
  'no-phone': 'sleep',
  lotus: 'mind',
  pray: 'mind',
  smile: 'mind',
  sparkle: 'mind',
  palette: 'create',
  yarn: 'create',
  music: 'create',
  camera: 'create',
  broom: 'tidy',
  'sparkle-clean': 'tidy',
  bathtub: 'tidy',
  laundry: 'tidy',
  dishes: 'tidy',
  house: 'tidy',
  wrench: 'tidy',
  salad: 'cook',
  apple: 'cook',
  cart: 'cook',
  skincare: 'care',
  tooth: 'care',
  vitamins: 'care',
  paw: 'care',
  'piggy-bank': 'plan',
  calendar: 'plan',
  star: 'plan',
  journal: 'plan',
  phone: 'connect',
  'heart-date': 'connect',
  gift: 'connect',
  'watering-can': 'garden',
  leaf: 'garden',
  flower: 'garden',
};

export function routineOf(icon: string): Routine {
  return ROUTINE_BY_ICON[icon] ?? 'garden';
}

export const KEEPSAKE_FAMILIES: readonly KeepsakeFamily[] = ['move', 'read', 'hydrate', 'rest', 'mind', 'create', 'tidy', 'cook', 'care', 'garden', 'connect', 'plan'];

/** The activity family a routine's keepsakes come from (studying leaves a bookmark, like reading). */
export const FAMILY_BY_ROUTINE: Readonly<Record<Routine, KeepsakeFamily>> = {
  read: 'read',
  learn: 'read',
  walk: 'move',
  mat: 'move',
  water: 'hydrate',
  sleep: 'rest',
  mind: 'mind',
  create: 'create',
  tidy: 'tidy',
  cook: 'cook',
  care: 'care',
  plan: 'plan',
  connect: 'connect',
  garden: 'garden',
};

/** The stages that leave a keepsake (§14.1): Rooting, Budding, Blooming and Evergreen. */
export const KEEPSAKE_STAGES: readonly number[] = [ROOTING, BUDDING, BLOOMING, EVERGREEN];

/** What a companion leaves by the pot at `stage`: the habit's family, or a brass seed at Evergreen. */
export function keepsakeKind(icon: string, stage: number): KeepsakeKind {
  return stage >= EVERGREEN ? 'brass-seed' : FAMILY_BY_ROUTINE[routineOf(icon)];
}

export type RoutinePhase = 'starting' | 'settled';

/**
 * The routine's phase on a day, or null when there is none to show: from Potted, on days the habit
 * was done ('starting'); every day from Blooming ('settled'). Never a "missed" state.
 */
export function routinePhase(displayStage: number, doneThatDay: boolean): RoutinePhase | null {
  if (displayStage >= BLOOMING) return 'settled';
  if (displayStage >= POTTED && doneThatDay) return 'starting';
  return null;
}

/**
 * "Let them choose" (§7.2): the routines each species is drawn to, most loved first. Cats like
 * books, beds and warm laptops; cows the walk and the garden; frogs and ducks the water dish.
 */
export const SPECIES_ROUTINES: Readonly<Record<Species, readonly Routine[]>> = {
  cat: ['read', 'learn', 'sleep', 'create', 'plan', 'mind'],
  cow: ['walk', 'garden', 'cook', 'mind'],
  dog: ['walk', 'connect', 'mat', 'cook'],
  bunny: ['garden', 'cook', 'mind', 'sleep'],
  frog: ['water', 'mind', 'garden'],
  bear: ['cook', 'sleep', 'read', 'walk'],
  hamster: ['mat', 'plan', 'tidy', 'create'],
  duck: ['water', 'walk', 'tidy'],
};
