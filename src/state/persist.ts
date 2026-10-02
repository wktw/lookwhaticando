/**
 * localStorage persistence (DESIGN §11 "Persistence", v1 §13.8 "Storage").
 *
 * - Envelope `{ v, appVersion, rev, savedAt, gen, state }` under `catkin:v1` (the demo save lives
 *   under `catkin:demo:v1`). `rev` increases with every write, so a window can tell a newer
 *   save written by another window (`storage` events) from its own. `gen` names the save's
 *   lineage (a random 128-bit id minted at a fresh start, a reset, an import and a restore), so a
 *   window can also tell a save that was started over, whose `rev` begins again at 1, from an old
 *   write of its own save (audit FS3). It is optional: a save without one is a legacy save, and
 *   its next write mints one. Older builds read only v/rev/savedAt/state, so they ignore it.
 * - Every storage access is in try/catch; nothing here throws. A QuotaExceeded write retries after
 *   dropping the `:corrupt` copy, then after dropping `:backup` and compacting the state's stale
 *   ledger; the backup is put back if even that fails (so a failed save never costs the backup),
 *   and 'storage-full' is reported. A write that went through only by dropping `:corrupt` hands
 *   its text to `onDamagedDropped`, so the store keeps it in memory and says so. A failed write keeps its state pending and is retried, so the
 *   last change is never dropped (audit data-d2); a held or retired queue never reports 'saved'.
 * - A queue can be *held* (a window still waiting for the single-writer lock): writes stay pending
 *   until it is released, and a window that is refused the lock discards them, so it never writes
 *   over the owner's save. Adopting another window's newer save discards the pending one too.
 * - Saves are debounced (250 ms) except when the caller asks for an immediate write (wallet-changing
 *   actions, commit-before-animate), and `flush()` writes any pending save (pagehide / hidden).
 * - Every save is read through the one decoder (`decodeState`, WP-A4): only the omissions a real
 *   build wrote are filled, and a save missing anything else is corrupt (and falls back to its
 *   `:backup`), never an empty history (audit data-d6). A save stamped with a newer schema is
 *   reported as 'newer' (the app opens it read-only) with its text, which is what a backup of it
 *   carries (FS2), and a presentation state when it still reads as a current-schema state (a newer
 *   version that only added fields), so it can be shown rather than an empty one.
 * - Reset removes only `catkin:*` keys (never `clear()`).
 * - The theme is mirrored to its own tiny key for the pre-paint script in index.html.
 * Storage and timers are injected, so all of this runs under node in tests.
 */
import { SCHEMA_VERSION, type AppState, type Settings } from './types';
import { decodeState } from './decode';
import { isTimestamp } from './validate';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export const NAMESPACE = 'catkin:';
export const SAVE_KEY = 'catkin:v1';
export const DEMO_KEY = 'catkin:demo:v1';
export const THEME_KEY = 'catkin:theme';
export const UNDO_IMPORT_KEY = 'catkin:undo-import';
export const backupKeyOf = (key: string): string => `${key}:backup`;
export const corruptKeyOf = (key: string): string => `${key}:corrupt`;
export const DEBOUNCE_MS = 250;

export interface Envelope {
  v: number;
  appVersion: string;
  rev: number;
  savedAt: number;
  /** The save's lineage (absent in a legacy save, until its next write). */
  gen?: string;
  state: AppState;
}

/** A save's identity: its lineage and its write (what a window compares before adopting it). */
export interface SaveHead {
  /** Undefined for a legacy save written before save identity existed. */
  gen: string | undefined;
  rev: number;
}

const GEN_RE = /^[0-9a-f]{32}$/;

/** A new save lineage: a random 128-bit id, as 32 hex digits. */
export function mintGen(): string {
  const bytes = new Uint8Array(16);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const genOf = (v: unknown): string | undefined => (typeof v === 'string' && GEN_RE.test(v) ? v : undefined);

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

/**
 * The browser's localStorage, or null when it can't be read at all (missing or blocked: some private
 * modes, file:// quirks). A store that reads but refuses the probe write because it is full is still
 * returned: its save loads, and the first write reports 'storage-full' and keeps retrying, rather than
 * the app starting over on a memory save that looks saved (audit data-d1).
 */
export function browserStorage(): KeyValueStorage | null {
  let ls: KeyValueStorage | undefined;
  try {
    ls = (globalThis as { localStorage?: KeyValueStorage }).localStorage;
    if (!ls) return null;
    ls.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  const probe = `${NAMESPACE}probe`;
  try {
    ls.setItem(probe, '1');
    ls.removeItem(probe);
  } catch (e) {
    if (!isQuotaError(e)) return null;
  }
  return ls;
}

export function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error) && !(typeof e === 'object' && e !== null)) return false;
  const err = e as { name?: string; code?: number };
  return err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014;
}

