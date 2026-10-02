// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setPlatform } from './capabilities';
import { checkForUpdates, registerServiceWorker, updateReady } from '@/app/pwa';
import { toasts } from '@/ui/toast';

const worker = vi.hoisted(() => {
  const handlers = new Map<string, (event: { isUpdate?: boolean }) => void>();
  return { handlers, registration: { waiting: null, update: vi.fn(async () => {}) }, construct: vi.fn(), register: vi.fn() };
});
vi.mock('workbox-window', () => ({ Workbox: class {
  constructor() { worker.construct(); }
  addEventListener(name: string, callback: (event: { isUpdate?: boolean }) => void) { worker.handlers.set(name, callback); }
  async register() { worker.register(); return worker.registration; }
} }));
let restore: (() => void) | undefined;
afterEach(() => { restore?.(); restore = undefined; toasts.value = []; updateReady.value = false; vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('capability-gated web updates', () => {
  it('does not register a worker or offer updates in an injected native installation', async () => {
    vi.stubEnv('DEV', false);
    vi.stubGlobal('navigator', { serviceWorker: {} });
    restore = setPlatform({ install: 'native' });
    await registerServiceWorker();
    expect(worker.construct).not.toHaveBeenCalled();
    expect(toasts.value).toEqual([]);
    expect(updateReady.value).toBe(false);
  });

  it('the web adapter still registers, checks and offers a waiting version; bundle callbacks cannot offer it', async () => {
    vi.stubEnv('DEV', false);
    vi.stubGlobal('navigator', { serviceWorker: {} });
    const subscribe = vi.fn(() => () => {});
    restore = setPlatform({ lifecycle: { hidden: false, subscribe } });
    await registerServiceWorker();
    expect(worker.register).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);
    await expect(checkForUpdates()).resolves.toBe('up-to-date');
    expect(worker.registration.update).toHaveBeenCalledTimes(1);
    worker.handlers.get('waiting')!({});
    expect(updateReady.value).toBe(true);
    expect(toasts.value.some((toast) => toast.key === 'sw-update')).toBe(true);
    toasts.value = []; updateReady.value = false;
    const restoreBundle = setPlatform({ updates: 'bundle' });
    try {
      worker.handlers.get('waiting')!({});
      worker.handlers.get('installed')!({ isUpdate: false });
      expect(updateReady.value).toBe(false);
      expect(toasts.value).toEqual([]);
      await expect(checkForUpdates()).resolves.toBe('unavailable');
    } finally { restoreBundle(); }
  });
});
