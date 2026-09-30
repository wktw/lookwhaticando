/**
 * Transactional replacement (WP-A3 in docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md: data-d3,
 * data-d4, data-d8, data-d11, FS5, FS9, data-d12 store half, P-persistence-05, P-persistence-11).
 * Import, Undo and restore run one protocol: an op token checked after every await, a protective
 * copy committed before anything else, an exact undo token `{id, until, gen, kind}`, a checked write
 * of the save, and only then the new state in memory. Each returns `{ ok: true, undo }` or
 * `{ ok: false, error }` and never rejects. Cases marked "failed before" failed against the code
 * before WP-A3 (see the plan's status note under WP-A3). The two unmarked ones are guards of
 * behaviour that was already right; they failed there only on the result's shape.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { DEMO_KEY, SAVE_KEY, SaveQueue, UNDO_IMPORT_KEY, encodeEnvelope, memoryStorage } from '@/state/persist';
import { KEEP, indexedDbSnapshotStore, type SnapshotStore } from '@/state/snapshots';
import { createInitialState } from '@/state/defaults';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { deferredLocks, failWrites, fakeBrowser } from './fixtures';

vi.setConfig({ testTimeout: 30_000 });

afterEach(() => {
  store.configureStore({ locks: null });
  vi.unstubAllGlobals();
});

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

type Saved = { v: number; rev: number; gen?: string; state: AppState };
type Browser = ReturnType<typeof fakeBrowser>;
const saved = (b: Browser) => JSON.parse(b.storage.getItem(SAVE_KEY)!) as Saved;
const token = (b: Browser) => JSON.parse(b.storage.getItem(UNDO_IMPORT_KEY) ?? 'null') as { id: string; until: number; gen?: string; kind?: string } | null;
const settle = () => new Promise<void>((r) => setTimeout(r, 0));
const NEW_GEN = 'b'.repeat(32);
const preImports = async (s: SnapshotStore) => (await s.list()).filter((m) => m.kind === 'pre-import').map((m) => m.id);

/** A real IndexedDB adapter over fake-indexeddb (a fresh database each time). */
function idb(): SnapshotStore {
  vi.stubGlobal('indexedDB', new IDBFactory());
  return indexedDbSnapshotStore()!;
}

type Method = 'list' | 'get' | 'put' | 'remove';

/**
 * A snapshot store whose chosen call is held after it reached the inner store and before it
 * answers, so a test can act in between (a reset, the demo, a stolen lock, closing the sheet).
 */
function gated(inner: SnapshotStore) {
  const gates = new Map<Method, { reached: () => void; wait: Promise<void> }>();
  const wrap =
    <K extends Method>(k: K) =>
    async (...args: unknown[]) => {
      const out = await (inner[k] as (...a: unknown[]) => Promise<unknown>)(...args);
      const g = gates.get(k);
      if (g) {
        gates.delete(k);
        g.reached();
        await g.wait;
      }
      return out;
    };
  const gatedStore = {
    get durable() {
      return inner.durable;
    },
    list: wrap('list'),
    get: wrap('get'),
    put: wrap('put'),
    remove: wrap('remove'),
  } as unknown as SnapshotStore;
  return {
    store: gatedStore,
    hold(k: Method) {
      let reached!: () => void;
      let open!: () => void;
      const hit = new Promise<void>((r) => (reached = r));
      gates.set(k, { reached, wait: new Promise<void>((r) => (open = r)) });
      return { reached: hit, release: () => open() };
    },
  };
}

/** Boots a window, keeps a backup of "Sam" (with Walk), then starts over as "Other". */
function twoSaves(b: Browser): string {
  store.completeOnboarding({ name: 'Sam', templateIds: [] });
  store.checkIn(store.createHabit(input()));
  const backup = store.exportData();
  store.resetAll();
  store.completeOnboarding({ name: 'Other', templateIds: [] });
  b.advance(1000);
  return backup;
}

