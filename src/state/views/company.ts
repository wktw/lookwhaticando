/**
 * Keeping Company in the views (DESIGN §14.1): a habit's companion and its stories, keepsakes, and
 * the pet card's "Keeps {habit} company" and "Known for". Data only: lines.ts words them
 * (`KNOWN_FOR`, the story templates, the keepsake captions).
 */
import type { AppState, DateKey, Habit, Keepsake, StoryId } from '../types';
import { STORIES, STORY_SUNSHINE, companionOf, habitOfPet, latestMoment, pairOf, routineOn, type RoutineOn } from '@/domain/company';
import { BLOOMING, POTTED, sunshinePerOccurrence } from '@/domain/growth';
import { occurrencesToReach } from '@/domain/precision';
import { routineOf } from '@/domain/routines';
import { ruleAt } from '@/domain/rules';
import { checkinsToStage, plantVM, type ViewEnv } from './common';

export interface StoryVM {
  id: StoryId;
  unlocked: boolean;
  /** The day it unlocked. */
  on: DateKey | null;
  read: boolean;
  /**
   * About how many more check-ins together it needs (companion sunshine at the rule of the next
   * check-in; Look at us also needs the plant at Blooming). Null once unlocked, or for a story that
   * waits on an earlier one.
   */
  remaining: number | null;
}

export interface CompanionVM {
  petId: string;
  /** The first day they kept company ("{name} moved into {plant} on {date}"). */
  since: DateKey;
  /** Check-ins while they kept company ("{Count} waterings later"). */
  waterings: number;
  stories: StoryVM[];
  /** "Why it matters" is unlocked and hasn't asked its question yet. */
  askWhy: boolean;
  /** Her latest Moment on the habit (Look at us quotes it). */
  moment: { date: DateKey; text: string } | null;
  /** The companion's routine today (null on a day without one). */
  routine: RoutineOn | null;
}

/** The habit's companion and their stories, or null without one. */
export function companionVM(s: AppState, env: ViewEnv, habit: Habit): CompanionVM | null {
  const petId = companionOf(s, habit);
  if (!petId) return null;
  const pair = pairOf(s, petId, habit.id);
  const per = sunshinePerOccurrence(ruleAt(habit, env.today));
  const plant = plantVM(s, habit, env.today, env.local);
  let blocked = false;
  const stories: StoryVM[] = STORIES.map((id) => {
    const st = pair?.stories?.[id];
    if (st) return { id, unlocked: true, on: st.on, read: st.readAt !== undefined, remaining: null };
    if (blocked) return { id, unlocked: false, on: null, read: false, remaining: null };
    blocked = true;
    const bySun = occurrencesToReach(pair?.sunshine ?? 0, STORY_SUNSHINE[id], per);
    const byStage = id === 'lookAtUs' ? (checkinsToStage(s, habit, env.today, env.local, BLOOMING) ?? 0) : 0;
    return { id, unlocked: false, on: null, read: false, remaining: Math.max(1, bySun, byStage) };
  });
  return {
    petId,
    since: pair?.since ?? env.today,
    waterings: pair?.waterings ?? 0,
    stories,
    askWhy: pair?.stories?.why !== undefined && pair.whyAsked !== true,
    moment: latestMoment(s, habit.id, env.today),
    routine: routineOn(s, habit, env.today, plant.displayStage, env.today),
  };
}

export interface KeepsakeVM extends Keepsake {
  habitName: string | null;
  /** Placed on the Shelf (as decor 'keepsake:<id>'). */
  placed: boolean;
}

export function keepsakeVM(s: AppState, k: Keepsake): KeepsakeVM {
  const itemId = `keepsake:${k.id}`;
  return { ...k, habitName: s.habits.find((h) => h.id === k.habitId)?.name ?? null, placed: s.shelf.decor.some((d) => d.itemId === itemId) };
}

/** The pet card's "Keeps {habit} company" and "Known for" (§14.1). */
export interface PetCompanyVM {
  /** The habit it keeps company, or null ("Find {name} a plant"). */
  habitId: string | null;
  since: DateKey | null;
  /**
   * "Known for" (`knownFor(icon)` in lines.ts): the routine, 'starting' from the first watered day
   * at Potted or later (`since`), 'settled' from Blooming. Sticky: once it has shown, it stays on
   * the Pet Card on every day, watered or not.
   */
  knownFor: { icon: string; routine: RoutineOn; since: DateKey | null } | null;
  /** Every habit it has kept company, oldest pairing first. */
  history: { habitId: string; since: DateKey; waterings: number }[];
}

export function petCompanyVM(s: AppState, env: ViewEnv, petId: string): PetCompanyVM {
  const habit = habitOfPet(s, petId);
  const pairs = Object.values(s.company?.pairs ?? {}).filter((p) => p.petId === petId);
  let knownFor: PetCompanyVM['knownFor'] = null;
  if (habit && habit.archivedOn === undefined) {
    const stage = plantVM(s, habit, env.today, env.local).displayStage;
    const since = pairOf(s, petId, habit.id)?.knownForSince ?? null;
    const today = routineOn(s, habit, env.today, stage, env.today);
    if (today) knownFor = { icon: habit.icon, routine: today, since };
    else if (since !== null && stage >= POTTED) knownFor = { icon: habit.icon, routine: { petId, routine: routineOf(habit.icon), phase: stage >= BLOOMING ? 'settled' : 'starting' }, since };
  }
  return {
    habitId: habit?.id ?? null,
    since: habit ? (pairOf(s, petId, habit.id)?.since ?? null) : null,
    knownFor,
    history: pairs.sort((a, b) => (a.since < b.since ? -1 : 1)).map((p) => ({ habitId: p.habitId, since: p.since, waterings: p.waterings })),
  };
}
