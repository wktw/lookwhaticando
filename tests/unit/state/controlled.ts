/** Test adapters with explicit fault/release controls; the real store still runs every operation. */
import type { KeyValueStorage } from '@/state/persist';
import type { SnapshotStore } from '@/state/snapshots';

export function capturedFrames() {
  const pending: Array<() => void> = [];
  return {
    afterFrame: (fn: () => void) => { pending.push(fn); },
    get pending() { return pending.length; },
    // Work scheduled during this frame belongs to the next one.
    flush: () => { for (const fn of pending.splice(0)) fn(); },
  };
}

type StorageMethod = 'getItem' | 'setItem' | 'removeItem';
type StorageFault = { key?: string; times?: number; name?: string };
export function faultStorage(inner: KeyValueStorage) {
  const faults = new Map<StorageMethod, StorageFault>();
  const quotas = new Map<string, number>();
  const check = (method: StorageMethod, key: string) => {
    const fault = faults.get(method);
    if (!fault || (fault.key !== undefined && fault.key !== key)) return;
    if (fault.times !== undefined && --fault.times <= 0) faults.delete(method);
    throw new DOMException(`injected ${method} failure`, fault.name ?? 'SecurityError');
  };
  const storage: KeyValueStorage = {
    get length() { return inner.length; },
    key: (index) => inner.key(index),
    getItem(key) { check('getItem', key); return inner.getItem(key); },
    setItem(key, value) {
      check('setItem', key);
      if (value.length > (quotas.get(key) ?? Infinity)) throw new DOMException('injected key quota', 'QuotaExceededError');
      inner.setItem(key, value);
    },
    removeItem(key) { check('removeItem', key); inner.removeItem(key); },
  };
  return {
    storage,
    fail(method: StorageMethod, fault: StorageFault = {}) { faults.set(method, { ...fault }); },
    quota(key: string, chars: number) { quotas.set(key, chars); },
    heal() { faults.clear(); quotas.clear(); },
  };
}

type SnapshotMethod = 'list' | 'get' | 'put' | 'remove' | 'erase';
type Gate = { reached: () => void; wait: Promise<void>; phase: 'before' | 'after' };
export function controlledSnapshots(inner: SnapshotStore) {
  const gates = new Map<SnapshotMethod, Gate[]>();
  const faults = new Map<SnapshotMethod, number>();
  const wrap = <K extends SnapshotMethod>(method: K) => async (...args: unknown[]) => {
    // Reserve the gate at invocation, before the inner promise settles, so concurrent calls
    // cannot accidentally consume the same gate or a gate intended for the next invocation.
    const gate = gates.get(method)?.shift();
    const wait = async () => { gate!.reached(); await gate!.wait; };
    if (gate?.phase === 'before') await wait();
    const remaining = faults.get(method) ?? 0;
    if (remaining > 0) {
      faults.set(method, remaining - 1);
      throw new Error(`injected snapshot ${method} failure`);
    }
    const out = await (inner[method] as (...a: unknown[]) => Promise<unknown>).apply(inner, args);
    if (gate?.phase === 'after') await wait();
    return out;
  };
  const store = {
    get durable() { return inner.durable; },
    list: wrap('list'), get: wrap('get'), put: wrap('put'), remove: wrap('remove'),
    ...(inner.erase ? { erase: wrap('erase') } : {}),
  } as SnapshotStore;
  return {
    store,
    hold(method: SnapshotMethod, phase: 'before' | 'after' = 'after') {
      let reached!: () => void;
      let release!: () => void;
      const hit = new Promise<void>((resolve) => { reached = resolve; });
      const wait = new Promise<void>((resolve) => { release = resolve; });
      const queue = gates.get(method) ?? [];
      queue.push({ reached, wait, phase });
      gates.set(method, queue);
      return { reached: hit, release };
    },
    fail(method: SnapshotMethod, times = 1) { faults.set(method, times); },
  };
}
