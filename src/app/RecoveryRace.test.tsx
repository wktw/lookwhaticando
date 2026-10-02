// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { button, click, installDom, mount, until } from '@/features/capsules/testing';

let view: ReturnType<typeof mount> | undefined;
let liveStore: typeof import('@/state/store') | undefined;
beforeAll(installDom);
afterEach(() => { view?.unmount(); liveStore?.configureStore({ storage: null, locks: null }); localStorage.clear(); sessionStorage.clear(); vi.resetModules(); });
async function setup() {
  vi.resetModules();
  let resolve!: (value: unknown) => void;
  let reject!: (value: unknown) => void;
  const gate = new Promise((r, no) => { resolve = r; reject = no; });
  const backup = vi.fn(async () => undefined);
  const damaged = vi.fn(async () => undefined);
  vi.doMock('@/features/you/recovery', () => gate);
  const store = await import('@/state/store'); liveStore = store;
  store.configureStore({ storage: localStorage, snapshots: null, locks: null, listen: null });
  store.hydrate(); store.completeOnboarding({ name: 'Sam', templateIds: [] }); store.flushSaves();
  const host = await import('./RecoveryHost');
  const persist = await import('@/state/persist');
  const loaded = () => resolve({ RecoverySheets: ({ open }: { open: string | null }) => <div data-recovery={open ?? ''} />, saveBackupNow: backup, saveDamagedFile: damaged });
  return { store, host, persist, loaded, reject, backup, damaged };
}

it.each(['backup', 'damaged', 'snapshots', 'import'] as const)('a delayed %s request cannot cross a save epoch', async (kind) => {
  const x = await setup();
  view = mount(<x.host.RecoveryHost />);
  await act(() => x.host.requestRecovery(kind));
  await act(() => { x.store.saveEpoch.value++; x.loaded(); });
  await act(() => new Promise((r) => setTimeout(r, 50)));
  expect(x.backup).not.toHaveBeenCalled(); expect(x.damaged).not.toHaveBeenCalled();
  expect(document.querySelector('[data-recovery="snapshots"], [data-recovery="import"]')).toBeNull();
});

it('closing recovery before its import resolves cancels its eventual action', async () => {
  const x = await setup();
  view = mount(<x.host.RecoveryHost />);
  await act(() => x.host.requestRecovery('backup'));
  await until(() => document.querySelector('[role="alertdialog"]'), 'loading recovery');
  await click(button('Close'), 'Close');
  await act(() => x.loaded());
  await act(() => new Promise((r) => setTimeout(r, 50)));
  expect(x.backup).not.toHaveBeenCalled();
});

it.each(['same', 'revision', 'lineage', 'malformed'] as const)('a reload intent resumes only its durable head: %s', async (change) => {
  const x = await setup();
  const head = x.persist.peekHead(localStorage, x.persist.SAVE_KEY)!;
  sessionStorage.setItem('catkin-recovery-retry', change === 'malformed' ? '{not-json' : JSON.stringify({ kind: 'import', head }));
  if (change === 'revision') localStorage.setItem(x.persist.SAVE_KEY, x.persist.encodeEnvelope(x.store.state.value, head.rev + 1, Date.now(), 'test', head.gen));
  if (change === 'lineage') localStorage.setItem(x.persist.SAVE_KEY, x.persist.encodeEnvelope(x.store.state.value, head.rev, Date.now(), 'test', x.persist.mintGen()));
  view = mount(<x.host.RecoveryHost />);
  await act(() => x.loaded());
  await act(() => new Promise((r) => setTimeout(r, 50)));
  expect(document.querySelector('[data-recovery="import"]') !== null).toBe(change === 'same');
  expect(sessionStorage.getItem('catkin-recovery-retry')).toBeNull();
});

it('a second failed chunk fetch retains only the requested kind and current durable head before reload', async () => {
  const x = await setup();
  const lazy = await import('./useLazyModule');
  const reload = vi.spyOn(lazy.pageReload, 'run').mockImplementation(() => undefined);
  view = mount(<x.host.RecoveryHost />);
  await act(() => x.host.requestRecovery('snapshots'));
  await act(() => x.reject(new Error('chunk failed')));
  await until(() => button('Try again') && button('Try again')!.getAttribute('aria-disabled') !== 'true', 'enabled retry');
  expect(reload).not.toHaveBeenCalled();
  expect(x.store.hasUnsavedWork()).toBe(false);
  expect(x.store.demoMode.value).toBe(false);
  expect(navigator.onLine).toBe(true);
  await click(button('Try again'), 'retry');
  await until(() => reload.mock.calls.length > 0, 'safe reload');
  expect(JSON.parse(sessionStorage.getItem('catkin-recovery-retry')!)).toEqual({ kind: 'snapshots', head: x.persist.peekHead(localStorage, x.persist.SAVE_KEY) });
  reload.mockRestore();
});
