import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '@/state/persist';
import { twoRuntime } from './twoRuntime';
import { mulberry32 } from '@/domain/rng';
import { deferredLocks } from './fixtures';

describe('two independent page runtimes (WP-04)', () => {
  it('shares disk immediately but delivers storage events only to the other page, when requested', async () => {
    const pages = await twoRuntime();
    const [first, second] = pages.tabs;
    first.store.completeOnboarding({ name: 'Sam', templateIds: ['water'], inFlow: true });
    first.store.flushSaves();
    expect(pages.storage.getItem(SAVE_KEY)).toContain('Sam');
    expect(pages.writes).toContainEqual({ source: 0, key: SAVE_KEY, value: pages.storage.getItem(SAVE_KEY) });
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
    expect(first.events.every((event) => event.source === 1)).toBe(true);
    expect(second.events.every((event) => event.source === 0)).toBe(true);
    expect(second.events.some((event) => event.key === SAVE_KEY)).toBe(true);
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
    expect(pages.storage.getItem(SAVE_KEY)).toBeNull();
    expect(second.store.state.value.habits).toEqual([]);
    expect(second.store.state.value.profile.onboardingStep).toBeUndefined();
  });

  it.each([17, 91, 20261002])('seed %i: delayed frames, timers, events, resets and ownership transfers preserve writer/onboarding authority', async (seed) => {
    const rng = mulberry32(seed);
    const locks = [deferredLocks(), deferredLocks()] as const;
    const pages = await twoRuntime([{ locks: locks[0] }, { locks: locks[1] }]);
    await locks[0].grant();
    await locks[1].refuse();
    let owner = 0;
    let checkedWrites = 0;
    const plant = () => pages.tabs[owner]!.store.completeOnboarding({ name: `Owner ${owner}`, templateIds: ['water'], inFlow: true });
    plant();
    const operations = ['tap', 'step', 'frame', 'timer', 'event', 'reset', 'transfer', 'flush'] as const;
    const seen = new Set<string>();
    for (let turn = 0; turn < 40; turn++) {
      const operation = operations[turn < operations.length ? turn : Math.floor(rng() * operations.length)]!;
      seen.add(operation);
      const page = pages.tabs[owner]!;
      if (operation === 'tap') page.store.checkIn(page.store.state.value.habits[0]!.id);
      else if (operation === 'step') {
        const step = rng() < 0.5 ? 'today' : 'first';
        expect(page.store.setOnboardingStep({ step, habitIds: page.store.state.value.habits.map((h) => h.id) })).toBe(true);
      } else if (operation === 'frame') for (const tab of pages.tabs) tab.frames.flush();
      else if (operation === 'timer') pages.advance(Math.floor(rng() * 2500));
      else if (operation === 'event') pages.deliver(Math.floor(rng() * pages.pendingEvents));
      else if (operation === 'flush') page.store.flushSaves();
      else if (operation === 'reset') { page.store.resetAll(); plant(); }
      else {
        // Force pending old-writer work, then release it after loss of ownership but before
        // the new page's grant/storage events. This is the interleaving synchronous fake locks hid.
        page.store.checkIn(page.store.state.value.habits[0]!.id);
        const cursor = pages.writes.length;
        await locks[owner]!.steal();
        const raw = pages.storage.getItem(SAVE_KEY);
        page.frames.flush();
        pages.advance(2000);
        page.store.setName('disposed writer');
        expect(page.store.setOnboardingStep({ step: 'first', habitIds: [] })).toBe(false);
        page.store.flushSaves();
        expect(pages.storage.getItem(SAVE_KEY), `seed ${seed}, turn ${turn}, disposed writer`).toBe(raw);
        expect(pages.writes.slice(cursor).filter((write) => write.key === SAVE_KEY)).toEqual([]);
        // Account for any legitimate write preceding the steal using the old owner.
        for (const write of pages.writes.slice(checkedWrites, cursor).filter((w) => w.key === SAVE_KEY)) expect(write.source).toBe(owner);
        checkedWrites = pages.writes.length;
        owner = 1 - owner;
        const next = pages.tabs[owner]!;
        next.store.useHere();
        // Ordinary edits may queue while acquiring (A1); they still cannot reach disk yet.
        expect(next.store.ownership.value).toBe('acquiring');
        const planted = next.store.state.value.profile.onboarded;
        expect(next.store.setOnboardingStep({ step: 'first', habitIds: [] })).toBe(planted);
        expect(pages.storage.getItem(SAVE_KEY)).toBe(raw);
        await locks[owner]!.grant();
        if (!next.store.state.value.profile.onboarded) plant();
      }
      for (const write of pages.writes.slice(checkedWrites).filter((w) => w.key === SAVE_KEY)) {
        expect(write.source, `seed ${seed}, turn ${turn}, ${operation}`).toBe(owner);
      }
      checkedWrites = pages.writes.length;
    }
    pages.tabs[owner]!.store.flushSaves();
    pages.deliverAll();
    for (const write of pages.writes.slice(checkedWrites).filter((w) => w.key === SAVE_KEY)) expect(write.source).toBe(owner);
    // The universal source assertions must not become vacuous if observation breaks.
    expect(new Set(pages.writes.filter((w) => w.key === SAVE_KEY).map((w) => w.source))).toEqual(new Set([0, 1]));
    expect(seen.size).toBe(operations.length);
    expect(pages.tabs[1 - owner]!.store.state.value.profile.onboardingStep).toEqual(pages.tabs[owner]!.store.state.value.profile.onboardingStep);
  });
});