/** The text stored under `key`, or null (none, or storage that can't be read). */
export function safeGet(storage: KeyValueStorage, key: string): string | null {
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
  | {
      kind: 'ok';
      state: AppState;
      rev: number;
      /** The save's lineage; undefined for a legacy save. */
      gen?: string;
      savedAt: number;
      migrated: boolean;
      raw: string;
      fromBackup: boolean;
      /** When read from `:backup`: the damaged main text, to keep aside under `:corrupt`. */
      damaged?: string;
    }
  | {
      kind: 'newer';
      version: number;
      raw: string;
      state?: AppState;
      rev?: number;
      gen?: string;
      /** When read from `:backup` (a newer catkin's, the main save being damaged): the damaged main text. */
      damaged?: string;
    }
  | { kind: 'corrupt'; errors: string[]; raw: string };

/**
 * Parses an envelope string and decodes its state (`decodeState`: the allow-listed omissions,
 * migrations, validation). `source` is 'backup-copy' for the `:backup` text. An envelope stamped
 * with a newer schema is 'newer' whatever its `state` holds (a newer catkin may store it another
 * way), so it is never started over as damaged.
 */
export function parseEnvelope(raw: string, source: 'main' | 'backup-copy' = 'main'): Exclude<LoadResult, { kind: 'empty' }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'corrupt', errors: ['not JSON'], raw };
  }
  const env = parsed as Partial<Envelope> | null;
  if (!env || typeof env !== 'object' || Array.isArray(env) || typeof env.v !== 'number') {
    return { kind: 'corrupt', errors: ['not a save envelope'], raw };
  }
  const gen = genOf(env.gen);
  const revOk = Number.isSafeInteger(env.rev) && (env.rev as number) >= 0;
  const d = decodeState(env.state, source, { declaredVersion: env.v });
  if (d.kind === 'newer') {
    // A newer catkin's save is never damage (WP-A4): a head it wrote that this one can't use is left out.
    const head = { ...(revOk ? { rev: env.rev } : {}), ...(gen ? { gen } : {}) };
    return { kind: 'newer', version: d.version, raw, ...(d.state ? { state: d.state } : {}), ...head };
  }
  if (d.kind === 'corrupt') return { kind: 'corrupt', errors: d.errors, raw };
  // FS8: the envelope's own numbers. `rev` 1e309 parses as Infinity (and writes back as null); no
  // catkin wrote a rev that isn't a whole number ≥ 0, or a save time past the ceiling.
  if (env.rev !== undefined && !revOk) return { kind: 'corrupt', errors: ['rev: not a whole number ≥ 0'], raw };
  if (env.savedAt !== undefined && !isTimestamp(env.savedAt)) return { kind: 'corrupt', errors: ['savedAt: not a timestamp'], raw };
  return {
    kind: 'ok',
    state: d.state,
    rev: typeof env.rev === 'number' ? env.rev : 0,
    ...(gen ? { gen } : {}),
    savedAt: typeof env.savedAt === 'number' ? env.savedAt : 0,
    migrated: d.migrated,
    raw,
    fromBackup: false,
  };
}

/**
 * Reads the save under `key` and writes nothing. A corrupt save falls back to its `:backup` copy
 * when that one is valid, and the damaged main text comes back as `damaged`, for the window that
 * owns the save to keep aside (never destroyed; audit P-persistence-03). A `:backup` written by a
 * newer catkin is that newer save (shown read-only, so neither it nor the damaged text is ever
 * written over), with the damaged main text as `damaged` too.
 */
export function readSave(storage: KeyValueStorage, key: string): LoadResult {
  const raw = safeGet(storage, key);
  if (raw === null) return { kind: 'empty' };
  const main = parseEnvelope(raw);
  if (main.kind !== 'corrupt') return main;
  const backupRaw = safeGet(storage, backupKeyOf(key));
  if (backupRaw !== null) {
    const backup = parseEnvelope(backupRaw, 'backup-copy');
    if (backup.kind === 'ok') return { ...backup, fromBackup: true, damaged: raw };
    if (backup.kind === 'newer') return { ...backup, damaged: raw };
  }
  return main;
}

