/**
 * Daily snapshots in IndexedDB (DESIGN v1 §13.8): 7 daily + 4 weekly copies of the save, taken only
 * when the state decodes as a good save (`decodeState`), listed and restorable from You › Data. Imports also snapshot first
 * ('pre-import') so they can be undone for 24 h.
 *
 * The store works against the small `SnapshotStore` interface: an IndexedDB implementation for the
 * browser (guarded: absent → null) and an in-memory one for tests and unsupported browsers. Each
 * says whether its copies outlive the page (`durable`): only a durable copy can back a 24-hour
 * Undo (audit FS9). The IndexedDB one counts a write as done when its transaction commits, not
 * when its request succeeds (data-d4), and never keeps a failed or closed connection
 * (P-persistence-05). The store reaches every store through `safely`, whose methods answer with
 * results instead of rejecting (data-d12).
 */
import { startOfWeek, type WeekStart } from '@/domain/dates';
import type { AppState, DateKey } from './types';
import { decodesAsSave } from './decode';

export type SnapshotKind = 'daily' | 'weekly' | 'pre-import';

export interface SnapshotMeta {
  id: string;
  kind: SnapshotKind;
  /** App day the snapshot belongs to. */
  day: DateKey;
  savedAt: number;
  habits: number;
  checkins: number;
  appVersion: string;
}

export interface SnapshotRecord extends SnapshotMeta {
  state: AppState;
}

