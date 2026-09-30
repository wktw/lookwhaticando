// @vitest-environment jsdom
/** The lazy-module load state (WP-C4): one import at a time, a rejected import forgotten, stale loads ignored. */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { installDom, mount, pause } from '@/features/capsules/testing';
import { demoMode, volatileStorage } from '@/state/store';
import { lazyModule, pageReload, useLazyModule, type LazyModule, type LazyState } from './useLazyModule';

type Mod = { name: string };

/** An importer the test settles by hand, counting its calls. */
function importer() {
  const calls: { resolve: (m: Mod) => void; reject: (e: unknown) => void }[] = [];
  const load = () => new Promise<Mod>((resolve, reject) => void calls.push({ resolve, reject }));
  return { calls, load };
}

let seen: LazyState<Mod> | null = null;
function Probe({ mod, wanted }: { mod: LazyModule<Mod>; wanted: boolean }) {
  seen = useLazyModule(mod, wanted);
  return <p data-status={seen.status}>{seen.module?.name ?? ''}</p>;
}

const reloads = vi.fn();
beforeAll(() => {
  installDom();
  pageReload.run = reloads;
});
beforeEach(() => reloads.mockClear());
afterEach(() => {
  delete (navigator as { onLine?: boolean }).onLine;
  demoMode.value = false;
  volatileStorage.value = false;
});

describe('lazyModule', () => {
  it('imports once, shares the load in flight, and keeps what loaded', async () => {
    const imp = importer();
    const mod = lazyModule(imp.load);
    const a = mod.load();
    const b = mod.load();
    expect(imp.calls).toHaveLength(1);
    imp.calls[0]!.resolve({ name: 'sheet' });
    expect(await a).toEqual({ name: 'sheet' });
    expect(await b).toBe(await a);
    expect(mod.current()).toEqual({ name: 'sheet' });
    await mod.load();
    expect(imp.calls).toHaveLength(1);
  });

  it('forgets a rejected import, so the next load tries again', async () => {
    const imp = importer();
    const mod = lazyModule(imp.load);
    const a = mod.load();
    imp.calls[0]!.reject(new TypeError('Failed to fetch dynamically imported module'));
    await expect(a).rejects.toThrow(TypeError);
    expect(mod.current()).toBeNull();
    const b = mod.load();
    expect(imp.calls).toHaveLength(2);
    imp.calls[1]!.resolve({ name: 'sheet' });
    expect(await b).toEqual({ name: 'sheet' });
  });
});

