import { describe, expect, it } from 'vitest';
import { memoryStorage } from '@/state/persist';
import { memorySnapshotStore, snapshotMeta } from '@/state/snapshots';
import { createInitialState } from '@/state/defaults';
import { capturedFrames, controlledSnapshots, faultStorage } from './controlled';
import { deferredLocks } from './fixtures';

describe('controlled browser adapters (WP-04)', () => {
  it('captures frames in order and leaves newly scheduled work for its own frame', () => {
    const frames = capturedFrames();
    const seen: number[] = [];
    frames.afterFrame(() => { seen.push(1); frames.afterFrame(() => seen.push(3)); });
    frames.afterFrame(() => seen.push(2));
    expect(seen).toEqual([]);
    expect(frames.pending).toBe(2);
    frames.flush();
    expect(seen).toEqual([1, 2]);
    expect(frames.pending).toBe(1);
    frames.flush();
    expect(seen).toEqual([1, 2, 3]);
  });

  it('faults only the selected key/method, then recovers after the requested call count', () => {
    const disk = faultStorage(memoryStorage({ a: 'old' }));
    disk.fail('setItem', { key: 'a', times: 2, name: 'QuotaExceededError' });
    disk.storage.setItem('b', 'safe');
    for (let i = 0; i < 2; i++) expect(() => disk.storage.setItem('a', 'new')).toThrow(/injected/);
    expect(disk.storage.getItem('a')).toBe('old');
    disk.storage.setItem('a', 'new');
    expect(disk.storage.getItem('a')).toBe('new');
    disk.fail('getItem', { key: 'a' });
    expect(() => disk.storage.getItem('a')).toThrow(/injected/);
    expect(disk.storage.getItem('b')).toBe('safe');
    disk.heal();
    expect(disk.storage.getItem('a')).toBe('new');
  });

  it('enforces independent key quotas without blocking deletion or another key', () => {
    const disk = faultStorage(memoryStorage());
    disk.quota('a', 3);
    disk.storage.setItem('a', '123');
    expect(() => disk.storage.setItem('a', '1234')).toThrow(/quota/);
    expect(disk.storage.getItem('a')).toBe('123');
    disk.storage.setItem('b', '1234');
    disk.storage.removeItem('a');
    expect(disk.storage.getItem('a')).toBeNull();
    expect(disk.storage.getItem('b')).toBe('1234');
  });

  it('can grant, steal, then refuse separate lock requests in the order asked', async () => {
    const locks = deferredLocks();
    const seen: string[] = [];
    const first = locks.request('save', {}, (lock) => { seen.push(lock ? 'granted' : 'refused'); return new Promise(() => {}); });
    const outcome = first.catch((e: Error) => e.name);
    expect(seen).toEqual([]);
    await locks.grant();
    expect(seen).toEqual(['granted']);
    await locks.steal();
    expect(await outcome).toBe('AbortError');
    const next = locks.request('save', {}, (lock) => { seen.push(lock ? 'granted' : 'refused'); });
    await locks.refuse();
    await next;
    expect(seen).toEqual(['granted', 'refused']);
  });

  it('holds before a snapshot write or after its commit, and preserves erase support', async () => {
    const inner = memorySnapshotStore({ durable: true });
    const snapshots = controlledSnapshots(inner);
    const state = createInitialState(0);
    const record = { ...snapshotMeta(state, 'daily', 'd', '2026-09-29', 0, 'test'), state };
    const before = snapshots.hold('put', 'before');
    const putting = snapshots.store.put(record);
    await before.reached;
    expect(await inner.list()).toEqual([]);
    before.release();
    await putting;
    const after = snapshots.hold('remove');
    const removing = snapshots.store.remove('d');
    await after.reached;
    expect(await inner.list()).toEqual([]);
    after.release();
    await removing;
    await snapshots.store.put(record);
    expect(await snapshots.store.erase!()).toEqual({ ok: true });
    expect(await inner.list()).toEqual([]);
  });

  it.each(['list', 'get', 'put'] as const)('rejects %s once, before altering the inner adapter, then recovers', async (method) => {
    const inner = memorySnapshotStore({ durable: true });
    const snapshots = controlledSnapshots(inner);
    const state = createInitialState(0);
    const record = { ...snapshotMeta(state, 'daily', 'd', '2026-09-29', 0, 'test'), state };
    const call = () => method === 'put' ? snapshots.store.put(record) : method === 'get' ? snapshots.store.get('d') : snapshots.store.list();
    snapshots.fail(method);
    await expect(call()).rejects.toThrow(/injected/);
    expect(await inner.list()).toEqual([]);
    await expect(call()).resolves.not.toThrow();
  });
});
