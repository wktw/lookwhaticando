// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { DataSection } from '@/features/you/DataSection';
import { DATA } from '@/catalog/lines';
import * as store from '@/state/store';
import { SAVE_KEY } from '@/state/persist';
import { button, click, installDom, mount, until } from '@/features/capsules/testing';
import { fakeBrowser } from './fixtures';
import { toasts } from '@/ui/toast';

beforeAll(() => { installDom(); window.matchMedia ??= (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia; });
let view: ReturnType<typeof mount> | undefined;
afterEach(() => { view?.unmount(); toasts.value = []; vi.restoreAllMocks(); Reflect.deleteProperty(navigator, 'clipboard'); });

it('a clipboard backup completed after erase never marks or persists the fresh state', async () => {
  const b = fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Private journal', templateIds: [] });
  store.flushSaves();
  let release!: () => void;
  let reached!: () => void;
  const writing = new Promise<void>((r) => { reached = r; });
  const gate = new Promise<void>((r) => { release = r; });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
    writeText: async () => { reached(); await gate; },
  } });
  view = mount(<DataSection />);
  await click(button(DATA.copy), 'Copy backup');
  await writing;
  expect(await store.eraseEverything()).toEqual({ ok: true });
  expect(b.storage.getItem(SAVE_KEY)).toBeNull();
  release();
  await until(() => toasts.value.some((t) => t.key === 'backup-copied') || null, 'the deferred clipboard completion');
  b.advance(2000);
  expect(b.storage.getItem(SAVE_KEY)).toBeNull();
  expect(store.state.value.lastBackupAt).toBeUndefined();
});
