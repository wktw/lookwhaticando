import { afterEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import * as store from '@/state/store';
import { SAVE_KEY, THEME_KEY } from '@/state/persist';
import { indexedDbSnapshotStore, snapshotMeta } from '@/state/snapshots';
import { deferredLocks, fakeBrowser } from './fixtures';

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const keys = (b: ReturnType<typeof fakeBrowser>) => [...b.storage.data.keys()].filter((key) => key.startsWith('catkin:'));
afterEach(() => { store.configureStore({ locks: null }); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('WP-A9 erase everything', () => {
  it('does not mistake unreadable storage for an erased save when a pending writer checks authority', () => {
    const b = fakeBrowser(); store.hydrate(); store.completeOnboarding({ name: 'Sam', templateIds: [] }); b.advance(1000);
    store.setName('Waiting');
    const get = b.storage.getItem;
    b.storage.getItem = () => { throw new Error('storage denied'); };
    b.advance(1000);
    expect(store.state.value.profile.name).toBe('Waiting');
    expect(store.saveStatus.value.status).toBe('unavailable');
    expect(store.hasUnsavedWork()).toBe(true);
    b.storage.getItem = get;
    b.advance(5000);
    expect(JSON.parse(b.storage.getItem(SAVE_KEY)!).state.profile.name).toBe('Waiting');
  });
  it('refuses a second erase while database deletion is still in flight', async () => {
    const b = fakeBrowser(); store.hydrate(); store.completeOnboarding({ name: 'Sam', templateIds: [] });
    await settle();
    let release!: () => void;
    let reached!: () => void;
    const hit = new Promise<void>((r) => { reached = r; });
    const held = new Promise<void>((r) => { release = r; });
    let calls = 0;
    b.snapshots.erase = async () => { calls++; reached(); await held; b.snapshots.records.clear(); return { ok: true }; };
    const first = store.eraseEverything();
    await hit;
    const second = store.eraseEverything();
    release();
    expect(await second).toEqual({ ok: false, error: 'busy' });
    expect(await first).toEqual({ ok: true });
    expect(calls).toBe(1);
  });

  it('refuses erasure while an import is keeping its protective copy', async () => {
    const b = fakeBrowser(); store.hydrate(); store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const backup = store.backupJson();
    store.setName('Current'); b.advance(1000); await settle();
    let release!: () => void;
    let reached!: () => void;
    const hit = new Promise<void>((r) => { reached = r; });
    const held = new Promise<void>((r) => { release = r; });
    const put = b.snapshots.put;
    b.snapshots.put = async (record) => { reached(); await held; await put(record); };
    const importing = store.applyImport(backup);
    await hit;
    expect(await store.eraseEverything()).toEqual({ ok: false, error: 'busy' });
    expect(b.storage.getItem(SAVE_KEY)).not.toBeNull();
    release();
    expect(await importing).toMatchObject({ ok: true });
  });
  it('removes every namespaced key and every copy, preserves unrelated storage, and stays empty after pagehide and captured saves', async () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    await settle();
    store.setName('Pending');
    for (const key of ['catkin:demo:v1', 'catkin:undo-import', 'catkin:onboarding', 'catkin:unknown-sidecar', `${SAVE_KEY}:corrupt`]) b.storage.setItem(key, 'private');
    b.storage.setItem('another-app', 'keep');
    expect(await store.eraseEverything()).toEqual({ ok: true });
    b.fire('pagehide');
    b.advance(2000);
    expect(keys(b)).toEqual([]);
    expect(await b.snapshots.list()).toEqual([]);
    expect(b.storage.getItem('another-app')).toBe('keep');
    expect(store.state.value.profile.onboarded).toBe(false);
    expect(store.state.value.profile.name).toBe('');
  });

  it('Start over and erase refuse while the writer lock is still acquiring', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    store.hydrate();
    b.storage.setItem('catkin:private', 'keep');
    const state = store.state.value;
    store.resetAll();
    expect(b.storage.getItem('catkin:private')).toBe('keep');
    expect(store.state.value).toBe(state);
    expect(await store.eraseEverything()).toEqual({ ok: false, error: 'read-only' });
  });

  it('waits for an in-flight daily copy and never lets its weekly continuation resurrect erased notes', async () => {
    const b = fakeBrowser();
    let release!: () => void;
    let reached!: () => void;
    const hit = new Promise<void>((r) => { reached = r; });
    const held = new Promise<void>((r) => { release = r; });
    const put = b.snapshots.put;
    b.snapshots.put = async (record) => { reached(); await held; await put(record); };
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    await hit;
    const pending = store.eraseEverything();
    release();
    expect(await pending).toEqual({ ok: true });
    await settle();
    expect(await b.snapshots.list()).toEqual([]);
  });

  it('reports storage removal errors and keeps writes fenced until a successful retry', async () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const remove = b.storage.removeItem;
    b.storage.removeItem = (key) => { if (key === THEME_KEY) throw new Error('denied'); remove(key); };
    expect(await store.eraseEverything()).toEqual({ ok: false, error: 'partial', failures: ['storage'] });
    store.setName('Resurrection');
    b.advance(2000);
    expect(b.storage.getItem(SAVE_KEY)).toBeNull();
    b.storage.removeItem = remove;
    expect(await store.eraseEverything()).toEqual({ ok: true });
    expect(keys(b)).toEqual([]);
  });

  it('does not begin deleting copies after ownership is stolen while a daily copy settles', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    store.hydrate();
    await locks.grant();
    let release!: () => void;
    const wait = new Promise<void>((r) => { release = r; });
    const put = b.snapshots.put;
    b.snapshots.put = async (record) => { await wait; await put(record); };
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const pending = store.eraseEverything();
    await locks.steal();
    release();
    expect(await pending).toEqual({ ok: false, error: 'superseded' });
    expect((await b.snapshots.list()).length).toBeGreaterThan(0);
  });
});

