// @vitest-environment jsdom
/**
 * The shared sheets load lazily (WP-C4, audit integration-i4). A sheet whose chunk can't load
 * (offline before it was ever cached, or an update that took the old chunk away) says so in a
 * small sheet of its own: "Try again" keeps the request and opens what was asked for (a retry
 * that fails in the page reloads it when that is safe, and the request is asked for again after),
 * "Close" clears it, and the next request loads afresh.
 *
 * Each test starts from a fresh module graph (`vi.resetModules`), so no chunk is already loaded
 * and no rejected load is cached; the host modules are real, with a switch that makes their
 * import reject the way a missing chunk does.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { button, click, installDom, key, mount, until } from '@/features/capsules/testing';
import { createInitialState } from '@/state/defaults';
import type { AppState } from '@/state/types';
import { ERRORS } from '@/catalog/lines';
import { SCREEN_COPY } from './copy';

vi.setConfig({ testTimeout: 30_000 });

const ctl = vi.hoisted(() => {
  const offline = new Set<string>();
  const attempts: Record<string, number> = {};
  return {
    offline,
    attempts,
    /** Throws as a dynamic import of a missing chunk does, while `what` is offline. */
    gate(what: string) {
      attempts[what] = (attempts[what] ?? 0) + 1;
      if (offline.has(what)) throw new TypeError(`Failed to fetch dynamically imported module: ${what}`);
    },
  };
});
/** The real host modules, behind the switch (registered afresh with each fresh module graph). */
function gateChunks() {
  vi.doMock('@/features/habits/editor/HabitEditorHost', async (orig) => (ctl.gate('editor'), orig()));
  vi.doMock('@/features/habits/detail/HabitDetailHost', async (orig) => (ctl.gate('detail'), orig()));
  vi.doMock('@/features/pets/PetCardHost', async (orig) => (ctl.gate('pet'), orig()));
  vi.doMock('@/features/rituals/RitualReaderHost', async (orig) => (ctl.gate('ritual'), orig()));
}

let view: ReturnType<typeof mount> | null = null;
/** A first import is transformed on the spot: room for a busy machine. */
const LOAD = 20_000;

/** The page reloads a failed retry asked for (jsdom cannot navigate; `pageReload` is the seam). */
const reloads = vi.fn();

/**
 * The shell's sheets, the store and the requests, all from one fresh module graph: a page load.
 * `save`: the state to load (as a reload finds it); else a new one with Walk and Drink water.
 */
async function fresh(save?: AppState) {
  vi.resetModules();
  gateChunks();
  const store = await import('@/state/store');
  const open = await import('@/features/habits/open');
  const rituals = await import('@/features/rituals/open');
  const lazy = await import('./useLazyModule');
  lazy.pageReload.run = reloads;
  const { SheetHosts } = await import('./SheetHosts');
  await act(() => {
    store.state.value = save ?? createInitialState(Date.now());
  });
  if (!save) store.completeOnboarding({ name: '', templateIds: ['walk', 'water'] });
  const walk = store.state.value.habits.find((h) => h.name === 'Walk')!.id;
  view = mount(<SheetHosts />);
  return { store, open, rituals, walk };
}

const errorSheet = () => document.querySelector<HTMLElement>('[role="alertdialog"]');
const dialogs = () => document.querySelectorAll('[role="dialog"], [role="alertdialog"]');

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
  reloads.mockClear();
  ctl.offline.clear();
  for (const k of Object.keys(ctl.attempts)) delete ctl.attempts[k];
});
afterEach(() => {
  delete (navigator as { onLine?: boolean }).onLine;
  view?.unmount();
  view = null;
  document.body.innerHTML = '';
});