function boot(opts: Parameters<typeof fakeBrowser>[0] = {}, snapshots?: SnapshotStore): Browser {
  const b = fakeBrowser(opts);
  if (snapshots) store.configureStore({ snapshots });
  store.hydrate();
  return b;
}

/** A daily copy of "Sam", then a rename, so a restore has something to change. */
async function withDailyCopy(b: Browser, snaps: SnapshotStore = b.snapshots): Promise<string> {
  store.completeOnboarding({ name: 'Sam', templateIds: [] });
  await settle();
  b.advance(1000);
  const daily = (await snaps.list()).find((m) => m.kind === 'daily')!;
  store.setName('Renamed');
  b.advance(1000);
  return daily.id;
}

describe('SaveQueue.writeNow: one checked write, memory untouched', () => {
  it('writes the given state on a given lineage and forgets the old save’s pending change (failed before)', () => {
    const storage = memoryStorage();
    const timers = { setTimeout: () => 0, clearTimeout: () => undefined };
    const q = new SaveQueue({ storage, key: SAVE_KEY, appVersion: 't', rev: 3, gen: 'a'.repeat(32), now: () => 5, timers, compact: (s) => s });
    const s = createInitialState(0);
    q.schedule({ ...s, profile: { ...s.profile, name: 'Old edit' } });
    expect(q.writeNow({ ...s, profile: { ...s.profile, name: 'Imported' } }, NEW_GEN)).toBe('saved');
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toMatchObject({ rev: 4, gen: NEW_GEN, state: { profile: { name: 'Imported' } } });
    expect(q.hasPending).toBe(false);
    expect({ rev: q.rev, gen: q.gen }).toEqual({ rev: 4, gen: NEW_GEN });
  });

  it('a failed writeNow changes nothing: rev, lineage and the pending change stay (failed before)', () => {
    const storage = memoryStorage();
    const timers = { setTimeout: () => 0, clearTimeout: () => undefined };
    const q = new SaveQueue({ storage, key: SAVE_KEY, appVersion: 't', rev: 3, gen: 'a'.repeat(32), now: () => 5, timers, compact: (s) => s });
    const s = createInitialState(0);
    q.schedule(s);
    failWrites(storage, 'quota', [SAVE_KEY]);
    expect(q.writeNow(s, NEW_GEN)).toBe('storage-full');
    expect({ rev: q.rev, gen: q.gen, pending: q.hasPending }).toEqual({ rev: 3, gen: 'a'.repeat(32), pending: true });
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });
});