/**
 * Loads the save under `key` (`readSave`), keeping a damaged main text aside under `:corrupt` at
 * once when it fell back to the backup. The store uses `readSave` and keeps it aside only once it
 * owns the save; this is for tools and tests that own their storage outright.
 */
export function loadSave(storage: KeyValueStorage, key: string): LoadResult {
  const res = readSave(storage, key);
  if (res.kind === 'ok' && res.damaged !== undefined) keepDamaged(storage, key, res.damaged);
  return res;
}

/** Keeps a damaged save's text aside under `:corrupt` (false when it couldn't be written). */
export function keepDamaged(storage: KeyValueStorage, key: string, raw: string): boolean {
  return trySet(storage, corruptKeyOf(key), raw).ok;
}

/** The envelope's head: the text before `"state":` (the writer puts every head field first). */
function headOf(raw: string): string {
  const at = raw.indexOf('"state":');
  return raw.slice(0, at < 0 ? 300 : Math.min(at, 300));
}

/** Whether `prev` is an earlier write of the save `good` (the same lineage, not a newer schema), from their heads. */
function olderWriteOf(prev: string, good: string): boolean {
  const gen = (raw: string) => /"gen":"([0-9a-f]{32})"/.exec(headOf(raw))?.[1];
  const v = /"v":(\d+)/.exec(headOf(prev));
  const g = gen(prev);
  return g !== undefined && g === gen(good) && v !== null && Number(v[1]) <= SCHEMA_VERSION;
}

/** The `rev` of the save under `key` without validating it (for `storage` events). */
export function peekRev(storage: KeyValueStorage, key: string): number | null {
  const raw = safeGet(storage, key);
  if (raw === null) return null;
  const m = /"rev":(\d+)/.exec(raw.slice(0, 200));
  return m ? Number(m[1]) : null;
}

/**
 * The identity of the save under `key` (`gen` and `rev`) without parsing or validating it, or
 * null when there is no save. A head that can't be read reads as a legacy save at rev 0.
 */
export function peekHead(storage: KeyValueStorage, key: string): SaveHead | null {
  const raw = safeGet(storage, key);
  if (raw === null) return null;
  const head = headOf(raw);
  const rev = /"rev":(\d+)/.exec(head);
  const gen = /"gen":"([0-9a-f]{32})"/.exec(head);
  return { gen: gen ? gen[1] : undefined, rev: rev ? Number(rev[1]) : 0 };
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

export function encodeEnvelope(state: AppState, rev: number, savedAt: number, appVersion: string, gen?: string): string {
  const env: Envelope = { v: state.version, appVersion, rev, savedAt, ...(gen ? { gen } : {}), state };
  return JSON.stringify(env);
}

/** Keeps the loaded good save as `:backup` (DESIGN §11). */
export function writeBackup(storage: KeyValueStorage, key: string, raw: string): void {
  trySet(storage, backupKeyOf(key), raw);
}

/**
 * Keeps the good save `good` as `:backup`, never losing a `:backup` this catkin can't read (the
 * WP-A4 review): one that is damaged or a newer catkin's may be the only copy of it, so it is kept
 * aside under `:corrupt` first when that is free, and otherwise left where it is; a damaged one
 * may go once `:corrupt` already holds a damaged save. An older write of the good save itself (the
 * same lineage, no newer schema) is simply replaced, as ever, without decoding it.
 */
export function replaceBackup(storage: KeyValueStorage, key: string, good: string): void {
  const prev = safeGet(storage, backupKeyOf(key));
  if (prev !== null && prev !== good && !olderWriteOf(prev, good)) {
    const kind = parseEnvelope(prev, 'backup-copy').kind;
    if (kind !== 'ok') {
      if (safeGet(storage, corruptKeyOf(key)) === null) {
        if (!keepDamaged(storage, key, prev)) return;
      } else if (kind === 'newer') return;
    }
  }
  writeBackup(storage, key, good);
}

/**
 * A write's outcome. 'volatile': written, but only to memory (no persistent storage this session),
 * so it goes when catkin closes; never reported as 'saved'.
 */
export type SaveStatus = 'saved' | 'volatile' | 'storage-full' | 'unavailable';

/**
 * What a write attempt did: the write's status, or why nothing was written: 'held' (this window
 * doesn't own the save yet, so the state waits) or 'disposed' (the queue was retired). Neither is
 * ever reported as 'saved'.
 */
export type FlushOutcome = SaveStatus | 'held' | 'disposed';

/** Waits between retries of a failed write (the last one repeats). */
export const RETRY_MS = [1_000, 4_000, 15_000, 60_000] as const;

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
  /** The save's lineage; left out for a legacy save (the first write mints one). */
  gen?: string;
  /** The storage is memory only (no persistent storage): writes report 'volatile', never 'saved'. */
  volatile?: boolean;
  /** Re-check the durable head immediately before writing; storage events may still be queued. */
  canWrite?: () => boolean;
  /**
   * A write that succeeded only by taking the room of the text kept aside under `:corrupt` (a full
   * disk) hands that text here: it is no longer on disk, so the caller keeps it and says so (the
   * WP-A7 review). Called after the write, only when it succeeded.
   */
  onDamagedDropped?: (raw: string) => void;
}

