/**
 * One decoder and schema-safe rescue (WP-A4 in docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md:
 * data-d6, FS2, P-persistence-04 and the decode half of data-d5). Every historical source (the main
 * save, `:backup`, an import, a daily copy, an Undo's copy) goes through `decodeState`, which fills
 * only the omissions a real catkin build wrote (ADDITIVE_DEFAULTS, from the corpus in
 * tests/fixtures/saves, DEC-E1) and calls anything else missing damage. A newer catkin's save, and
 * a damaged one, keep their bytes for rescue, and a backup made from a newer save is those bytes.
 *
 * Cases marked "failed before" failed against the code before WP-A4 (0e1fe70) on what it did; the
 * ones marked "new API" failed there only because the function, field or line did not exist yet.
 * Unmarked cases are guards that passed there too (see the plan's status note under WP-A4).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createInitialState } from '@/state/defaults';
import { SAVE_KEY, backupKeyOf, corruptKeyOf, memoryStorage, readSave } from '@/state/persist';
import { decodePayload, parseBackupText } from '@/state/handoff';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { fakeBrowser } from './fixtures';

vi.setConfig({ testTimeout: 30_000 });

type Obj = Record<string, unknown>;
const CORPUS = new URL('../../fixtures/saves/', import.meta.url);
const BUILDS = readdirSync(CORPUS).filter((d) => /^[0-9a-f]{7}$/.test(d)).sort();
const fixture = (build: string, file: string): string => readFileSync(new URL(`${build}/${file}`, CORPUS), 'utf8');
const envOf = (raw: string) => JSON.parse(raw) as { v: number; rev: number; gen?: string; savedAt: number; state: Obj };
/** The newest corpus build's lived-in save (a demo sill, made by that build's own reducers). */
const livedInRaw = () => fixture('b053e0a', 'main-demo.json');

/** The lived-in envelope with `edit` applied to its state (a damaged save). */
function damaged(edit: (s: Obj) => void, raw = livedInRaw()): string {
  const env = envOf(raw);
  edit(env.state);
  return JSON.stringify(env);
}
const without = (path: string) => (s: Obj) => {
  const [a, b] = path.split('.') as [string, string | undefined];
  if (b === undefined) delete s[a];
  else delete (s[a] as Obj)[b];
};

/** A newer catkin's save (schema 2). `readable`: it still reads as a schema-1 state. */
function newerRaw(readable: boolean): string {
  const s = createInitialState(Date.UTC(2026, 8, 20)) as unknown as Obj;
  const state = { ...s, version: 2, profile: { name: 'Future Sam', onboarded: true, createdAt: 1 }, futureThing: { kept: true }, ...(readable ? {} : { wallet: { coins: 'lots' } }) };
  // Written the way a newer build writes it, with its own key order and spacing.
  return JSON.stringify({ v: 2, appVersion: 'future', rev: 12, savedAt: 1, gen: 'f'.repeat(32), state }, null, 1);
}

afterEach(() => {
  store.configureStore({ locks: null });
});

