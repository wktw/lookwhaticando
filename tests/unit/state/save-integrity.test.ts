/**
 * Save-queue integrity (package P1-A in docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN_ALTERNATE.md
 * §13; WP-A1a/A1b in the canonical CATKIN_AUDIT_IMPLEMENTATION_PLAN.md): a write reported as saved
 * is on disk, a failed write stays pending until it lands, a retired writer never writes again,
 * and nothing durable is promised before this window owns the save. Each case names its audit
 * finding; every case but one guard failed against the code before this package.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '@/state/defaults';
import { wishPrice } from '@/domain/gacha';
import { RETRY_MS, SAVE_KEY, SaveQueue, browserStorage, encodeEnvelope, memoryStorage, type Timers } from '@/state/persist';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { deferredLocks, failWrites, fakeBrowser, fakeLocks } from './fixtures';
import { capturedFrames } from './controlled';

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
/** A saved profile with stamps to spend in Special Order. */
const withStamps = (b: ReturnType<typeof fakeBrowser>, stars = 10) => {
  const s = onboarded(b.clock.now);
  b.storage.setItem(SAVE_KEY, encodeEnvelope({ ...s, wallet: { ...s.wallet, stars } }, 3, b.clock.now, 'test'));
};
const ORDER = 'pet-cat-orange';

afterEach(() => {
  vi.unstubAllGlobals();
  store.configureStore({ locks: null });
});

describe('FS1: a writer that lost the save never writes over the new owner', () => {
  function ownedWithWalk() {
    const locks = fakeLocks({ byOther: false });
    const b = fakeBrowser({ locks });
    const frames = capturedFrames();
    store.configureStore({ afterFrame: frames.afterFrame });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const id = store.createHabit(input());
    frames.flush();
    store.flushSaves();
    return { b, locks, frames, id };
  }

  it('the lock is stolen while a check-in waits for its frame (R201)', async () => {
    const { b, locks, frames, id } = ownedWithWalk();
    store.checkIn(id);
    expect(frames.pending).toBe(1);
    locks.stolen();
    await settle();
    expect(store.readOnly.value).toBe('other-window');
    // The new owner saves before its storage event reaches this window.
    b.storage.setItem(SAVE_KEY, encodeEnvelope(onboarded(b.clock.now, 'Owner'), 99, b.clock.now, 'test'));
    frames.flush();
    expect(saved(b).rev).toBe(99);
    expect(saved(b).state.profile.name).toBe('Owner');
  });

  it('a queue replaced by a fresh hydrate never writes its old pending state', () => {
    const { b, frames, id } = ownedWithWalk();
    const before = saved(b).state;
    store.checkIn(id);
    store.hydrate();
    frames.flush();
    store.flushSaves();
    expect(saved(b).state.logs[id]).toEqual(before.logs[id]);
  });
});

