import { afterEach, describe, expect, it, vi } from 'vitest';
import * as store from '@/state/store';
import { SAVE_KEY, encodeEnvelope } from '@/state/persist';
import { deferredLocks, fakeBrowser } from './fixtures';

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
afterEach(() => { store.configureStore({ locks: null }); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('adversarial erase retry authority', () => {
  it('rechecks the disk before the first erase when a newer-schema event has not been delivered yet', async () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Old journal', templateIds: [] });
    store.flushSaves();
    await settle();
    const newerState = { ...store.state.value, version: 2, profile: { ...store.state.value.profile, name: 'Newer journal' } };
    const raw = JSON.stringify({ v: 2, rev: 99, gen: 'newer-lineage', savedAt: b.clock.now, appVersion: 'newer', state: newerState });
    b.storage.setItem(SAVE_KEY, raw);
    const outcome = await store.eraseEverything();
    expect({ outcome, raw: b.storage.getItem(SAVE_KEY) }).toEqual({ outcome: { ok: false, error: 'read-only' }, raw });
  });

  it('does not treat another app storage event as a changed journal during erasure', async () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Private journal', templateIds: [] });
    await settle();
    let release!: () => void;
    let reached!: () => void;
    const deleting = new Promise<void>((r) => { reached = r; });
    const gate = new Promise<void>((r) => { release = r; });
    b.snapshots.erase = async () => { reached(); await gate; b.snapshots.records.clear(); return { ok: true }; };
    const erasing = store.eraseEverything();
    await deleting;
    b.fire('storage', { key: 'another-app:preferences', newValue: 'changed' });
    release();
    expect(await erasing).toEqual({ ok: true });
    expect(store.erasePending.value).toBe(false);
  });

  it('does not let the old erase confirmation erase a newer-schema save after Use here', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    store.hydrate();
    await locks.grant();
    store.completeOnboarding({ name: 'Old journal', templateIds: [] });
    await settle();
    b.snapshots.erase = async () => ({ ok: false, error: 'blocked' });
    expect(await store.eraseEverything()).toEqual({ ok: false, error: 'partial', failures: ['snapshots-blocked'] });
    await locks.steal();
    const newerState = { ...store.state.value, version: 2, profile: { ...store.state.value.profile, name: 'Newer journal' } };
    const raw = JSON.stringify({ v: 2, rev: 99, gen: 'newer-lineage', savedAt: b.clock.now, appVersion: 'newer', state: newerState });
    b.storage.setItem(SAVE_KEY, raw);
    b.fire('storage', { key: SAVE_KEY, newValue: raw });
    store.useHere();
    await locks.grant();
    b.snapshots.erase = async () => ({ ok: true });
    const outcome = await store.eraseEverything();
    expect({ outcome, raw: b.storage.getItem(SAVE_KEY) }).toEqual({ outcome: { ok: false, error: 'read-only' }, raw });
  });

  it('does not reuse an old erase confirmation for another ordinary journal after Use here', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    store.hydrate();
    await locks.grant();
    store.completeOnboarding({ name: 'Old journal', templateIds: [] });
    await settle();
    b.snapshots.erase = async () => ({ ok: false, error: 'blocked' });
    expect((await store.eraseEverything()).ok).toBe(false);
    await locks.steal();
    const other = { ...store.state.value, profile: { ...store.state.value.profile, name: 'Other journal' } };
    const raw = encodeEnvelope(other, 99, b.clock.now, 'test', 'other-lineage');
    b.storage.setItem(SAVE_KEY, raw);
    b.fire('storage', { key: SAVE_KEY, newValue: raw });
    store.useHere();
    await locks.grant();
    expect(store.state.value.profile.name).toBe('Other journal');
  });
});

describe('erasure with another unsupported-lock runtime', () => {
  it('does not let a second window pending save bring the erased journal back', async () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Private journal', templateIds: [] });
    store.flushSaves();
    await settle();
    vi.resetModules();
    const follower = await import('@/state/store');
    const followerListeners: Array<(event: Event) => void> = [];
    follower.configureStore({ ...b.runtime, listen: (_target, type, fn) => {
      if (type === 'storage') followerListeners.push(fn);
      return () => {};
    } });
    follower.hydrate();
    await settle();
    follower.setName('Private change');
    expect(await store.eraseEverything()).toEqual({ ok: true });
    expect(b.storage.getItem(SAVE_KEY)).toBeNull();
    b.advance(2000);
    for (const fn of followerListeners) fn({ key: SAVE_KEY } as unknown as Event);
    expect(b.storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('does not resurrect an old weekly snapshot when a second window continuation resumes after erase', async () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Private journal', templateIds: [] });
    store.flushSaves();
    await settle();
    const originalList = b.snapshots.list;
    let release!: () => void;
    let reached!: () => void;
    const reachedList = new Promise<void>((r) => { reached = r; });
    const listGate = new Promise<void>((r) => { release = r; });
    let holdOnce = true;
    b.snapshots.list = async () => {
      if (holdOnce) { holdOnce = false; reached(); await listGate; }
      return originalList();
    };
    vi.resetModules();
    const follower = await import('@/state/store');
    const followerListeners: Array<(event: Event) => void> = [];
    follower.configureStore({ ...b.runtime, listen: (_target, type, fn) => {
      if (type === 'storage') followerListeners.push(fn);
      return () => {};
    } });
    follower.hydrate();
    await reachedList;
    expect(await store.eraseEverything()).toEqual({ ok: true });
    expect(await originalList()).toEqual([]);
    // A suspended window has not yet received its queued storage event. Its existing async
    // work resumes first; erasure must not allow old private data to be kept anew.
    release();
    await settle();
    for (const fn of followerListeners) fn({ key: SAVE_KEY } as unknown as Event);
    expect(await originalList()).toEqual([]);
  });
});
