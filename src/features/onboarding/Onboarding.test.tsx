// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import { createInitialState } from '@/state/defaults';
import { ownership, state } from '@/state/store';
import { holdUpdates } from '@/app/pwa';
import { currentTab } from '@/app/router';
import { button, click, installDom, mount, type, until } from '@/features/capsules/testing';
import { ONBOARDING_KEY, onboardingActive, onboardingProgress, reloadProgress, saveProgress } from './progress';
import { Onboarding } from './Onboarding';

let view: ReturnType<typeof mount> | null = null;
const h1 = () => view!.root.querySelector('h1')?.textContent;
const byText = (text: string) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === text) ?? null;

beforeAll(() => {
  installDom();
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver ??= RO;
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver ??= RO;
});
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  reloadProgress();
  state.value = createInitialState(Date.now());
  location.hash = '';
  view = mount(<Onboarding />);
});
afterEach(() => {
  view?.unmount();
  view = null;
  ownership.value = 'unsupported';
});

describe('onboarding (DESIGN §9.6)', () => {
  it('starts on the empty sill, holds updates while it runs, and is what the shell shows', () => {
    expect(h1()).toBe('New place. Which plants came with you?');
    expect(view!.root.querySelectorAll('h1')).toHaveLength(1);
    expect(onboardingActive.value).toBe(true);
    expect(holdUpdates.value).toBe(true);
  });

  it('plants up to 3 picks, remembers step 3, and tops the jar up with the first watering', async () => {
    await type(view!.root.querySelector('input') as HTMLInputElement, 'Maya');
    await click(byText('Next'), 'Next');
    expect(h1()).toBe('Pick up to 3.');
    await click(button('Walk'), 'Walk');
    await click(button('Read'), 'Read');
    await click(byText('Make my own'), 'Make my own');
    await type(view!.root.querySelector('#onb-own') as HTMLInputElement, 'Practise piano');
    await click(byText('Add'), 'Add');
    // A fourth is refused: the chips stay as they were.
    await click(button('Stretch'), 'Stretch');
    expect(button('Stretch')!.getAttribute('aria-pressed')).toBe('false');
    expect(view!.root.textContent).toContain('That’s 3. More can go on the sill anytime.');
    await click(byText('Plant these'), 'Plant these');

    expect(state.value.profile).toMatchObject({ name: 'Maya', onboarded: true });
    expect(state.value.habits.map((h) => h.name)).toEqual(['Walk', 'Read', 'Practise piano']);
    expect(onboardingProgress.value?.step).toBe('today');
    expect(JSON.parse(localStorage.getItem(ONBOARDING_KEY)!).habitIds).toHaveLength(3);
    expect(h1()).toBe('Anything already done today?');

    await click(button('Walk'), 'water Walk');
    expect(state.value.wallet.coins).toBe(25);
    expect(view!.root.textContent).toContain('There are 25 coins in the jar. That’s a capsule.');
    expect(button('Walk')!.getAttribute('aria-pressed')).toBe('true');

    await click(byText('Next'), 'Next');
    expect(onboardingProgress.value?.step).toBe('first');
    await until(() => h1() === 'Who comes home first?', 'the four cabinets');
    for (const n of ['No. 01 · Cats', 'No. 02 · Cows', 'No. 03 · Dogs', 'No. 04 · Pond']) expect(button(new RegExp(`^${n}`))).not.toBeNull();
  });

  it('skips every step, and "Not yet, I’ll earn it" goes to Today with nothing left to resume', async () => {
    await click(byText('Skip'), 'Skip');
    expect(h1()).toBe('Pick up to 3.');
    await click(byText('Skip'), 'Skip');
    // Nothing planted: no step 3.
    expect(state.value.profile.onboarded).toBe(true);
    expect(state.value.habits).toHaveLength(0);
    await until(() => h1() === 'Who comes home first?', 'step 4');
    await click(byText('Not yet, I’ll earn it'), 'Not yet');
    expect(onboardingProgress.value).toBeNull();
    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull();
    expect(onboardingActive.value).toBe(false);
    expect(currentTab.value).toBe('today');
  });

  it('the first capsule waits, unspent, while this window is still getting ready (audit FS4)', async () => {
    view!.unmount();
    state.value = { ...state.value, profile: { ...state.value.profile, onboarded: true } };
    saveProgress({ step: 'first', habitIds: [] });
    await act(() => reloadProgress());
    view = mount(<Onboarding />);
    await click(await until(() => button(/^No\. 01 · Cats/), 'the Cats cabinet'), 'Cats');
    ownership.value = 'acquiring';
    const before = state.value;
    await click(await until(() => byText('Put a coin in'), 'the coin slot'), 'Put a coin in');
    const note = await until(() => document.querySelector('[role="note"]'), 'a notice');
    expect(note.textContent).toMatch(/^One moment: catkin is still getting ready in this window\. Nothing was spent\./);
    // Still on the capsule step, the gift unspent, and the way back still open.
    expect(h1()).toBe('No. 01 · Cats');
    expect(state.value).toBe(before);
    expect(onboardingProgress.value?.step).toBe('first');
    expect(button('Who comes home first? Choose a cabinet')?.disabled).toBe(false);
    await act(() => {
      ownership.value = 'granted';
    });
    await until(() => !document.querySelector('[role="note"]'), 'the notice to clear');
    expect(byText('Put a coin in')?.disabled).toBe(false);
  });

  it('comes back to the same step after a reload', async () => {
    view!.unmount();
    state.value = { ...state.value, profile: { ...state.value.profile, onboarded: true } };
    saveProgress({ step: 'first', habitIds: [] });
    await act(() => reloadProgress());
    view = mount(<Onboarding />);
    await until(() => h1() === 'Who comes home first?', 'step 4 again');
  });
});
