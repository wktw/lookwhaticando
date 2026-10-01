/**
 * Where onboarding stands (DESIGN §9.6), small enough for the app shell to import.
 *
 * Steps 1–2 (the sill and the cuttings) live only on the screen: nothing is saved until she has
 * chosen her plants, so a reload simply starts again. `completeOnboarding` runs at the end of
 * step 2 and marks the save onboarded; the rest of the flow (3 "Anything already done today?",
 * 4 "Who comes home first?", 5 "Find {name} a plant") is part of the save itself
 * (`profile.onboardingStep`, WP-C5, DEC-E3), written through the store like any change. So it has
 * one authority, under the writer lock: a reload lands on the same step, another window shows the
 * step the owner is on and leaves onboarding when the owner does, a window that doesn't own the save
 * can't move it, and Start over, an import and the demo carry it (or not) with the save.
 */
import { computed } from '@preact/signals';
import { demoMode, setOnboardingStep, state } from '@/state/store';
import type { LateStep, OnboardingStep } from '@/state/types';

export { ONBOARDING_KEY } from '@/state/store';
export type { LateStep };
export type OnboardingProgress = OnboardingStep;

/** The save's late step (null before step 3 and once onboarding is over). */
export const onboardingProgress = computed<OnboardingProgress | null>(() => {
  const p = state.value.profile;
  return p.onboarded ? (p.onboardingStep ?? null) : null;
});

/** Moves onboarding to a late step, or ends it (null). False when this window can't change the save. */
export function saveProgress(p: OnboardingProgress | null): boolean {
  return setOnboardingStep(p);
}

/**
 * Nothing to read again any more: the step is part of the save, so Start over, an import and
 * another window's changes bring it along. Kept for callers written for the old sidecar.
 */
export function reloadProgress(): void {}

/**
 * The shell shows onboarding instead of the tabs: a save that hasn't been onboarded, or one whose
 * onboarding is still under way (steps 3–5). Peeking at the demo shows the demo's shell.
 */
export const onboardingActive = computed(() => !demoMode.value && (!state.value.profile.onboarded || onboardingProgress.value !== null));
