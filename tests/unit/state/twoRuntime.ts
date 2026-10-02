import { vi } from 'vitest';
import type { KeyValueStorage } from '@/state/persist';
import type { StoreRuntime } from '@/state/store';
import { capturedFrames } from './controlled';
import { fakeBrowser } from './fixtures';

type Store = typeof import('@/state/store');
type Tab = { store: Store; frames: ReturnType<typeof capturedFrames>; events: Array<{ source: number; key: string }>; listeners: Set<(event: Event) => void> };

/** Independent module graphs, shared durable adapters, and a storage-event queue like suspended pages. */
export async function twoRuntime(patches: [Partial<StoreRuntime>, Partial<StoreRuntime>] = [{}, {}]) {
  const browser = fakeBrowser();
  const tabs: Tab[] = [];
  const writes: Array<{ source: number; key: string; value: string }> = [];
  const events: Array<{ target: Tab; source: number; event: Partial<StorageEvent> }> = [];
  for (const patch of patches) {
    vi.resetModules();
    const store = await import('@/state/store');
    const tab: Tab = { store, frames: capturedFrames(), events: [], listeners: new Set() };
    const changed = (key: string, oldValue: string | null, newValue: string | null) => {
      if (oldValue === newValue) return;
      for (const target of tabs) if (target !== tab) events.push({ target, source: tabs.indexOf(tab), event: { key, oldValue, newValue } });
    };
    const storage: KeyValueStorage = {
      get length() { return browser.storage.length; },
      key: (index) => browser.storage.key(index),
      getItem: (key) => browser.storage.getItem(key),
      setItem(key, value) {
        const before = browser.storage.getItem(key);
        browser.storage.setItem(key, value);
        writes.push({ source: tabs.indexOf(tab), key, value });
        changed(key, before, value);
      },
      removeItem(key) {
        const before = browser.storage.getItem(key);
        browser.storage.removeItem(key);
        changed(key, before, null);
      },
    };
    store.configureStore({
      ...browser.runtime, ...patch, storage, afterFrame: tab.frames.afterFrame,
      listen: (_target, type, fn) => {
        if (type === 'storage') tab.listeners.add(fn);
        return () => { tab.listeners.delete(fn); };
      },
    });
    tabs.push(tab);
    store.hydrate();
    store.flushSaves();
  }
  const deliver = (index = 0) => {
    const queued = events.splice(index, 1)[0];
    if (!queued) return;
    queued.target.events.push({ source: queued.source, key: queued.event.key! });
    for (const listener of queued.target.listeners) listener({ type: 'storage', ...queued.event } as Event);
  };
  return {
    tabs: tabs as [Tab, Tab], storage: browser.storage, snapshots: browser.snapshots, writes,
    advance: browser.advance,
    get pendingEvents() { return events.length; },
    deliver,
    deliverAll() { while (events.length) deliver(); },
  };
}
