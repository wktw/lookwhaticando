/**
 * Every line the fx layer writes (celebration notes, toasts, the check-in note), in the catkin
 * voice. The words come from the copy deck: templates from src/catalog/lines.ts where they exist,
 * and docs/VOICE.md verbatim where lines.ts has no constant yet. Brief, kind, specific, observed.
 * Present tense, numerals, sentence case, curly apostrophes. No exclamation marks, no emoji, no
 * puns, no pep talk, never a gap or a count of what is undone. Pets are named, never given a
 * pronoun, and plants are "the Read plant", never "your". tests/unit/fx/copy.test.ts lints it all.
 */
import type { PlantSpeciesId, Species } from '@/catalog/types';
import { MONTH_NAMES, WEEKDAY_NAMES, parseDateKey, weekday } from '@/domain/dates';

import type { RitualKind } from '@/state/api';
import type { StreakUnit } from '@/domain/streaks';
import { runText } from '@/catalog/format';
import type { BloomColour, BloomShape, DateKey, KeepsakeKind, SeasonName } from '@/state/types';
import {
  BLOOM_LINES,
  CHECKIN_TOASTS,
  DUPLICATE_LINES,
  EXCLUSIVE_LINES,
  FOUND_LINE,
  FOUND_THINGS,
  FRIENDSHIP_LEVELS,
  HARVEST_LINES,
  STAGE_LINES,
  STAGE_NAMES,
  TODAY_LINES,
  COMPANION,
  KEEPSAKE_NOTE,
  KEEPSAKE_THINGS as THINGS,
  LOOKS,
  PERFECT_DAY,
  PET_CARD,
  SEASON_REVIEW,
  STORIES,
  WELCOME_HOME,
  capitalise,
  fillLine,
  fits,
  lineText,
  plantPhrase,
  withArticle,
} from '@/catalog/lines';

/** Plant stages (DESIGN §5.5): the one list, in lines.ts. */
export { STAGE_NAMES };

/** Blooming and Evergreen are celebrations; the other stages are notes. */
export const isMajorStage = (stage: number) => stage === 5 || stage >= 7;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A line as an "also" line under a bigger moment: no full stop ("Walk: 7 days in a row"). */
export const asAlso = (line: string) => line.replace(/\.$/, '');

/* ------------------------------------------------------------------ */
/* Plants                                                              */
/* ------------------------------------------------------------------ */

/** A habit as the fx layer sees it: its name and its plant. */
export interface HabitRef {
  name: string;
  plant: PlantSpeciesId;
}

/** "the Read plant", "the snake plant" (lines.ts plantPhrase), or "the plant" when the habit is gone. */
export function plantOf(habit: HabitRef | undefined): string {
  return habit ? plantPhrase(habit.name, habit.plant) : 'the plant';
}

/** The stage note (lines.ts STAGE_LINES): "The Read plant is potted up." At Blooming, the species' own line. */
export function stageLine(habit: HabitRef | undefined, stage: number): string {
  if (stage === 5 && habit) return bloomLine(habit);
  const template = STAGE_LINES[Math.max(0, Math.min(7, stage))] ?? STAGE_LINES[0]!;
  const plant = plantOf(habit);
  return fillLine(template, { Plant: capitalise(plant), plant });
}

/** Banner title for the big stages: "The Yoga plant is Blooming", "The Yoga plant is Evergreen". */
export function majorStageTitle(habit: HabitRef | undefined, stage: number): string {
  return `${capitalise(plantOf(habit))} is ${stage >= 7 ? STAGE_NAMES[7] : STAGE_NAMES[5]}`;
}

/** What Blooming looks like, species by species (lines.ts BLOOM_LINES): "The Walk plant has opened a single cup." */
export function bloomLine(habit: HabitRef): string {
  return fillLine(BLOOM_LINES[habit.plant] ?? STAGE_LINES[5]!, { Plant: capitalise(plantOf(habit)) });
}

/** The Evergreen banner's line, after its title: "There’s a small brass watering can on the pot now." */
export const EVERGREEN_LINE = STAGE_LINES[7]!.slice(STAGE_LINES[7]!.indexOf('. ') + 2);

