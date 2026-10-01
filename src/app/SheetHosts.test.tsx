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
import { button, click, installDom, key, mount, pause, until } from '@/features/capsules/testing';
import { createInitialState } from '@/state/defaults';
import type { AppState } from '@/state/types';
import { ERRORS } from '@/catalog/lines';
import { SCREEN_COPY } from './copy';

vi.setConfig({ testTimeout: 30_000 });

const ctl = vi.hoisted(() => {
  const offline = new Set<string>();
  const attempts: Record<string, number> = {};
  /** While set for `what`, its import waits for it (a slow fetch). */
  const holds: Record<string, Promise<void>> = {};
  return {
    offline,
    attempts,
    holds,
    /** Throws as a dynamic import of a missing chunk does, while `what` is offline. */
    async gate(what: string) {
      attempts[what] = (attempts[what] ?? 0) + 1;
      const hold = holds[what];
      if (hold) await hold;
      if (offline.has(what)) throw new TypeError(`Failed to fetch dynamically imported module: ${what}`);
    },
  };
});
/** The real host modules, behind the switch (registered afresh with each fresh module graph). */
function gateChunks() {
  vi.doMock('@/features/habits/editor/HabitEditorHost', async (orig) => (await ctl.gate('editor'), orig()));
  vi.doMock('@/features/habits/detail/HabitDetailHost', async (orig) => (await ctl.gate('detail'), orig()));
  vi.doMock('@/features/pets/PetCardHost', async (orig) => (await ctl.gate('pet'), orig()));
  vi.doMock('@/features/rituals/RitualReaderHost', async (orig) => (await ctl.gate('ritual'), orig()));
}
/** Holds `what`'s next import until the returned function lets it through. */
function hold(what: string): () => void {
  let letThrough = () => {};
  ctl.holds[what] = new Promise<void>((r) => (letThrough = r));
  return () => {
    delete ctl.holds[what];
    letThrough();
  };
}

let view: ReturnType<typeof mount> | null = null;
/** A first import is transformed on the spot: room for a busy machine. */
const LOAD = 20_000;

/** How long a first load may take before its sheet says so (SheetHosts' own, set by `fresh`). */
let SLOW_SHEET_MS = NaN;

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
  const { SheetHosts, SLOW_SHEET_MS: slow } = await import('./SheetHosts');
  SLOW_SHEET_MS = slow ?? 1000; // (a build without one: the old code, for the failing-first run)
  await act(() => {
    store.state.value = save ?? createInitialState(Date.now());
  });
  if (!save) store.completeOnboarding({ name: '', templateIds: ['walk', 'water'] });
  const walk = store.state.value.habits.find((h) => h.name === 'Walk')!.id;
  view = mount(<SheetHosts />);
  return { store, open, rituals, walk };
}

