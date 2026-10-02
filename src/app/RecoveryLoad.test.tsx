// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { button, click, installDom, mount, until } from '@/features/capsules/testing';

const control = vi.hoisted(() => ({ fail: true, attempts: 0 }));
let view: ReturnType<typeof mount> | null = null;
let liveStore: typeof import('@/state/store') | null = null;
beforeAll(installDom);
afterEach(() => { view?.unmount(); view = null; liveStore?.flushSaves(); document.body.innerHTML = ''; });

it('a shell recovery chunk failure keeps its request visible and Try again opens Daily copies', async () => {
  vi.resetModules();
  control.fail = true; control.attempts = 0;
  vi.doMock('@/features/you/recovery', async (original) => {
    control.attempts++;
    if (control.fail) throw new TypeError('Failed to fetch dynamically imported module: recovery');
    return original();
  });
  const store = await import('@/state/store');
  liveStore = store;
  const { memoryStorage } = await import('@/state/persist');
  const { memorySnapshotStore } = await import('@/state/snapshots');
  store.configureStore({ storage: memoryStorage(), snapshots: memorySnapshotStore(), locks: null });
  store.hydrate();
  store.loadIssue.value = { kind: 'corrupt-save' };
  const { ShellBanners } = await import('./App');
  view = mount(<ShellBanners />);
  await click(button('Daily copies'), 'Daily copies');
  await until(() => document.querySelector('[role="alertdialog"]'), 'the recovery load error', 2000);
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain('This didn’t open');
  control.fail = false;
  await click(button('Try again'), 'Try again');
  await until(() => document.querySelector('[role="dialog"]'), 'Daily copies');
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Daily copies');
  expect(control.attempts).toBeGreaterThanOrEqual(2);
  await act(() => Promise.resolve());
}, 30_000);