/** Harvest (lines.ts HARVEST_LINES): "A pinch of cat grass, into the basket." (null for plants that don't harvest). */
export function harvestLine(plant: PlantSpeciesId | undefined): string | null {
  return (plant && HARVEST_LINES[plant]) || null;
}

/* ------------------------------------------------------------------ */
/* The check-in note (lines.ts CHECKIN_TOASTS)                         */
/* ------------------------------------------------------------------ */

export type CheckInKind = 'watered' | 'count' | 'tiny' | 'noCoins' | 'history';

export interface CheckInSlots {
  habit: string;
  /** A count habit reaching its target: 8 (glasses). */
  count?: number;
  unit?: string;
  /** A history edit: the day it was for ("Sat, Sep 27"). */
  date?: string;
}

const CHECKIN_TEMPLATE: Record<CheckInKind, string> = {
  watered: CHECKIN_TOASTS.watered,
  count: CHECKIN_TOASTS.wateredCount,
  tiny: CHECKIN_TOASTS.wateredTiny,
  noCoins: CHECKIN_TOASTS.wateredNoCoins,
  history: CHECKIN_TOASTS.history,
};

/**
 * The note's words, without the coin chip: "Walk, watered." · "Drink water, watered. 8 glasses." ·
 * "Walk, watered: the tiny version." · "Walk, watered for Sat, Sep 27. History only, no coins."
 * The "+5" follows as a currency token; with no coins (past the budget) it is simply not there.
 */
export function checkInLine(kind: CheckInKind, slots: CheckInSlots): string {
  const template = CHECKIN_TEMPLATE[kind].replace(/ \+\{coins\}$/, '');
  return fillLine(template, { habit: slots.habit, count: slots.count ?? '', unit: slots.unit ?? '', date: slots.date ?? '' }).replace(/ {2,}/g, ' ');
}

/** Which check-in note a result calls for. */
export function checkInKind({ coins, tiny, count, history }: { coins: number; tiny?: boolean; count?: number; history?: boolean }): CheckInKind {
  if (history) return 'history';
  if (tiny) return 'tiny';
  if ((count ?? 0) > 1) return 'count';
  return coins > 0 ? 'watered' : 'noCoins';
}

/** Un-watering (lines.ts): what happened to the coins, and nothing more. */
export function uncheckLine(habit: string, { refunded, spent = false }: { refunded: number; spent?: boolean }): string {
  if (refunded > 1) return fillLine(CHECKIN_TOASTS.unchecked, { habit, coins: refunded });
  if (refunded === 1) return fillLine(CHECKIN_TOASTS.uncheckedOne, { habit });
  return fillLine(spent ? CHECKIN_TOASTS.uncheckedSpent : CHECKIN_TOASTS.uncheckedNoCoins, { habit });
}

/** A rested habit: the one place "Nothing here wilts" is said. */
export function restLine(habit: string): string {
  return fillLine(CHECKIN_TOASTS.rest, { habit });
}

/** "Plus 14 coins." for screen readers (VOICE §5). */
export const plusCoins = (coins: number) => (coins > 0 ? `Plus ${plural(coins, 'coin')}.` : '');

