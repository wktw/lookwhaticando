// @vitest-environment jsdom
/**
 * Save-queue integrity in the interface (package P1-A in CATKIN_AUDIT_IMPLEMENTATION_PLAN_ALTERNATE.md):
 * the shell says when a change is being retried or can't be kept at all, and a window waiting for
 * the writer lock leaves the onboarding sidecar alone.
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

const bannerText = () => [...document.querySelectorAll('[data-banner]')].map((b) => b.querySelector('p')?.textContent ?? '');

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

describe('RISK-01: the onboarding sidecar is written only by the window that owns the save', () => {
  it('waits for the writer lock', async () => {
    const locks = deferredLocks();
    fakeBrowser({ locks });
    store.hydrate();
    saveProgress({ step: 'today', habitIds: [] });
    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull();
    await locks.grant();
    saveProgress({ step: 'first', habitIds: [] });
    expect(JSON.parse(localStorage.getItem(ONBOARDING_KEY)!)).toMatchObject({ step: 'first' });
  });

  it('a refused window never writes it', async () => {
    const locks = deferredLocks();
    fakeBrowser({ locks });
    store.hydrate();
    await locks.refuse();
    saveProgress({ step: 'place', habitIds: [] });
    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull();
  });
});