describe('useLazyModule', () => {
  it('idle until wanted; loading; error; retrying; ready', async () => {
    const imp = importer();
    const mod = lazyModule(imp.load);
    const view = mount(<Probe mod={mod} wanted={false} />);
    expect(seen!.status).toBe('idle');
    expect(imp.calls).toHaveLength(0);

    view.unmount();
    const v2 = mount(<Probe mod={mod} wanted />);
    expect(seen!.status).toBe('loading');
    await act(() => imp.calls[0]!.reject(new Error('offline')));
    await pause(0);
    expect(seen!.status).toBe('error');
    expect(seen!.retrying).toBe(false);

    await act(() => seen!.retry());
    expect(seen!.status).toBe('loading');
    expect(seen!.retrying).toBe(true);
    expect(imp.calls).toHaveLength(2);
    await act(() => imp.calls[1]!.resolve({ name: 'sheet' }));
    await pause(0);
    expect(seen!.status).toBe('ready');
    expect(seen!.retrying).toBe(false);
    expect(v2.root.textContent).toBe('sheet');
    v2.unmount();

    // Loaded once, it is there at once for the next component that wants it.
    const v3 = mount(<Probe mod={mod} wanted />);
    expect(seen!.status).toBe('ready');
    expect(imp.calls).toHaveLength(2);
    v3.unmount();
  });

  it('a load that settles after it stopped being wanted changes nothing; wanted again, it loads afresh', async () => {
    const imp = importer();
    const mod = lazyModule(imp.load);
    const root = document.createElement('div');
    document.body.append(root);
    await act(() => render(<Probe mod={mod} wanted />, root));
    expect(seen!.status).toBe('loading');
    await act(() => render(<Probe mod={mod} wanted={false} />, root));
    expect(seen!.status).toBe('idle');
    await act(() => imp.calls[0]!.reject(new Error('offline')));
    await pause(0);
    // The stale failure is not this component's error to show.
    expect(seen!.status).toBe('idle');

    await act(() => render(<Probe mod={mod} wanted />, root));
    expect(seen!.status).toBe('loading');
    // A fresh first load, not a retry: the stale failure left no count behind.
    expect(seen!.retrying).toBe(false);
    expect(imp.calls).toHaveLength(2);
    await act(() => imp.calls[1]!.resolve({ name: 'sheet' }));
    await pause(0);
    expect(seen!.status).toBe('ready');
    await act(() => render(null, root));
    root.remove();
  });

  it('an error is forgotten when it is no longer wanted', async () => {
    const imp = importer();
    const mod = lazyModule(imp.load);
    const root = document.createElement('div');
    document.body.append(root);
    await act(() => render(<Probe mod={mod} wanted />, root));
    await act(() => imp.calls[0]!.reject(new Error('offline')));
    await pause(0);
    expect(seen!.status).toBe('error');
    await act(() => render(<Probe mod={mod} wanted={false} />, root));
    expect(seen!.status).toBe('idle');
    await act(() => render(<Probe mod={mod} wanted />, root));
    expect(seen!.status).toBe('loading');
    expect(seen!.retrying).toBe(false);
    await act(() => render(null, root));
    root.remove();
  });

  it('a first load that fails never reloads; a retry that fails reloads the page, once', async () => {
    const imp = importer();
    const mod = lazyModule(imp.load);
    const before = vi.fn();
    const Retry = () => {
      seen = useLazyModule(mod, true, { beforeReload: before });
      return null;
    };
    const view = mount(<Retry />);
    await act(() => imp.calls[0]!.reject(new Error('offline')));
    await pause(0);
    expect(seen!.status).toBe('error');
    expect(reloads).not.toHaveBeenCalled();

    await act(() => seen!.retry());
    await act(() => imp.calls[1]!.reject(new Error('still cached as failed')));
    await pause(0);
    expect(before).toHaveBeenCalledTimes(1);
    expect(reloads).toHaveBeenCalledTimes(1);
    // Busy until the page goes.
    expect(seen!.retrying).toBe(true);
    view.unmount();
  });

  it('a retry that fails after it stopped being wanted does not reload, and leaves no failure behind', async () => {
    // Try again, then Close while it is busy, then that retry fails: she chose Close.
    const imp = importer();
    const mod = lazyModule(imp.load);
    const before = vi.fn();
    const Retry = ({ wanted }: { wanted: boolean }) => {
      seen = useLazyModule(mod, wanted, { beforeReload: before });
      return null;
    };
    const root = document.createElement('div');
    document.body.append(root);
    await act(() => render(<Retry wanted />, root));
    await act(() => imp.calls[0]!.reject(new Error('offline')));
    await pause(0);
    expect(seen!.status).toBe('error');
    await act(() => seen!.retry());
    expect(seen!.retrying).toBe(true);
    await act(() => render(<Retry wanted={false} />, root));
    await act(() => imp.calls[1]!.reject(new Error('still cached as failed')));
    await pause(0);
    expect(reloads).not.toHaveBeenCalled();
    expect(before).not.toHaveBeenCalled();
    expect(seen!.status).toBe('idle');

    // Asked for again, it is a first load: loading, not a busy retry.
    await act(() => render(<Retry wanted />, root));
    expect(seen!.status).toBe('loading');
    expect(seen!.retrying).toBe(false);
    expect(imp.calls).toHaveLength(3);
    await act(() => render(null, root));
    root.remove();
  });

  // A reload would lose what lives only in this page: changes not on disk (here, a save with no
  // persistent storage at all), or the demo peek.
  it.each([
    ['with changes that are not on disk', () => (volatileStorage.value = true)],
    ['in the demo', () => (demoMode.value = true)],
  ])('%s, a retry that fails shows the error again instead of reloading', async (_, set) => {
    set();
    const imp = importer();
    const mod = lazyModule(imp.load);
    const before = vi.fn();
    const Retry = () => {
      seen = useLazyModule(mod, true, { beforeReload: before });
      return null;
    };
    const view = mount(<Retry />);
    await act(() => imp.calls[0]!.reject(new Error('offline')));
    await pause(0);
    await act(() => seen!.retry());
    await act(() => imp.calls[1]!.reject(new Error('still cached as failed')));
    await pause(0);
    expect(reloads).not.toHaveBeenCalled();
    expect(before).not.toHaveBeenCalled();
    expect(seen!.status).toBe('error');
    expect(seen!.retrying).toBe(false);
    view.unmount();
  });

  it('offline, a retry that fails shows the error again instead of reloading', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const imp = importer();
    const mod = lazyModule(imp.load);
    const view = mount(<Probe mod={mod} wanted />);
    await act(() => imp.calls[0]!.reject(new Error('offline')));
    await pause(0);
    await act(() => seen!.retry());
    await act(() => imp.calls[1]!.reject(new Error('offline')));
    await pause(0);
    expect(reloads).not.toHaveBeenCalled();
    expect(seen!.status).toBe('error');
    view.unmount();
  });
});
