import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/state/defaults';
import { MIGRATIONS, fillDefaults, migrate } from '@/state/migrate';
import {
  SAVE_KEY,
  SaveQueue,
  backupKeyOf,
  corruptKeyOf,
  encodeEnvelope,
  loadSave,
  memoryStorage,
  mirrorTheme,
  peekRev,
  readThemeMirror,
  removeNamespace,
  writeBackup,
  type Timers,
} from '@/state/persist';
import { KEEP, memorySnapshotStore, retentionPlan, takeDailySnapshot, type SnapshotMeta } from '@/state/snapshots';
import { addDays } from '@/domain/dates';
import type { AppState } from '@/state/types';

const now = Date.UTC(2026, 8, 29, 9);

function manualTimers(): Timers & { run(): void; pending(): number } {
  const q = new Map<number, () => void>();
  let id = 0;
  return {
    setTimeout: (fn) => (q.set(++id, fn), id),
    clearTimeout: (h) => void q.delete(h as number),
    run: () => {
      const fns = [...q.values()];
      q.clear();
      for (const f of fns) f();
    },
    pending: () => q.size,
  };
}

const queueFor = (storage: ReturnType<typeof memoryStorage>, timers = manualTimers(), compact = (s: AppState) => s) =>
  new SaveQueue({ storage, key: SAVE_KEY, appVersion: 'test', rev: 0, now: () => now, timers, compact });

