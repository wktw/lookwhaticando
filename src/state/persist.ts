/**
 * localStorage persistence (DESIGN §11 "Persistence", §13.8 "Storage").
 *
 * - Envelope `{ v, appVersion, rev, savedAt, state }` under `mochi-meadow:v1` (the demo meadow lives
 *   under `mochi-meadow:demo:v1`). `rev` increases with every write, so a window can tell a newer
 *   save written by another window (`storage` events) from its own.
 * - Every storage access is in try/catch; nothing here throws. A QuotaExceeded write retries after
 *   dropping the `:corrupt` copy, then after dropping `:backup` and compacting the state's stale
 *   ledger; the backup is put back if even that fails (so a failed save never costs the backup),
 *   and 'storage-full' is reported.
 * - A queue can be *held* (a window still waiting for the single-writer lock): writes stay pending
 *   until it is released, and a window that is refused the lock discards them, so it never writes
 *   over the owner's save. Adopting another window's newer save discards the pending one too.
 * - Saves are debounced (250 ms) except when the caller asks for an immediate write (wallet-changing
 *   actions, commit-before-animate), and `flush()` writes any pending save (pagehide / hidden).
 * - A save stamped with a newer schema is reported as 'newer' (the app opens it read-only), with the
 *   state when it still reads as a current-schema state (a newer version that only added fields),
 *   so the meadow can be shown rather than an empty one.
 * - Reset removes only `mochi-meadow:*` keys (never `clear()`).
 * - The theme is mirrored to its own tiny key for the pre-paint script in index.html.
 * Storage and timers are injected, so all of this runs under node in tests.
 */
import { SCHEMA_VERSION, type AppState, type Settings } from './types';
import { migrate } from './migrate';
import { validateState } from './validate';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export const NAMESPACE = 'mochi-meadow:';
export const SAVE_KEY = 'mochi-meadow:v1';
export const DEMO_KEY = 'mochi-meadow:demo:v1';
export const THEME_KEY = 'mochi-meadow:theme';
export const UNDO_IMPORT_KEY = 'mochi-meadow:undo-import';
export const backupKeyOf = (key: string): string => `${key}:backup`;
export const corruptKeyOf = (key: string): string => `${key}:corrupt`;
export const DEBOUNCE_MS = 250;

export interface Envelope {
  v: number;
  appVersion: string;
  rev: number;
  savedAt: number;
  state: AppState;
}

/** A Map-backed Storage (tests, and a fallback when localStorage is unavailable). */
export function memoryStorage(initial: Record<string, string> = {}, quotaChars = Infinity): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  const used = () => [...data].reduce((a, [k, v]) => a + k.length + v.length, 0);
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      const prev = data.get(k);
      if (used() - (prev === undefined ? 0 : k.length + prev.length) + k.length + v.length > quotaChars) {
        const e = new Error('quota') as Error & { name: string };
        e.name = 'QuotaExceededError';
        throw e;
      }
      data.set(k, v);
    },
    removeItem: (k) => void data.delete(k),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

