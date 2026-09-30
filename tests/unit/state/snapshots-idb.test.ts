/**
 * The IndexedDB snapshot adapter against a real IndexedDB implementation (fake-indexeddb, DEC-E2),
 * for WP-A3 in docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md: data-d4 (a write is done when its
 * transaction commits, not when its request succeeds), P-persistence-05 (a failed open is not
 * cached; another connection's versionchange or a blocked open never wedges the adapter), the
 * `durable` capability (FS9) and the result-returning wrappers the store uses (data-d12). Cases
 * marked "failed before" failed against the code before WP-A3 (see the plan's status note).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { createInitialState } from '@/state/defaults';
import * as snaps from '@/state/snapshots';
import { indexedDbSnapshotStore, memorySnapshotStore, snapshotMeta, type SnapshotRecord, type SnapshotStore } from '@/state/snapshots';

let factory: IDBFactory;
beforeEach(() => {
  factory = new IDBFactory();
  vi.stubGlobal('indexedDB', factory);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function record(id: string, name = 'Sam'): SnapshotRecord {
  const s = createInitialState(Date.UTC(2026, 8, 29));
  const state = { ...s, profile: { ...s.profile, name } };
  return { ...snapshotMeta(state, 'pre-import', id, '2026-09-29', Date.UTC(2026, 8, 29, 9), 'test'), state };
}

type Settled<T> = { settled: 'resolved'; value: T } | { settled: 'rejected'; error: unknown } | { settled: 'pending' };

/** How a promise settles within `ms` (a hung adapter reads 'pending'). */
function within<T>(p: Promise<T>, ms = 1000): Promise<Settled<T>> {
  return Promise.race([
    p.then(
      (value): Settled<T> => ({ settled: 'resolved', value }),
      (error): Settled<T> => ({ settled: 'rejected', error }),
    ),
    new Promise<Settled<T>>((r) => setTimeout(() => r({ settled: 'pending' }), ms)),
  ]);
}

/** An open request that never reaches the database: it errors, or reports it is blocked. */
function doomedOpen(how: 'error' | 'blocked'): IDBOpenDBRequest {
  const r = {} as { error?: DOMException; onerror?: (e: Event) => void; onblocked?: (e: Event) => void };
  setTimeout(() => {
    if (how === 'error') {
      r.error = new DOMException('open failed', 'UnknownError');
      r.onerror?.(new Event('error'));
    } else r.onblocked?.(new Event('blocked'));
  }, 0);
  return r as unknown as IDBOpenDBRequest;
}

/** A factory whose first `n` opens go wrong, then the real one. */
function flaky(how: 'error' | 'blocked', n = 1): IDBFactory {
  let left = n;
  return {
    open: (name: string, version?: number) => (left-- > 0 ? doomedOpen(how) : factory.open(name, version)),
    deleteDatabase: (name: string) => factory.deleteDatabase(name),
    cmp: (a: unknown, b: unknown) => factory.cmp(a, b),
    databases: () => factory.databases(),
  } as unknown as IDBFactory;
}