describe('save envelope (DESIGN §13.8)', () => {
  it('round-trips { v, appVersion, rev, savedAt, state } and increments rev', () => {
    const storage = memoryStorage();
    const q = queueFor(storage);
    const s = createInitialState(now);
    expect(q.saveNow(s)).toBe('saved');
    expect(q.saveNow({ ...s, profile: { ...s.profile, name: 'Sam' } })).toBe('saved');
    const raw = JSON.parse(storage.getItem(SAVE_KEY)!);
    expect(raw).toMatchObject({ v: 1, appVersion: 'test', rev: 2, savedAt: now });
    const loaded = loadSave(storage, SAVE_KEY);
    expect(loaded.kind).toBe('ok');
    if (loaded.kind === 'ok') {
      expect(loaded.state.profile.name).toBe('Sam');
      expect(loaded.rev).toBe(2);
    }
    expect(peekRev(storage, SAVE_KEY)).toBe(2);
  });

  it('debounces ordinary saves, writes wallet-changing ones at once, and flushes on demand', () => {
    const storage = memoryStorage();
    const timers = manualTimers();
    const q = queueFor(storage, timers);
    const s = createInitialState(now);
    q.schedule(s);
    q.schedule({ ...s, profile: { ...s.profile, name: 'A' } });
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(timers.pending()).toBe(1);
    timers.run();
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).state.profile.name).toBe('A');
    q.schedule({ ...s, profile: { ...s.profile, name: 'B' } });
    expect(q.flush()).toBe('saved');
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).rev).toBe(2);
    expect(q.flush()).toBeNull();
  });

  it('QuotaExceeded: drops the backup, compacts and retries, else reports storage-full', () => {
    const s = createInitialState(now);
    const small = encodeEnvelope(s, 1, now, 'test').length;
    const storage = memoryStorage({}, small + SAVE_KEY.length + 50);
    storage.data.set(backupKeyOf(SAVE_KEY), 'x'.repeat(40));
    const big = { ...s, profile: { ...s.profile, name: 'x'.repeat(80) } };
    let compacted = 0;
    const statuses: string[] = [];
    const q = new SaveQueue({
      storage,
      key: SAVE_KEY,
      appVersion: 'test',
      rev: 0,
      now: () => now,
      timers: manualTimers(),
      compact: (x) => (compacted++, { ...x, profile: { ...x.profile, name: '' } }),
      onStatus: (st) => statuses.push(st),
    });
    expect(q.saveNow(big)).toBe('saved');
    expect(compacted).toBe(1);
    expect(storage.getItem(backupKeyOf(SAVE_KEY))).toBeNull();
    const huge = { ...s, habits: [], inbox: [], profile: { ...s.profile, name: 'x'.repeat(5000) } };
    const q2 = new SaveQueue({ storage, key: SAVE_KEY, appVersion: 'test', rev: 1, now: () => now, timers: manualTimers(), compact: (x) => x, onStatus: (st) => statuses.push(st) });
    expect(q2.saveNow(huge)).toBe('storage-full');
    expect(statuses).toEqual(['saved', 'storage-full']);
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).rev).toBe(1); // the last good save is intact
  });

  it('a save from a newer schema is reported as newer (opened read-only)', () => {
    const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify({ v: 2, appVersion: 'future', rev: 9, savedAt: now, state: { ...createInitialState(now), version: 2 } }) });
    expect(loadSave(storage, SAVE_KEY)).toMatchObject({ kind: 'newer', version: 2 });
  });

  it('a corrupt save falls back to the backup and keeps the corrupt text aside', () => {
    const good = encodeEnvelope(createInitialState(now), 4, now, 'test');
    const storage = memoryStorage({ [SAVE_KEY]: '{"v":1,"state":{"version":1', [backupKeyOf(SAVE_KEY)]: good });
    const res = loadSave(storage, SAVE_KEY);
    expect(res).toMatchObject({ kind: 'ok', fromBackup: true, rev: 4 });
    expect(storage.getItem(corruptKeyOf(SAVE_KEY))).toBe('{"v":1,"state":{"version":1');
    const bad = memoryStorage({ [SAVE_KEY]: JSON.stringify({ v: 1, rev: 1, state: { ...createInitialState(now), wallet: { coins: -5 } } }) });
    expect(loadSave(bad, SAVE_KEY).kind).toBe('corrupt');
    writeBackup(bad, SAVE_KEY, good);
    expect(loadSave(bad, SAVE_KEY).kind).toBe('ok');
  });

  it('the catkin namespace (DESIGN §1): catkin:* keys, the catkin-backup format, the CK1: handoff, a pre-paint theme mirror', async () => {
    const persist = await import('@/state/persist');
    const handoff = await import('@/state/handoff');
    expect([persist.NAMESPACE, persist.SAVE_KEY, persist.DEMO_KEY, persist.THEME_KEY, persist.UNDO_IMPORT_KEY]).toEqual(['catkin:', 'catkin:v1', 'catkin:demo:v1', 'catkin:theme', 'catkin:undo-import']);
    expect([handoff.BACKUP_FORMAT, handoff.PAYLOAD_GZIP, handoff.PAYLOAD_PLAIN]).toEqual(['catkin-backup', 'CK1:', 'CK0:']);
    const { readFileSync } = await import('node:fs');
    const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
    const prePaint = html.slice(html.indexOf('<script>'), html.indexOf('</script>'));
    expect(prePaint).toContain("localStorage.getItem('catkin:theme')");
    expect(prePaint).not.toMatch(/mochi/i);
    const shoot = readFileSync(new URL('../../../scripts/shoot.mjs', import.meta.url), 'utf8');
    expect(shoot).toContain("localStorage.setItem('catkin:v1'");
  });

  it('reset removes only catkin:* keys', () => {
    const storage = memoryStorage({ 'catkin:v1': '1', 'catkin:demo:v1': '2', 'catkin:theme': '3', 'other-app': 'keep', catkin: 'keep' });
    expect(removeNamespace(storage)).toBe(3);
    expect([...storage.data.keys()].sort()).toEqual(['catkin', 'other-app']);
  });

  it('mirrors the theme to its own key for the pre-paint script', () => {
    const storage = memoryStorage();
    expect(readThemeMirror(storage)).toBeNull();
    mirrorTheme(storage, { theme: 'night', reduceMotion: 'on' });
    expect(storage.getItem('catkin:theme')).toBe('{"theme":"night","reduceMotion":"on"}');
    expect(readThemeMirror(storage)).toEqual({ theme: 'night', reduceMotion: 'on' });
  });

  it('never throws when storage itself throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
      key: () => null,
      length: 0,
    };
    expect(loadSave(broken, SAVE_KEY)).toEqual({ kind: 'empty' });
    const q = new SaveQueue({ storage: broken, key: SAVE_KEY, appVersion: 't', rev: 0, now: () => now, timers: manualTimers(), compact: (s) => s });
    expect(q.saveNow(createInitialState(now))).toBe('unavailable');
  });
});

