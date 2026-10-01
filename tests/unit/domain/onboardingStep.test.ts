/**
 * The late onboarding step as part of the save (WP-C5, DEC-E3): `profile.onboardingStep` is set
 * only on an onboarded save, cleaned on the way in, cleared with null, and the validator accepts
 * exactly the shapes the app writes (INV-6: an accepted step is one the flow can show).
 */
import { describe, expect, it } from 'vitest';
import * as habits from '@/domain/habits';
import * as profile from '@/domain/profile';
import type { AppState } from '@/state/types';
import { validateState } from '@/state/validate';
import { Game } from './game';

const setStep = profile.setOnboardingStep;
const stepOf = (s: AppState) => s.profile.onboardingStep;

describe('setOnboardingStep', () => {
  it('is refused before onboarding (there is no late step before planting)', () => {
    const g = new Game({ onboard: false });
    expect(g.run((tx) => setStep(tx, { step: 'today', habitIds: [] }))).toBe(false);
    expect(stepOf(g.state)).toBeUndefined();
  });

  it('keeps a step on an onboarded save, cleaned: at most 3 string ids, a string pet id; null clears it', () => {
    const g = new Game();
    expect(g.run((tx) => setStep(tx, { step: 'place', habitIds: ['a', 'b', 'c', 'd', 7 as never, 'a'], petId: 'pet-cat-calico' }))).toBe(true);
    expect(stepOf(g.state)).toEqual({ step: 'place', habitIds: ['a', 'b', 'c'], petId: 'pet-cat-calico' });
    expect(g.run((tx) => setStep(tx, { step: 'first', habitIds: ['a'], petId: 5 as never }))).toBe(true);
    expect(stepOf(g.state)).toEqual({ step: 'first', habitIds: ['a'] });
    expect(g.run((tx) => setStep(tx, { step: 'later' as never, habitIds: [] }))).toBe(false);
    expect(stepOf(g.state)).toEqual({ step: 'first', habitIds: ['a'] });
    expect(g.run((tx) => setStep(tx, null))).toBe(true);
    expect(stepOf(g.state)).toBeUndefined();
    expect('onboardingStep' in g.state.profile).toBe(false);
  });

  it('completeOnboarding itself sets no step (only the flow’s own Plant does, through the store)', () => {
    const g = new Game({ onboard: false });
    g.run((tx) => habits.completeOnboarding(tx, { name: 'Sam', templateIds: ['walk'] }));
    expect(stepOf(g.state)).toBeUndefined();
  });
});

describe('the validator and profile.onboardingStep', () => {
  const base = () => {
    const g = new Game();
    return structuredClone(g.state) as unknown as { profile: Record<string, unknown> };
  };

  it('accepts no step, and each shape the flow writes', () => {
    expect(validateState(base()).ok).toBe(true);
    for (const step of [{ step: 'today', habitIds: ['h1', 'h2'] }, { step: 'first', habitIds: [] }, { step: 'place', habitIds: ['h1'], petId: 'pet-cat-calico' }]) {
      const s = base();
      s.profile.onboardingStep = step;
      expect(validateState(s).ok, JSON.stringify(step)).toBe(true);
    }
  });

  it('rejects a step that is not one', () => {
    for (const bad of ['first', null, { step: 'sill', habitIds: [] }, { step: 'first' }, { step: 'first', habitIds: [1] }, { step: 'first', habitIds: ['a', 'b', 'c', 'd'] }, { step: 'place', habitIds: [], petId: 3 }]) {
      const s = base();
      s.profile.onboardingStep = bad;
      const res = validateState(s);
      expect(res.ok, JSON.stringify(bad)).toBe(false);
      if (!res.ok) expect(res.errors.join(' ')).toContain('profile.onboardingStep');
    }
  });
});
