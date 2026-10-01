// @vitest-environment jsdom
/**
 * Onboarding's second chunk (steps 4 and 5: the cabinets and the pets) loads while she is on the
 * sill (WP-C4, audit creative-cr-d3 and P-ui-11). While it loads the step shows its heading and a
 * quiet loading line; if it can't load, the heading and an error with "Try again" stand in place
 * of the lead. The step always has exactly one h1, and the heading takes focus when the cabinets
 * arrive. Retrying replays nothing: no second planting, no second gift, no pull. A retry that fails
 * in the page reloads it when that is safe, and the step comes back from its saved progress.
 *
 * Each test starts from a fresh module graph (`vi.resetModules`), so the chunk is never already
 * loaded; the real CapsuleSteps module sits behind a switch that makes its import reject the way a
 * missing chunk does, or wait until the test lets it through.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { button, click, installDom, mount, pause, until } from '@/features/capsules/testing';
import { createInitialState } from '@/state/defaults';
import type { PetState } from '@/state/types';

vi.setConfig({ testTimeout: 30_000 });

const ctl = vi.hoisted(() => ({
  offline: false,
  attempts: 0,
  /** While set, the chunk's import waits for it. */
  hold: null as Promise<void> | null,
}));
/** The real CapsuleSteps module, behind the switch (registered afresh with each fresh module graph). */
function gateChunk() {
  vi.doMock('./CapsuleSteps', async (orig) => {
    ctl.attempts++;
    if (ctl.hold) await ctl.hold;
    if (ctl.offline) throw new TypeError('Failed to fetch dynamically imported module: CapsuleSteps');
    return orig();
  });
}

let view: ReturnType<typeof mount> | null = null;
/** A first import is transformed on the spot: room for a busy machine. */
const LOAD = 20_000;
const h1s = () => Array.from(document.querySelectorAll('h1'));
const h1 = () => h1s()[0]?.textContent;
const byText = (text: string) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === text) ?? null;
const LEAD = 'Your first capsule is on the house. Choose a cabinet.';

/** The page reloads a failed retry asked for (jsdom cannot navigate; `pageReload` is the seam). */
const reloads = vi.fn();

type Setup = (m: { store: typeof import('@/state/store'); progress: typeof import('./progress') }) => void;

/** Onboarding, the store and its progress from one fresh module graph, mounted in the shell's <main>. */
async function fresh(setup?: Setup) {
  vi.resetModules();
  gateChunk();
  const store = await import('@/state/store');
  const progress = await import('./progress');
  const router = await import('@/app/router');
  const lazy = await import('@/app/useLazyModule');
  lazy.pageReload.run = reloads;
  const { Onboarding } = await import('./Onboarding');
  await act(() => {
    store.state.value = createInitialState(Date.now());
  });
  if (setup) await act(() => setup({ store, progress }));
  view = mount(
    <main id="main" tabIndex={-1}>
      <Onboarding />
    </main>,
  );
  return { store, progress, router };
}

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
  location.hash = '';
  ctl.offline = false;
  ctl.attempts = 0;
  ctl.hold = null;
  reloads.mockClear();
});
afterEach(() => {
  delete (navigator as { onLine?: boolean }).onLine;
  view?.unmount();
  view = null;
  document.body.innerHTML = '';
});

