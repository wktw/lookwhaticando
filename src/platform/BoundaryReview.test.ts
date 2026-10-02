// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { copyLater, readImportFile, saveFile } from '@/features/you/files';
import { getPlatform, setPlatform, type LifecycleEvent } from './capabilities';
import * as store from '@/state/store';
import { fakeBrowser } from '../../tests/unit/state/fixtures';
import { registerServiceWorker, pageReload, updateReady } from '@/app/pwa';

const box = vi.hoisted(() => ({ skip: vi.fn(), registration: { waiting: {} }, listeners: new Map<string, (e: unknown) => void>() }));
vi.mock('workbox-window', () => ({ Workbox: class {
  addEventListener(name: string, fn: (e: unknown) => void) { box.listeners.set(name, fn); }
  messageSkipWaiting() { box.skip(); }
  async register() { return box.registration; }
} }));
let restore: (() => void) | undefined;
afterEach(() => { restore?.(); restore = undefined; store.configureStore({ locks: null }); updateReady.value = false; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

it('the real web clipboard write begins inside the caller’s gesture while the backup text is still pending', async () => {
  let finish!: (value: string) => void;
  const text = new Promise<string>((resolve) => { finish = resolve; });
  class Item { constructor(public contents: Record<string, Promise<Blob>>) {} }
  vi.stubGlobal('ClipboardItem', Item);
  const write = vi.fn(async (items: Item[]) => { await items[0]!.contents['text/plain']; });
  vi.stubGlobal('navigator', { clipboard: { write } });
  const result = copyLater(text);
  expect(write).toHaveBeenCalledTimes(1);
  finish('a pending backup');
  await expect(result).resolves.toBe(true);
});

it('the real web share starts synchronously and its cancellation never becomes a download', async () => {
  let cancel!: (error: Error) => void;
  const shared = new Promise<void>((_, reject) => { cancel = reject; });
  const share = vi.fn(() => shared);
  vi.stubGlobal('navigator', { canShare: () => true, share });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const anchor = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const result = saveFile('backup.json', '{}');
  expect(share).toHaveBeenCalledTimes(1);
  cancel(new DOMException('cancelled', 'AbortError'));
  await expect(result).resolves.toBe('cancelled');
  expect(anchor).not.toHaveBeenCalled();
});

it('a platform ceiling rejects a file before opening its stream even when a caller asks for more', async () => {
  const base = getPlatform();
  restore = setPlatform({ files: { ...base.files, maxImportBytes: 2 } });
  const stream = vi.fn(() => { throw new Error('must not read'); });
  await expect(readImportFile({ size: 3, stream } as unknown as File, { maxBytes: 100 })).resolves.toEqual({ ok: false, error: 'too-large' });
  expect(stream).not.toHaveBeenCalled();
});

it('a pause callback cannot auto-apply an update after a later pause listener makes an unsaved edit', async () => {
  vi.useFakeTimers();
  vi.stubEnv('DEV', false);
  vi.stubGlobal('navigator', { serviceWorker: {} });
  const b = fakeBrowser(); store.hydrate(); store.completeOnboarding({ name: 'Before', templateIds: [] }); b.advance(1000);
  const listeners: Array<(event: LifecycleEvent) => void> = [];
  let hidden = true;
  restore = setPlatform({ lifecycle: { get hidden() { return hidden; }, subscribe(fn) { listeners.push(fn); return () => {}; } } });
  const reload = vi.spyOn(pageReload, 'run').mockImplementation(() => {});
  await registerServiceWorker();
  expect(updateReady.value).toBe(true);
  listeners[0]!('pause');
  store.setName('After');
  expect(store.hasUnsavedWork()).toBe(true);
  vi.advanceTimersByTime(0);
  expect(box.skip).not.toHaveBeenCalled(); expect(reload).not.toHaveBeenCalled();
  store.flushSaves();
  expect(store.hasUnsavedWork()).toBe(false);
  listeners[0]!('pause'); hidden = false;
  vi.advanceTimersByTime(0);
  expect(box.skip).not.toHaveBeenCalled();
  hidden = true; listeners[0]!('pause');
  vi.advanceTimersByTime(0);
  expect(box.skip).toHaveBeenCalledTimes(1);
});
