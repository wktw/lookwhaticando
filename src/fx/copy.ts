/**
 * Every line the fx layer writes, in the catkin voice (DESIGN §12): a plant-sitter's note.
 * Brief, kind, specific, observed. Present tense, numerals, sentence case. No exclamation marks,
 * no emoji, no puns, no pep talk, never a gap or a count of what is undone, and pets are named,
 * never given a pronoun. tests/unit/fx/copy.test.ts lints all of it.
 */
import type { PlantSpeciesId } from '@/catalog/types';

/** Plant stages (DESIGN §5.5). */
export const STAGE_NAMES = ['Cutting', 'Rooting', 'Potted', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen'] as const;

/** Blooming and Evergreen are celebrations; the other stages are notes. */
export const isMajorStage = (stage: number) => stage === 5 || stage >= 7;

/** "Walk" → "walk", but "ASMR" stays "ASMR". */
function lowerFirst(name: string): string {
  return /^[A-Z][A-Z]/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1);
}

/** "Your yoga plant" (DESIGN §12 names plants by their habit). */
export function plantOf(habitName: string | undefined): string {
  return habitName ? `Your ${lowerFirst(habitName.trim())} plant` : 'Your plant';
}

/** The in-between stages, as a note ("Your reading plant is potted up."). */
const STAGE_PHRASE: Record<number, string> = {
  1: 'is rooting',
  2: 'is potted up',
  3: 'is leafy now',
  4: 'is budding',
  6: 'is flourishing',
};

export function stageLine(habitName: string | undefined, stage: number): string {
  return `${plantOf(habitName)} ${STAGE_PHRASE[stage] ?? 'grew a little'}.`;
}

/** Banner title for the big stages: "Your yoga plant is blooming". */
export function majorStageTitle(habitName: string | undefined, stage: number): string {
  return `${plantOf(habitName)} is ${stage >= 7 ? 'evergreen' : 'blooming'}`;
}

/** What blooming looks like, species by species (foliage plants bloom as their peak form). */
const BLOOM_LINE: Partial<Record<PlantSpeciesId, string>> = {
  pothos: 'The pothos is trailing past the edge of the sill.',
  pilea: 'The pilea has a full crown of round leaves.',
  begonia: 'The begonia has its first pink flowers.',
  snakeplant: 'The snake plant has a new leaf, taller than the rest.',
  catgrass: 'The cat grass is tall enough to nibble.',
  monstera: 'The monstera has its first split leaf.',
  strawberry: 'The strawberry has its first white flowers.',
  lavender: 'The lavender is in flower.',
  catnip: 'The catnip has small white flowers.',
  hoya: 'The hoya has its first cluster of flowers.',
  orchid: 'The orchid has opened its first flower.',
  calathea: 'The calathea folds its leaves up every evening now.',
  violet: 'The African violet is in flower.',
  tulip: 'The tulip has opened.',
  xmascactus: 'The Christmas cactus has its first flowers.',
  sunflower: 'The sunflower has opened, facing the window.',
};

export function bloomLine(species: PlantSpeciesId | undefined): string {
  return (species && BLOOM_LINE[species]) ?? 'Its first flowers are open.';
}

export const EVERGREEN_LINE = 'It has grown past the top of the window frame.';

/** The check-in note (DESIGN §12): "Walk, watered." (the "+5" follows as a currency token). */
export function checkInLine(habitName: string, { tiny = false }: { tiny?: boolean } = {}): string {
  return tiny ? `${habitName}, tiny version.` : `${habitName}, watered.`;
}

/** A rested habit (DESIGN §12). */
export function restLine(habitName: string): string {
  return `${habitName} is resting today. Nothing here wilts.`;
}

export const PERFECT_DAY = {
  eyebrow: 'Perfect day',
  title: 'Everything’s watered',
  text: 'The whole sill is in the sun.',
  line: 'Perfect day',
} as const;

/** Welcome home never mentions the gap (DESIGN §6). */
export function welcomeHomeLine(tickets: number): string {
  return tickets > 0 ? 'Everything kept. There’s a ticket on the sill.' : 'Everything kept.';
}

export const NOTE_ON_SILL = 'There’s a note on the sill.';

const UNIT_WORDS = { days: ['day', 'days'], times: ['in a row', 'in a row'], weeks: ['week', 'weeks'], months: ['month', 'months'] } as const;

/** A streak rung: "Walk, 7 days." · "Yoga, 5 in a row." (never a streak of 0). */
export function rungLine(habitName: string, streak: number, unit: keyof typeof UNIT_WORDS): string {
  const [one, many] = UNIT_WORDS[unit];
  return `${habitName}, ${streak} ${streak === 1 ? one : many}.`;
}

export function periodGoalLine(habitName: string, period: 'week' | 'month'): string {
  return `${habitName}, done for the ${period}.`;
}

export const SHOWING_UP = { eyebrow: 'Showing up' } as const;

export function showUpTitle(days: number): string {
  return `${days} days of showing up`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "3 stamps and a ticket, enclosed." (the Sunday Note's way of saying it). */
export function enclosedLine({ stamps = 0, tickets = 0, coins = 0 }: { stamps?: number; tickets?: number; coins?: number }): string {
  const parts: string[] = [];
  if (stamps > 0) parts.push(plural(stamps, 'stamp'));
  if (tickets > 0) parts.push(tickets === 1 ? 'a ticket' : plural(tickets, 'ticket'));
  if (!parts.length && coins > 0) parts.push(plural(coins, 'coin'));
  if (!parts.length) return '';
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]!;
  return `${list.charAt(0).toUpperCase()}${list.slice(1)}, enclosed.`;
}

export const PIN = { eyebrow: 'A new pin' } as const;
export const pinLine = (name: string) => `${name} pin`;

export const BEST_FRIENDS = {
  eyebrow: 'Best friends',
  title: (name: string) => `${name} and you`,
  text: 'Friendship level 10. A small brass tag, for best friends.',
  line: (name: string) => `${name}, best friends`,
} as const;

export const friendshipLine = (name: string, level: number) => `${name} reached friendship level ${level}.`;
export const favouriteLine = (name: string, treat: string) => `${treat} is ${name}’s favourite.`;

/** Swaps become stamps, 10 to 1 (DESIGN §6). */
export const swapsLine = (stamps: number) => `${stamps * 10} swaps became ${plural(stamps, 'stamp')}.`;

/** The exclusive moment's eyebrow says what it was for. */
export const EXCLUSIVE = {
  forShowingUp: (days: number) => `For ${days} days of showing up`,
  forEvergreen: 'For the first evergreen plant',
  kept: 'Kept for you',
  button: 'Keep it',
  tag: 'Only this once',
} as const;

/** Words on the fx layer's own controls. */
export const FX_UI = {
  undo: 'Undo',
  dismiss: 'Put the note away',
} as const;

/** Wallet display names (DESIGN §6): internal ids stay coins/stars/tickets/stardust. */
export const CURRENCY = {
  coins: ['coin', 'coins'],
  stars: ['stamp', 'stamps'],
  tickets: ['ticket', 'tickets'],
  stardust: ['swap', 'swaps'],
} as const;
