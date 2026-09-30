// @vitest-environment jsdom
/**
 * A screen's chunk (ScreenHost, through `loadScreen`) and onboarding's first chunk (App's loader)
 * show an error with "Try again" when they can't load. Chromium keeps a failed module fetch for the
 * life of the page, so a retry that fails in the page reloads it when that is safe (online, outside
 * the demo, every change on disk), as the shared sheets and onboarding's capsule steps do
 * (WP-C4 follow-up, P-ui-22). The tab is in the URL and onboarding's progress is saved, so the
 * reload comes back to what was asked for.
 *
 * Each test starts from a fresh module graph (`vi.resetModules`), so no chunk is already loaded;
 * the screen and onboarding modules are small stand-ins behind a switch that makes their import
 * reject the way a missing chunk does.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { button, click, installDom, mount, until } from '@/features/capsules/testing';
import { createInitialState } from '@/state/defaults';

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

/** Stand-ins for the chunks, behind the switch (registered afresh with each fresh module graph). */
function gateChunks() {
  vi.doMock('@/features/today/TodayScreen', async () => (ctl.gate('today'), { TodayScreen: () => <h1>Today</h1> }));
  vi.doMock('@/features/progress/ProgressScreen', async () => (ctl.gate('progress'), { ProgressScreen: () => <h1>Progress</h1> }));
  vi.doMock('@/features/you/YouScreen', async () => (ctl.gate('you'), { YouScreen: () => <h1>You</h1> }));
  vi.doMock('@/features/onboarding/Onboarding', async () => (ctl.gate('onboarding'), { Onboarding: () => <h1>Hello</h1> }));
}

let view: ReturnType<typeof mount> | null = null;
const LOAD = 20_000;
const reloads = vi.fn();
const h1 = () => document.querySelector('h1')?.textContent ?? null;
const loadError = () => Array.from(document.querySelectorAll('h1, h2, h3')).find((h) => h.textContent === 'This page didn’t load') ?? null;
const loading = () => document.querySelector('[role="status"]');

/** One fresh module graph (a page load), with the reload seam in place and a save onboarded or not. */
async function fresh(onboarded = true) {
  vi.resetModules();
  gateChunks();
  const store = await import('@/state/store');
  const lazy = await import('./useLazyModule');
  lazy.pageReload.run = reloads;
  await act(() => {
    store.state.value = createInitialState(Date.now());
  });
  if (onboarded) store.completeOnboarding({ name: '', templateIds: ['walk'] });
  return { store };
}

beforeAll(() => {
  installDom();
  window.scrollTo = () => undefined;
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

describe('a screen whose chunk can’t load (ScreenHost, P-ui-22)', () => {
  async function screen(tab: 'today' | 'progress' | 'you') {
    const { ScreenHost } = await import('./ScreenHost');
    const { render } = await import('preact');
    const root = document.body.appendChild(document.createElement('main'));
    const show = (t: typeof tab) => act(() => render(<ScreenHost tab={t} />, root));
    /** Its first render only, before any effect has run: what is painted first. */
    const firstFrame = (t: typeof tab) => render(<ScreenHost tab={t} />, root);
    show(tab);
    view = { root, unmount: () => (act(() => render(null, root)), root.remove()) };
    return { show, firstFrame };
  }

  it('shows the error with Try again, and a retry that loads brings the screen', async () => {
    ctl.offline.add('progress');
    await fresh();
    await screen('progress');
    await until(loadError, 'the load error', LOAD);
    ctl.offline.delete('progress');
    await click(button('Try again'), 'Try again');
    await until(() => h1() === 'Progress', 'the Progress screen', LOAD);
    expect(loadError()).toBeNull();
    expect(reloads).not.toHaveBeenCalled();
    expect(ctl.attempts.progress).toBe(2);
  });

  it('a retry that fails in the page reloads it (the tab is in the URL)', async () => {
    // Chromium keeps a failed chunk for the life of the page: importing it again fails at once.
    ctl.offline.add('progress');
    await fresh();
    await screen('progress');
    await until(loadError, 'the load error', LOAD);
    await click(button('Try again'), 'Try again');
    await until(() => reloads.mock.calls.length > 0, 'the reload', LOAD);
    expect(reloads).toHaveBeenCalledTimes(1);
    expect(ctl.attempts.progress).toBe(2);
  });

  it('a first load that fails never reloads by itself', async () => {
    ctl.offline.add('progress');
    await fresh();
    await screen('progress');
    await until(loadError, 'the load error', LOAD);
    await until(() => ctl.attempts.progress === 1 && loadError(), 'the first attempt to settle');
    expect(reloads).not.toHaveBeenCalled();
  });

  it('offline, a failed retry does not reload: the error comes back, until one loads', async () => {
    ctl.offline.add('progress');
    await fresh();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await screen('progress');
    await until(loadError, 'the load error', LOAD);
    await click(button('Try again'), 'Try again');
    await until(() => ctl.attempts.progress === 2 && loadError(), 'the second attempt to fail', LOAD);
    expect(reloads).not.toHaveBeenCalled();

    ctl.offline.delete('progress');
    await click(button('Try again'), 'Try again');
    await until(() => h1() === 'Progress', 'the Progress screen', LOAD);
  });

  it('another tab after a failed one loads as its own (no error carried over), and the failed one loads afresh', async () => {
    ctl.offline.add('progress');
    await fresh();
    const { show, firstFrame } = await screen('progress');
    await until(loadError, 'the load error', LOAD);

    ctl.offline.add('you');
    // The You tab's first frame is loading, not the Progress tab's error.
    firstFrame('you');
    expect(loadError()).toBeNull();
    expect(loading()).not.toBeNull();
    await act(() => show('you'));
    expect(loadError()).toBeNull();
    await until(() => ctl.attempts.you === 1 && loadError(), 'the You tab’s own error', LOAD);

    ctl.offline.clear();
    await act(() => show('progress'));
    expect(loadError()).toBeNull();
    await until(() => h1() === 'Progress', 'the Progress screen', LOAD);
    expect(reloads).not.toHaveBeenCalled();
  });
});

describe('onboarding’s first chunk can’t load (App, P-ui-22)', () => {
  async function app() {
    const { App } = await import('./App');
    view = mount(<App />);
  }

  it('shows the error with Try again, and a retry that loads brings onboarding', async () => {
    ctl.offline.add('onboarding');
    await fresh(false);
    await app();
    await until(loadError, 'the load error', LOAD);
    ctl.offline.delete('onboarding');
    await click(button('Try again'), 'Try again');
    await until(() => h1() === 'Hello', 'onboarding', LOAD);
    expect(loadError()).toBeNull();
    expect(reloads).not.toHaveBeenCalled();
  });

  it('a retry that fails in the page reloads it (onboarding comes back from the save)', async () => {
    ctl.offline.add('onboarding');
    await fresh(false);
    await app();
    await until(loadError, 'the load error', LOAD);
    await click(button('Try again'), 'Try again');
    await until(() => reloads.mock.calls.length > 0, 'the reload', LOAD);
    expect(reloads).toHaveBeenCalledTimes(1);
    expect(ctl.attempts.onboarding).toBe(2);
  });
});