/**
 * Debounced, quota-aware writer for one key. `schedule` coalesces writes within 250 ms; `saveNow`
 * writes at once (cancelling a pending one); `flush` writes whatever is pending.
 *
 * A state stays pending until it is actually written: a failed write keeps it and retries (after
 * RETRY_MS, and whenever `flush` is called again), so the last change is never dropped from the
 * retry path (audit data-d2). A retired queue (`dispose`) forgets its pending state and never writes
 * again, even from a frame or timer callback scheduled before it was retired (audit FS1).
 */
export class SaveQueue {
  rev: number;
  /** The lineage this queue writes (undefined until a legacy save's first write mints one). */
  gen: string | undefined;
  private pending: AppState | null = null;
  private handle: unknown = null;
  private retryHandle: unknown = null;
  private attempts = 0;
  private lastStatus: SaveStatus | null = null;
  private held = false;
  private disposed = false;
  lastChars = 0;

  constructor(private readonly o: SaveQueueOptions) {
    this.rev = o.rev;
    this.gen = o.gen;
  }

  /** A state waiting to be written (debounced, held for the lock, or after a failed write). */
  get hasPending(): boolean {
    return this.pending !== null;
  }

  /** The last write failed and its state is still waiting to be written. */
  get failing(): boolean {
    return this.pending !== null && (this.lastStatus === 'storage-full' || this.lastStatus === 'unavailable');
  }