describe('data-d3: nothing is published before the save is written', () => {
  it('a failing save write returns not-saved; memory, disk and the earlier undo token are unchanged, and the fresh copy is removed (failed before)', async () => {
    const b = boot();
    const backup = twoSaves(b);
    expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    store.setName('Other again');
    b.advance(1000);
    const before = { state: store.state.value, disk: b.storage.getItem(SAVE_KEY), token: b.storage.getItem(UNDO_IMPORT_KEY), copies: await preImports(b.snapshots) };
    failWrites(b.storage, 'quota', [SAVE_KEY]);
    expect(await store.applyImport(backup)).toEqual({ ok: false, error: 'not-saved' });
    expect(store.state.value).toBe(before.state);
    expect(b.storage.getItem(SAVE_KEY)).toBe(before.disk);
    expect(b.storage.getItem(UNDO_IMPORT_KEY)).toBe(before.token);
    expect(await preImports(b.snapshots)).toEqual(before.copies);
  });

  it('an undo whose write fails keeps its token and the imported state (failed before)', async () => {
    const b = boot();
    const backup = twoSaves(b);
    expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    const shown = store.state.value;
    const disk = b.storage.getItem(SAVE_KEY);
    const t = b.storage.getItem(UNDO_IMPORT_KEY);
    const broken = failWrites(b.storage, 'error', [SAVE_KEY]);
    expect(await store.undoImport()).toEqual({ ok: false, error: 'not-saved' });
    expect(store.state.value).toBe(shown);
    expect(b.storage.getItem(SAVE_KEY)).toBe(disk);
    expect(b.storage.getItem(UNDO_IMPORT_KEY)).toBe(t);
    expect(store.canUndoImport()).toBe(true);
    broken.heal();
    expect(await store.undoImport()).toEqual({ ok: true, undo: null });
    expect(store.state.value.profile.name).toBe('Other');
  });

  it('a restore whose write fails changes nothing and leaves no copy behind (failed before)', async () => {
    const b = boot();
    const daily = await withDailyCopy(b);
    const before = { state: store.state.value, disk: b.storage.getItem(SAVE_KEY) };
    failWrites(b.storage, 'quota', [SAVE_KEY]);
    expect(await store.restoreSnapshot(daily)).toEqual({ ok: false, error: 'not-saved' });
    expect(store.state.value).toBe(before.state);
    expect(b.storage.getItem(SAVE_KEY)).toBe(before.disk);
    expect(b.storage.getItem(UNDO_IMPORT_KEY)).toBeNull();
    expect(await preImports(b.snapshots)).toEqual([]);
  });

  it('an undo token that can’t be written is no-undo: nothing changes, and the fresh copy is removed (failed before)', async () => {
    const b = boot();
    const backup = twoSaves(b);
    const before = { state: store.state.value, disk: b.storage.getItem(SAVE_KEY) };
    failWrites(b.storage, 'quota', [UNDO_IMPORT_KEY]);
    expect(await store.applyImport(backup)).toEqual({ ok: false, error: 'no-undo' });
    expect(store.state.value).toBe(before.state);
    expect(b.storage.getItem(SAVE_KEY)).toBe(before.disk);
    expect(await preImports(b.snapshots)).toEqual([]);
  });
});

describe('the exact undo token {id, until, gen, kind}', () => {
  it('names the copy, the lineage it undoes and what made it (failed before)', async () => {
    const b = boot();
    const backup = twoSaves(b);
    const res = await store.applyImport(backup);
    const until = b.clock.now + store.UNDO_IMPORT_MS;
    expect(res).toEqual({ ok: true, undo: { until } });
    expect(token(b)).toEqual({ id: expect.stringMatching(/^pre-import-/), until, gen: saved(b).gen, kind: 'import' });
    expect(await preImports(b.snapshots)).toContain(token(b)!.id);
  });

  it('Undo is refused once the save shown is another lineage (another window started a new save) (failed before)', async () => {
    const b = boot();
    const backup = twoSaves(b);
    expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    const s = createInitialState(b.clock.now);
    b.storage.setItem(SAVE_KEY, encodeEnvelope({ ...s, profile: { ...s.profile, name: 'Elsewhere', onboarded: true } }, 1, 0, 'other', NEW_GEN));
    b.fire('storage', { key: SAVE_KEY });
    expect(store.state.value.profile.name).toBe('Elsewhere');
    expect(store.canUndoImport()).toBe(false);
    expect(await store.undoImport()).toEqual({ ok: false, error: 'expired' });
    expect(store.state.value.profile.name).toBe('Elsewhere');
  });

  it('an older build’s {id, until} token is honoured until it expires', async () => {
    const b = boot();
    const backup = twoSaves(b);
    expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    const { id, until } = token(b)!;
    b.storage.setItem(UNDO_IMPORT_KEY, JSON.stringify({ id, until }));
    expect(store.canUndoImport()).toBe(true);
    expect(await store.undoImport()).toEqual({ ok: true, undo: null });
    expect(store.state.value.profile.name).toBe('Other');

    expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    const t = token(b)!;
    b.storage.setItem(UNDO_IMPORT_KEY, JSON.stringify({ id: t.id, until: t.until }));
    b.clock.now = t.until + 1;
    expect(store.canUndoImport()).toBe(false);
    expect(await store.undoImport()).toEqual({ ok: false, error: 'expired' });
    expect(store.state.value.profile.name).toBe('Sam');
  });
});