describe('a shared sheet whose chunk can’t load (WP-C4, integration-i4)', () => {
  it('says so with Try again and Close, keeps the request, and Try again opens the same habit, once', async () => {
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    await act(() => open.openHabitDetail(walk));
    const sheet = await until(errorSheet, 'the error sheet', LOAD);
    expect(sheet.textContent).toContain('This didn’t open');
    expect(sheet.textContent).toContain('It needs a connection the first time it opens. Your plants and coins are saved.');
    expect(button('Try again')).not.toBeNull();
    expect(button('Close')).not.toBeNull();
    // The request is kept: it is what Try again opens.
    expect(open.habitDetailRequest.value).toBe(walk);

    ctl.offline.delete('detail');
    await click(button('Try again'), 'Try again');
    await until(() => document.querySelector(`[data-habit-detail="${walk}"]`), 'Walk’s detail', LOAD);
    // One dialog: the detail, and no error sheet left behind it.
    expect(errorSheet()).toBeNull();
    expect(dialogs()).toHaveLength(1);
    expect(open.habitDetailRequest.value).toBe(walk);
    expect(ctl.attempts.detail).toBe(2);
  });

  it('a retry that fails in the page reloads it, and the request is asked for again after the reload', async () => {
    // Chromium keeps a failed chunk for the life of the page: importing it again fails at once.
    ctl.offline.add('detail');
    const { store, open, walk } = await fresh();
    await act(() => open.openHabitDetail(walk));
    await until(errorSheet, 'the error sheet', LOAD);
    await click(button('Try again'), 'Try again');
    await until(() => reloads.mock.calls.length > 0, 'the reload', LOAD);
    expect(reloads).toHaveBeenCalledTimes(1);
    expect(ctl.attempts.detail).toBe(2);
    // The error sheet stays up, busy, while the page goes; the request is kept for this tab.
    expect(button('Try again')?.getAttribute('aria-busy')).toBe('true');
    expect(JSON.parse(sessionStorage.getItem('catkin-sheet-retry')!)).toEqual({ name: 'detail', request: walk });

    // The reload: a new page on the same save, where the chunk loads.
    const save = store.state.value;
    view!.unmount();
    view = null;
    document.body.innerHTML = '';
    ctl.offline.delete('detail');
    const again = await fresh(save);
    await until(() => document.querySelector(`[data-habit-detail="${walk}"]`), 'Walk’s detail after the reload', LOAD);
    expect(again.open.habitDetailRequest.value).toBe(walk);
    expect(dialogs()).toHaveLength(1);
    expect(sessionStorage.getItem('catkin-sheet-retry')).toBeNull();
  });

  it('offline, a failed retry does not reload: the error sheet comes back with its request, until one loads', async () => {
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await act(() => open.openHabitDetail(walk));
    await until(errorSheet, 'the error sheet', LOAD);
    await click(button('Try again'), 'Try again');
    await until(() => ctl.attempts.detail === 2 && !button('Try again')?.hasAttribute('aria-busy') && button('Try again'), 'the second attempt to fail', LOAD);
    expect(reloads).not.toHaveBeenCalled();
    expect(errorSheet()).not.toBeNull();
    expect(dialogs()).toHaveLength(1);
    expect(open.habitDetailRequest.value).toBe(walk);

    ctl.offline.delete('detail');
    await click(button('Try again'), 'Try again');
    await until(() => document.querySelector(`[data-habit-detail="${walk}"]`), 'Walk’s detail', LOAD);
    expect(dialogs()).toHaveLength(1);
  });

  it('a kept request that isn’t one is dropped after a reload', async () => {
    sessionStorage.setItem('catkin-sheet-retry', JSON.stringify({ name: 'editor', request: { id: 7, evil: true } }));
    const { open } = await fresh();
    await act(() => Promise.resolve());
    expect(open.habitEditorRequest.value).toBeNull();
    expect(sessionStorage.getItem('catkin-sheet-retry')).toBeNull();
  });

  it('Close clears the request, and the next request loads', async () => {
    ctl.offline.add('editor');
    const { open, walk } = await fresh();
    await act(() => open.openHabitEditor({ id: walk }));
    await until(errorSheet, 'the error sheet', LOAD);
    await click(button('Close'), 'Close');
    expect(open.habitEditorRequest.value).toBeNull();
    await until(() => !errorSheet(), 'the error sheet to go');
    expect(dialogs()).toHaveLength(0);

    ctl.offline.delete('editor');
    await act(() => open.openHabitEditor());
    const editor = await until(() => document.querySelector<HTMLElement>('[role="dialog"]'), 'the Habit Editor', LOAD);
    expect(editor.querySelector('h2')?.textContent).toBe('A new habit');
    expect(dialogs()).toHaveLength(1);
  });

  it('Esc on the error sheet is Close, too', async () => {
    ctl.offline.add('pet');
    const { open } = await fresh();
    await act(() => open.openPetCard('pet-cat-calico'));
    await until(errorSheet, 'the error sheet', LOAD);
    await key(document, 'Escape');
    expect(open.petCardRequest.value).toBeNull();
    await until(() => !errorSheet(), 'the error sheet to go');
  });

  it('the ritual reader has the same error sheet (SheetHosts is its one loader)', async () => {
    ctl.offline.add('ritual');
    const { rituals } = await fresh();
    await act(() => rituals.openRitual('letter-missing'));
    await until(errorSheet, 'the error sheet', LOAD);
    expect(dialogs()).toHaveLength(1);
    await click(button('Close'), 'Close');
    expect(rituals.ritualRequest.value).toBeNull();
  });
});

describe('its words', () => {
  it('are the VOICE §18 lines (ERRORS.sheet…), copied for the first paint', () => {
    expect(SCREEN_COPY.sheetTitle).toBe(ERRORS.sheet);
    expect(SCREEN_COPY.sheetText).toBe(ERRORS.sheetText);
    expect(SCREEN_COPY.sheetRetry).toBe(ERRORS.sheetRetry);
    expect(SCREEN_COPY.sheetClose).toBe(ERRORS.sheetClose);
  });
});