describe('the IndexedDB adapter', () => {
  it('round-trips a copy, and says its copies outlive the page (durable) (failed before)', async () => {
    const store = indexedDbSnapshotStore()!;
    expect(store).not.toBeNull();
    expect(store.durable).toBe(true);
    await store.put(record('a'));
    expect((await store.get('a'))?.state.profile.name).toBe('Sam');
    expect((await store.list()).map((m) => m.id)).toEqual(['a']);
    await store.remove('a');
    expect(await store.get('a')).toBeNull();
  });

  it('a memory store says its copies go with the page, unless a test says otherwise (failed before)', () => {
    expect(memorySnapshotStore().durable).toBe(false);
    expect(memorySnapshotStore({ durable: true }).durable).toBe(true);
  });

  it('data-d4: a put whose request succeeds but whose transaction aborts is rejected, and nothing is kept (failed before)', async () => {
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
      const req = put.apply(this, args);
      // The request succeeds, then the transaction is aborted before it commits (quota, a crash).
      req.addEventListener('success', () => this.transaction.abort());
      return req;
    });
    const store = indexedDbSnapshotStore()!;
    const res = await within(store.put(record('a')));
    expect(res.settled).toBe('rejected');
    vi.restoreAllMocks();
    expect(await store.get('a')).toBeNull();
  });

  it('P-persistence-05: an open that fails once is tried again on the next call (failed before)', async () => {
    vi.stubGlobal('indexedDB', flaky('error'));
    const store = indexedDbSnapshotStore()!;
    expect((await within(store.put(record('a')))).settled).toBe('rejected');
    const again = await within(store.put(record('a')));
    expect(again.settled).toBe('resolved');
    expect((await store.get('a'))?.id).toBe('a');
  });

  it('P-persistence-05: a blocked open answers (rejects) instead of hanging, and the next call opens (failed before)', async () => {
    vi.stubGlobal('indexedDB', flaky('blocked'));
    const store = indexedDbSnapshotStore()!;
    expect((await within(store.put(record('a')))).settled).toBe('rejected');
    expect((await within(store.put(record('a')))).settled).toBe('resolved');
    expect((await store.list()).map((m) => m.id)).toEqual(['a']);
  });

  it('P-persistence-05: versionchange closes the connection, so another window can delete the database, and the adapter reopens it (failed before)', async () => {
    const store = indexedDbSnapshotStore()!;
    await store.put(record('a'));
    const del = factory.deleteDatabase('catkin');
    const outcome = await within(
      new Promise<string>((r) => {
        del.onsuccess = () => r('deleted');
        del.onblocked = () => r('blocked');
      }),
    );
    expect(outcome).toEqual({ settled: 'resolved', value: 'deleted' });
    expect((await within(store.put(record('b')))).settled).toBe('resolved');
    expect((await store.list()).map((m) => m.id)).toEqual(['b']);
  });

  it('P-persistence-05: a newer catkin upgrading the database is not blocked by this one, whose next call answers (failed before)', async () => {
    const store = indexedDbSnapshotStore()!;
    await store.put(record('a'));
    const up = factory.open('catkin', 2);
    const outcome = await within(
      new Promise<string>((r) => {
        up.onsuccess = () => {
          up.result.close();
          r('upgraded');
        };
        up.onblocked = () => r('blocked');
      }),
    );
    expect(outcome).toEqual({ settled: 'resolved', value: 'upgraded' });
    // This build opens version 1, which is now older than the database: it answers (no copy), never hangs.
    expect((await within(store.get('a'))).settled).not.toBe('pending');
  });
});

describe('result-returning wrappers (data-d12, store half)', () => {
  const broken: SnapshotStore = {
    durable: true,
    list: () => Promise.reject(new Error('gone')),
    get: () => Promise.reject(new Error('gone')),
    put: () => Promise.reject(new Error('gone')),
    remove: () => Promise.reject(new Error('gone')),
  };

  it('turn every rejection into { ok: false } (failed before)', async () => {
    const safe = snaps.safely(broken);
    expect(await safe.list()).toEqual({ ok: false, error: 'unavailable' });
    expect(await safe.get('a')).toEqual({ ok: false, error: 'unavailable' });
    expect(await safe.put(record('a'))).toEqual({ ok: false, error: 'unavailable' });
    expect(await safe.remove('a')).toEqual({ ok: false, error: 'unavailable' });
  });

  it('and pass values through (failed before)', async () => {
    const safe = snaps.safely(memorySnapshotStore({ durable: true }));
    expect(await safe.put(record('a'))).toEqual({ ok: true, value: undefined });
    expect(await safe.get('a')).toMatchObject({ ok: true, value: { id: 'a' } });
    expect(await safe.get('b')).toEqual({ ok: true, value: null });
    expect(await safe.list()).toMatchObject({ ok: true, value: [{ id: 'a' }] });
  });
});