describe('data-d8: restore goes through the same protocol', () => {
  it('a rejected protective copy is no-undo; confirmed, it restores with no token; with a copy, Undo gives back exactly the state before (failed before)', async () => {
    const b = boot();
    const daily = await withDailyCopy(b);
    const failingPut: SnapshotStore = { durable: true, list: b.snapshots.list, get: b.snapshots.get, remove: b.snapshots.remove, put: () => Promise.reject(new Error('quota')) };
    store.configureStore({ snapshots: failingPut });
    const before = store.state.value;
    expect(await store.restoreSnapshot(daily)).toEqual({ ok: false, error: 'no-undo' });
    expect(store.state.value).toBe(before);
    expect(await store.restoreSnapshot(daily, { withoutUndo: true })).toEqual({ ok: true, undo: null });
    expect(store.state.value.profile.name).toBe('Sam');
    expect(saved(b).state.profile.name).toBe('Sam');
    expect(b.storage.getItem(UNDO_IMPORT_KEY)).toBeNull();

    store.configureStore({ snapshots: b.snapshots });
    store.setName('Again');
    b.advance(1000);
    const pre = structuredClone(store.state.value);
    const res = await store.restoreSnapshot(daily);
    expect(res).toEqual({ ok: true, undo: { until: b.clock.now + store.UNDO_IMPORT_MS } });
    expect(token(b)).toMatchObject({ kind: 'restore', gen: saved(b).gen });
    expect(store.state.value.profile.name).toBe('Sam');
    expect(await store.undoImport()).toEqual({ ok: true, undo: null });
    expect(store.state.value).toEqual(pre);
    expect(saved(b).state).toEqual(pre);
    expect(store.canUndoImport()).toBe(false);
  });
});

describe('data-d11: a no-undo import clears any earlier undo', () => {
  for (const oldCopy of ['readable', 'unavailable'] as const) {
    it(`A → B, then a no-undo import of C: no Undo is offered (the old copy ${oldCopy}) (failed before)`, async () => {
      const b = boot();
      const backup = twoSaves(b); // B is "Sam"; A is "Other"
      store.setName('C');
      const c = store.backupJson();
      store.setName('Other');
      b.advance(1000);
      expect(await store.applyImport(backup)).toMatchObject({ ok: true, undo: { until: expect.any(Number) } });
      const noCopies: SnapshotStore = { durable: true, list: b.snapshots.list, get: b.snapshots.get, remove: b.snapshots.remove, put: () => Promise.reject(new Error('quota')) };
      store.configureStore({ snapshots: noCopies });
      expect(await store.applyImport(c)).toEqual({ ok: false, error: 'no-undo' });
      expect(await store.applyImport(c, { withoutUndo: true })).toEqual({ ok: true, undo: null });
      expect(store.state.value.profile.name).toBe('C');
      if (oldCopy === 'readable') store.configureStore({ snapshots: b.snapshots });
      else store.configureStore({ snapshots: { durable: true, list: () => Promise.reject(new Error('x')), get: () => Promise.reject(new Error('x')), put: () => Promise.reject(new Error('x')), remove: () => Promise.reject(new Error('x')) } });
      expect(b.storage.getItem(UNDO_IMPORT_KEY)).toBeNull();
      expect(store.canUndoImport()).toBe(false);
      expect(await store.undoImport()).toMatchObject({ ok: false });
      expect(store.state.value.profile.name).toBe('C');
    });
  }
});

