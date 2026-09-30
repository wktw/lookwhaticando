/**
 * Save identity and one adoption routine (WP-A2 in docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md:
 * data-d5, FS3, the ownership half of FS4, P-persistence-03). Every save lineage carries a `gen`
 * beside its `rev`; every way a window takes a save in (boot, another window's storage event, Use
 * here, leaving the demo, the writer lock's grant) goes through one `adopt()`; and nothing but the
 * main save's own queue writes before this window owns the save. Each case names its finding; the
 * ones marked "failed before" failed against the code before this package (see the plan's status
 * note under WP-A2).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '@/state/defaults';
import * as persist from '@/state/persist';
import { SAVE_KEY, THEME_KEY, backupKeyOf, corruptKeyOf, encodeEnvelope, parseEnvelope, removeNamespace } from '@/state/persist';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { deferredLocks, fakeBrowser, fakeLocks } from './fixtures';

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

type Saved = { v: number; rev: number; gen?: string; state: AppState };
const saved = (b: ReturnType<typeof fakeBrowser>) => JSON.parse(b.storage.getItem(SAVE_KEY)!) as Saved;
const settle = () => new Promise<void>((r) => setTimeout(r, 0));
const GEN = /^[0-9a-f]{32}$/;
const OLD_GEN = 'a'.repeat(32);
const NEW_GEN = 'b'.repeat(32);

/** An envelope as another window (or another build) writes it; `gen` left out is a legacy save. */
function envelope(state: AppState, rev: number, opts: { v?: number; gen?: string } = {}): string {
  return JSON.stringify({ v: opts.v ?? state.version, appVersion: 'other', rev, savedAt: 0, ...(opts.gen ? { gen: opts.gen } : {}), state });
}

/** A lived-in save: onboarded, with the Walk habit watered today. Made by a real store session. */
function livedIn(): AppState {
  fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Sam', templateIds: [] });
  store.checkIn(store.createHabit(input()));
  return store.state.value;
}

/** A newer catkin's save: schema 2, which this build can read but never writes over. */
function newer(now: number): AppState {
  const s = createInitialState(now);
  return { ...s, version: 2, profile: { ...s.profile, name: 'Future Sam', onboarded: true } } as AppState;
}

const hasWalk = (s: AppState) => s.habits.some((h) => h.name === 'Walk');

afterEach(() => {
  store.configureStore({ locks: null });
});

describe('INV-3: the envelope carries a save identity (gen) beside its rev', () => {
  it('encodeEnvelope writes gen; parseEnvelope and peekHead read it back', () => {
    const s = createInitialState(Date.UTC(2026, 8, 29));
    const raw = encodeEnvelope(s, 3, 0, 'test', OLD_GEN);
    expect(JSON.parse(raw)).toMatchObject({ v: 1, rev: 3, gen: OLD_GEN });
    expect(parseEnvelope(raw)).toMatchObject({ kind: 'ok', rev: 3, gen: OLD_GEN });
    const storage = persist.memoryStorage({ [SAVE_KEY]: raw });
    expect(persist.peekHead(storage, SAVE_KEY)).toEqual({ gen: OLD_GEN, rev: 3 });
    expect(persist.peekHead(persist.memoryStorage(), SAVE_KEY)).toBeNull();
  });

  it('a legacy envelope without gen still loads, and the first write mints one', () => {
    const s = livedIn();
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, envelope(s, 4));
    expect(persist.peekHead(b.storage, SAVE_KEY)).toEqual({ gen: undefined, rev: 4 });
    store.hydrate();
    expect(hasWalk(store.state.value)).toBe(true);
    store.setName('Samira');
    b.advance(1000);
    expect(saved(b)).toMatchObject({ rev: 5, gen: expect.stringMatching(GEN) });
    const gen = saved(b).gen;
    store.setName('Sam');
    b.advance(1000);
    expect(saved(b)).toMatchObject({ rev: 6, gen });
  });

  it('a fresh start, a reset, an import and a restore each begin a new gen; ordinary writes keep it', async () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.advance(1000);
    const first = saved(b).gen;
    expect(first).toMatch(GEN);
    store.setName('Samira');
    b.advance(1000);
    expect(saved(b).gen).toBe(first);
    const backup = store.backupJson();

    store.resetAll();
    store.completeOnboarding({ name: 'Jo', templateIds: [] });
    b.advance(1000);
    const afterReset = saved(b).gen;
    expect(afterReset).toMatch(GEN);
    expect(afterReset).not.toBe(first);

    expect(await store.applyImport(backup)).toEqual({ ok: true });
    const afterImport = saved(b).gen;
    expect(afterImport).toMatch(GEN);
    expect(afterImport).not.toBe(afterReset);

    const pre = (await store.listSnapshots()).find((m) => m.kind === 'pre-import')!;
    expect(await store.restoreSnapshot(pre.id)).toBe(true);
    const afterRestore = saved(b).gen;
    expect(afterRestore).toMatch(GEN);
    expect(afterRestore).not.toBe(afterImport);
  });
});

