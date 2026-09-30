/**
 * Save-queue integrity (package P1-A in docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN_ALTERNATE.md
 * §13; WP-A1a/A1b in the canonical CATKIN_AUDIT_IMPLEMENTATION_PLAN.md): a write reported as saved
 * is on disk, a failed write stays pending until it lands, a retired writer never writes again,
 * and nothing durable is promised before this window owns the save. Each case names its audit
 * finding; every case but one guard failed against the code before this package.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '@/state/defaults';
import { SAVE_KEY, browserStorage, encodeEnvelope, memoryStorage } from '@/state/persist';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { deferredLocks, failWrites, fakeBrowser, fakeLocks } from './fixtures';

vi.setConfig({ testTimeout: 30_000 });

const input = (name = 'Walk') => ({
  name,
  icon: 'walk',
  color: 'sage' as const,
  plant: 'pothos' as const,
  pot: 'terracotta' as const,
  schedule: { kind: 'daily' as const },
  target: 1,
  step: 1,
  effort: 'steady' as const,
  timeOfDay: 'anytime' as const,
  polarity: 'build' as const,
});

const saved = (b: ReturnType<typeof fakeBrowser>) => JSON.parse(b.storage.getItem(SAVE_KEY)!) as { rev: number; state: AppState };
const settle = () => new Promise<void>((r) => setTimeout(r, 0));
const onboarded = (now: number, name = 'Sam'): AppState => {
  const s = createInitialState(now);
  return { ...s, profile: { ...s.profile, name, onboarded: true } };
};

afterEach(() => {
  vi.unstubAllGlobals();
  store.configureStore({ locks: null });
});

describe('FS1: a writer that lost the save never writes over the new owner', () => {
  function ownedWithWalk() {
    const locks = fakeLocks({ byOther: false });
    const b = fakeBrowser({ locks });
    const frames: (() => void)[] = [];
    store.configureStore({ afterFrame: (fn) => void frames.push(fn) });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const id = store.createHabit(input());
    for (const f of frames.splice(0)) f();
    store.flushSaves();
    return { b, locks, frames, id };
  }

  it('the lock is stolen while a check-in waits for its frame (R201)', async () => {
    const { b, locks, frames, id } = ownedWithWalk();
    store.checkIn(id);
    expect(frames).toHaveLength(1);
    locks.stolen();
    await settle();
    expect(store.readOnly.value).toBe('other-window');
    // The new owner saves before its storage event reaches this window.
    b.storage.setItem(SAVE_KEY, encodeEnvelope(onboarded(b.clock.now, 'Owner'), 99, b.clock.now, 'test'));
    for (const f of frames.splice(0)) f();
    expect(saved(b).rev).toBe(99);
    expect(saved(b).state.profile.name).toBe('Owner');
  });

  it('a queue replaced by a fresh hydrate never writes its old pending state', () => {
    const { b, frames, id } = ownedWithWalk();
    const before = saved(b).state;
    store.checkIn(id);
    store.hydrate();
    for (const f of frames.splice(0)) f();
    store.flushSaves();
    expect(saved(b).state.logs[id]).toEqual(before.logs[id]);
  });
});

describe('data-d2: a failed save stays pending until it is written', () => {
  function withWalk() {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const id = store.createHabit(input());
    b.advance(1000);
    return { b, id };
  }

  it('storage recovers, then a flush with no new change writes the last check-in', () => {
    const { b, id } = withWalk();
    const broken = failWrites(b.storage, 'quota', [SAVE_KEY]);
    store.checkIn(id);
    b.advance(20);
    expect(store.saveStatus.value.status).toBe('storage-full');
    expect(saved(b).state.logs[id]).toBeUndefined();
    broken.heal();
    store.flushSaves();
    expect(saved(b).state.logs[id]?.[store.today.value]).toMatchObject({ kind: 'log', count: 1 });
    expect(store.saveStatus.value.status).toBe('saved');
  });

  it('keeps trying on its own: a later retry writes it without any new action', () => {
    const { b, id } = withWalk();
    const broken = failWrites(b.storage, 'error', [SAVE_KEY]);
    store.checkIn(id);
    b.advance(20);
    expect(store.saveStatus.value.status).toBe('unavailable');
    broken.heal();
    b.advance(60_000);
    expect(saved(b).state.logs[id]?.[store.today.value]).toMatchObject({ kind: 'log', count: 1 });
    expect(store.hasUnsavedWork()).toBe(false);
  });
});

describe('FS4: nothing durable is promised while the writer lock is still being asked for', () => {
  it('the first capsule is refused (nothing spent) until the lock answers, then works (R210)', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const early = store.pull('cats', { free: true });
    expect(early).toEqual({ ok: false, error: 'storage-full' });
    expect(store.state.value.pendingReveal).toBeUndefined();
    expect(b.storage.getItem(SAVE_KEY)).toBeNull();
    await locks.grant();
    const r = store.pull('cats', { free: true });
    expect(r).toMatchObject({ ok: true, paidWith: 'free' });
    expect(saved(b).state.pendingReveal).toMatchObject({ machineId: 'cats' });
  });

  it('a refused lock never shows a pet that was not saved', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    expect(store.pull('cats', { free: true }).ok).toBe(false);
    await locks.refuse();
    expect(store.readOnly.value).toBe('other-window');
    expect(store.state.value.pendingReveal).toBeUndefined();
    expect(b.storage.getItem(SAVE_KEY)).toBeNull();
  });
});

describe('RISK-01: no daily copy or sidecar before this window owns the save', () => {
  it('the daily snapshot waits for the lock, then is taken', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    b.storage.setItem(SAVE_KEY, encodeEnvelope(onboarded(b.clock.now), 3, b.clock.now, 'test'));
    store.hydrate();
    await settle();
    expect(await b.snapshots.list()).toHaveLength(0);
    expect(store.ownsSave()).toBe(false);
    await locks.grant();
    await settle();
    expect(store.ownsSave()).toBe(true);
    expect((await b.snapshots.list()).map((m) => m.kind)).toContain('daily');
  });

  it('a refused window never snapshots', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    b.storage.setItem(SAVE_KEY, encodeEnvelope(onboarded(b.clock.now), 3, b.clock.now, 'test'));
    store.hydrate();
    await locks.refuse();
    store.startClock()();
    await settle();
    expect(await b.snapshots.list()).toHaveLength(0);
  });
});

describe('data-d1: a full but readable browser store is used, never swapped for a silent memory save', () => {
  it('browserStorage keeps a readable localStorage whose probe write hits the quota', () => {
    const existing = encodeEnvelope(onboarded(Date.UTC(2026, 8, 29)), 7, 0, 'test');
    const full = memoryStorage({ [SAVE_KEY]: existing }, SAVE_KEY.length + existing.length);
    vi.stubGlobal('localStorage', full);
    expect(browserStorage()).toBe(full);
  });

  it('browserStorage gives up only when storage cannot be read at all', () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
      removeItem: () => undefined,
      key: () => null,
      length: 0,
    };
    vi.stubGlobal('localStorage', blocked);
    expect(browserStorage()).toBeNull();
  });

  it('without persistent storage the save is volatile, and says so instead of "saved"', () => {
    fakeBrowser();
    store.configureStore({ storage: null });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    store.flushSaves();
    expect(store.durability.value.kind).toBe('volatile');
    expect(store.hasUnsavedWork()).toBe(true);
  });
});

describe('RISK-06 and RISK-07: nothing that would drop unsaved work runs while a save is failing', () => {
  it('unsaved work is reported while failing and cleared once written', () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.advance(1000);
    expect(store.hasUnsavedWork()).toBe(false);
    const broken = failWrites(b.storage, 'quota', [SAVE_KEY]);
    store.checkIn(store.createHabit(input()));
    b.advance(20);
    expect(store.hasUnsavedWork()).toBe(true);
    expect(store.durability.value).toMatchObject({ kind: 'failing', reason: 'quota' });
    broken.heal();
    store.flushSaves();
    expect(store.hasUnsavedWork()).toBe(false);
    expect(store.durability.value.kind).toBe('ok');
  });

  it('the demo will not open over a real save that has not been written; it keeps the change', () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const id = store.createHabit(input());
    b.advance(1000);
    const broken = failWrites(b.storage, 'quota', [SAVE_KEY]);
    store.checkIn(id);
    b.advance(20);
    expect(store.enterDemo()).toBe(false);
    expect(store.demoMode.value).toBe(false);
    expect(store.state.value.logs[id]?.[store.today.value]).toMatchObject({ count: 1 });
    broken.heal();
    expect(store.enterDemo()).toBe(true);
    store.exitDemo();
    expect(store.state.value.logs[id]?.[store.today.value]).toMatchObject({ count: 1 });
    expect(saved(b).state.logs[id]?.[store.today.value]).toMatchObject({ count: 1 });
  });
});
