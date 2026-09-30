/**
 * The test-only schema-2 build (plan §5.5, INV-5): SCHEMA_VERSION is 2 here and the one migration
 * is a stub v1 → v2, so every historical source must go through the migration to be used at all.
 * Old main, old external backup, old daily copy, an active Undo's copy and a newer (v3) save, each
 * from the corpus or written as their builds write them, through the store's real paths and
 * through `decodeState`. This is what has to be green before any real `SCHEMA_VERSION` bump.
 *
 * Cases marked "failed before" failed against the code before WP-A4 (0e1fe70) on what it did (the
 * daily copy and the Undo were validated without migrating, and the newer save's backup was
 * stamped as this build's schema); "new API" ones failed there only because `decodeState` did not
 * exist; unmarked ones are guards that passed there too.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('@/state/types', async (original) => ({ ...(await original<typeof import('@/state/types')>()), SCHEMA_VERSION: 2 }));
vi.mock('@/state/migrate', async (original) => {
  const real = await original<typeof import('@/state/migrate')>();
  // The stub v1 → v2 step: it marks what it touched, so a test can tell a migrated state apart.
  const STUB = { 1: (s: Record<string, unknown>) => ({ ...s, profile: { ...(s.profile as object), migratedFrom1: true } }) };
  return { ...real, MIGRATIONS: STUB, migrate: (raw: unknown, _m?: unknown, target?: number) => real.migrate(raw, STUB, target ?? 2) };
});

const { SAVE_KEY, UNDO_IMPORT_KEY } = await import('@/state/persist');
const { SCHEMA_VERSION } = await import('@/state/types');
const store = await import('@/state/store');
const { fakeBrowser } = await import('./fixtures');

vi.setConfig({ testTimeout: 30_000 });

const CORPUS = new URL('../../fixtures/saves/', import.meta.url);
const fixture = (build: string, file: string): string => readFileSync(new URL(`${build}/${file}`, CORPUS), 'utf8');
type Env = { v: number; state: { version: number; profile: Record<string, unknown>; habits: { id: string }[] } };
const envOf = (raw: string) => JSON.parse(raw) as Env;

/** A save from a catkin newer still (schema 3). */
const v3Raw = () => {
  const env = envOf(fixture('b053e0a', 'main-demo.json'));
  return JSON.stringify({ ...env, v: 3, rev: 4, state: { ...env.state, version: 3, laterThing: [1, 2, 3] } });
};

afterEach(() => {
  store.configureStore({ locks: null });
});

describe('a test-only schema-2 build reads every older source through the one decoder', () => {
  it('the build under test is schema 2', () => {
    expect(SCHEMA_VERSION).toBe(2);
  });

  it('old main: a v1 save from the corpus opens migrated, and its next write is v2', () => {
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, fixture('f6ed7ea', 'main-demo.json'));
    store.hydrate();
    expect(store.loadIssue.value).toBeNull();
    expect(store.state.value.version).toBe(2);
    expect(store.state.value.profile).toMatchObject({ name: 'Sam', migratedFrom1: true });
    store.setName('Sam B');
    b.advance(1000);
    expect(envOf(b.storage.getItem(SAVE_KEY)!)).toMatchObject({ v: 2, state: { version: 2 } });
  });

  it('old external backup: the oldest build’s backup file imports, migrated', async () => {
    const b = fakeBrowser();
    store.hydrate();
    expect(await store.applyImport(fixture('f6ed7ea', 'backup-demo.json'))).toMatchObject({ ok: true });
    expect(store.state.value.profile).toMatchObject({ name: 'Sam', migratedFrom1: true });
    expect(envOf(b.storage.getItem(SAVE_KEY)!).v).toBe(2);
  });

  it('old daily copy: a v1 copy restores, migrated (failed before)', async () => {
    const b = fakeBrowser();
    store.hydrate();
    const snap = JSON.parse(fixture('f6ed7ea', 'snapshot-demo.json'));
    b.snapshots.records.set(snap.id, snap);
    expect(await store.restoreSnapshot(snap.id)).toMatchObject({ ok: true });
    expect(store.state.value.version).toBe(2);
    expect(store.state.value.habits.map((h) => h.id)).toEqual(snap.state.habits.map((h: { id: string }) => h.id));
  });

  it('active Undo: an Undo whose copy was kept by the v1 build takes the save back to it, migrated (failed before)', async () => {
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, fixture('b053e0a', 'main-fresh.json'));
    store.hydrate();
    // The v1 build imported over its lived-in sill: its copy of that sill, and its undo note.
    const lived = envOf(fixture('b053e0a', 'main-demo.json')).state;
    b.snapshots.records.set('pre-import-1', { id: 'pre-import-1', kind: 'pre-import', day: '2026-09-29', savedAt: 1, habits: 6, checkins: 1, appVersion: 'v1', state: lived as never });
    b.storage.setItem(UNDO_IMPORT_KEY, JSON.stringify({ id: 'pre-import-1', until: b.clock.now + 3_600_000, gen: '0123456789abcdef0123456789abcdef', kind: 'import' }));
    expect(store.canUndoImport()).toBe(true);
    expect(await store.undoImport()).toMatchObject({ ok: true });
    expect(store.state.value).toMatchObject({ version: 2, profile: { name: 'Sam', migratedFrom1: true } });
  });

  it('newer rescue: a v3 save opens read-only and its backup is its own bytes, still v3 (failed before)', () => {
    const b = fakeBrowser();
    const raw = v3Raw();
    b.storage.setItem(SAVE_KEY, raw);
    store.hydrate();
    expect(store.readOnly.value).toBe('newer-version');
    expect(store.backupJson()).toBe(raw);
    expect(b.storage.getItem(SAVE_KEY)).toBe(raw);
  });

  it('new API: decodeState takes all five sources: old main, old backup, old daily copy, an Undo’s copy, a newer save', async () => {
    const { decodeState } = await import('@/state/decode');
    const main = decodeState(envOf(fixture('cf30bcf', 'main-demo.json')).state, 'main');
    const backup = decodeState((JSON.parse(fixture('f6ed7ea', 'backup-demo.json')) as Env).state, 'import');
    const daily = decodeState((JSON.parse(fixture('f6ed7ea', 'snapshot-demo.json')) as Env).state, 'snapshot');
    const undo = decodeState(envOf(fixture('b053e0a', 'main-demo.json')).state, 'undo');
    const newer = decodeState(envOf(v3Raw()).state, 'main');
    for (const d of [main, backup, daily, undo]) expect(d).toMatchObject({ kind: 'ok', from: 1, migrated: true, state: { version: 2 } });
    expect(newer).toMatchObject({ kind: 'newer', version: 3 });
    expect(decodeState(envOf(v3Raw()).state, 'snapshot')).toMatchObject({ kind: 'newer', version: 3 });
  });
});