describe('data-d5: a newer catkin’s save is never written over', () => {
  it('Use here over a v2 save opens it read-only, asks for no lock, and v stays 2 (failed before)', async () => {
    const locks = deferredLocks();
    const s = livedIn();
    const c = fakeBrowser({ locks });
    c.storage.setItem(SAVE_KEY, envelope(s, 5, { gen: OLD_GEN }));
    store.hydrate();
    await locks.refuse();
    expect(store.readOnly.value).toBe('other-window');
    // The owner updates to a newer catkin, which writes schema 2 (its storage event is late).
    c.storage.setItem(SAVE_KEY, envelope(newer(c.clock.now), 6, { v: 2, gen: NEW_GEN }));
    const asked = locks.asked;
    store.useHere();
    await settle();
    expect(store.readOnly.value).toBe('newer-version');
    expect(locks.asked).toBe(asked);
    expect(store.state.value.profile.name).toBe('Future Sam');
    store.setName('Old build');
    store.flushSaves();
    c.advance(60_000);
    expect(saved(c).v).toBe(2);
    expect(saved(c).state.profile.name).toBe('Future Sam');
  });

  it('a v2 save that lands between asking for the lock and getting it (failed before)', async () => {
    const locks = deferredLocks();
    const s = livedIn();
    const c = fakeBrowser({ locks });
    c.storage.setItem(SAVE_KEY, envelope(s, 5, { gen: OLD_GEN }));
    store.hydrate();
    await locks.refuse();
    store.useHere();
    expect(store.ownership.value).toBe('acquiring');
    // Between the request and the grant, a newer catkin writes schema 2 and lets the lock go.
    c.storage.setItem(SAVE_KEY, envelope(newer(c.clock.now), 6, { v: 2, gen: NEW_GEN }));
    await locks.grant();
    expect(store.readOnly.value).toBe('newer-version');
    expect(store.ownership.value).not.toBe('granted');
    store.setName('Old build');
    store.checkIn(store.state.value.habits[0]?.id ?? 'none');
    store.flushSaves();
    c.advance(60_000);
    expect(saved(c).v).toBe(2);
    expect(saved(c).state.profile.name).toBe('Future Sam');
  });

  it('a v2 save announced by a storage event stops this window writing (failed before)', () => {
    const s = livedIn();
    const c = fakeBrowser();
    c.storage.setItem(SAVE_KEY, envelope(s, 5));
    store.hydrate(); // no Web Locks: this window writes, best effort
    c.advance(1000);
    store.setName('Typed here'); // debounced, still pending
    c.storage.setItem(SAVE_KEY, envelope(newer(c.clock.now), 9, { v: 2, gen: NEW_GEN }));
    c.fire('storage', { key: SAVE_KEY });
    expect(store.readOnly.value).toBe('newer-version');
    c.advance(60_000);
    store.flushSaves();
    expect(saved(c).v).toBe(2);
    expect(saved(c).state.profile.name).toBe('Future Sam');
  });
});