  /** Waiting for the writer lock: writes are held. */
  get isHeld(): boolean {
    return this.held && !this.disposed;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  schedule(state: AppState): void {
    if (this.disposed) return;
    this.pending = state;
    if (this.handle !== null) return;
    this.handle = this.o.timers.setTimeout(() => {
      this.handle = null;
      this.flush();
    }, this.o.debounceMs ?? DEBOUNCE_MS);
  }

  saveNow(state: AppState): FlushOutcome {
    if (this.disposed) return 'disposed';
    this.pending = state;
    return this.flush() ?? 'held';
  }

  private soon = false;

  /**
   * Writes on the next chance `afterFrame` gives (just after the frame that shows the change), so
   * a tap's frame never waits for the save. A flush in between (pagehide, hidden, another save)
   * writes it sooner, and the late call then finds nothing pending; a queue retired in between
   * ignores it.
   */
  saveSoon(state: AppState, afterFrame: (fn: () => void) => void): void {
    if (this.disposed) return;
    this.pending = state;
    if (this.handle !== null) {
      this.o.timers.clearTimeout(this.handle);
      this.handle = null;
    }
    if (this.soon) return;
    this.soon = true;
    afterFrame(() => {
      this.soon = false;
      if (!this.disposed) this.flush();
    });
  }

  /**
   * One checked write of a whole new state (an import, an undo, a restore: WP-A3), on the lineage
   * `gen`, at once. It never touches the store's memory, and it answers with what happened:
   * - 'saved' / 'volatile': written. The queue now writes that lineage, and a change still pending
   *   from the save it replaced is dropped (it belongs to the old save).
   * - anything else: nothing changed here, not rev, not lineage, not the pending change (which keeps
   *   its own retries). A failed replacement is not retried: the caller says nothing changed.
   */
  writeNow(state: AppState, gen: string): FlushOutcome {
    if (this.disposed) return 'disposed';
    if (this.held) return 'held';
    if (this.o.canWrite?.() === false) return 'disposed';
    const before = this.gen;
    this.gen = gen;
    const status = this.write(state);
    if (status !== 'saved' && status !== 'volatile') {
      this.gen = before;
      return status;
    }
    this.clearTimers();
    this.pending = null;
    this.attempts = 0;
    this.lastStatus = status;
    this.o.onStatus?.(status, { rev: this.rev, chars: this.lastChars });
    return status;
  }

  /** Keeps writes pending (not written) until `release()`. */
  hold(): void {
    this.held = true;
  }

  /** Ends a hold and writes whatever is pending. */
  release(): FlushOutcome | null {
    this.held = false;
    return this.flush();
  }

  /** Forgets the pending state without writing it (lock refused, or another window's save adopted). */
  discardPending(): void {
    this.clearTimers();
    this.pending = null;
    this.attempts = 0;
  }

  /**
   * Writes the pending state, if any. Null when nothing is pending; 'held' while held (the state
   * stays pending); 'disposed' once retired. On a failed write the state stays pending and a retry
   * is scheduled.
   */
  flush(): FlushOutcome | null {
    if (this.handle !== null) {
      this.o.timers.clearTimeout(this.handle);
      this.handle = null;
    }
    if (this.disposed) return null;
    const state = this.pending;
    if (state === null) return null;
    if (this.held) return 'held';
    if (this.o.canWrite?.() === false) return 'disposed';
    const status = this.write(state);
    if (status === 'saved' || status === 'volatile') {
      if (this.pending === state) this.pending = null;
      this.attempts = 0;
      if (this.retryHandle !== null) {
        this.o.timers.clearTimeout(this.retryHandle);
        this.retryHandle = null;
      }
    } else {
      this.attempts++;
      this.scheduleRetry();
    }
    if (status !== this.lastStatus || status === 'saved') this.o.onStatus?.(status, { rev: this.rev, chars: this.lastChars });
    this.lastStatus = status;
    return status;
  }

  private scheduleRetry(): void {
    if (this.retryHandle !== null) return;
    const wait: number = RETRY_MS[Math.min(this.attempts, RETRY_MS.length) - 1] ?? RETRY_MS[RETRY_MS.length - 1]!;
    this.retryHandle = this.o.timers.setTimeout(() => {
      this.retryHandle = null;
      this.flush();
    }, wait);
  }

  private clearTimers(): void {
    if (this.handle !== null) this.o.timers.clearTimeout(this.handle);
    this.handle = null;
    if (this.retryHandle !== null) this.o.timers.clearTimeout(this.retryHandle);
    this.retryHandle = null;
  }

  private write(state: AppState): SaveStatus {
    const { storage, key, appVersion } = this.o;
    const rev = this.rev + 1;
    const now = this.o.now();
    const gen = (this.gen ??= mintGen());
    let res = trySet(storage, key, encodeEnvelope(state, rev, now, appVersion, gen));
    // Room is made by letting the kept-aside copies go, but only for a write that then succeeds: a
    // write that fails anyway puts them back, so a failed write never costs a damaged save's only
    // bytes (the WP-A3 review).
    let damaged: string | null = null;
    if (!res.ok && res.reason === 'quota') {
      damaged = safeGet(storage, corruptKeyOf(key));
      safeRemove(storage, corruptKeyOf(key));
      res = trySet(storage, key, encodeEnvelope(state, rev, now, appVersion, gen));
    }
    if (!res.ok && res.reason === 'quota') {
      const backup = safeGet(storage, backupKeyOf(key));
      safeRemove(storage, backupKeyOf(key));
      res = trySet(storage, key, encodeEnvelope(this.o.compact(state), rev, now, appVersion, gen));
      if (!res.ok && backup !== null) trySet(storage, backupKeyOf(key), backup);
    }
    if (!res.ok && damaged !== null) trySet(storage, corruptKeyOf(key), damaged);
    if (!res.ok) return res.reason === 'quota' ? 'storage-full' : 'unavailable';
    this.rev = rev;
    this.lastChars = res.chars;
    // The write went through without the kept-aside copy: its text is handed on, never just gone.
    if (damaged !== null) this.o.onDamagedDropped?.(damaged);
    return this.o.volatile ? 'volatile' : 'saved';
  }

  /** Retires the queue: its pending state is forgotten and it never writes again. */
  dispose(): void {
    this.disposed = true;
    this.clearTimers();
    this.pending = null;
  }
}

/* ------------------------------------------------------------------ */
/* Reset & theme mirror                                                */
/* ------------------------------------------------------------------ */

/** Removes every `catkin:*` key (and nothing else). Returns how many were removed. */
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

/** Writes a stored text back as it was (an undo note being put back); false on failure. */
export function writeRaw(storage: KeyValueStorage, key: string, text: string): boolean {
  return trySet(storage, key, text).ok;
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
