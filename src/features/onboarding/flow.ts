/**
 * Onboarding's pure parts (DESIGN §9.6): the steps in order, what "Skip" does on each, the picks
 * (up to 3 across the starter chips, "More ideas" and "Make my own"), and a "Make my own" habit.
 */
import type { HabitInput } from '@/state/api';
import type { PastelKey } from '@/catalog/types';
import { ONBOARDING_STARTERS, TEMPLATES } from '@/catalog/templates';
import { suggestHabitIcon } from '@/catalog/habitIcons';
import type { LateStep } from './progress';

export type Phase = 'gate' | 'sill' | 'pick' | LateStep;

/** The five steps she sees (the gate comes before them and isn't counted). */
export const STEPS: readonly Phase[] = ['sill', 'pick', 'today', 'first', 'place'];

/** At most this many habits come out of onboarding (the domain's ONBOARDING_MAX_HABITS). */
export const MAX_PICKS = 3;

export const STARTER_TEMPLATES = ONBOARDING_STARTERS.map((id) => TEMPLATES.find((t) => t.id === id)!);
/** "More ideas": every other template. */
export const MORE_TEMPLATES = TEMPLATES.filter((t) => !(ONBOARDING_STARTERS as readonly string[]).includes(t.id));

export interface Picks {
  templateIds: string[];
  custom: HabitInput[];
}

export const pickCount = (p: Picks): number => p.templateIds.length + p.custom.length;
export const isFull = (p: Picks): boolean => pickCount(p) >= MAX_PICKS;

/** Toggles a template chip; a fourth pick is refused (the same picks come back). */
export function togglePick(p: Picks, templateId: string): Picks {
  if (p.templateIds.includes(templateId)) return { ...p, templateIds: p.templateIds.filter((id) => id !== templateId) };
  if (isFull(p)) return p;
  return { ...p, templateIds: [...p.templateIds, templateId] };
}

const CUSTOM_COLOURS: readonly PastelKey[] = ['sky', 'sage', 'lilac', 'peach', 'butter', 'mint', 'blush', 'lavender'];

/**
 * "Make my own": just a name. The icon is guessed from it (the watering can suits anything), and
 * the rest is the gentlest start: every day, anytime, a pothos cutting in terracotta. The Habit
 * Editor can change any of it later.
 */
export function customHabit(name: string, index: number): HabitInput {
  const guess = suggestHabitIcon(name);
  return {
    name: name.trim().slice(0, 60),
    icon: guess === 'sparkle' ? 'watering-can' : guess,
    color: CUSTOM_COLOURS[index % CUSTOM_COLOURS.length]!,
    plant: 'pothos',
    pot: 'terracotta',
    schedule: { kind: 'daily' },
    target: 1,
    step: 1,
    effort: 'light',
    timeOfDay: 'anytime',
    polarity: 'build',
  };
}

export function addCustom(p: Picks, name: string): Picks {
  const clean = name.trim();
  if (!clean || isFull(p)) return p;
  if (p.custom.some((h) => h.name.toLowerCase() === clean.toLowerCase())) return p;
  return { ...p, custom: [...p.custom, customHabit(clean, p.custom.length + p.templateIds.length)] };
}

export const removeCustom = (p: Picks, name: string): Picks => ({ ...p, custom: p.custom.filter((h) => h.name !== name) });

/** Where "Skip" (or finishing a step) goes next. `planted` is how many habits step 2 made. */
export function nextPhase(phase: Phase, planted = 1): Phase | 'done' {
  switch (phase) {
    case 'gate':
      return 'sill';
    case 'sill':
      return 'pick';
    case 'pick':
      return planted > 0 ? 'today' : 'first';
    case 'today':
      return 'first';
    case 'first':
    case 'place':
      return 'done';
  }
}

/** The step dots: which of the five is current (the gate shows none). */
export const stepIndex = (phase: Phase): number => STEPS.indexOf(phase);

/** "glasses" → "glass" for a single step ("Add 1 glass to Drink water", VOICE §23). */
export function unitFor(unit: string, n: number): string {
  if (n !== 1) return unit;
  return unit.replace(/(ss|sh|ch|x)es$/, '$1').replace(/([^s])s$/, '$1');
}