describe('FS5: a replacement never commits across a reset, the demo or a lost lock', () => {
  it('a reset between the protective put and its answer: superseded, the state stays fresh, no token, no copy left (failed before)', async () => {
    const inner = idb();
    const g = gated(inner);
    const b = boot({}, g.store);
    const backup = twoSaves(b);
    const hold = g.hold('put');
    const p = store.applyImport(backup);
    await hold.reached;
    store.resetAll();
    hold.release();
    expect(await p).toEqual({ ok: false, error: 'superseded' });
    expect(store.state.value.profile.onboarded).toBe(false);
    expect(store.state.value.habits).toEqual([]);
    expect(b.storage.getItem(UNDO_IMPORT_KEY)).toBeNull();
    expect(await preImports(inner)).toEqual([]);
    b.advance(60_000);
    expect(b.storage.getItem(SAVE_KEY) ?? '').not.toContain('"Sam"');
  });

  it('entering the demo mid-import: superseded, and the demo’s save is untouched (failed before)', async () => {
    const inner = idb();
    const g = gated(inner);
    const b = boot({}, g.store);
    const backup = twoSaves(b);
    const hold = g.hold('put');
    const p = store.applyImport(backup);
    await hold.reached;
    expect(store.enterDemo()).toBe(true);
    const demoDisk = b.storage.getItem(DEMO_KEY);
    const demoState = store.state.value;
    hold.release();
    expect(await p).toEqual({ ok: false, error: 'superseded' });
    expect(b.storage.getItem(DEMO_KEY)).toBe(demoDisk);
    expect(store.state.value).toBe(demoState);
    store.exitDemo();
    expect(store.state.value.profile.name).toBe('Other');
    expect(await preImports(inner)).toEqual([]);
  });

  it('the lock stolen mid-undo: superseded; memory, disk and token unchanged (failed before)', async () => {
    const locks = deferredLocks();
    const inner = idb();
    const g = gated(inner);
    const b = boot({ locks }, g.store);
    await locks.grant();
    const backup = twoSaves(b);
    expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    const shown = store.state.value;
    const disk = b.storage.getItem(SAVE_KEY);
    const t = b.storage.getItem(UNDO_IMPORT_KEY);
    const hold = g.hold('get');
    const p = store.undoImport();
    await hold.reached;
    await locks.steal();
    hold.release();
    expect(await p).toEqual({ ok: false, error: 'superseded' });
    expect(store.state.value).toBe(shown);
    expect(b.storage.getItem(SAVE_KEY)).toBe(disk);
    expect(b.storage.getItem(UNDO_IMPORT_KEY)).toBe(t);
  });

  it('closing the sheet (an aborted signal) mid-import: aborted, nothing changes, the fresh copy is removed (failed before)', async () => {
    const inner = idb();
    const g = gated(inner);
    const b = boot({}, g.store);
    const backup = twoSaves(b);
    const before = { state: store.state.value, disk: b.storage.getItem(SAVE_KEY) };
    const ctl = new AbortController();
    const hold = g.hold('put');
    const p = store.applyImport(backup, { signal: ctl.signal });
    await hold.reached;
    ctl.abort();
    hold.release();
    expect(await p).toEqual({ ok: false, error: 'aborted' });
    expect(store.state.value).toBe(before.state);
    expect(b.storage.getItem(SAVE_KEY)).toBe(before.disk);
    expect(await preImports(inner)).toEqual([]);
  });

  it('replacements are single-flight, with a replacing signal while one is in flight (failed before)', async () => {
    const inner = idb();
    const g = gated(inner);
    const b = boot({}, g.store);
    const backup = twoSaves(b);
    const hold = g.hold('put');
    const p = store.applyImport(backup);
    await hold.reached;
    expect(store.replacing.value).toBe(true);
    expect(await store.applyImport(backup)).toEqual({ ok: false, error: 'busy' });
    expect(await store.undoImport()).toEqual({ ok: false, error: 'busy' });
    expect(await store.restoreSnapshot('daily-2026-09-29')).toEqual({ ok: false, error: 'busy' });
    hold.release();
    expect(await p).toMatchObject({ ok: true });
    expect(store.replacing.value).toBe(false);
    expect(store.state.value.profile.name).toBe('Sam');
  });
});

