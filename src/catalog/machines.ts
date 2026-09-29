import type { MachineDef, MachineId, StandardMachineId, SeasonalMachineId } from './types';

/*
 * Tabletop capsule cabinets, named like real blind-box series (DESIGN §7.1). Each cabinet is
 * a painted tin body (`body`), a paper lineup leaflet (`trim`, with `ink` at AA contrast on it),
 * a window (`glass`) and capsules whose lower halves are tinted (`capsules`); upper halves are clear.
 */

const COIN_ODDS = { common: 60, uncommon: 25, rare: 10, ultra: 5 } as const;
const NIGHT_ODDS = { common: 40, uncommon: 30, rare: 20, ultra: 10 } as const;

const CREAM = '#FFFDF9';

export const MACHINES: readonly MachineDef[] = [
  {
    id: 'cats',
    number: 'No. 01',
    name: 'Cats',
    tagline: 'Real coats, collars and knits, and the smallest cardboard box.',
    currency: 'coins',
    price: 25,
    theme: { body: '#EFB4C1', trim: '#FBE9EC', glass: '#FFF8F9', capsules: ['#F5CDD6', '#F6E6B4', '#D2E4F2', CREAM, '#DDD4F1'], ink: '#8F3550' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'cows',
    number: 'No. 02',
    name: 'Cows',
    tagline: 'Real breeds, bells and bandanas, and strawberry milk.',
    currency: 'coins',
    price: 25,
    theme: { body: '#F1E9DD', trim: CREAM, glass: '#FFFBF5', capsules: ['#F5CDD6', CREAM, '#F6E6B4', '#D5E3C7', '#D2E4F2'], ink: '#3B3236' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'dogs',
    number: 'No. 03',
    name: 'Dogs',
    tagline: 'Real breeds, bandanas, and biscuits snapped in half to share.',
    currency: 'coins',
    price: 25,
    theme: { body: '#B3D1E8', trim: '#EAF2F9', glass: '#F7FAFD', capsules: ['#F6E6B4', '#D2E4F2', '#EFCDBD', CREAM, '#D5E3C7'], ink: '#2D6186' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'pond',
    number: 'No. 04',
    name: 'Pond',
    tagline: 'Frogs and ducklings, rain hats, and a lily pad with room for one.',
    currency: 'coins',
    price: 25,
    theme: { body: '#A9D3C0', trim: '#E8F3EE', glass: '#F5FBF8', capsules: ['#CDE6DA', '#F6E6B4', '#D2E4F2', CREAM, '#D5E3C7'], ink: '#2D6653' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'garden',
    number: 'No. 05',
    name: 'Garden',
    tagline: 'Rabbits, new plants and pots for your habits, and seed packets.',
    currency: 'coins',
    price: 25,
    theme: { body: '#B5CC9C', trim: '#EEF3E7', glass: '#F7FAF3', capsules: ['#D5E3C7', '#F5CDD6', '#F6E6B4', CREAM, '#EDD3EA'], ink: '#3F5C34' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'pantry',
    number: 'No. 06',
    name: 'Pantry',
    tagline: 'Hamsters, bear cubs, and good things from the kitchen shelf.',
    currency: 'coins',
    price: 25,
    theme: { body: '#F2D98A', trim: '#FBF3DA', glass: '#FFFBF0', capsules: ['#F6E6B4', '#EFCDBD', '#F5CDD6', '#CDE6DA', CREAM], ink: '#735A0B' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'night',
    number: 'No. 07',
    name: 'Night',
    tagline: 'Night coats, pajamas and lamps, and Moonlit visitors. Better odds, paid in stamps.',
    currency: 'stars',
    price: 3,
    theme: { body: '#C8BAE6', trim: '#F1EDF9', glass: '#F8F6FC', capsules: ['#DDD4F1', '#D2E4F2', '#F6E6B4', '#EDD3EA', CREAM], ink: '#5A4896' },
    odds: { ...NIGHT_ODDS },
  },
  {
    id: 'autumn',
    name: 'Autumn Edition',
    tagline: 'Conkers, knitwear and small pumpkins. Here from September 1 to November 10.',
    currency: 'coins',
    price: 25,
    theme: { body: '#DDA088', trim: '#F9EBE3', glass: '#FFF8F4', capsules: ['#EFCDBD', '#F6E6B4', '#DDD4F1', '#D5E3C7', CREAM], ink: '#7F3E24' },
    seasonal: { start: { month: 9, day: 1 }, end: { month: 11, day: 10 } },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'winter',
    name: 'Winter Edition',
    tagline: 'Snow coats, Fair Isle and warm oats. Here from November 11 to January 14.',
    currency: 'coins',
    price: 25,
    theme: { body: '#D2E4F2', trim: CREAM, glass: '#F7FAFD', capsules: [CREAM, '#D2E4F2', '#F5CDD6', '#D5E3C7', '#F6E6B4'], ink: '#2D6186' },
    seasonal: { start: { month: 11, day: 11 }, end: { month: 1, day: 14 } },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'valentine',
    name: 'Valentine Edition',
    tagline: 'Heart-spots, sweet peas and small letters. Here from January 15 to the end of February.',
    currency: 'coins',
    price: 25,
    theme: { body: '#DDB6DA', trim: '#F8ECF6', glass: '#FDF7FC', capsules: ['#F5CDD6', '#EDD3EA', CREAM, '#F6E6B4', '#EFB4C1'], ink: '#763A74' },
    seasonal: { start: { month: 1, day: 15 }, end: { month: 2, day: 29 } },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'spring',
    name: 'Spring Edition',
    tagline: 'Blossom, pea pods and new ducklings. Here from March 1 to May 31.',
    currency: 'coins',
    price: 25,
    theme: { body: '#D5E3C7', trim: '#FBE9EC', glass: '#FDF8F9', capsules: ['#F5CDD6', '#D5E3C7', '#F6E6B4', CREAM, '#D2E4F2'], ink: '#3F5C34' },
    seasonal: { start: { month: 3, day: 1 }, end: { month: 5, day: 31 } },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'summer',
    name: 'Summer Edition',
    tagline: 'Sun hats, watermelon and seashells. Here from June 1 to August 31.',
    currency: 'coins',
    price: 25,
    theme: { body: '#F6E6B4', trim: '#EAF2F9', glass: '#F7FAFD', capsules: ['#F6E6B4', '#D2E4F2', '#F5CDD6', '#CDE6DA', CREAM], ink: '#2D6186' },
    seasonal: { start: { month: 6, day: 1 }, end: { month: 8, day: 31 } },
    odds: { ...COIN_ODDS },
  },
];

export const MACHINE_BY_ID: ReadonlyMap<MachineId, MachineDef> = new Map(MACHINES.map((m) => [m.id, m]));

export function getMachine(id: MachineId): MachineDef {
  const m = MACHINE_BY_ID.get(id);
  if (!m) throw new Error(`Unknown machine ${id}`);
  return m;
}

/** "No. 02 · Cows" for numbered series, "Autumn Edition" for seasonal ones. */
export function seriesLabel(m: MachineDef): string {
  return m.number ? `${m.number} · ${m.name}` : m.name;
}

export const STANDARD_MACHINE_IDS: readonly StandardMachineId[] = ['cats', 'cows', 'dogs', 'pond', 'garden', 'pantry', 'night'];
export const SEASONAL_MACHINE_IDS: readonly SeasonalMachineId[] = ['autumn', 'winter', 'valentine', 'spring', 'summer'];

/** Duplicate → swaps by rarity (internally `stardust`; DESIGN §6). 10 swaps make a stamp. */
export const STARDUST_FOR_DUPLICATE = { common: 2, uncommon: 4, rare: 8, ultra: 15 } as const;
/** Special Order stamp prices by rarity (internally the "wish"; DESIGN §7.3). */
export const WISH_PRICE = { common: 3, uncommon: 4, rare: 8, ultra: 15 } as const;
export const STARDUST_PER_STAR = 10;
export const PITY_RARE = 10;
export const PITY_ULTRA = 40;
export const NEW_ITEM_WEIGHT = 3;
