import { afterEach, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { indexedDbSnapshotStore, snapshotMeta } from '@/state/snapshots';
import { createInitialState } from '@/state/defaults';
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
afterEach(() => { vi.unstubAllGlobals(); });
const state = createInitialState();
const record = { ...snapshotMeta(state, 'daily', 'old', '2026-09-29', 1, 'test'), state };

it('fences an in-flight initial database open before erase', async () => {
  const factory = new IDBFactory();
  vi.stubGlobal('indexedDB', factory);
  const adapter = indexedDbSnapshotStore()!;
  const pendingPut = adapter.put(record).then(() => 'written', () => 'refused');
  expect(await adapter.erase!()).toEqual({ ok: true });
  expect(await pendingPut).toBe('refused');
  expect(await factory.databases()).toEqual([]);
});

it('keeps writes fenced after blocked deletion until its eventual actual success', async () => {
  const factory = new IDBFactory();
  vi.stubGlobal('indexedDB', factory);
  const adapter = indexedDbSnapshotStore()!;
  await adapter.put(record);
  const request = factory.open('catkin', 1);
  const blocker = await new Promise<IDBDatabase>((resolve) => { request.onsuccess = () => resolve(request.result); });
  expect(await adapter.erase!()).toEqual({ ok: false, error: 'blocked' });
  await expect(adapter.put({ ...record, id: 'while-blocked' })).rejects.toThrow();
  expect(await adapter.erase!()).toEqual({ ok: false, error: 'blocked' });
  blocker.close();
  for (let i = 0; i < 10 && (await factory.databases()).length; i++) await settle();
  expect(await factory.databases()).toEqual([]);
  await adapter.put({ ...record, id: 'new' });
  expect((await adapter.list()).map((r) => r.id)).toEqual(['new']);
});