describe('onboarding’s capsule steps load, fail and retry (WP-C4, creative-cr-d3, P-ui-11)', () => {
  it('a chunk that can’t load: the heading stays, Try again stands in for the lead, and a retry replays nothing', async () => {
    ctl.offline = true;
    const { store, progress } = await fresh();
    await click(byText('Next'), 'Next');
    await click(button('Walk'), 'Walk');
    await click(byText('Plant it'), 'Plant it');
    expect(h1()).toBe('Anything already done today?');
    await click(button('Walk'), 'water Walk');
    expect(store.state.value.wallet.coins).toBe(25);
    await click(byText('Next'), 'Next');

    await until(() => byText('Try again'), 'the error in place of the lead', LOAD);
    expect(h1s()).toHaveLength(1);
    expect(h1()).toBe('Who comes home first?');
    // The error's own title sits under the step's h1, as an h2.
    const errorTitle = Array.from(document.querySelectorAll('h1, h2, h3, h4')).find((h) => h.textContent === 'This page didn’t load');
    expect(errorTitle?.tagName).toBe('H2');
    expect(view!.root.textContent).not.toContain(LEAD);
    expect(byText('Skip')).not.toBeNull();

    const before = store.state.value;
    ctl.offline = false;
    await click(byText('Try again'), 'Try again');
    await until(() => button(/^No\. 01 · Cats/), 'the four cabinets', LOAD);
    // Nothing was replayed: no second planting, no second top-up, no capsule pulled.
    expect(store.state.value).toBe(before);
    expect(store.state.value.habits.map((h) => h.name)).toEqual(['Walk']);
    expect(store.state.value.wallet.coins).toBe(25);
    expect(store.state.value.lifetime.pulls).toBe(0);
    expect(progress.onboardingProgress.value?.step).toBe('first');
    // Exactly one h1, and it has focus (the Try again button it replaced is gone).
    expect(h1s()).toHaveLength(1);
    expect(h1()).toBe('Who comes home first?');
    expect(document.activeElement).toBe(h1s()[0]);
  });

  it('a retry that fails in the page reloads it; step 4 comes back after the reload, and loads', async () => {
    // Chromium keeps a failed chunk for the life of the page: importing it again fails at once.
    ctl.offline = true;
    const onStep4: Setup = ({ store, progress }) => {
      store.state.value = { ...store.state.value, profile: { ...store.state.value.profile, onboarded: true } };
      progress.saveProgress({ step: 'first', habitIds: [] });
      progress.reloadProgress();
    };
    await fresh(onStep4);
    await click(await until(() => byText('Try again'), 'the error', LOAD), 'Try again');
    await until(() => reloads.mock.calls.length > 0, 'the reload', LOAD);
    expect(reloads).toHaveBeenCalledTimes(1);
    // The step's heading holds focus while the page goes.
    expect(document.activeElement).toBe(h1s()[0]);
    expect(h1()).toBe('Who comes home first?');

    // The reload: step 4 again (onboarding keeps its step), and now the chunk loads.
    view!.unmount();
    view = null;
    document.body.innerHTML = '';
    ctl.offline = false;
    const { progress } = await fresh(({ store }) => {
      // What the reload finds on disk: the save, with the step it was on (the reload wrote it
      // first; nothing here saves it again). The step is part of the save (WP-C5).
      store.hydrate();
    });
    await until(() => button(/^No\. 01 · Cats/), 'the four cabinets after the reload', LOAD);
    expect(progress.onboardingProgress.value?.step).toBe('first');
    expect(h1s()).toHaveLength(1);
    expect(document.activeElement).toBe(h1s()[0]);
  });

  it('offline, a failed retry does not reload: the error comes back, and Skip still works', async () => {
    ctl.offline = true;
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await fresh();
    await click(byText('Skip'), 'Skip');
    await click(byText('Skip'), 'Skip');
    await click(await until(() => byText('Try again'), 'the error', LOAD), 'Try again');
    await until(() => ctl.attempts >= 2 && byText('Try again'), 'the error again', LOAD);
    expect(reloads).not.toHaveBeenCalled();
    expect(h1s()).toHaveLength(1);
    expect(h1()).toBe('Who comes home first?');
  });

  it('while it loads, step 4 has its h1 and a loading line; the heading keeps focus as the cabinets arrive', async () => {
    let letThrough = () => {};
    ctl.hold = new Promise<void>((r) => (letThrough = r));
    await fresh();
    await click(byText('Skip'), 'Skip');
    await click(byText('Skip'), 'Skip');
    await until(() => h1() === 'Who comes home first?', 'step 4’s heading while it loads', LOAD);
    expect(h1s()).toHaveLength(1);
    expect(document.querySelector('[role="status"]')?.textContent).toContain('One moment');
    expect(view!.root.textContent).not.toContain(LEAD);
    expect(document.activeElement).toBe(h1s()[0]);

    await act(() => letThrough());
    await until(() => button(/^No\. 01 · Cats/), 'the four cabinets', LOAD);
    expect(h1s()).toHaveLength(1);
    expect(h1()).toBe('Who comes home first?');
    expect(document.activeElement).toBe(h1s()[0]);
  });

  it('when the cabinets arrive after she moved focus herself, focus stays where she put it', async () => {
    let letThrough = () => {};
    ctl.hold = new Promise<void>((r) => (letThrough = r));
    await fresh();
    await click(byText('Skip'), 'Skip');
    await click(byText('Skip'), 'Skip');
    await until(() => h1() === 'Who comes home first?', 'step 4’s heading while it loads', LOAD);
    const skip = byText('Skip')!;
    await act(() => skip.focus());
    expect(document.activeElement).toBe(skip);

    await act(() => letThrough());
    await until(() => button(/^No\. 01 · Cats/), 'the four cabinets', LOAD);
    await pause(0);
    expect(document.activeElement).toBe(skip);
  });

  it('after a reload into step 5, the heading names the pet, and Skip still goes to Today', async () => {
    ctl.offline = true;
    const petId = 'pet-cat-calico';
    const { progress, router } = await fresh(({ store, progress }) => {
      const pet = { id: petId, name: 'Pudding', personality: 'sleepy', favoriteTreat: 'treat-milk', favoriteKnown: false, xp: 0, outfit: {}, inMeadow: true, favorite: false, obtainedAt: Date.now() } as PetState;
      store.state.value = { ...store.state.value, profile: { ...store.state.value.profile, onboarded: true }, pets: { [petId]: pet } };
      progress.saveProgress({ step: 'place', habitIds: [], petId });
      progress.reloadProgress();
    });
    await until(() => byText('Try again'), 'the error', LOAD);
    expect(h1s()).toHaveLength(1);
    expect(h1()).toBe('Find Pudding a plant');
    await click(byText('Skip'), 'Skip');
    expect(progress.onboardingProgress.value).toBeNull();
    expect(router.currentTab.value).toBe('today');
  });
});
