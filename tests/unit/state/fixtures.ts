/** A fully fake browser for store tests: memory storage, snapshots, a manual clock and timers. */
import { configureStore, type LockManagerLike, type StoreRuntime } from '@/state/store';
import { memoryStorage } from '@/state/persist';
import { memorySnapshotStore } from '@/state/snapshots';
import { mulberry32 } from '@/domain/rng';
import { UTC, at } from '../domain/game';

export interface FakeBrowser {
  storage: ReturnType<typeof memoryStorage>;
  snapshots: ReturnType<typeof memorySnapshotStore>;
  clock: { now: number };
  /** Runs due timeouts (debounced saves) and interval ticks as if `ms` passed. */
  advance(ms: number): void;
  /** Fires a DOM event registered through `listen`. */
  fire(type: string, event?: Partial<StorageEvent>): void;
  runtime: StoreRuntime;
}

export function fakeBrowser(opts: { start?: string; hour?: number; quotaChars?: number; locks?: LockManagerLike | null; seed?: number } = {}): FakeBrowser {
  const storage = memoryStorage({}, opts.quotaChars ?? Infinity);
  // A stand-in for IndexedDB: its copies count as durable (outliving the page), as IndexedDB's do.
  const snapshots = memorySnapshotStore({ durable: true });
  const clock = { now: at(opts.start ?? '2026-09-29', opts.hour ?? 9) };
  let nextId = 1;
  const timeouts = new Map<number, { at: number; fn: () => void }>();
  const intervals = new Map<number, { every: number; next: number; fn: () => void }>();
  const listeners = new Map<string, Set<(e: Event) => void>>();
  const runtime: StoreRuntime = {
    storage,
    snapshots,
    now: () => clock.now,
    local: UTC,
    rng: mulberry32(opts.seed ?? 1),
    timers: {
      setTimeout: (fn, ms) => {
        const id = nextId++;
        timeouts.set(id, { at: clock.now + ms, fn });
        return id;
      },
      clearTimeout: (h) => void timeouts.delete(h as number),
      setInterval: (fn, ms) => {
        const id = nextId++;
        intervals.set(id, { every: ms, next: clock.now + ms, fn });
        return id;
      },
      clearInterval: (h) => void intervals.delete(h as number),
    },
    locks: opts.locks ?? null,
    listen: (_target, type, fn) => {
      const set = listeners.get(type) ?? new Set();
      set.add(fn);
      listeners.set(type, set);
      return () => set.delete(fn);
    },
    hidden: () => false,
    standalone: () => false,
    persistStorage: () => undefined,
    appVersion: 'test',
    device: 'Test · Node',
    // The next frame is 16 ms away on this clock.
    afterFrame: (fn) => void runtime.timers.setTimeout(fn, 16),
  };
  configureStore(runtime);
  return {
    storage,
    snapshots,
    clock,
    runtime,
    advance(ms: number) {
      const end = clock.now + ms;
      for (;;) {
        const due = [...timeouts.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        const tick = [...intervals.values()].filter((i) => i.next <= end).sort((a, b) => a.next - b.next)[0];
        if (!due && !tick) break;
        if (due && (!tick || due[1].at <= tick.next)) {
          clock.now = Math.max(clock.now, due[1].at);
          timeouts.delete(due[0]);
          due[1].fn();
        } else if (tick) {
          clock.now = Math.max(clock.now, tick.next);
          tick.next += tick.every;
          tick.fn();
        }
      }
      clock.now = end;
    },
    fire(type: string, event: Partial<StorageEvent> = {}) {
      for (const fn of listeners.get(type) ?? []) fn({ type, ...event } as unknown as Event);
    },
  };
}

/** A Web Locks stand-in: `held` decides whether `ifAvailable` requests are granted. */
export function fakeLocks(held: { byOther: boolean }): LockManagerLike & { stolen: () => void } {
  let reject: ((e: unknown) => void) | null = null;
  return {
    request(_name, options, callback) {
      if (options.ifAvailable && held.byOther) return Promise.resolve(callback(null));
      held.byOther = false;
      return new Promise((resolve, rej) => {
        reject = rej;
        void Promise.resolve(callback({ name: 'lock' })).then(resolve);
      });
    },
    stolen() {
      held.byOther = true;
      reject?.(new DOMException('stolen', 'AbortError'));
    },
  };
}

/**
 * A Web Locks stand-in that answers only when the test says so, so the window between asking for
 * the writer lock and getting it (saves held) can be exercised.
 */
export function deferredLocks(): LockManagerLike & { grant(): Promise<void>; refuse(): Promise<void>; steal(): Promise<void>; asked: number } {
  let answer: ((lock: unknown) => void) | null = null;
  let reject: ((e: unknown) => void) | null = null;
  const settle = () => new Promise<void>((r) => setTimeout(r, 0));
  const locks = {
    asked: 0,
    request(_name: string, _options: { ifAvailable?: boolean; steal?: boolean }, callback: (lock: unknown) => Promise<unknown> | unknown) {
      locks.asked++;
      return new Promise<unknown>((resolve, rej) => {
        reject = rej;
        answer = (lock) => void Promise.resolve(callback(lock)).then(resolve, rej);
      });
    },
    async grant() {
      const respond = answer;
      answer = null;
      respond?.({ name: 'lock' });
      await settle();
    },
    async refuse() {
      const respond = answer;
      answer = null;
      respond?.(null);
      await settle();
    },
    async steal() {
      reject?.(new DOMException('stolen', 'AbortError'));
      await settle();
    },
  };
  return locks;
}

/** Makes chosen keys' writes throw (a full disk, or storage that went away) until `heal()`. */
export function failWrites(storage: ReturnType<typeof memoryStorage>, how: 'quota' | 'error', keys?: readonly string[]): { heal(): void } {
  const setItem = storage.setItem.bind(storage);
  let failing = true;
  storage.setItem = (k: string, v: string) => {
    if (failing && (!keys || keys.includes(k))) {
      const e = new Error(how) as Error & { name: string };
      e.name = how === 'quota' ? 'QuotaExceededError' : 'SecurityError';
      throw e;
    }
    setItem(k, v);
  };
  return {
    heal() {
      failing = false;
    },
  };
}
