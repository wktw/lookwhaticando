// @vitest-environment jsdom
/**
 * Save-queue integrity in the interface (package P1-A in CATKIN_AUDIT_IMPLEMENTATION_PLAN_ALTERNATE.md):
 * the shell says when a change is being retried or can't be kept at all, and a window waiting for
 * the writer lock writes no onboarding progress.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SAVE_KEY } from '@/state/persist';
import * as store from '@/state/store';
import { ShellBanners } from '@/app/App';
import { SHELL_LINES } from '@/features/you/shellCopy';
import { ONBOARDING_KEY, saveProgress } from '@/features/onboarding/progress';
import { installDom, mount } from '@/features/capsules/testing';
import { deferredLocks, failWrites, fakeBrowser } from './fixtures';

beforeAll(() => installDom());

let view: ReturnType<typeof mount> | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
  store.configureStore({ locks: null });
  localStorage.clear();
});

const bannerText = () => [...document.querySelectorAll('[data-banner]')].map((b) => b.textContent ?? '');

describe('the shell says what is true about the save', () => {
  it('a write that is being retried shows the "didn’t save yet" note until it lands', () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.advance(1000);
    const broken = failWrites(b.storage, 'error', [SAVE_KEY]);
    store.setName('Samira');
    b.advance(300);
    view = mount(<ShellBanners />);
    expect(bannerText()).toEqual([SHELL_LINES.save]);
    broken.heal();
    b.advance(60_000);
    view.unmount();
    view = mount(<ShellBanners />);
    expect(bannerText()).toEqual([]);
  });

  it('with no storage at all it says changes go when catkin closes', () => {
    fakeBrowser();
    store.configureStore({ storage: null });
    store.hydrate();
    view = mount(<ShellBanners />);
    expect(bannerText()).toEqual([SHELL_LINES.volatile]);
  });
});

describe('RISK-01: onboarding’s progress is written only by the window that owns the save', () => {
  // Since WP-C5 the late step is part of the save (profile.onboardingStep): it waits for the writer
  // lock with every other change, and nothing writes the old catkin:onboarding key.
  it('waits for the writer lock', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    expect(saveProgress({ step: 'today', habitIds: [] })).toBe(true);
    store.flushSaves();
    expect(b.storage.getItem(SAVE_KEY)).toBeNull();
    expect(b.storage.getItem(ONBOARDING_KEY)).toBeNull();
    await locks.grant();
    saveProgress({ step: 'first', habitIds: [] });
    store.flushSaves();
    expect(JSON.parse(b.storage.getItem(SAVE_KEY)!).state.profile.onboardingStep).toMatchObject({ step: 'first' });
    expect(b.storage.getItem(ONBOARDING_KEY)).toBeNull();
  });

  it('a refused window never writes it', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    await locks.refuse();
    expect(saveProgress({ step: 'place', habitIds: [] })).toBe(false);
    store.flushSaves();
    expect(b.storage.getItem(SAVE_KEY)).toBeNull();
    expect(b.storage.getItem(ONBOARDING_KEY)).toBeNull();
  });
});