describe('FS3: starting over in another window is never undone here', () => {
  /** Window B: read-only (another window owns the save) and showing the old save at rev 5. */
  function readOnlyAtRev5() {
    const s = livedIn();
    const b = fakeBrowser({ locks: fakeLocks({ byOther: true }) });
    b.storage.setItem(SAVE_KEY, envelope(s, 5, { gen: OLD_GEN }));
    store.hydrate();
    return b;
  }

  it('a deletion event gives a fresh state and the notice (failed before)', async () => {
    const b = readOnlyAtRev5();
    await settle();
    expect(store.readOnly.value).toBe('other-window');
    expect(hasWalk(store.state.value)).toBe(true);
    removeNamespace(b.storage); // Start over, in the owner's window
    b.fire('storage', { key: SAVE_KEY, newValue: null });
    expect(hasWalk(store.state.value)).toBe(false);
    expect(store.state.value.profile.onboarded).toBe(false);
    expect(store.crossWindowNotice.value).toBe('started-over');
    store.dismissCrossWindowNotice();
    expect(store.crossWindowNotice.value).toBeNull();
  });

  it('R203 inverted: Use here after a reset elsewhere (its event never seen), then an edit: no old habits on disk (failed before)', async () => {
    const b = readOnlyAtRev5();
    await settle();
    removeNamespace(b.storage);
    store.useHere();
    await settle();
    expect(store.readOnly.value).toBe(false);
    expect(hasWalk(store.state.value)).toBe(false);
    expect(store.crossWindowNotice.value).toBe('started-over');
    store.setName('Jo');
    b.advance(1000);
    store.flushSaves();
    expect(hasWalk(saved(b).state)).toBe(false);
    expect(saved(b).state.profile.name).toBe('Jo');
  });

  it('R203 inverted, with the event seen first: Use here, then an edit (failed before)', async () => {
    const b = readOnlyAtRev5();
    await settle();
    removeNamespace(b.storage);
    b.fire('storage', { key: SAVE_KEY, newValue: null });
    store.useHere();
    await settle();
    store.completeOnboarding({ name: 'Jo', templateIds: [] });
    store.setName('Jo');
    b.advance(1000);
    store.flushSaves();
    expect(hasWalk(saved(b).state)).toBe(false);
    expect(saved(b).state.profile.name).toBe('Jo');
  });

  it('a reset, then a new rev-1 profile, is adopted by a read-only tab holding rev 5', async () => {
    const b = readOnlyAtRev5();
    await settle();
    removeNamespace(b.storage);
    b.fire('storage', { key: SAVE_KEY, newValue: null });
    const fresh = createInitialState(b.clock.now);
    const jo: AppState = { ...fresh, profile: { ...fresh.profile, name: 'Jo', onboarded: true } };
    b.storage.setItem(SAVE_KEY, envelope(jo, 1, { gen: NEW_GEN }));
    b.fire('storage', { key: SAVE_KEY });
    expect(store.state.value.profile.name).toBe('Jo');
    expect(hasWalk(store.state.value)).toBe(false);
  });

  it('a new rev-1 profile is adopted over rev 5 by its new gen alone, even with the deletion unseen (failed before)', () => {
    const s = livedIn();
    const b = fakeBrowser(); // no Web Locks: this window keeps its own queue at rev 5
    b.storage.setItem(SAVE_KEY, envelope(s, 5, { gen: OLD_GEN }));
    store.hydrate();
    b.advance(1000);
    const fresh = createInitialState(b.clock.now);
    const jo: AppState = { ...fresh, profile: { ...fresh.profile, name: 'Jo', onboarded: true } };
    b.storage.setItem(SAVE_KEY, envelope(jo, 1, { gen: NEW_GEN }));
    b.fire('storage', { key: SAVE_KEY });
    expect(store.state.value.profile.name).toBe('Jo');
    store.setName('Jo B');
    b.advance(1000);
    expect(hasWalk(saved(b).state)).toBe(false);
    expect(saved(b)).toMatchObject({ rev: 2, gen: NEW_GEN });
  });

  it('an older rev of the same save is ignored (a late event), as before', () => {
    const s = livedIn();
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, envelope(s, 5, { gen: OLD_GEN }));
    store.hydrate();
    const late = { ...s, profile: { ...s.profile, name: 'Stale' } };
    b.storage.setItem(SAVE_KEY, envelope(late, 3, { gen: OLD_GEN }));
    b.fire('storage', { key: SAVE_KEY });
    expect(store.state.value.profile.name).toBe('Sam');
  });

  it('leaving the demo after a reset elsewhere starts fresh, with the notice, and never writes the old save back (failed before)', () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    store.createHabit(input());
    b.advance(1000);
    expect(store.enterDemo()).toBe(true);
    removeNamespace(b.storage, SAVE_KEY); // another window started over (the demo's keys stay)
    store.exitDemo();
    expect(hasWalk(store.state.value)).toBe(false);
    expect(store.crossWindowNotice.value).toBe('started-over');
    store.completeOnboarding({ name: 'Jo', templateIds: [] });
    b.advance(1000);
    expect(hasWalk(saved(b).state)).toBe(false);
  });
});