describe('FS1 at the queue: a retired queue ignores every late callback', () => {
  function queue(storage = memoryStorage()) {
    const due = new Map<number, () => void>();
    let id = 0;
    const timers: Timers = { setTimeout: (fn) => (due.set(++id, fn), id), clearTimeout: (h) => void due.delete(h as number) };
    const run = () => {
      const fns = [...due.values()];
      due.clear();
      for (const f of fns) f();
    };
    const q = new SaveQueue({ storage, key: SAVE_KEY, appVersion: 'test', rev: 0, now: () => 0, timers, compact: (x) => x });
    return { q, storage, run, due };
  }
  const s0 = onboarded(Date.UTC(2026, 8, 29));

  it('after the frame', () => {
    const { q, storage } = queue();
    const frames = capturedFrames();
    q.saveSoon(s0, frames.afterFrame);
    q.dispose();
    frames.flush();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('on the debounce timer', () => {
    const { q, storage, run, due } = queue();
    q.schedule(s0);
    q.dispose();
    expect(due.size).toBe(0);
    run();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('on a retry timer', () => {
    const storage = memoryStorage();
    const broken = failWrites(storage, 'error', [SAVE_KEY]);
    const { q, run } = queue(storage);
    expect(q.saveNow(s0)).toBe('unavailable');
    q.dispose();
    broken.heal();
    run();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(q.flush()).toBeNull();
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

  it('retries back off: an hour of failing is a few dozen tries at most, not one per tick', () => {
    const { b, id } = withWalk();
    const stop = store.startClock();
    failWrites(b.storage, 'error', [SAVE_KEY]);
    const set = b.storage.setItem;
    let tries = 0;
    b.storage.setItem = (k: string, v: string) => {
      if (k === SAVE_KEY) tries++;
      set(k, v);
    };
    store.checkIn(id);
    b.advance(60 * 60_000);
    // RETRY_MS then once a minute: 3 quick tries and about 60 at the cap; the 30 s clock adds none.
    expect(tries).toBeGreaterThanOrEqual(RETRY_MS.length);
    expect(tries).toBeLessThanOrEqual(RETRY_MS.length + 60 + 2);
    expect(store.hasUnsavedWork()).toBe(true);
    stop();
  });

  it('coming back to the app tries a failed write again at once', () => {
    const { b, id } = withWalk();
    const stop = store.startClock();
    const broken = failWrites(b.storage, 'quota', [SAVE_KEY]);
    store.checkIn(id);
    b.advance(20);
    expect(store.durability.value.kind).toBe('failing');
    broken.heal();
    b.fire('focus');
    expect(saved(b).state.logs[id]?.[store.today.value]).toMatchObject({ kind: 'log', count: 1 });
    expect(store.durability.value.kind).toBe('ok');
    stop();
  });
});

describe('INV-1: every "saved" follows a write that landed, from the queue that owns the save', () => {
  it('holds across failures, a heal, a re-hydrate and a steal', async () => {
    const locks = fakeLocks({ byOther: false });
    const b = fakeBrowser({ locks });
    const set = b.storage.setItem;
    let landed = 0;
    b.storage.setItem = (k: string, v: string) => {
      set(k, v);
      if (k === SAVE_KEY) landed++;
    };
    store.hydrate();
    let claims = 0;
    let seen = 0;
    const off = store.saveStatus.subscribe((st) => {
      if (st.status !== 'saved') return;
      claims++;
      // Claimed only by the window that owns the save, after a write reached disk since the last
      // claim, and the disk holds this window's latest state.
      expect(store.readOnly.value).not.toBe('other-window');
      expect(landed).toBeGreaterThan(seen);
      seen = landed;
      expect(saved(b).state).toEqual(store.state.value);
    });
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const id = store.createHabit(input());
    b.advance(1000);
    const broken = failWrites(b.storage, 'quota', [SAVE_KEY]);
    store.checkIn(id);
    b.advance(5_000);
    broken.heal();
    b.advance(60_000);
    store.hydrate();
    store.setName('Samira');
    b.advance(1000);
    // A check-in waiting for its frame when another window takes the save (R201).
    store.checkIn(id);
    locks.stolen();
    await settle();
    b.advance(60_000);
    off();
    expect(claims).toBeGreaterThanOrEqual(3);
  });
});

describe('FS4: nothing durable is promised while the writer lock is still being asked for', () => {
  it('the first capsule is refused (nothing spent) until the lock answers, then works (R210)', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const early = store.pull('cats', { free: true });
    expect(early).toEqual({ ok: false, error: 'acquiring' });
    expect(store.state.value.pendingReveal).toBeUndefined();
    expect(b.storage.getItem(SAVE_KEY)).toBeNull();
    await locks.grant();
    const r = store.pull('cats', { free: true });
    expect(r).toMatchObject({ ok: true, paidWith: 'free' });
    expect(saved(b).state.pendingReveal).toMatchObject({ machineId: 'cats' });
    expect(saved(b).state.collection).toEqual(store.state.value.collection);
    // One gift: a second try is the tray, not another capsule.
    expect(store.pull('cats', { free: true })).toEqual({ ok: false, error: 'reveal-pending' });
    expect(Object.values(saved(b).state.collection).reduce((n, i) => n + i.count, 0)).toBe(Object.values(store.state.value.collection).reduce((n, i) => n + i.count, 0));
  });

  it('a Special Order waits too, then is placed exactly once after the grant', async () => {
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    withStamps(b);
    store.hydrate();
    expect(store.wish(ORDER)).toEqual({ ok: false, error: 'acquiring' });
    expect(store.state.value.wallet.stars).toBe(10);
    expect(store.state.value.collection[ORDER]).toBeUndefined();
    await locks.grant();
    expect(store.wish(ORDER)).toMatchObject({ ok: true, itemId: ORDER });
    expect(saved(b).state.wallet.stars).toBe(10 - wishPrice(ORDER)!);
    expect(saved(b).state.collection[ORDER]?.count).toBe(1);
    expect(store.wish(ORDER)).toEqual({ ok: false, error: 'already-owned' });
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

describe('FS10: a Special Order is saved before it is shown, like a capsule', () => {
  it('under quota it is refused; memory and disk keep the stamps; after space frees it is placed once', () => {
    const b = fakeBrowser();
    withStamps(b);
    store.hydrate();
    const before = b.storage.getItem(SAVE_KEY);
    const broken = failWrites(b.storage, 'quota', [SAVE_KEY]);
    expect(store.wish(ORDER)).toEqual({ ok: false, error: 'storage-full' });
    expect(store.state.value.wallet.stars).toBe(10);
    expect(store.state.value.collection[ORDER]).toBeUndefined();
    expect(store.state.value.pendingReveal).toBeUndefined();
    expect(b.storage.getItem(SAVE_KEY)).toBe(before);
    // Nothing of the refused order is written later by the queue either.
    b.advance(60_000);
    expect(saved(b).state.wallet.stars).toBe(10);
    broken.heal();
    expect(store.wish(ORDER)).toMatchObject({ ok: true, stars: wishPrice(ORDER) });
    // Written at once, before the reveal: no frame or flush needed.
    expect(saved(b).state.wallet.stars).toBe(10 - wishPrice(ORDER)!);
    expect(saved(b).state.collection[ORDER]?.count).toBe(1);
    expect(saved(b).state.pendingReveal).toMatchObject({ itemId: ORDER, order: true });
  });

  it('with a capsule reveal already waiting, the order is still written before it is shown', () => {
    const b = fakeBrowser();
    withStamps(b);
    store.hydrate();
    const capsule = store.pull('cats', { free: true });
    expect(capsule.ok).toBe(true);
    const waiting = saved(b).state.pendingReveal;
    expect(waiting).toMatchObject({ machineId: 'cats' });
    // An item the capsule didn't just bring.
    const order = [ORDER, 'pet-cat-tortie'].find((id) => !store.state.value.collection[id])!;
    const stars = store.state.value.wallet.stars;
    const broken = failWrites(b.storage, 'error', [SAVE_KEY]);
    expect(store.wish(order)).toEqual({ ok: false, error: 'unavailable' });
    expect(store.state.value.wallet.stars).toBe(stars);
    expect(store.state.value.pendingReveal).toEqual(waiting);
    broken.heal();
    expect(store.wish(order).ok).toBe(true);
    expect(saved(b).state.wallet.stars).toBe(stars - wishPrice(order)!);
    expect(saved(b).state.collection[order]?.count).toBe(1);
    // The capsule keeps its place; the order's reveal plays from the result.
    expect(saved(b).state.pendingReveal).toEqual(waiting);
  });
});

describe('volatile: with nothing kept, no capsule or order is shown as if it were saved', () => {
  it('a pull and an order are refused as "volatile" and nothing is spent', () => {
    const b = fakeBrowser();
    store.configureStore({ storage: null });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const wallet = store.state.value.wallet;
    expect(store.pull('cats', { free: true })).toEqual({ ok: false, error: 'volatile' });
    expect(store.state.value.pendingReveal).toBeUndefined();
    expect(store.state.value.wallet).toEqual(wallet);
    expect(store.wish(ORDER)).toEqual({ ok: false, error: 'not-enough-stars' });
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