describe('DEC-E1: every save a catkin build wrote still loads (tests/fixtures/saves)', () => {
  it('the corpus has the five shape-changing builds, oldest first', () => {
    expect(BUILDS).toEqual(['57c0faa', '5e4fa89', 'b053e0a', 'cf30bcf', 'f6ed7ea'].sort());
  });

  it.each(BUILDS.flatMap((b) => ['main-fresh.json', 'main-demo.json'].map((f) => [b, f] as const)))('%s %s loads with every section as written', (build, file) => {
    const raw = fixture(build, file);
    const res = readSave(memoryStorage({ [SAVE_KEY]: raw }), SAVE_KEY);
    expect(res.kind).toBe('ok');
    if (res.kind !== 'ok') return;
    const written = envOf(raw).state;
    const loaded = res.state as unknown as Obj;
    for (const k of Object.keys(written)) {
      if (k === 'settings') continue;
      expect(loaded[k], k).toEqual(written[k]);
    }
    // Settings: what was written, plus at most the allow-listed historical omissions.
    const ws = written.settings as Obj;
    const ls = loaded.settings as Obj;
    for (const k of Object.keys(ws)) expect(ls[k], `settings.${k}`).toEqual(ws[k]);
    const added = Object.keys(ls).filter((k) => !(k in ws));
    expect(added.every((k) => ['showCompanions', 'compactToday', 'quoteNotes'].includes(k))).toBe(true);
  });

  it('the oldest build’s backup file and clipboard payload both import', async () => {
    const backup = await parseBackupText(fixture('f6ed7ea', 'backup-demo.json'));
    expect(backup).toMatchObject({ ok: true, device: 'iPhone · Safari', savedAt: envOf(fixture('f6ed7ea', 'main-demo.json')).savedAt });
    expect(backup.ok && backup.state.habits).toEqual(envOf(fixture('f6ed7ea', 'main-demo.json')).state.habits);
    expect((await parseBackupText(fixture('f6ed7ea', 'payload-fresh.txt'))).ok).toBe(true);
  });

  it('new API: decodeState reads every build’s saves, filling only what that build left out', async () => {
    const { decodeState } = await import('@/state/decode');
    for (const build of BUILDS) {
      for (const file of ['main-fresh.json', 'main-demo.json']) {
        const out = decodeState(envOf(fixture(build, file)).state, 'main');
        expect(out.kind, `${build} ${file}`).toBe('ok');
        expect(out.kind === 'ok' && out.filled, `${build} ${file}`).toEqual(build === 'f6ed7ea' ? ['settings.showCompanions', 'settings.compactToday', 'settings.quoteNotes'] : []);
      }
    }
    const snap = JSON.parse(fixture('f6ed7ea', 'snapshot-demo.json')) as { state: unknown };
    expect(decodeState(snap.state, 'snapshot')).toMatchObject({ kind: 'ok', filled: ['settings.showCompanions', 'settings.compactToday', 'settings.quoteNotes'] });
    const backup = JSON.parse(fixture('f6ed7ea', 'backup-demo.json')) as { state: unknown };
    expect(decodeState(backup.state, 'import').kind).toBe('ok');
  });

  it('new API: the allowlist is exactly the corpus’s omissions, each with the build that added it', async () => {
    const { ADDITIVE_DEFAULTS } = await import('@/state/migrate');
    expect(ADDITIVE_DEFAULTS.map((d) => [d.path, d.addedIn, d.value])).toEqual([
      ['settings.showCompanions', '57c0faa', true],
      ['settings.compactToday', '57c0faa', false],
      ['settings.quoteNotes', '57c0faa', true],
    ]);
  });

  it('new API: decodeState never changes what it is given', async () => {
    const { decodeState } = await import('@/state/decode');
    const state = envOf(fixture('f6ed7ea', 'main-demo.json')).state;
    const before = JSON.stringify(state);
    decodeState(state, 'import');
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('data-d6: missing core data is damage, never an empty history', () => {
  it('a version-only save is corrupt (failed before)', () => {
    const res = readSave(memoryStorage({ [SAVE_KEY]: JSON.stringify({ v: 1, rev: 3, savedAt: 0, state: { version: 1 } }) }), SAVE_KEY);
    expect(res.kind).toBe('corrupt');
  });

  it('a lived-in save missing its logs falls back to a valid :backup (failed before)', () => {
    const good = livedInRaw();
    const bad = damaged(without('logs'));
    const res = readSave(memoryStorage({ [SAVE_KEY]: bad, [backupKeyOf(SAVE_KEY)]: good }), SAVE_KEY);
    expect(res).toMatchObject({ kind: 'ok', fromBackup: true, damaged: bad });
    expect(res.kind === 'ok' && res.state.logs).toEqual(envOf(good).state.logs);
  });

  it('the same save as an import is a damaged backup (failed before)', async () => {
    expect(await parseBackupText(damaged(without('logs')))).toMatchObject({ ok: false, error: 'damaged-backup' });
    const file = JSON.stringify({ format: 'catkin-backup', v: 1, appVersion: 'x', exportedAt: 1, device: 'd', state: envOf(damaged(without('ledger'))).state });
    expect(await parseBackupText(file)).toMatchObject({ ok: false, error: 'damaged-backup' });
  });

  // Missing habits or pets already read as damage before WP-A4 (logs and ledger entries then name
  // habits and pets that aren't there), so those two are guards; every other one failed before.
  it.each(['profile', 'settings', 'habits', 'logs', 'offDays', 'wallet', 'lifetime', 'ledger', 'collection', 'pity', 'pets', 'pantry', 'shelf', 'badges', 'inbox', 'clock'].map((section) => [section, section === 'habits' || section === 'pets' ? '' : ' (failed before)'] as const))(
    'a lived-in save missing %s is corrupt%s',
    (section) => {
      expect(readSave(memoryStorage({ [SAVE_KEY]: damaged(without(section)) }), SAVE_KEY).kind).toBe('corrupt');
    },
  );

  it.each(['profile.name', 'profile.createdAt', 'settings.weekStart', 'settings.volume', 'wallet.coins', 'wallet.stardust', 'lifetime.checkins', 'ledger.daily', 'ledger.recent', 'shelf.places', 'clock.maxEpochMs'])(
    'a lived-in save missing %s is corrupt (failed before)',
    (field) => {
      expect(readSave(memoryStorage({ [SAVE_KEY]: damaged(without(field)) }), SAVE_KEY).kind).toBe('corrupt');
    },
  );

  it('a save without the three settings an early build left out still loads, with their defaults', () => {
    const res = readSave(memoryStorage({ [SAVE_KEY]: damaged((s) => ['showCompanions', 'compactToday', 'quoteNotes'].forEach((k) => delete (s.settings as Obj)[k])) }), SAVE_KEY);
    expect(res.kind === 'ok' && res.state.settings).toMatchObject({ showCompanions: true, compactToday: false, quoteNotes: true });
  });

  it('boot: a save missing its logs opens its :backup, and keeps the damaged text aside (failed before)', () => {
    const b = fakeBrowser();
    const bad = damaged(without('logs'));
    b.storage.setItem(SAVE_KEY, bad);
    b.storage.setItem(backupKeyOf(SAVE_KEY), livedInRaw());
    store.hydrate();
    expect(store.loadIssue.value?.kind).toBe('recovered-from-backup');
    expect(store.state.value.logs).toEqual(envOf(livedInRaw()).state.logs);
    expect(b.storage.getItem(corruptKeyOf(SAVE_KEY))).toBe(bad);
  });

  it('boot: a save missing its wallet, with no backup, is kept byte for byte and never opens as an empty wallet (failed before)', () => {
    const b = fakeBrowser();
    const bad = damaged(without('wallet'));
    b.storage.setItem(SAVE_KEY, bad);
    store.hydrate();
    expect(store.loadIssue.value?.kind).toBe('corrupt-save');
    expect(b.storage.getItem(corruptKeyOf(SAVE_KEY))).toBe(bad);
    expect(store.state.value.habits).toEqual([]);
  });

  it('new API: the damaged save’s bytes are the rescue record', () => {
    const b = fakeBrowser();
    const bad = damaged(without('wallet'));
    b.storage.setItem(SAVE_KEY, bad);
    store.hydrate();
    expect(store.rescue.value).toEqual({ kind: 'damaged', raw: bad });
    store.resetAll();
    expect(store.rescue.value).toBeNull();
  });

  it('fault: a truncated envelope that is no longer JSON falls back to :backup', () => {
    const raw = livedInRaw();
    const res = readSave(memoryStorage({ [SAVE_KEY]: raw.slice(0, raw.length / 2), [backupKeyOf(SAVE_KEY)]: raw }), SAVE_KEY);
    expect(res).toMatchObject({ kind: 'ok', fromBackup: true });
  });

  it('fault: an envelope cut after its habits, closed again so it still parses, falls back to :backup (failed before)', () => {
    // The oldest build's sill (no pet keeps a habit company, so nothing left names what was cut).
    const raw = fixture('f6ed7ea', 'main-demo.json');
    const cut = `${raw.slice(0, raw.indexOf(',"logs":'))}}}`;
    expect(() => JSON.parse(cut)).not.toThrow();
    const res = readSave(memoryStorage({ [SAVE_KEY]: cut, [backupKeyOf(SAVE_KEY)]: raw }), SAVE_KEY);
    expect(res).toMatchObject({ kind: 'ok', fromBackup: true, damaged: cut });
  });
});

describe('FS2 / R202: a backup of a newer catkin’s save is that save, byte for byte', () => {
  function bootNewer(readable: boolean) {
    const b = fakeBrowser();
    const raw = newerRaw(readable);
    b.storage.setItem(SAVE_KEY, raw);
    store.hydrate();
    expect(store.readOnly.value).toBe('newer-version');
    return { b, raw };
  }

  it('readable: Save a backup gives the original bytes, still v 2, which this catkin then refuses to import (failed before)', async () => {
    const { raw } = bootNewer(true);
    const json = store.backupJson();
    expect(json).toBe(raw);
    expect(JSON.parse(json)).toMatchObject({ v: 2, state: { version: 2, futureThing: { kept: true } } });
    expect(await parseBackupText(json)).toMatchObject({ ok: false, error: 'made-by-newer-version' });
  });

  it('unreadable: the backup is the newer save, never a fresh profile (failed before)', () => {
    const { raw } = bootNewer(false);
    expect(store.backupJson()).toBe(raw);
    expect(store.backupJson()).not.toContain('"onboarded":false');
  });

  it('Copy backup carries the same bytes (failed before)', async () => {
    const { raw } = bootNewer(false);
    expect(await decodePayload(await store.backupPayload())).toEqual({ ok: true, json: raw });
  });

  it('new API: the CSV of a newer save is labelled partial, and a newer save this catkin can’t read gives none', () => {
    bootNewer(true);
    const partial = store.exportCsv();
    expect(partial).toMatchObject({ partial: true, name: expect.stringMatching(/^catkin-waterings-\d{4}-\d{2}-\d{2}-partial\.csv$/) });
    bootNewer(false);
    expect(store.exportCsv()).toBeNull();
    expect(store.rescue.value).toMatchObject({ kind: 'newer', version: 2, readable: false });
  });

  it('data-d5: Use here over a newer save stays read-only, and its backup is the newer bytes (failed before)', async () => {
    const { deferredLocks } = await import('./fixtures');
    const locks = deferredLocks();
    const b = fakeBrowser({ locks });
    store.hydrate();
    await locks.refuse();
    expect(store.readOnly.value).toBe('other-window');
    const raw = newerRaw(true);
    b.storage.setItem(SAVE_KEY, raw);
    store.useHere();
    expect(store.readOnly.value).toBe('newer-version');
    expect(store.backupJson()).toBe(raw);
  });

  it('a newer save written by another window: this window’s backup is then the newer bytes (failed before)', () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.advance(1000);
    const raw = newerRaw(true);
    b.storage.setItem(SAVE_KEY, raw);
    b.fire('storage', { key: SAVE_KEY });
    expect(store.readOnly.value).toBe('newer-version');
    expect(store.backupJson()).toBe(raw);
  });

  it('once the newer save gives way to an ordinary one, a backup is of the save shown again', () => {
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, newerRaw(true));
    store.hydrate();
    b.storage.setItem(SAVE_KEY, livedInRaw());
    b.fire('storage', { key: SAVE_KEY });
    expect(store.readOnly.value).toBe('other-window');
    store.useHere();
    const json = JSON.parse(store.backupJson()) as { v: number; format: string; state: AppState };
    expect(json).toMatchObject({ format: 'catkin-backup', v: 1 });
    expect(json.state.profile.name).toBe('Sam');
  });

  it('inside the demo, the backup of a newer real save is still its bytes (failed before)', () => {
    const { raw } = bootNewer(true);
    store.enterDemo();
    expect(store.demoMode.value).toBe(true);
    expect(store.backupJson()).toBe(raw);
    store.exitDemo();
  });
});

describe('P-persistence-04: daily copies and Undo go through the one decoder', () => {
  /** A lived-in window with the corpus's copies in its daily-copy store. */
  function withCopies() {
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, livedInRaw());
    store.hydrate();
    const put = (id: string, state: unknown) =>
      b.snapshots.records.set(id, { id, kind: 'daily', day: '2026-09-20', savedAt: Date.UTC(2026, 8, 20), habits: 1, checkins: 1, appVersion: 'x', state: state as AppState });
    return { b, put };
  }

  it('the oldest build’s daily copy restores with its settings filled as a load fills them (failed before)', async () => {
    const { b } = withCopies();
    const snap = JSON.parse(fixture('f6ed7ea', 'snapshot-demo.json'));
    b.snapshots.records.set(snap.id, snap);
    expect(await store.restoreSnapshot(snap.id)).toMatchObject({ ok: true });
    expect(store.state.value.settings).toMatchObject({ showCompanions: true, compactToday: false, quoteNotes: true });
    expect(store.state.value.habits.map((h) => h.id)).toEqual((snap.state.habits as { id: string }[]).map((h) => h.id));
  });

  it('new API: a mixed list: old and current copies restore, a newer catkin’s copy is refused as newer and nothing changes', async () => {
    const { b, put } = withCopies();
    const snap = JSON.parse(fixture('f6ed7ea', 'snapshot-demo.json'));
    b.snapshots.records.set('daily-old', { ...snap, id: 'daily-old' });
    put('daily-now', createInitialState(Date.UTC(2026, 8, 20)));
    put('daily-newer', JSON.parse(newerRaw(true)).state);
    const list = await store.listSnapshots();
    expect(list.ok && list.snapshots.map((s) => s.id)).toEqual(expect.arrayContaining(['daily-newer', 'daily-now', 'daily-old']));
    const before = store.state.value;
    const disk = b.storage.getItem(SAVE_KEY);
    expect(await store.restoreSnapshot('daily-newer')).toEqual({ ok: false, error: 'newer-copy' });
    expect(store.state.value).toBe(before);
    expect(b.storage.getItem(SAVE_KEY)).toBe(disk);
    expect(await store.restoreSnapshot('daily-old')).toMatchObject({ ok: true });
    expect(await store.restoreSnapshot('daily-now')).toMatchObject({ ok: true });
  });

  it('a copy missing its logs is damaged, and nothing changes', async () => {
    const { put } = withCopies();
    put('daily-bad', envOf(damaged(without('logs'))).state);
    const before = store.state.value;
    expect(await store.restoreSnapshot('daily-bad')).toEqual({ ok: false, error: 'damaged-copy' });
    expect(store.state.value).toBe(before);
  });

  it('INV-5: in src/state, validateState is called only inside decodeState (failed before)', () => {
    const dir = new URL('../../../src/state/', import.meta.url);
    const calls = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .flatMap((f) =>
        readFileSync(new URL(f, dir), 'utf8')
          .split('\n')
          .map((line, i) => ({ at: `${f}:${i + 1}`, line }))
          .filter(({ line }) => /\bvalidateState\(/.test(line) && !/^\s*(\*|\/\/)/.test(line) && !/export function validateState\(/.test(line)),
      )
      .map((c) => c.at.split(':')[0]);
    expect([...new Set(calls)]).toEqual(['decode.ts']);
  });
});
