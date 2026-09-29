/**
 * Daily snapshots in IndexedDB (DESIGN v1 §13.8): 7 daily + 4 weekly copies of the save, taken only
 * when `validateState` passes, listed and restorable from You › Data. Imports also snapshot first
 * ('pre-import') so they can be undone for 24 h.
 *
 * The store works against the small `SnapshotStore` interface: an IndexedDB implementation for the
 * browser (guarded: absent → null) and an in-memory one for tests and unsupported browsers.
 */
import { startOfWeek, type WeekStart } from '@/domain/dates';
import type { AppState, DateKey } from './types';
import { validateState } from './validate';

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

/** Ids to delete so that only the newest KEEP[kind] of each kind remain. */
export function retentionPlan(metas: readonly SnapshotMeta[]): string[] {
  const out: string[] = [];
  for (const kind of Object.keys(KEEP) as SnapshotKind[]) {
    const mine = metas.filter((m) => m.kind === kind).sort((a, b) => (a.day === b.day ? b.savedAt - a.savedAt : a.day < b.day ? 1 : -1));
    out.push(...mine.slice(KEEP[kind]).map((m) => m.id));
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
  opts: { day: DateKey; now: number; weekStart: WeekStart; appVersion: string },
): Promise<boolean> {
  if (!validateState(state).ok) return false;
  const daily = `daily-${opts.day}`;
  await store.put({ ...snapshotMeta(state, 'daily', daily, opts.day, opts.now, opts.appVersion), state });
  const weekly = `weekly-${startOfWeek(opts.day, opts.weekStart)}`;
  const metas = await store.list();
  if (!metas.some((m) => m.id === weekly)) {
    await store.put({ ...snapshotMeta(state, 'weekly', weekly, opts.day, opts.now, opts.appVersion), state });
  }
  for (const id of retentionPlan(await store.list())) await store.remove(id);
  return true;
}

/** An in-memory SnapshotStore (tests; browsers without IndexedDB). Records are deep-copied. */
export function memorySnapshotStore(): SnapshotStore & { records: Map<string, SnapshotRecord> } {
  const records = new Map<string, SnapshotRecord>();
  const copy = <T>(x: T): T => structuredClone(x);
  return {
    records,
    list: async () => [...records.values()].map(({ state: _s, ...meta }) => meta).sort((a, b) => b.savedAt - a.savedAt),
    get: async (id) => (records.has(id) ? copy(records.get(id)!) : null),
    put: async (r) => void records.set(r.id, copy(r)),
    remove: async (id) => void records.delete(id),
  };
}

/* ------------------------------------------------------------------ */
/* IndexedDB                                                           */
/* ------------------------------------------------------------------ */

const DB_NAME = 'catkin';
const STORE = 'snapshots';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** The IndexedDB-backed store, or null when IndexedDB is unavailable (node, some private modes). */
export function indexedDbSnapshotStore(): SnapshotStore | null {
  const idb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  if (!idb) return null;
  let dbp: Promise<IDBDatabase> | null = null;
  const db = (): Promise<IDBDatabase> =>
    (dbp ??= new Promise((resolve, reject) => {
      const open = idb.open(DB_NAME, 1);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    }));
  const tx = async (mode: IDBTransactionMode): Promise<IDBObjectStore> => (await db()).transaction(STORE, mode).objectStore(STORE);
  return {
    async list() {
      const all = (await req((await tx('readonly')).getAll())) as SnapshotRecord[];
      return all.map(({ state: _s, ...meta }) => meta).sort((a, b) => b.savedAt - a.savedAt);
    },
    async get(id) {
      return ((await req((await tx('readonly')).get(id))) as SnapshotRecord | undefined) ?? null;
    },
    async put(record) {
      await req((await tx('readwrite')).put(record));
    },
    async remove(id) {
      await req((await tx('readwrite')).delete(id));
    },
  };
}
