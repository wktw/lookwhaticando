/**
 * Where onboarding stands (DESIGN §9.6), small enough for the app shell to import.
 *
 * Steps 1–2 (the sill and the cuttings) live only on the screen: nothing is saved until she has
 * chosen her plants, so a reload simply starts again. `completeOnboarding` runs at the end of
 * step 2 and marks the save onboarded; the rest of the flow (3 "Anything already done today?",
 * 4 "Who comes home first?", 5 "Find {name} a plant") is remembered here, under a catkin:* key
 * (so Start over clears it too), and a reload lands back on the same step.
 */
import { computed, signal } from '@preact/signals';
import { demoMode, ownsSave, state } from '@/state/store';

export const ONBOARDING_KEY = 'catkin:onboarding';

export type LateStep = 'today' | 'first' | 'place';

export interface OnboardingProgress {
  step: LateStep;
  /** The habits planted at the end of step 2, for step 3's water buttons and step 5's plants. */
  habitIds: string[];
  /** The pet from the first capsule (step 5). */
  petId?: string;
}

const STEPS: readonly LateStep[] = ['today', 'first', 'place'];

export function parseProgress(raw: string | null): OnboardingProgress | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<OnboardingProgress>;
    if (!o || !STEPS.includes(o.step as LateStep) || !Array.isArray(o.habitIds)) return null;
    const habitIds = o.habitIds.filter((id): id is string => typeof id === 'string').slice(0, 3);
    return { step: o.step as LateStep, habitIds, ...(typeof o.petId === 'string' ? { petId: o.petId } : {}) };
  } catch {
    return null;
  }
}

function read(): OnboardingProgress | null {
  try {
    return parseProgress(localStorage.getItem(ONBOARDING_KEY));
  } catch {
    return null;
  }
}

/** The saved late-step progress (null before step 3 and once onboarding is over). */
export const onboardingProgress = signal<OnboardingProgress | null>(typeof localStorage === 'undefined' ? null : read());

export function saveProgress(p: OnboardingProgress | null): void {
  onboardingProgress.value = p;
  // Only the window that owns the save writes the sidecar, so a second window can't put stale
  // progress back after the owner has finished (audit RISK-01; cross-window sync is later work).
  if (!ownsSave()) return;
  try {
    if (p) localStorage.setItem(ONBOARDING_KEY, JSON.stringify(p));
    else localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    /* Private mode or full storage: the flow still runs; a reload would land on Today. */
  }
}

/** Re-reads the key (after Start over or an import, which rewrite storage underneath). */
export function reloadProgress(): void {
  onboardingProgress.value = read();
}

/**
 * The shell shows onboarding instead of the tabs: a save that hasn't been onboarded, or one whose
 * onboarding is still under way (steps 3–5). Peeking at the demo shows the demo's shell.
 */
export const onboardingActive = computed(() => !demoMode.value && (!state.value.profile.onboarded || (onboardingProgress.value !== null && state.value.profile.onboarded)));