/** The browser's localStorage, or null when it is missing or blocked (private mode, file:// quirks). */
export function browserStorage(): KeyValueStorage | null {
  try {
    const ls = (globalThis as { localStorage?: KeyValueStorage }).localStorage;
    if (!ls) return null;
    const probe = `${NAMESPACE}probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error) && !(typeof e === 'object' && e !== null)) return false;
  const err = e as { name?: string; code?: number };
  return err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014;
}

function safeGet(storage: KeyValueStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemove(storage: KeyValueStorage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

export type LoadResult =
  | { kind: 'empty' }
  | { kind: 'ok'; state: AppState; rev: number; savedAt: number; migrated: boolean; raw: string; fromBackup: boolean }
  | { kind: 'newer'; version: number; raw: string; state?: AppState }
  | { kind: 'corrupt'; errors: string[]; raw: string };

/** Parses, migrates and validates an envelope string. */
export function parseEnvelope(raw: string): Exclude<LoadResult, { kind: 'empty' }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'corrupt', errors: ['not JSON'], raw };
  }
  const env = parsed as Partial<Envelope> | null;
  if (!env || typeof env !== 'object' || typeof env.v !== 'number' || typeof env.state !== 'object') {
    return { kind: 'corrupt', errors: ['not a save envelope'], raw };
  }
  const m = migrate(env.state);
  if (!m.ok) {
    if (m.error === 'newer-version') {
      const readable = validateState({ ...(env.state as object), version: SCHEMA_VERSION });
      return readable.ok ? { kind: 'newer', version: m.version ?? env.v, raw, state: readable.state } : { kind: 'newer', version: m.version ?? env.v, raw };
    }
    return { kind: 'corrupt', errors: [`migration: ${m.error}`], raw };
  }
  const valid = validateState(m.state);
  if (!valid.ok) return { kind: 'corrupt', errors: valid.errors, raw };
  return {
    kind: 'ok',
    state: valid.state,
    rev: typeof env.rev === 'number' ? env.rev : 0,
    savedAt: typeof env.savedAt === 'number' ? env.savedAt : 0,
    migrated: m.migrated,
    raw,
    fromBackup: false,
  };
}

/**
 * Loads the save under `key`. A corrupt save falls back to its `:backup` copy when that one is
 * valid (the corrupt text is kept aside under `:corrupt`, never destroyed).
 */
export function loadSave(storage: KeyValueStorage, key: string): LoadResult {
  const raw = safeGet(storage, key);
  if (raw === null) return { kind: 'empty' };
  const main = parseEnvelope(raw);
  if (main.kind !== 'corrupt') return main;
  const backupRaw = safeGet(storage, backupKeyOf(key));
  if (backupRaw !== null) {
    const backup = parseEnvelope(backupRaw);
    if (backup.kind === 'ok') {
      trySet(storage, corruptKeyOf(key), raw);
      return { ...backup, fromBackup: true };
    }
  }
  return main;
}

/** The `rev` of the save under `key` without validating it (for `storage` events). */
export function peekRev(storage: KeyValueStorage, key: string): number | null {
  const raw = safeGet(storage, key);
  if (raw === null) return null;
  const m = /"rev":(\d+)/.exec(raw.slice(0, 200));
  return m ? Number(m[1]) : null;
}

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

export type WriteResult = { ok: true; chars: number } | { ok: false; reason: 'quota' | 'error' };

function trySet(storage: KeyValueStorage, key: string, value: string): WriteResult {
  try {
    storage.setItem(key, value);
    return { ok: true, chars: value.length };
  } catch (e) {
    return { ok: false, reason: isQuotaError(e) ? 'quota' : 'error' };
  }
}

export function encodeEnvelope(state: AppState, rev: number, savedAt: number, appVersion: string): string {
  const env: Envelope = { v: state.version, appVersion, rev, savedAt, state };
  return JSON.stringify(env);
}

/** Keeps the loaded good save as `:backup` (DESIGN §11). */
export function writeBackup(storage: KeyValueStorage, key: string, raw: string): void {
  trySet(storage, backupKeyOf(key), raw);
}

export type SaveStatus = 'saved' | 'storage-full' | 'unavailable';

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface SaveQueueOptions {
  storage: KeyValueStorage;
  key: string;
  appVersion: string;
  rev: number;
  now: () => number;
  timers: Timers;
  /** Shrinks a state for a retry after QuotaExceeded (ledger compaction). */
  compact: (s: AppState) => AppState;
  onStatus?: (status: SaveStatus, info: { rev: number; chars?: number }) => void;
  debounceMs?: number;
}

/**
 * Debounced, quota-aware writer for one key. `schedule` coalesces writes within 250 ms; `saveNow`
 * writes at once (cancelling a pending one); `flush` writes whatever is pending.
 */
export class SaveQueue {
  rev: number;
  private pending: AppState | null = null;
  private handle: unknown = null;
  private lastStatus: SaveStatus | null = null;
  private held = false;
  lastChars = 0;

  constructor(private readonly o: SaveQueueOptions) {
    this.rev = o.rev;
  }

  get hasPending(): boolean {
    return this.pending !== null;
  }

  schedule(state: AppState): void {
    this.pending = state;
    if (this.handle !== null) return;
    this.handle = this.o.timers.setTimeout(() => {
      this.handle = null;
      this.flush();
    }, this.o.debounceMs ?? DEBOUNCE_MS);
  }

  saveNow(state: AppState): SaveStatus {
    this.pending = state;
    return this.flush() ?? 'saved';
  }

  /** Keeps writes pending (not written) until `release()`. */
  hold(): void {
    this.held = true;
  }

  /** Ends a hold and writes whatever is pending. */
  release(): SaveStatus | null {
    this.held = false;
    return this.flush();
  }

  /** Forgets the pending state without writing it (lock refused, or another window's save adopted). */
  discardPending(): void {
    if (this.handle !== null) this.o.timers.clearTimeout(this.handle);
    this.handle = null;
    this.pending = null;
  }

  /** Writes the pending state, if any (nothing while held). */
  flush(): SaveStatus | null {
    if (this.handle !== null) {
      this.o.timers.clearTimeout(this.handle);
      this.handle = null;
    }
    if (this.held) return null;
    const state = this.pending;
    if (state === null) return null;
    this.pending = null;
    const status = this.write(state);
    if (status !== this.lastStatus || status === 'saved') this.o.onStatus?.(status, { rev: this.rev, chars: this.lastChars });
    this.lastStatus = status;
    return status;
  }

  private write(state: AppState): SaveStatus {
    const { storage, key, appVersion } = this.o;
    const rev = this.rev + 1;
    const now = this.o.now();
    let res = trySet(storage, key, encodeEnvelope(state, rev, now, appVersion));
    if (!res.ok && res.reason === 'quota') {
      safeRemove(storage, corruptKeyOf(key));
      res = trySet(storage, key, encodeEnvelope(state, rev, now, appVersion));
    }
    if (!res.ok && res.reason === 'quota') {
      const backup = safeGet(storage, backupKeyOf(key));
      safeRemove(storage, backupKeyOf(key));
      res = trySet(storage, key, encodeEnvelope(this.o.compact(state), rev, now, appVersion));
      if (!res.ok && backup !== null) trySet(storage, backupKeyOf(key), backup);
    }
    if (!res.ok) return res.reason === 'quota' ? 'storage-full' : 'unavailable';
    this.rev = rev;
    this.lastChars = res.chars;
    return 'saved';
  }

  dispose(): void {
    if (this.handle !== null) this.o.timers.clearTimeout(this.handle);
    this.handle = null;
  }
}

/* ------------------------------------------------------------------ */
/* Reset & theme mirror                                                */
/* ------------------------------------------------------------------ */

/** Removes every `mochi-meadow:*` key (and nothing else). Returns how many were removed. */
export function removeNamespace(storage: KeyValueStorage, prefix = NAMESPACE): number {
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k !== null && k.startsWith(prefix)) keys.push(k);
    }
  } catch {
    return 0;
  }
  for (const k of keys) safeRemove(storage, k);
  return keys.length;
}

/** What the pre-paint script reads: `{"theme":"night","reduceMotion":"auto"}`. */
export function mirrorTheme(storage: KeyValueStorage, settings: Pick<Settings, 'theme' | 'reduceMotion'>): void {
  trySet(storage, THEME_KEY, JSON.stringify({ theme: settings.theme, reduceMotion: settings.reduceMotion }));
}

export function readThemeMirror(storage: KeyValueStorage): Pick<Settings, 'theme' | 'reduceMotion'> | null {
  const raw = safeGet(storage, THEME_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    const theme = v.theme === 'light' || v.theme === 'night' ? v.theme : 'auto';
    const reduceMotion = v.reduceMotion === 'on' || v.reduceMotion === 'off' ? v.reduceMotion : 'auto';
    return { theme, reduceMotion };
  } catch {
    return null;
  }
}

/** Writes a small JSON value (import undo info etc.); false on failure. */
export function writeJson(storage: KeyValueStorage, key: string, value: unknown): boolean {
  return trySet(storage, key, JSON.stringify(value)).ok;
}

export function readJson<T>(storage: KeyValueStorage, key: string): T | null {
  const raw = safeGet(storage, key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function removeKey(storage: KeyValueStorage, key: string): void {
  safeRemove(storage, key);
}
