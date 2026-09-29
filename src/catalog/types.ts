/**
 * Catalog type contracts. The catalog is static data describing every collectible,
 * machine, template and personality in Mochi Meadow. Art modules render by id;
 * domain modules reason by id. See docs/DESIGN.md §6–§8.
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'ultra';
/** Blind-box display labels (internal ids stay common/uncommon/rare/ultra). The series Secret shows 'Secret'. */
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Classic', uncommon: 'Special', rare: 'Rare', ultra: 'Super rare' };
/** Static print finish per tier (never color alone; DESIGN §7.1). */
export const RARITY_FINISH: Record<Rarity, string> = { common: 'matte paper', uncommon: 'two-colour print', rare: 'foil edge', ultra: 'holographic' };
export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'ultra'] as const;

export type Species = 'cat' | 'cow' | 'dog' | 'bunny' | 'frog' | 'bear' | 'hamster' | 'duck';
export const SPECIES: readonly Species[] = ['cat', 'cow', 'dog', 'bunny', 'frog', 'bear', 'hamster', 'duck'] as const;

export type Category = 'pet' | 'wearable' | 'treat' | 'decor' | 'plant' | 'pot';
export type WearableSlot = 'head' | 'face' | 'neck' | 'body';
export const WEARABLE_SLOTS: readonly WearableSlot[] = ['head', 'face', 'neck', 'body'] as const;

/** Where decor sits in the Meadow scene. */
export type DecorSlot = 'back-left' | 'back-right' | 'ground-left' | 'ground-center' | 'ground-right' | 'sky';
export const DECOR_SLOTS: readonly DecorSlot[] = [
  'back-left',
  'back-right',
  'ground-left',
  'ground-center',
  'ground-right',
  'sky',
] as const;

export type TreatTag = 'fruity' | 'sweet' | 'savory' | 'drink' | 'crunchy' | 'fresh';

/** Numbered series (No. 01 … No. 07). */
export type StandardMachineId = 'cats' | 'cows' | 'dogs' | 'pond' | 'garden' | 'pantry' | 'night';
/** Seasonal editions, returning every year on fixed calendar dates. */
export type SeasonalMachineId = 'autumn' | 'winter' | 'valentine' | 'spring' | 'summer';
export type MachineId = StandardMachineId | SeasonalMachineId;

/** Items that come from no machine. */
/** 'harvest' = grown on her own plants, never from a machine. */
export type Source = MachineId | 'starter' | 'exclusive' | 'harvest';

export type PlantSpeciesId =
  | 'pothos'
  | 'pilea'
  | 'begonia'
  | 'snakeplant'
  | 'catgrass'
  | 'monstera'
  | 'strawberry'
  | 'lavender'
  | 'catnip'
  | 'hoya'
  | 'orchid'
  | 'calathea'
  | 'violet'
  | 'tulip'
  | 'xmascactus'
  | 'sunflower';

export type PotId =
  | 'terracotta'
  | 'cream'
  | 'blush'
  | 'speckled'
  | 'ticking'
  | 'mug'
  | 'teacup'
  | 'midnight'
  | 'gourd'
  | 'rosy'
  | 'eggshell'
  | 'tincan';

export type Personality =
  | 'sleepy'
  | 'playful'
  | 'curious'
  | 'shy'
  | 'sassy'
  | 'gentle'
  | 'foodie'
  | 'dramatic'
  | 'sunny'
  | 'dreamy';

interface Base {
  /** Globally unique, stable (persisted in saves). Prefixed by category: pet-, wear-, treat-, decor-, plant-, pot-. */
  id: string;
  /** Display name of the collectible (for pets: the variant, e.g. "Calico"). */
  name: string;
  rarity: Rarity;
  source: Source;
  /** One-line flavor text shown on reveal and in the collection book. */
  flavor: string;
}

export interface PetDef extends Base {
  category: 'pet';
  species: Species;
  /** The pet's default personal name, e.g. "Patches". User can rename. */
  defaultName: string;
}

export interface WearableDef extends Base {
  category: 'wearable';
  slot: WearableSlot;
}

export interface TreatDef extends Base {
  category: 'treat';
  /** 1–2 tags; the first tag drives the favorite-treat hint. */
  tags: TreatTag[];
}

export interface DecorDef extends Base {
  category: 'decor';
  slot: DecorSlot;
}

export interface PlantDef extends Base {
  category: 'plant';
  plant: PlantSpeciesId;
}

export interface PotDef extends Base {
  category: 'pot';
  pot: PotId;
}

export type CollectibleDef = PetDef | WearableDef | TreatDef | DecorDef | PlantDef | PotDef;

export interface MachineDef {
  id: MachineId;
  /** 'No. 01' … 'No. 07' for numbered series; undefined for seasonal editions. */
  number?: string;
  name: string;
  tagline: string;
  /** 'coins' machines cost `price` coins; 'stars' machines cost `price` stars. */
  currency: 'coins' | 'stars';
  price: number;
  /** Visual theme for the machine illustration and screen accents. */
  theme: {
    body: string; // main body color
    trim: string; // accents/trim
    glass: string; // dome tint
    capsules: string[]; // capsule shell colors (pastels)
    ink: string; // AA-contrast text color on `trim`
  };
  seasonal?: {
    /** Inclusive month/day window, recurring yearly. `start` may be after `end` (wraps new year). */
    start: { month: number; day: number };
    end: { month: number; day: number };
    emoji: string;
  };
  /** Odds per rarity in percent; must sum to 100. */
  odds: Record<Rarity, number>;
}

export interface HabitTemplate {
  id: string;
  group: 'body' | 'mind' | 'home' | 'heart';
  name: string;
  /** HabitIconId (custom drawn icon, see catalog/habitIcons.ts). */
  icon: string;
  schedule:
    | { kind: 'daily' }
    | { kind: 'days'; days: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] }
    | { kind: 'weekly'; times: number; every: 1 | 2 | 3 | 4 }
    | { kind: 'monthly'; times: number; every: 1 | 2 | 3 | 6 | 12 };
  target: number;
  step?: number;
  unit?: string;
  effort: 'light' | 'steady' | 'big';
  timeOfDay: 'morning' | 'midday' | 'evening' | 'anytime';
  tiny?: { label: string; count?: number };
  polarity?: 'build' | 'avoid';
  plant: PlantSpeciesId;
  color: PastelKey;
}

export type PastelKey = 'blush' | 'peach' | 'butter' | 'sage' | 'mint' | 'sky' | 'lavender' | 'lilac';
export const PASTELS: readonly PastelKey[] = ['blush', 'peach', 'butter', 'sage', 'mint', 'sky', 'lavender', 'lilac'] as const;

/** Places on the Shelf (DESIGN §8.4). The Sill is free; the rest are the long-term coin goal. */
export type PlaceId = 'sill' | 'pond' | 'grass' | 'bookshelf' | 'balcony' | 'quilt';