/** The sheet that says a chunk didn't load (not the one that says it is still loading). */
const errorSheet = () => Array.from(document.querySelectorAll<HTMLElement>('[role="alertdialog"]')).find((el) => el.textContent?.includes(SCREEN_COPY.sheetTitle)) ?? null;
/** The sheet that says a first load is taking a moment (P-ui-23). */
const loadingSheet = () => Array.from(document.querySelectorAll<HTMLElement>('[role="alertdialog"]')).find((el) => el.textContent?.includes(SCREEN_COPY.sheetSlow)) ?? null;
/** The error sheet's phase (its layer's `data-state`, ./LoadSheet.tsx): 'enter' or 'open' while it is up, 'exit' as it goes. */
const errorSheetPhase = () => errorSheet()?.closest('[data-state]')?.getAttribute('data-state') ?? null;
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
  for (const k of Object.keys(ctl.holds)) delete ctl.holds[k];
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

  it('while Try again is under way the error sheet stays up, busy; Close then, and the retry failing after changes nothing', async () => {
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    await act(() => open.openHabitDetail(walk));
    await until(errorSheet, 'the error sheet', LOAD);
    await until(() => errorSheetPhase() === 'open', 'the error sheet to settle');
    const letThrough = hold('detail');
    await click(button('Try again'), 'Try again');
    await until(() => ctl.attempts.detail === 2, 'the second attempt to start', LOAD);
    // Still up (not sliding out), past the time a closing sheet takes to go, and busy.
    await pause(400);
    expect(errorSheetPhase()).toBe('open');
    expect(button('Try again')?.getAttribute('aria-busy')).toBe('true');

    // She closes it while it tries; then the retry fails. She chose Close: no reload, nothing kept.
    await click(button('Close'), 'Close');
    expect(open.habitDetailRequest.value).toBeNull();
    await act(() => letThrough());
    await until(() => !errorSheet(), 'the error sheet to go');
    await pause(50);
    expect(reloads).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('catkin-sheet-retry')).toBeNull();
    expect(errorSheet()).toBeNull();
    expect(open.habitDetailRequest.value).toBeNull();

    // The next request is a first load, not a retry left busy.
    ctl.offline.delete('detail');
    await act(() => open.openHabitDetail(walk));
    await until(() => document.querySelector(`[data-habit-detail="${walk}"]`), 'Walk’s detail', LOAD);
    expect(errorSheet()).toBeNull();
    expect(dialogs()).toHaveLength(1);
  });

  // A reload would lose what lives only in this page: changes not yet on disk (a write that keeps
  // failing, or a save with no persistent storage at all), or the demo peek.
  it.each([
    ['a write that keeps failing', 'failing'],
    ['no persistent storage', 'volatile'],
    ['the demo', 'demo'],
  ] as const)('with %s, a failed retry does not reload: the error sheet comes back with its request', async (_, what) => {
    ctl.offline.add('detail');
    const { store, open } = await fresh();
    let restore = () => {};
    if (what === 'volatile') store.volatileStorage.value = true;
    if (what === 'demo') store.demoMode.value = true;
    if (what === 'failing') {
      // A real save queue whose writes fail, holding a change: flushSaves() can't write it.
      store.hydrate();
      store.completeOnboarding({ name: '', templateIds: ['walk'] });
      store.flushSaves();
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
        if (this === localStorage) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        return real.call(this, k, v);
      };
      restore = () => (Storage.prototype.setItem = real);
      const id = store.state.value.habits.find((h) => h.name === 'Walk')!.id;
      store.checkIn(id);
      store.flushSaves();
      expect(store.hasUnsavedWork()).toBe(true);
    }
    try {
      const id = store.state.value.habits.find((h) => h.name === 'Walk')!.id;
      await act(() => open.openHabitDetail(id));
      await until(errorSheet, 'the error sheet', LOAD);
      await click(button('Try again'), 'Try again');
      await until(() => ctl.attempts.detail === 2 && !button('Try again')?.hasAttribute('aria-busy') && button('Try again'), 'the second attempt to fail', LOAD);
      expect(reloads).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('catkin-sheet-retry')).toBeNull();
      expect(errorSheetPhase()).not.toBe('exit');
      expect(dialogs()).toHaveLength(1);
      expect(open.habitDetailRequest.value).toBe(id);
    } finally {
      restore();
      store.volatileStorage.value = false;
      store.demoMode.value = false;
    }
  });

  it('a kept request that isn’t one is dropped after a reload', async () => {
    sessionStorage.setItem('catkin-sheet-retry', JSON.stringify({ name: 'editor', request: { id: 7, evil: true } }));
    const { open } = await fresh();
    await act(() => Promise.resolve());
    expect(open.habitEditorRequest.value).toBeNull();
    expect(sessionStorage.getItem('catkin-sheet-retry')).toBeNull();
  });

  it.each([
    ['one opened to find a plant keeps its intent', { id: 'pet-cat-calico', intent: 'findPlant' }, { id: 'pet-cat-calico', intent: 'findPlant' }],
    ['one opened as usual', { id: 'pet-cat-calico' }, { id: 'pet-cat-calico' }],
    ['an unknown intent is dropped', { id: 'pet-cat-calico', intent: 'dance' }, null],
    ['one kept by the build before, as a bare id, opens that pet’s card', 'pet-cat-calico', { id: 'pet-cat-calico' }],
  ])('a kept Pet Card request after a reload (WP-C7): %s', async (_, request, expected) => {
    // Its chunk still can't load, so the request stays as it was asked for again.
    ctl.offline.add('pet');
    sessionStorage.setItem('catkin-sheet-retry', JSON.stringify({ name: 'pet', request }));
    const { open } = await fresh();
    await act(() => Promise.resolve());
    expect(open.petCardRequest.value).toEqual(expected);
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

describe('a shared sheet whose first load takes a moment (WP-C4 follow-up, P-ui-23)', () => {
  it('shows nothing at first, then a small sheet that says so with Close; the sheet asked for opens in its place', async () => {
    const { open, walk } = await fresh();
    const letThrough = hold('detail');
    await act(() => open.openHabitDetail(walk));
    // A quick load answers by itself: nothing flashes up before the delay.
    await pause(SLOW_SHEET_MS / 2);
    expect(dialogs()).toHaveLength(0);
    const sheet = await until(loadingSheet, 'the loading sheet', SLOW_SHEET_MS * 4);
    expect(button('Close')).not.toBeNull();
    expect(errorSheet()).toBeNull();
    expect(dialogs()).toHaveLength(1);
    expect(sheet.querySelector('[aria-busy="true"]')).not.toBeNull();

    await act(() => letThrough());
    await until(() => document.querySelector(`[data-habit-detail="${walk}"]`), 'Walk’s detail', LOAD);
    expect(loadingSheet()).toBeNull();
    expect(dialogs()).toHaveLength(1);
    expect(ctl.attempts.detail).toBe(1);
  });

  it('Close lets the request go; the chunk arriving after opens nothing, and the next request opens at once', async () => {
    const { open, walk } = await fresh();
    const letThrough = hold('detail');
    await act(() => open.openHabitDetail(walk));
    await until(loadingSheet, 'the loading sheet', SLOW_SHEET_MS * 4);
    await click(button('Close'), 'Close');
    expect(open.habitDetailRequest.value).toBeNull();
    // As it slides away it keeps its own words: it never says the load failed.
    let saidFailed = false;
    await until(() => ((saidFailed ||= errorSheet() !== null), !loadingSheet()), 'the loading sheet to go');
    expect(saidFailed).toBe(false);

    await act(() => letThrough());
    await until(() => ctl.attempts.detail === 1, 'the load');
    await pause(SLOW_SHEET_MS + 100);
    expect(dialogs()).toHaveLength(0);
    expect(reloads).not.toHaveBeenCalled();

    await act(() => open.openHabitDetail(walk));
    await until(() => document.querySelector(`[data-habit-detail="${walk}"]`), 'Walk’s detail', LOAD);
    expect(dialogs()).toHaveLength(1);
  });

  it('a slow first load that then fails: the same sheet says it didn’t open, with Try again', async () => {
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    const letThrough = hold('detail');
    await act(() => open.openHabitDetail(walk));
    await until(loadingSheet, 'the loading sheet', SLOW_SHEET_MS * 4);
    await act(() => letThrough());
    const sheet = await until(errorSheet, 'the error sheet', LOAD);
    expect(sheet.textContent).toContain(SCREEN_COPY.sheetText);
    expect(loadingSheet()).toBeNull();
    expect(dialogs()).toHaveLength(1);
    expect(open.habitDetailRequest.value).toBe(walk);
    expect(reloads).not.toHaveBeenCalled();
  });
});

/**
 * The small sheet is the shell's own (`LoadSheet`, so the paper Sheet stays off the first paint);
 * these pin what it has to do as a modal alertdialog, whichever component draws it.
 */
describe('the small sheet, as a dialog (WP-C4, first-paint headroom)', () => {
  /** The layer the small sheet sits in (its dimmed backdrop is the layer's own first child). */
  const layerOf = (el: Element | null) => el?.closest<HTMLElement>('[data-state]') ?? null;

  it('takes focus to Try again as it opens, and gives it back to what had it on Close and on Esc', async () => {
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    const opener = document.createElement('button');
    opener.textContent = 'Walk';
    document.body.append(opener);
    opener.focus();

    await act(() => open.openHabitDetail(walk));
    await until(errorSheet, 'the error sheet', LOAD);
    expect(document.activeElement).toBe(button('Try again'));
    await click(button('Close'), 'Close');
    expect(document.activeElement).toBe(opener);
    await until(() => !errorSheet(), 'the error sheet to go');

    opener.focus();
    await act(() => open.openHabitDetail(walk));
    await until(() => errorSheet() && layerOf(errorSheet())?.getAttribute('data-state') !== 'exit' && document.activeElement === button('Try again'), 'the error sheet again, focused', LOAD);
    await key(document.activeElement!, 'Escape');
    expect(open.habitDetailRequest.value).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('is a modal alertdialog named by its h2 title and described by its line (the slow sheet by its title alone)', async () => {
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    await act(() => open.openHabitDetail(walk));
    const sheet = await until(errorSheet, 'the error sheet', LOAD);
    expect(sheet.getAttribute('aria-modal')).toBe('true');
    const title = document.getElementById(sheet.getAttribute('aria-labelledby') ?? '');
    expect(title?.tagName).toBe('H2');
    expect(title?.textContent).toBe(SCREEN_COPY.sheetTitle);
    expect(document.getElementById(sheet.getAttribute('aria-describedby') ?? '')?.textContent).toBe(SCREEN_COPY.sheetText);
    await click(button('Close'), 'Close');
    await until(() => !errorSheet(), 'the error sheet to go');

    ctl.offline.delete('detail');
    const letThrough = hold('detail');
    await act(() => open.openHabitDetail(walk));
    const slow = await until(loadingSheet, 'the loading sheet', SLOW_SHEET_MS * 4);
    expect(document.getElementById(slow.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(SCREEN_COPY.sheetSlow);
    expect(slow.getAttribute('aria-describedby')).toBeNull();
    await act(() => letThrough());
  });

  it('shows its title once, as that h2 (no second, hidden copy)', async () => {
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    await act(() => open.openHabitDetail(walk));
    const sheet = await until(errorSheet, 'the error sheet', LOAD);
    const withTitle = Array.from(sheet.querySelectorAll('*')).filter((el) => el.children.length === 0 && el.textContent === SCREEN_COPY.sheetTitle);
    expect(withTitle.map((el) => el.tagName)).toEqual(['H2']);
    expect(withTitle[0]!.closest('.sr-only, [aria-hidden="true"]')).toBeNull();
  });

  it('gives the page back when the sheet asked for takes its place: Esc then closes that sheet, and nothing is left inert', async () => {
    const app = document.createElement('div');
    app.id = 'app';
    document.body.append(app);
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    await act(() => open.openHabitDetail(walk));
    await until(errorSheet, 'the error sheet', LOAD);
    expect(app.inert).toBe(true);

    ctl.offline.delete('detail');
    await click(button('Try again'), 'Try again');
    const detail = await until(() => document.querySelector<HTMLElement>(`[data-habit-detail="${walk}"]`), 'Walk’s detail', LOAD);
    expect(layerOf(detail)!.inert).toBe(false);
    await key(document, 'Escape');
    expect(open.habitDetailRequest.value).toBeNull();
    await until(() => dialogs().length === 0, 'the detail to go');
    expect(app.inert).toBe(false);
  });

  it('keeps Tab and Shift+Tab inside it', async () => {
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    await act(() => open.openHabitDetail(walk));
    await until(errorSheet, 'the error sheet', LOAD);
    button('Close')!.focus();
    await key(button('Close')!, 'Tab');
    expect(document.activeElement).toBe(button('Try again'));
    await act(() => void button('Try again')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(button('Close'));
  });

  it('a tap on the dimmed page around it is Close', async () => {
    ctl.offline.add('editor');
    const { open } = await fresh();
    await act(() => open.openHabitEditor());
    const sheet = await until(errorSheet, 'the error sheet', LOAD);
    const backdrop = layerOf(sheet)!.firstElementChild as HTMLElement;
    expect(backdrop.contains(sheet)).toBe(false);
    await click(backdrop, 'the dimmed page');
    expect(open.habitEditorRequest.value).toBeNull();
    await until(() => !errorSheet(), 'the error sheet to go');
  });

  it('over a sheet already open: it is on top, the sheet under it is inert, and Esc closes only it, focus back in the sheet under it', async () => {
    const { open, walk } = await fresh();
    await act(() => open.openHabitDetail(walk));
    const detail = await until(() => document.querySelector<HTMLElement>(`[data-habit-detail="${walk}"]`), 'Walk’s detail', LOAD);
    const detailLayer = layerOf(detail)!;
    await until(() => detailLayer.getAttribute('data-state') === 'open', 'the detail to settle');
    const inside = detail.closest('[role="dialog"]')!.querySelector<HTMLElement>('button')!;
    inside.focus();

    ctl.offline.add('pet');
    await act(() => open.openPetCard('pet-cat-calico'));
    const sheet = await until(errorSheet, 'the error sheet over the detail', LOAD);
    expect(document.activeElement).toBe(button('Try again'));
    expect(detailLayer.inert).toBe(true);
    expect(Number(layerOf(sheet)!.style.zIndex)).toBeGreaterThan(Number(detailLayer.style.zIndex));

    await key(document.activeElement!, 'Escape');
    expect(open.petCardRequest.value).toBeNull();
    expect(open.habitDetailRequest.value).toBe(walk);
    await until(() => !errorSheet(), 'the error sheet to go');
    expect(detailLayer.inert).toBe(false);
    expect(document.activeElement).toBe(inside);
    expect(dialogs()).toHaveLength(1);
  });

  it('dims the page fully when alone, and more lightly (data-over) over a sheet already open', async () => {
    ctl.offline.add('editor');
    const { open, walk } = await fresh();
    await act(() => open.openHabitEditor());
    const alone = await until(errorSheet, 'the error sheet on its own', LOAD);
    expect(layerOf(alone)!.hasAttribute('data-over')).toBe(false);
    await click(button('Close'), 'Close');
    await until(() => !errorSheet(), 'the error sheet to go');

    await act(() => open.openHabitDetail(walk));
    const detail = await until(() => document.querySelector<HTMLElement>(`[data-habit-detail="${walk}"]`), 'Walk’s detail', LOAD);
    await until(() => layerOf(detail)!.getAttribute('data-state') === 'open', 'the detail to settle');
    ctl.offline.add('pet');
    await act(() => open.openPetCard('pet-cat-calico'));
    const over = await until(errorSheet, 'the error sheet over the detail', LOAD);
    expect(layerOf(over)!.hasAttribute('data-over')).toBe(true);
  });

  it('slides away as the paper Sheet does: still there, exiting, just after Close, and gone only after its 320 ms', async () => {
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    await act(() => open.openHabitDetail(walk));
    const sheet = await until(errorSheet, 'the error sheet', LOAD);
    await until(() => errorSheetPhase() === 'open', 'the error sheet to settle');
    const layer = layerOf(sheet)!;
    const t0 = Date.now();
    await click(button('Close'), 'Close');
    expect(layer.isConnected).toBe(true);
    expect(layer.getAttribute('data-state')).toBe('exit');
    await until(() => !layer.isConnected, 'the error sheet to go', LOAD);
    // A busy machine only makes it later; a timer never fires early (a few ms allowed for rounding).
    expect(Date.now() - t0).toBeGreaterThanOrEqual(310);
  });

  it('opens with the paper Sheet’s whoosh, once', async () => {
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    const { sfx } = await import('@/fx/sound');
    const play = vi.spyOn(sfx, 'play');
    await act(() => open.openHabitDetail(walk));
    await until(errorSheet, 'the error sheet', LOAD);
    await until(() => errorSheetPhase() === 'open', 'the error sheet to settle');
    expect(play.mock.calls.filter(([name]) => name === 'whoosh')).toHaveLength(1);
  });

  it('under a layer opened over it: inert, and Esc is not its own until that layer goes', async () => {
    ctl.offline.add('detail');
    const { open, walk } = await fresh();
    const stack = await import('@/ui/sheetStack');
    await act(() => open.openHabitDetail(walk));
    const sheet = await until(errorSheet, 'the error sheet', LOAD);
    const layer = layerOf(sheet)!;
    expect(layer.inert).toBe(false);

    await act(() => stack.pushLayer('test-over'));
    expect(layer.inert).toBe(true);
    await key(document, 'Escape');
    expect(open.habitDetailRequest.value).toBe(walk);
    expect(errorSheetPhase()).not.toBe('exit');

    await act(() => stack.removeLayer('test-over'));
    expect(layer.inert).toBe(false);
    await key(document, 'Escape');
    expect(open.habitDetailRequest.value).toBeNull();
  });
});

describe('its words', () => {
  it('are the VOICE §18 lines (ERRORS.sheet…), copied for the first paint', () => {
    expect(SCREEN_COPY.sheetTitle).toBe(ERRORS.sheet);
    expect(SCREEN_COPY.sheetText).toBe(ERRORS.sheetText);
    expect(SCREEN_COPY.sheetRetry).toBe(ERRORS.sheetRetry);
    expect(SCREEN_COPY.sheetClose).toBe(ERRORS.sheetClose);
    expect(SCREEN_COPY.sheetSlow).toBe(ERRORS.sheetSlow);
  });
});