describe('P-persistence-03: no recovery copy or sidecar before this window owns the save', () => {
  /** Every key written, except the theme mirror (pre-paint only, and deliberately ungated). */
  function watch(b: ReturnType<typeof fakeBrowser>) {
    const keys: string[] = [];
    const set = b.storage.setItem;
    b.storage.setItem = (k: string, v: string) => {
      if (k !== THEME_KEY) keys.push(k);
      set(k, v);
    };
    const put = vi.spyOn(b.snapshots, 'put');
    return { keys, put };
  }

  it('no snapshots.put and no :backup write before the grant; both after it (failed before)', async () => {
    const locks = deferredLocks();
    const s = livedIn();
    const b = fakeBrowser({ locks });
    b.storage.setItem(SAVE_KEY, envelope(s, 3, { gen: OLD_GEN }));
    const w = watch(b);
    store.hydrate();
    store.startClock()();
    await settle();
    expect(w.put).not.toHaveBeenCalled();
    expect(w.keys).not.toContain(backupKeyOf(SAVE_KEY));
    await locks.grant();
    await settle();
    expect(w.keys).toContain(backupKeyOf(SAVE_KEY));
    expect(w.put).toHaveBeenCalled();
  });

  it('a damaged main save is kept aside (:corrupt) only once this window owns the save (failed before)', async () => {
    const locks = deferredLocks();
    const s = livedIn();
    const b = fakeBrowser({ locks });
    b.storage.setItem(SAVE_KEY, '{"v":1,"state":{"version":1');
    b.storage.setItem(backupKeyOf(SAVE_KEY), envelope(s, 3, { gen: OLD_GEN }));
    const w = watch(b);
    store.hydrate();
    await settle();
    expect(hasWalk(store.state.value)).toBe(true);
    expect(w.keys).not.toContain(corruptKeyOf(SAVE_KEY));
    await locks.grant();
    expect(b.storage.getItem(corruptKeyOf(SAVE_KEY))).toBe('{"v":1,"state":{"version":1');
  });

  it('a refused window writes no backup, quarantine or snapshot (failed before)', async () => {
    const locks = deferredLocks();
    const s = livedIn();
    const b = fakeBrowser({ locks });
    b.storage.setItem(SAVE_KEY, envelope(s, 3, { gen: OLD_GEN }));
    const w = watch(b);
    store.hydrate();
    await locks.refuse();
    store.startClock()();
    await settle();
    expect(w.keys).toEqual([]);
    expect(w.put).not.toHaveBeenCalled();
  });

  it('an import while the lock is still being asked for is refused before any snapshot is taken (failed before)', async () => {
    const locks = deferredLocks();
    const s = livedIn();
    const backup = store.backupJson();
    const b = fakeBrowser({ locks });
    b.storage.setItem(SAVE_KEY, envelope(s, 3, { gen: OLD_GEN }));
    const w = watch(b);
    store.hydrate();
    expect(await store.applyImport(backup)).toEqual({ ok: false, error: 'read-only' });
    expect(w.put).not.toHaveBeenCalled();
    expect(w.keys).toEqual([]);
  });
});

describe('preserved: adoption of a newer rev and the Use here flow', () => {
  it('a newer rev of the same save from another window is adopted, and its pending change dropped', () => {
    const s = livedIn();
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, envelope(s, 5, { gen: OLD_GEN }));
    store.hydrate();
    b.advance(1000);
    store.setName('Typed here');
    const next = { ...s, profile: { ...s.profile, name: 'From there' } };
    b.storage.setItem(SAVE_KEY, envelope(next, 9, { gen: OLD_GEN }));
    b.fire('storage', { key: SAVE_KEY });
    expect(store.state.value.profile.name).toBe('From there');
    b.advance(1000);
    expect(saved(b).state.profile.name).toBe('From there');
    store.setName('Then here');
    b.advance(1000);
    expect(saved(b)).toMatchObject({ rev: 10, gen: OLD_GEN });
  });

  it('Use here takes over the save as it is on disk, and the next edit continues its lineage', async () => {
    const s = livedIn();
    const b = fakeBrowser({ locks: fakeLocks({ byOther: true }) });
    b.storage.setItem(SAVE_KEY, envelope(s, 5, { gen: OLD_GEN }));
    store.hydrate();
    const next = { ...s, profile: { ...s.profile, name: 'Owner' } };
    b.storage.setItem(SAVE_KEY, envelope(next, 7, { gen: OLD_GEN }));
    store.useHere();
    await settle();
    expect(store.readOnly.value).toBe(false);
    expect(store.ownership.value).toBe('granted');
    expect(store.state.value.profile.name).toBe('Owner');
    expect(store.crossWindowNotice.value).toBeNull();
    store.setName('Here now');
    b.advance(1000);
    expect(saved(b)).toMatchObject({ rev: 8, gen: OLD_GEN });
    expect(hasWalk(saved(b).state)).toBe(true);
  });
});