/** The screen-reader sentence for a burst of waterings: "3 habits watered. Plus 14 coins." */
export function wateredBatchLine(habits: number, coins: number): string {
  return [`${plural(habits, 'habit')} watered.`, plusCoins(coins)].filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* The day and the ladders                                             */
/* ------------------------------------------------------------------ */

/** "Monday, September 29": a note is dated like one. */
export function longDate(date: DateKey): string {
  const { month, day } = parseDateKey(date);
  return `${WEEKDAY_NAMES[weekday(date)]}, ${MONTH_NAMES[month - 1]} ${day}`;
}

/** Everything that's on is watered or resting (lines.ts PERFECT_DAY, VOICE §5). */
export { PERFECT_DAY };

/** Welcome home never mentions the gap (lines.ts WELCOME_HOME, VOICE §5). */
export function welcomeHomeLine(tickets: number): string {
  return tickets > 0 ? WELCOME_HOME.ticket : WELCOME_HOME.none;
}

/** A ritual on the sill (lines.ts TODAY_LINES.letterWaiting): "There’s a note on the sill." · "There’s a page on the sill." */
export const noteOnSillLine = (kind: RitualKind = 'sundayNote') => TODAY_LINES.letterWaiting[kind];
export const NOTE_ON_SILL = noteOnSillLine();

/** A rung (VOICE §5, format.ts runText): "Walk: 7 days in a row." · "Yoga: 21 in a row." · "No snooze: held off 14 days." */
export function rungLine(habit: string, streak: number, unit: StreakUnit, avoid = false): string {
  const run = runText({ length: streak, unit, polarity: avoid ? 'avoid' : 'build' }, avoid ? 'card' : 'long');
  return `${habit}: ${run.charAt(0).toLowerCase()}${run.slice(1)}.`;
}

/** A period goal (VOICE §5): "Yoga, watered for the week." */
export function periodGoalLine(habit: string, period: 'week' | 'month'): string {
  return `${habit}, watered for the ${period}.`;
}

export const SHOWING_UP = { eyebrow: 'Showing up' } as const;

/** "30 days" under the "Showing up" eyebrow; as a line, "Showing up: 30 days". */
export const showUpTitle = (days: number) => plural(days, 'day');
export const showUpLine = (days: number) => `${SHOWING_UP.eyebrow}: ${showUpTitle(days)}`;

/** What a rung brings (VOICE §5): "1 stamp, onto the card." · "2 stamps and a ticket." · "6 stamps and 2 tickets." */
export function showUpText({ stamps = 0, tickets = 0 }: { stamps?: number; tickets?: number }): string {
  const parts: string[] = [];
  if (stamps > 0) parts.push(plural(stamps, 'stamp'));
  if (tickets > 0) parts.push(tickets === 1 ? 'a ticket' : plural(tickets, 'ticket'));
  if (!parts.length) return '';
  return `${capitalise(parts.join(' and '))}${tickets > 0 ? '.' : ', onto the card.'}`;
}

/* ------------------------------------------------------------------ */
/* Pins, the Field Guide, keepsakes                                    */
/* ------------------------------------------------------------------ */

export const PIN = { eyebrow: 'A new pin' } as const;
/** As an "also" line: "Fifty waterings, a new pin". */
export const pinLine = (name: string) => `${name}, a new pin`;

export const FIELD_GUIDE = { eyebrow: 'Field Guide', page: 'A full Field Guide page' } as const;
/** "The Cats page is full" (the Field Guide, VOICE §8). */
export const albumTitle = (album: string) => `The ${album} page is full`;

/** The epic moment's eyebrow says what it was for. */
export const EXCLUSIVE = {
  forShowingUp: showUpLine,
  forEvergreen: 'The first Evergreen plant',
  forAlbum: FIELD_GUIDE.page,
  kept: 'Kept for you',
  button: 'Keep it',
  tag: 'Only this once',
} as const;

/** A keepsake you earn (lines.ts EXCLUSIVE_LINES): "A laurel sprig, from the first plant to reach Evergreen. It’s in the wardrobe now." */
export function exclusiveLine(id: string, name: string): string {
  return EXCLUSIVE_LINES[id] ?? fillLine(EXCLUSIVE_LINES.fallback, { A: withArticle(name, true) });
}

/** What a companion leaves by the pot, by the habit's family (lines.ts KEEPSAKE_THINGS, VOICE §13). */
export const KEEPSAKE_THINGS: Readonly<Record<KeepsakeKind, string>> = THINGS;

/** The keepsake note (lines.ts KEEPSAKE_NOTE, VOICE §13): "{name} left {thing} by the pot." */
export const KEEPSAKE_LINE = KEEPSAKE_NOTE;

/** "Pudding left a pebble from the path by the pot." */
export const keepsakeLine = (name: string, kind: KeepsakeKind) => fillLine(KEEPSAKE_LINE, { name, thing: KEEPSAKE_THINGS[kind] ?? 'something small' });

/* ------------------------------------------------------------------ */
/* Keeping Company, Blooms Like You, the seasons                       */
/* ------------------------------------------------------------------ */

/** "Pudding moved into the Read plant." (VOICE §13) */
export const companionLine = (name: string, habit: HabitRef | undefined) => fillLine(COMPANION.movedIn, { name, plant: plantOf(habit) });

/** "There’s a story on the plant tag for Walk." (VOICE §13) */
export const storyLine = (habit: string) => fillLine(STORIES.waiting, { habit });

const LOOK_COLOUR: Record<BloomColour, string> = LOOKS.colours;
const LOOK_SHAPE: Record<BloomShape, string> = LOOKS.shapes;

/** "A new look for the Walk plant: Twilight." · with a shape, "Dawn · Paired" (VOICE §14). */
export function lookLine(habit: HabitRef | undefined, colour: BloomColour, shape: BloomShape): string {
  const look = shape === 'classic' ? LOOK_COLOUR[colour] : `${LOOK_COLOUR[colour]} · ${LOOK_SHAPE[shape]}`;
  return fillLine(LOOKS.newLook, { plant: plantOf(habit), look });
}

const SEASON: Record<SeasonName, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

/** The season just ended waits as a card on Today (VOICE §12): "Summer, on the sill. It’s on Today." */
export const seasonReviewLine = (season: SeasonName) => fillLine(SEASON_REVIEW.waiting, { Season: SEASON[season] });

/* ------------------------------------------------------------------ */
/* Pets                                                                */
/* ------------------------------------------------------------------ */

export const BEST_FRIENDS = {
  eyebrow: PET_CARD.bestFriendsBanner.eyebrow,
  title: (name: string) => fillLine(PET_CARD.bestFriendsBanner.title, { name }),
  text: PET_CARD.bestFriendsBanner.text,
  line: (name: string) => `${name}, best friends`,
} as const;

/**
 * A friendship level says what the pet does now (lines.ts FRIENDSHIP_LEVELS), never a number:
 * "Pudding slow-blinks back at you now." Level 8 names the friend it naps beside, or goes solo.
 */
export function friendshipLine(name: string, level: number, species: Species = 'cat', friend = ''): string {
  const def = FRIENDSHIP_LEVELS.find((l) => l.level === level) ?? FRIENDSHIP_LEVELS[FRIENDSHIP_LEVELS.length - 1]!;
  const template = !friend && def.solo ? def.solo : lineText(def.lines.find((l) => fits(l, species)) ?? def.lines[0]!);
  return fillLine(template, { name, friend });
}

/** "Pudding’s favourite is the strawberry. It’s on the Pet Card now." (VOICE §9) */
export const favouriteLine = (name: string, treat: string) => fillLine(PET_CARD.favouriteFound, { name, treat: treat.toLowerCase() });

/** The found thing (lines.ts FOUND_LINE, without its "+1 swap": the note carries the swap token). */
export function foundLine(name: string, seed: number): string {
  const found = FOUND_THINGS[Math.abs(Math.trunc(seed)) % FOUND_THINGS.length]!;
  return fillLine(FOUND_LINE, { name, found }).replace(/ \+\d+ swaps?$/, '');
}

/** Swaps becoming stamps (lines.ts DUPLICATE_LINES). */
export const swapsLine = (stamps: number) => (stamps === 1 ? DUPLICATE_LINES.toStamp : fillLine(DUPLICATE_LINES.toStamps, { count: stamps }));

/** Words on the fx layer's own controls. */
export const FX_UI = {
  undo: CHECKIN_TOASTS.undo,
  addNote: CHECKIN_TOASTS.addNote,
  dismiss: 'Put the note away',
} as const;

/** Wallet display names (DESIGN §6): internal ids stay coins/stars/tickets/stardust. */
export const CURRENCY = {
  coins: ['coin', 'coins'],
  stars: ['stamp', 'stamps'],
  tickets: ['ticket', 'tickets'],
  stardust: ['swap', 'swaps'],
} as const;
