/**
 * The line kit: what a line is (a string, or a string with the conditions it needs to be true),
 * the filters, and the small helpers that fill and word a line. Shared by the caption matrix
 * (captionMatrix.ts), the first-paint copy (linesCore.ts) and the rest of the deck (lines.ts), which
 * re-exports all of it: import from `@/catalog/lines` in screens. First-paint code (domain, state,
 * fx) imports from here or linesCore.ts directly, so the whole deck stays out of the entry chunk.
 */
import type { PlantSpeciesId, Species } from './types';

/**
 * A line, with the conditions it needs to be true:
 * - `species`: only these species (a cud-chew is for cows);
 * - `minStage`: the habit's plant is at least this stage (2 = Potted: before that it's a cutting
 *   in a glass, with no pot, soil or saucer);
 * - `minLevel`: the pet is at least this friendship level (a level announces a behaviour, so the
 *   captions don't show it earlier);
 * - `night`: only between 23:00 and 06:00.
 */
export interface LineDef {
  readonly text: string;
  readonly species?: readonly Species[];
  readonly minStage?: number;
  readonly minLevel?: number;
  readonly night?: boolean;
}

export type Line = string | LineDef;

/** What the caller knows about the moment. Unknown values count as the most cautious case. */
export interface Situation {
  /** The habit's plant stage, 0 (Cutting) to 7 (Evergreen). Pass it for checkin and resident. */
  stage?: number;
  /** The pet's friendship level, 1 to 15. */
  level?: number;
  /** True between 23:00 and 06:00. */
  night?: boolean;
}

export const only = (species: Species | readonly Species[], text: string): LineDef => ({
  text,
  species: typeof species === 'string' ? [species] : species,
});

/** Needs a pot: the plant is at least Potted. */
export const potted = (line: string | LineDef): LineDef => ({ ...(typeof line === 'string' ? { text: line } : line), minStage: 2 });

/** Shows from this friendship level. */
export const atLevel = (level: number, line: string | LineDef): LineDef => ({ ...(typeof line === 'string' ? { text: line } : line), minLevel: level });

export const lineText = (line: Line): string => (typeof line === 'string' ? line : line.text);

export const fitsSpecies = (line: Line, species: Species): boolean => typeof line === 'string' || !line.species || line.species.includes(species);

/** Whether a line is true for this species in this situation. */
export function fits(line: Line, species: Species, situation: Situation = {}): boolean {
  if (typeof line === 'string') return true;
  if (!fitsSpecies(line, species)) return false;
  if ((line.minStage ?? 0) > (situation.stage ?? 0)) return false;
  if ((line.minLevel ?? 1) > (situation.level ?? 1)) return false;
  return !line.night || situation.night === true;
}

/** Fills {slots}. An empty value also drops the ", " before it ("Morning, {userName}." → "Morning."). */
export function fillLine(template: string, slots: Readonly<Record<string, string | number>>): string {
  let out = template;
  for (const [key, value] of Object.entries(slots)) {
    const text = String(value);
    if (text === '') out = out.split(`, {${key}}`).join('');
    out = out.split(`{${key}}`).join(text);
  }
  return out;
}

/** "Walk" → "Walk", "the pothos" → "The pothos": for a {Plant} or {Count} slot that opens a sentence. */
export const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Each plant's everyday name, for when the habit's own name won't read as a label. */
export const PLANT_COMMON_NAMES: Readonly<Record<PlantSpeciesId, string>> = {
  pothos: 'pothos',
  pilea: 'money plant',
  begonia: 'begonia',
  snakeplant: 'snake plant',
  catgrass: 'cat grass',
  monstera: 'monstera',
  strawberry: 'strawberry plant',
  lavender: 'lavender',
  catnip: 'catnip',
  hoya: 'hoya',
  orchid: 'orchid',
  calathea: 'prayer plant',
  violet: 'African violet',
  tulip: 'tulip',
  xmascactus: 'Christmas cactus',
  sunflower: 'sunflower',
};

/**
 * The {plant} slot. A short habit name reads as a label ("the Read plant", "the Drink water
 * plant"). A long one, one with a number, or one that starts with "The" reads like a form field
 * ("the Tidy for 10 minutes plant", "the The real plants plant"), so those use the plant's own name
 * ("the snake plant", "the pothos"). Capitalise it for {Plant}.
 */
export function plantPhrase(habitName: string, plant: PlantSpeciesId): string {
  const name = habitName.trim();
  const words = name.split(/\s+/);
  const readsAsLabel = words.length <= 2 && !/\d/.test(name) && !/^the\b/i.test(name);
  return readsAsLabel ? `the ${name} plant` : `the ${PLANT_COMMON_NAMES[plant]}`;
}

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/**
 * A count at the start of a sentence is spelled out ("Nineteen waterings."); everywhere else
 * catkin uses numerals. Spells 1–99, and falls back to numerals ("1,204") outside that range.
 */
export function numberWord(n: number, capital = false): string {
  let word: string;
  if (!Number.isInteger(n) || n < 1 || n > 99) word = n.toLocaleString('en-GB');
  else if (n < 20) word = ONES[n]!;
  else word = TENS[Math.floor(n / 10)]! + (n % 10 ? `-${ONES[n % 10]}` : '');
  return capital ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

/** Names that take no article: mass nouns ("Barley Tea"). */
const NO_ARTICLE = new Set([
  'Barley Tea', 'Cat Grass', 'Catnip', 'Fresh Clover', 'Frozen Yoghurt', 'Gingerbread', 'Honey Toast', 'Lavender',
  'Lavender Shortbread', 'Pumpkin Purée', 'Strawberry Milk', 'Warm Oats', 'Watermelon',
]);

/**
 * Plural names in the catalog, listed rather than guessed from a final s: "Christmas Cactus",
 * "Cavalier King Charles" and "Golden Pothos" are singular.
 */
const PLURAL = new Set([
  'Blueberries', 'Fish Crackers', 'Salmon Flakes', 'Sunflower Seeds', 'Stepping Stones', 'Stacked Pots', 'Starry Pajamas',
  'Earmuffs', 'Heart Sunglasses',
]);

/** "a Belted Galloway", "an Orange Tabby", "Blueberries", "The Window Seat". Capitalised with `capital`. */
export function withArticle(name: string, capital = false): string {
  if (name.startsWith('The ') || NO_ARTICLE.has(name) || PLURAL.has(name)) return name;
  const article = /^[aeiou]/i.test(name) ? 'an' : 'a';
  return `${capital ? article.charAt(0).toUpperCase() + article.slice(1) : article} ${name}`;
}