describe('snapshot database erasure', () => {
  it('deletes the actual database, including stores a newer version added', async () => {
    const factory = new IDBFactory();
    vi.stubGlobal('indexedDB', factory);
    const request = factory.open('catkin', 2);
    await new Promise<void>((resolve) => {
      request.onupgradeneeded = () => request.result.createObjectStore('future-private-data');
      request.onsuccess = () => { request.result.close(); resolve(); };
    });
    const snapshots = indexedDbSnapshotStore()!;
    expect(await snapshots.erase!()).toEqual({ ok: true });
    expect(await factory.databases()).toEqual([]);
  });

  it('closes its own connection, deletes all copies, and can keep new ones after erasure', async () => {
    const factory = new IDBFactory();
    vi.stubGlobal('indexedDB', factory);
    const snapshots = indexedDbSnapshotStore()!;
    const state = store.state.value;
    const record = { ...snapshotMeta(state, 'daily', 'private', '2026-09-29', 1, 'test'), state };
    await snapshots.put(record);
    expect(await snapshots.erase!()).toEqual({ ok: true });
    expect(await factory.databases()).toEqual([]);
    await snapshots.put({ ...record, id: 'new' });
    expect((await snapshots.list()).map((x) => x.id)).toEqual(['new']);
  });

  it.each(['blocked', 'error'] as const)('reports a deleteDatabase %s without claiming success', async (how) => {
    const factory = new IDBFactory();
    vi.spyOn(factory, 'deleteDatabase').mockImplementation(() => {
      const request = {} as IDBOpenDBRequest;
      queueMicrotask(() => how === 'blocked' ? request.onblocked?.(new Event('blocked') as IDBVersionChangeEvent) : request.onerror?.(new Event('error')));
      return request;
    });
    vi.stubGlobal('indexedDB', factory);
    expect(await indexedDbSnapshotStore()!.erase!()).toEqual({ ok: false, error: how === 'blocked' ? 'blocked' : 'unavailable' });
  });
});