describe('FS9: without durable copies there is no durable Undo', () => {
  it('no IndexedDB: import needs the no-undo confirmation, writes no token, and after reopening nothing is offered (failed before)', async () => {
    const b = fakeBrowser();
    store.configureStore({ snapshots: null });
    store.hydrate();
    const backup = twoSaves(b);
    expect(await store.applyImport(backup)).toEqual({ ok: false, error: 'no-undo' });
    expect(store.state.value.profile.name).toBe('Other');
    expect(await store.applyImport(backup, { withoutUndo: true })).toEqual({ ok: true, undo: null });
    expect(store.state.value.profile.name).toBe('Sam');
    expect(b.storage.getItem(UNDO_IMPORT_KEY)).toBeNull();
    store.configureStore({ snapshots: null });
    store.hydrate();
    expect(store.canUndoImport()).toBe(false);
  });

  it('with nothing yet to lose, an import needs no confirmation and promises no Undo', async () => {
    const b = fakeBrowser();
    store.configureStore({ snapshots: null });
    store.hydrate();
    const backup = twoSaves(b);
    store.resetAll();
    expect(await store.applyImport(backup)).toEqual({ ok: true, undo: null });
    expect(b.storage.getItem(UNDO_IMPORT_KEY)).toBeNull();
  });
});

describe('data-d12 (store half): the snapshot methods answer with results, never rejections', () => {
  it('a copy store whose reads reject: undo, restore and the list all resolve to unavailable, and the token stays (failed before)', async () => {
    const b = boot();
    const backup = twoSaves(b);
    expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    const t = b.storage.getItem(UNDO_IMPORT_KEY);
    const reject = () => Promise.reject(new Error('read failed'));
    store.configureStore({ snapshots: { durable: true, list: reject, get: reject, put: b.snapshots.put, remove: b.snapshots.remove } });
    await expect(store.undoImport()).resolves.toEqual({ ok: false, error: 'unavailable' });
    await expect(store.restoreSnapshot('daily-2026-09-29')).resolves.toEqual({ ok: false, error: 'unavailable' });
    await expect(store.listSnapshots()).resolves.toEqual({ ok: false, error: 'unavailable' });
    expect(b.storage.getItem(UNDO_IMPORT_KEY)).toBe(t);
    expect(store.canUndoImport()).toBe(true);
    expect(store.replacing.value).toBe(false);
  });

  it('a copy that is gone is not-found, and its token is cleared (failed before)', async () => {
    const b = boot();
    const backup = twoSaves(b);
    expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    await b.snapshots.remove(token(b)!.id);
    expect(await store.undoImport()).toEqual({ ok: false, error: 'not-found' });
    expect(store.canUndoImport()).toBe(false);
    expect(store.state.value.profile.name).toBe('Sam');
  });

  it('the list resolves to its snapshots (failed before)', async () => {
    const b = boot();
    await withDailyCopy(b);
    const res = await store.listSnapshots();
    expect(res.ok).toBe(true);
    expect(res.ok && res.snapshots).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'daily', day: '2026-09-29' })]));
  });
});

describe('P-persistence-11: pre-import copies are pruned after commit, never the one Undo needs', () => {
  it('five same-day imports keep at most KEEP[pre-import] copies, and the active target survives (failed before)', async () => {
    const b = boot();
    const backup = twoSaves(b);
    for (let i = 0; i < 5; i++) {
      b.clock.now += 60_000;
      expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    }
    const ids = await preImports(b.snapshots);
    expect(ids.length).toBeLessThanOrEqual(KEEP['pre-import']);
    expect(ids).toContain(token(b)!.id);
  });

  it('even when the clock went back and the active copy is the oldest by time (failed before)', async () => {
    const b = boot();
    const backup = twoSaves(b);
    const base = b.clock.now;
    for (const hours of [4, 3, 2, 1]) {
      b.clock.now = base + hours * 3_600_000;
      expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    }
    const ids = await preImports(b.snapshots);
    expect(ids.length).toBeLessThanOrEqual(KEEP['pre-import']);
    expect(ids).toContain(token(b)!.id);
    expect(await store.undoImport()).toEqual({ ok: true, undo: null });
  });
});