export interface SnapshotStore {
  /** Whether a copy outlives this page (IndexedDB), or goes when it closes (memory). */
  readonly durable: boolean;
  list(): Promise<SnapshotMeta[]>;
  get(id: string): Promise<SnapshotRecord | null>;
  put(record: SnapshotRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

export const KEEP = { daily: 7, weekly: 4, 'pre-import': 3 } as const;

/** Check-ins across all logs (done or tiny days), for snapshot and import previews. */
export function countCheckins(s: AppState): number {
  let n = 0;
  for (const byDate of Object.values(s.logs)) for (const log of Object.values(byDate)) if (log.kind === 'log' && (log.count > 0 || log.level === 'tiny')) n++;
  return n;
}

export function snapshotMeta(state: AppState, kind: SnapshotKind, id: string, day: DateKey, savedAt: number, appVersion: string): SnapshotMeta {
  return { id, kind, day, savedAt, habits: state.habits.length, checkins: countCheckins(state), appVersion };
}

/**
 * Ids to delete so that only the newest KEEP[kind] of each kind remain. `keep` (the copy an Undo
 * still needs) is never deleted, whatever its age, and counts as one of its kind's copies
 * (P-persistence-11).
 */
export function retentionPlan(metas: readonly SnapshotMeta[], keep: string | null = null): string[] {
  const out: string[] = [];
  for (const kind of Object.keys(KEEP) as SnapshotKind[]) {
    const kept = keep !== null && metas.some((m) => m.kind === kind && m.id === keep) ? 1 : 0;
    const mine = metas.filter((m) => m.kind === kind && m.id !== keep).sort((a, b) => (a.day === b.day ? b.savedAt - a.savedAt : a.day < b.day ? 1 : -1));
    out.push(...mine.slice(Math.max(0, KEEP[kind] - kept)).map((m) => m.id));
  }
  return out;
}

/**
 * Today's snapshot (replacing an earlier one from the same day) plus the week's first snapshot,
 * then pruning. Skips states that fail validation. Returns whether a snapshot was written.
 */
export async function takeDailySnapshot(
  store: SnapshotStore,
  state: AppState,
  opts: { day: DateKey; now: number; weekStart: WeekStart; appVersion: string; keep?: string | null },
): Promise<boolean> {
  if (!decodesAsSave(state)) return false;
  const daily = `daily-${opts.day}`;
  await store.put({ ...snapshotMeta(state, 'daily', daily, opts.day, opts.now, opts.appVersion), state });
  const weekly = `weekly-${startOfWeek(opts.day, opts.weekStart)}`;
  const metas = await store.list();
  if (!metas.some((m) => m.id === weekly)) {
    await store.put({ ...snapshotMeta(state, 'weekly', weekly, opts.day, opts.now, opts.appVersion), state });
  }
  for (const id of retentionPlan(await store.list(), opts.keep ?? null)) await store.remove(id);
  return true;
}

/**
 * An in-memory SnapshotStore (tests; browsers without IndexedDB). Records are deep-copied. Its
 * copies go when the page closes, so it is not durable, unless a test stands it in for IndexedDB.
 */
export function memorySnapshotStore(opts: { durable?: boolean } = {}): SnapshotStore & { records: Map<string, SnapshotRecord> } {
  const records = new Map<string, SnapshotRecord>();
  const copy = <T>(x: T): T => structuredClone(x);
  return {
    durable: opts.durable ?? false,
    records,
    list: async () => [...records.values()].map(({ state: _s, ...meta }) => meta).sort((a, b) => b.savedAt - a.savedAt),
    get: async (id) => (records.has(id) ? copy(records.get(id)!) : null),
    put: async (r) => void records.set(r.id, copy(r)),
    remove: async (id) => void records.delete(id),
  };
}

/* ------------------------------------------------------------------ */
/* Results instead of rejections                                       */
/* ------------------------------------------------------------------ */

/** What a snapshot call did: its value, or that the copies can't be reached right now. */
export type SnapResult<T> = { ok: true; value: T } | { ok: false; error: 'unavailable' };

/** A SnapshotStore whose every method answers with a result and never rejects (data-d12). */
export interface SafeSnapshots {
  readonly durable: boolean;
  list(): Promise<SnapResult<SnapshotMeta[]>>;
  get(id: string): Promise<SnapResult<SnapshotRecord | null>>;
  put(record: SnapshotRecord): Promise<SnapResult<void>>;
  remove(id: string): Promise<SnapResult<void>>;
}

async function attempt<T>(run: () => Promise<T>): Promise<SnapResult<T>> {
  try {
    return { ok: true, value: await run() };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

/** Wraps a store so that nothing it does can reject (a throw, a rejection, a closed database). */
export function safely(store: SnapshotStore): SafeSnapshots {
  return {
    durable: store.durable,
    list: () => attempt(() => store.list()),
    get: (id) => attempt(() => store.get(id)),
    put: (record) => attempt(() => store.put(record)),
    remove: (id) => attempt(() => store.remove(id)),
  };
}

/* ------------------------------------------------------------------ */
/* IndexedDB                                                           */
/* ------------------------------------------------------------------ */

const DB_NAME = 'catkin';
const DB_VERSION = 1;
const STORE = 'snapshots';

/** The request's result, once the request succeeds. */
function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/**
 * The transaction's end: resolved at `complete` (the write is committed), rejected at `abort` or
 * `error`. A request can succeed and its transaction still abort (quota, a crash, a closing
 * database), so nothing counts as written before this (audit data-d4).
 */
export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'));
    tx.onerror = () => reject(tx.error ?? new DOMException('Transaction error', 'UnknownError'));
  });
}

/** The same promise, marked handled: a read that fails first rejects through the request instead. */
function quiet<T>(p: Promise<T>): Promise<T> {
  p.catch(() => undefined);
  return p;
}

/**
 * The IndexedDB-backed store, or null when IndexedDB is unavailable (node, some private modes).
 * The connection is opened on first use and forgotten whenever it fails, is blocked, closes, or
 * another connection asks for a new version (a newer catkin, or the database being deleted), so
 * the next call opens it again instead of failing for the rest of the session (P-persistence-05).
 * A blocked open answers at once (the copy isn't kept) rather than waiting.
 */
export function indexedDbSnapshotStore(): SnapshotStore | null {
  const idb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  if (!idb) return null;
  let dbp: Promise<IDBDatabase> | null = null;
  const forget = (p: Promise<IDBDatabase>) => {
    if (dbp === p) dbp = null;
  };
  const open = (): Promise<IDBDatabase> => {
    const p: Promise<IDBDatabase> = new Promise((resolve, reject) => {
      let settled = false;
      let request: IDBOpenDBRequest;
      try {
        request = idb.open(DB_NAME, DB_VERSION);
      } catch (e) {
        reject(e);
        return;
      }
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        if (settled) {
          // It opened after this attempt already answered (blocked): let it go.
          db.close();
          return;
        }
        settled = true;
        // Another connection wants a new version (a newer catkin) or to delete the database:
        // step aside at once, and open again on the next call.
        db.onversionchange = () => {
          db.close();
          forget(p);
        };
        db.onclose = () => forget(p);
        resolve(db);
      };
      request.onerror = () => {
        if (settled) return;
        settled = true;
        reject(request.error ?? new DOMException('Could not open', 'UnknownError'));
      };
      request.onblocked = () => {
        if (settled) return;
        settled = true;
        reject(new DOMException('Opening the snapshot database is blocked', 'AbortError'));
      };
    });
    p.catch(() => forget(p));
    return p;
  };
  const db = (): Promise<IDBDatabase> => (dbp ??= open());
  /** A transaction on the store; a connection that has closed underneath is forgotten. */
  const begin = async (mode: IDBTransactionMode): Promise<IDBTransaction> => {
    const p = db();
    const conn = await p;
    try {
      return conn.transaction(STORE, mode);
    } catch (e) {
      forget(p);
      throw e;
    }
  };
  return {
    durable: true,
    async list() {
      const tx = await begin('readonly');
      const done = quiet(txDone(tx));
      const all = (await req(tx.objectStore(STORE).getAll())) as SnapshotRecord[];
      await done;
      return all.map(({ state: _s, ...meta }) => meta).sort((a, b) => b.savedAt - a.savedAt);
    },
    async get(id) {
      const tx = await begin('readonly');
      const done = quiet(txDone(tx));
      const rec = (await req(tx.objectStore(STORE).get(id))) as SnapshotRecord | undefined;
      await done;
      return rec ?? null;
    },
    async put(record) {
      const tx = await begin('readwrite');
      const done = txDone(tx);
      tx.objectStore(STORE).put(record);
      await done;
    },
    async remove(id) {
      const tx = await begin('readwrite');
      const done = txDone(tx);
      tx.objectStore(STORE).delete(id);
      await done;
    },
  };
}
