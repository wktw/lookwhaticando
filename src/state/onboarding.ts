/**
 * The old home of onboarding's late steps (WP-C5). Builds before WP-C5 kept steps 3–5 in a
 * `catkin:onboarding` key beside the save, outside the writer lock (audit UI2-07,
 * P-persistence-23). The step now lives in the save (`profile.onboardingStep`, DEC-E3); the window
 * that owns the save folds an old key in once, when it plausibly belongs to that save, and removes
 * it (store.ts `foldLegacyOnboarding`, which loads this module only when there is a key, so it stays
 * off the first paint; the key's name, `ONBOARDING_KEY`, is the store's).
 */
import type { AppState, LateStep, OnboardingStep } from './types';

const STEPS: readonly LateStep[] = ['today', 'first', 'place'];

/** The old key's text as a step, or null when it isn't one. */
export function parseLegacyProgress(raw: string | null): OnboardingStep | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<OnboardingStep>;
    if (!o || !STEPS.includes(o.step as LateStep) || !Array.isArray(o.habitIds)) return null;
    const habitIds = o.habitIds.filter((id): id is string => typeof id === 'string').slice(0, 3);
    return { step: o.step as LateStep, habitIds, ...(typeof o.petId === 'string' ? { petId: o.petId } : {}) };
  } catch {
    return null;
  }
}

/**
 * The old key's step, when it can only be this save's: an onboarded save with no step of its own,
 * whose habits are exactly the ones the step planted (no tab can add one during steps 3–5), with at
 * most the first capsule opened, and, on step 5, that capsule's pet. A key left over from another
 * save (a reset, an import, a backup from elsewhere) fails one of these and is dropped instead of
 * bringing onboarding back over a save that is past it (P-persistence-23).
 */
export function legacyStepFor(s: AppState, legacy: OnboardingStep | null): OnboardingStep | null {
  if (!legacy || !s.profile.onboarded || s.profile.onboardingStep) return null;
  const ids = new Set(legacy.habitIds);
  if (ids.size !== s.habits.length || !s.habits.every((h) => ids.has(h.id))) return null;
  if (s.lifetime.pulls > 1) return null;
  if (legacy.step === 'place' && (!legacy.petId || !s.pets[legacy.petId])) return null;
  return legacy;
}