describe('migrations', () => {
  it('current saves pass through; missing additive sections are filled from defaults', () => {
    const s = createInitialState(now) as unknown as Record<string, unknown>;
    expect(migrate(s)).toMatchObject({ ok: true, from: 1, migrated: false });
    const partial = { ...s } as Record<string, unknown>;
    delete partial.pantry;
    delete partial.offDays;
    partial.ledger = { recent: {}, sunshine: {}, bestStage: {}, once: {} };
    const m = migrate(partial);
    expect(m.ok && m.state.pantry).toEqual({});
    expect(m.ok && (m.state.ledger as Record<string, unknown>).daily).toEqual({});
    expect(fillDefaults({ wallet: { coins: 7 } }).wallet).toEqual({ coins: 7, stars: 0, stardust: 0, tickets: 0 });
  });

  it('refuses newer, version-less and non-object saves', () => {
    expect(migrate({ version: 99 })).toEqual({ ok: false, error: 'newer-version', version: 99 });
    expect(migrate({})).toEqual({ ok: false, error: 'no-version' });
    expect(migrate([1, 2])).toEqual({ ok: false, error: 'not-an-object' });
    expect(MIGRATIONS).toEqual({});
  });

  it('runs a chain of migrations in order', () => {
    const chain = {
      1: (s: Record<string, unknown>) => ({ ...s, steps: ['1→2'] }),
      2: (s: Record<string, unknown>) => ({ ...s, steps: [...(s.steps as string[]), '2→3'] }),
    };
    const m = migrate({ ...createInitialState(now), version: 1 }, chain, 3);
    expect(m).toMatchObject({ ok: true, from: 1, migrated: true });
    expect(m.ok && m.state.steps).toEqual(['1→2', '2→3']);
    expect(m.ok && m.state.version).toBe(3);
    expect(migrate({ ...createInitialState(now), version: 1 }, { 1: chain[1] }, 3)).toEqual({ ok: false, error: 'no-migration', version: 2 });
  });
});

describe('daily snapshots (7 daily + 4 weekly, valid only)', () => {
  it('keeps the newest 7 daily and 4 weekly snapshots', async () => {
    const store = memorySnapshotStore();
    const s = { ...createInitialState(now), profile: { ...createInitialState(now).profile, onboarded: true } };
    for (let i = 0; i < 40; i++) {
      const day = addDays('2026-08-01', i);
      expect(await takeDailySnapshot(store, s, { day, now: now + i, weekStart: 1, appVersion: 't' })).toBe(true);
    }
    const metas = await store.list();
    expect(metas.filter((m) => m.kind === 'daily').map((m) => m.day)).toEqual(Array.from({ length: 7 }, (_, i) => addDays('2026-09-09', -i)));
    expect(metas.filter((m) => m.kind === 'weekly')).toHaveLength(KEEP.weekly);
    const snap = await store.get(metas[0]!.id);
    expect(snap?.state).toEqual(s);
  });

  it('replaces the same day’s snapshot and skips invalid states', async () => {
    const store = memorySnapshotStore();
    const s = createInitialState(now);
    await takeDailySnapshot(store, s, { day: '2026-09-29', now, weekStart: 1, appVersion: 't' });
    await takeDailySnapshot(store, { ...s, profile: { ...s.profile, name: 'Later' } }, { day: '2026-09-29', now: now + 5, weekStart: 1, appVersion: 't' });
    expect((await store.list()).filter((m) => m.kind === 'daily')).toHaveLength(1);
    expect((await store.get('daily-2026-09-29'))?.state.profile.name).toBe('Later');
    expect(await takeDailySnapshot(store, { ...s, wallet: { ...s.wallet, coins: -1 } }, { day: '2026-09-30', now, weekStart: 1, appVersion: 't' })).toBe(false);
  });

  it('retentionPlan picks the oldest beyond each limit', () => {
    const meta = (kind: SnapshotMeta['kind'], day: string): SnapshotMeta => ({ id: `${kind}-${day}`, kind, day, savedAt: 0, habits: 0, checkins: 0, appVersion: 't' });
    const metas = [...Array.from({ length: 9 }, (_, i) => meta('daily', addDays('2026-09-01', i))), ...Array.from({ length: 4 }, (_, i) => meta('pre-import', addDays('2026-09-01', i)))];
    expect(retentionPlan(metas).sort()).toEqual(['daily-2026-09-01', 'daily-2026-09-02', 'pre-import-2026-09-01']);
  });
});
