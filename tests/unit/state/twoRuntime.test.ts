import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '@/state/persist';
import { twoRuntime } from './twoRuntime';

describe('two independent page runtimes (WP-04)', () => {
  it('shares disk immediately but delivers storage events only to the other page, when requested', async () => {
    const pages = await twoRuntime();
    const [first, second] = pages.tabs;
    first.store.completeOnboarding({ name: 'Sam', templateIds: ['water'], inFlow: true });
    first.store.flushSaves();
    expect(pages.storage.getItem(SAVE_KEY)).toContain('Sam');
    expect(second.store.state.value.profile.name).toBe('');
    expect(pages.pendingEvents).toBeGreaterThan(0);
    pages.deliverAll();
    expect(second.store.state.value.profile.name).toBe('Sam');
    expect(second.store.state.value.profile.onboardingStep?.step).toBe('today');
    first.store.setOnboardingStep({ step: 'first', habitIds: first.store.state.value.habits.map((h) => h.id) });
    first.store.flushSaves();
    expect(second.store.state.value.profile.onboardingStep?.step).toBe('today');
    pages.deliverAll();
    expect(second.store.state.value.profile.onboardingStep?.step).toBe('first');
    expect(first.events).toBe(0);
    expect(second.events).toBeGreaterThan(0);
  });

  it('a queued write in the second runtime cannot resurrect a reset performed in the first', async () => {
    const pages = await twoRuntime();
    const [first, second] = pages.tabs;
    first.store.completeOnboarding({ name: 'Old', templateIds: ['water'], inFlow: true });
    first.store.flushSaves();
    pages.deliverAll();
    second.store.setName('stale pending name');
    first.store.resetAll();
    pages.advance(2000); // stale timer resumes before its queued reset event
    pages.deliverAll();
    expect(JSON.parse(pages.storage.getItem(SAVE_KEY)!).state.profile.onboarded).toBe(false);
    expect(second.store.state.value.habits).toEqual([]);
    expect(second.store.state.value.profile.onboardingStep).toBeUndefined();
  });
});
