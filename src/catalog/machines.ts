import type { MachineDef, MachineId, StandardMachineId, SeasonalMachineId } from './types';

const COIN_ODDS = { common: 60, uncommon: 25, rare: 10, ultra: 5 } as const;
const DREAMY_ODDS = { common: 40, uncommon: 30, rare: 20, ultra: 10 } as const;

export const MACHINES: readonly MachineDef[] = [
  {
    id: 'kitty',
    name: 'Kitty Capsule',
    tagline: 'Cats, cat toys, and cat-approved accessories.',
    currency: 'coins',
    price: 25,
    theme: { body: '#F58CAA', trim: '#FFE9EF', glass: '#FFF5F8', capsules: ['#FFC4D3', '#FFE593', '#BBDCF6', '#FFFFFF', '#D6C8F8'], ink: '#8A2448' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'moo',
    name: 'Moo Moo Milk Bar',
    tagline: 'Cows, farm fits, and strawberry milk.',
    currency: 'coins',
    price: 25,
    theme: { body: '#FFFFFF', trim: '#FFC4D3', glass: '#FFF9F2', capsules: ['#FFC4D3', '#FFFFFF', '#FFE593', '#C3DFB4', '#BBDCF6'], ink: '#6B3A2E' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'puppy',
    name: 'Puppy Park',
    tagline: 'Pups, playthings, and very good snacks.',
    currency: 'coins',
    price: 25,
    theme: { body: '#BBDCF6', trim: '#FFE593', glass: '#F5FAFF', capsules: ['#FFE593', '#BBDCF6', '#FFCBA8', '#FFFFFF', '#C3DFB4'], ink: '#1F4F75' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'sakura',
    name: 'Sakura Garden',
    tagline: 'Bunnies, frogs, blossoms, and new plants for your habits.',
    currency: 'coins',
    price: 25,
    theme: { body: '#C3DFB4', trim: '#FFC4D3', glass: '#FDF6F8', capsules: ['#FFC4D3', '#FFE9EF', '#C3DFB4', '#FFFFFF', '#F0C6F0'], ink: '#365A2C' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'sweets',
    name: 'Sweet Treats',
    tagline: 'Hamsters, bears, and snacks your friends will adore.',
    currency: 'coins',
    price: 25,
    theme: { body: '#FFCBA8', trim: '#FFF7D9', glass: '#FFFAF3', capsules: ['#FFE593', '#FFCBA8', '#FFC4D3', '#B3E6D6', '#FFFFFF'], ink: '#8A4520' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'dreamy',
    name: 'Dreamy Night',
    tagline: 'Starlit friends and sleepy things. Costs stars, and the odds are better.',
    currency: 'stars',
    price: 3,
    theme: { body: '#A993EA', trim: '#F2EDFE', glass: '#F4F0FF', capsules: ['#D6C8F8', '#BBDCF6', '#FFE593', '#F0C6F0', '#FFFFFF'], ink: '#3E2A8A' },
    odds: { ...DREAMY_ODDS },
  },
  {
    id: 'pumpkin',
    name: 'Pumpkin Patch',
    tagline: 'Cozy autumn and gentle spooks. Back every fall.',
    currency: 'coins',
    price: 25,
    theme: { body: '#FF9E6E', trim: '#FFEEDF', glass: '#FFF7F0', capsules: ['#FFCBA8', '#D6C8F8', '#FFE593', '#C3DFB4', '#FFFFFF'], ink: '#7A3410' },
    seasonal: { start: { month: 9, day: 1 }, end: { month: 11, day: 10 }, emoji: '🎃' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'snow',
    name: 'Snow Globe',
    tagline: 'Snowy friends and festive knits. Back every winter.',
    currency: 'coins',
    price: 25,
    theme: { body: '#7DB7E8', trim: '#E7F3FD', glass: '#F3F9FF', capsules: ['#FFFFFF', '#BBDCF6', '#FFC4D3', '#C3DFB4', '#FFE593'], ink: '#1F4F75' },
    seasonal: { start: { month: 11, day: 11 }, end: { month: 1, day: 14 }, emoji: '❄️' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'love',
    name: 'Love Letters',
    tagline: 'Hearts, roses, and very huggable friends. Back every February.',
    currency: 'coins',
    price: 25,
    theme: { body: '#F58CAA', trim: '#FBEAFB', glass: '#FFF4F7', capsules: ['#FFC4D3', '#F0C6F0', '#FFFFFF', '#FFE593', '#FF9FB8'], ink: '#8A2448' },
    seasonal: { start: { month: 1, day: 15 }, end: { month: 2, day: 29 }, emoji: '💌' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'rainy',
    name: 'Rainy Day',
    tagline: 'Ducks, frogs, puddles, and rainbows. Back every spring.',
    currency: 'coins',
    price: 25,
    theme: { body: '#6CCBAE', trim: '#FFF7D9', glass: '#F2FBF8', capsules: ['#FFE593', '#B3E6D6', '#BBDCF6', '#FFFFFF', '#C3DFB4'], ink: '#1E5C4A' },
    seasonal: { start: { month: 3, day: 1 }, end: { month: 5, day: 31 }, emoji: '☔' },
    odds: { ...COIN_ODDS },
  },
  {
    id: 'beach',
    name: 'Beach Day',
    tagline: 'Sunshine, seashores, and something mermaid-y. Back every summer.',
    currency: 'coins',
    price: 25,
    theme: { body: '#7DB7E8', trim: '#FFE593', glass: '#F3FAFF', capsules: ['#FFE593', '#BBDCF6', '#FFC4D3', '#B3E6D6', '#FFFFFF'], ink: '#1F4F75' },
    seasonal: { start: { month: 6, day: 1 }, end: { month: 8, day: 31 }, emoji: '🏖️' },
    odds: { ...COIN_ODDS },
  },
];

export const MACHINE_BY_ID: ReadonlyMap<MachineId, MachineDef> = new Map(MACHINES.map((m) => [m.id, m]));

export function getMachine(id: MachineId): MachineDef {
  const m = MACHINE_BY_ID.get(id);
  if (!m) throw new Error(`Unknown machine ${id}`);
  return m;
}

export const STANDARD_MACHINE_IDS: readonly StandardMachineId[] = ['kitty', 'moo', 'puppy', 'sakura', 'sweets', 'dreamy'];
export const SEASONAL_MACHINE_IDS: readonly SeasonalMachineId[] = ['pumpkin', 'snow', 'love', 'rainy', 'beach'];

/** Duplicate → stardust by rarity (DESIGN §6.4). */
export const STARDUST_FOR_DUPLICATE = { common: 2, uncommon: 4, rare: 8, ultra: 15 } as const;
/** Wishing Well star prices by rarity (DESIGN §6.4). */
export const WISH_PRICE = { common: 2, uncommon: 4, rare: 8, ultra: 15 } as const;
export const STARDUST_PER_STAR = 10;
export const PITY_RARE = 10;
export const PITY_ULTRA = 40;
export const NEW_ITEM_WEIGHT = 3;
