/**
 * Backups and the Safari → app handoff (DESIGN v1 §13.8 "Handoff", "Export/import").
 *
 * - Backup file: `{ format: 'catkin-backup', v, appVersion, exportedAt, device, state }`. A backup of
 *   a newer catkin's save is that save's own envelope text instead (the store's `backupJson`, FS2),
 *   which import reads as a raw envelope and refuses as 'made-by-newer-version'.
 * - Clipboard payload: `'CK1:' + base64url(gzip(json))` using CompressionStream, or, where
 *   CompressionStream is unavailable, the graceful fallback `'CK0:' + base64url(utf8(json))`.
 * - Import accepts a backup file, a CK1/CK0 payload, or a raw save envelope; it decodes the state
 *   (`decodeState`: the allow-listed omissions, migrations, validation) before anything is applied,
 *   and describes the result for the preview ("12 habits, 1,284 check-ins, 23 friends, saved
 *   Sep 27"). Applying (snapshot first, replace
 *   never merge, undo for 24 h) is the store's job.
 * - Bounds (WP-A5, P-persistence-06): an import is at most `MAX_IMPORT_BYTES` of text (a file is
 *   checked by its size before it is read, `features/you/files.ts`), and a CK1 payload is expanded
 *   as a stream that stops at `MAX_EXPANDED_BYTES`: 'too-large', never a phone out of memory. The
 *   wrapper's own numbers are checked too (`exportedAt`, a raw envelope's `savedAt` and `rev`, FS8),
 *   and the clock guard it brings is capped at when it was made (DEC-P14, `capImportedClock`).
 * - Letting go (WP-A6): an import or preview carries the sheet's `signal`; when it aborts, a CK1
 *   payload stops expanding at the next chunk and nothing is parsed: 'aborted'.
 */
import type { ImportPreview } from './api';
import type { AppState } from './types';
import { appDayKey, CLOCK_ROLLBACK_TOLERANCE_MS, runtimeLocalTime, type LocalTimeReader } from '@/domain/dates';
import { decodeState } from './decode';
import { countCheckins } from './snapshots';
import { isTimestamp } from './validate';

export const BACKUP_FORMAT = 'catkin-backup';
export const PAYLOAD_GZIP = 'CK1:';
export const PAYLOAD_PLAIN = 'CK0:';

/** The most an import may be: 64 MB of file, or of pasted text (a lived-in backup is well under 1 MB). */
export const MAX_IMPORT_BYTES = 64 * 1024 * 1024;
/** The most a CK1 payload may expand to (128 MB): past it, decompression stops. */
export const MAX_EXPANDED_BYTES = 128 * 1024 * 1024;

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  v: number;
  appVersion: string;
  exportedAt: number;
  device: string;
  state: AppState;
}

export function makeBackup(state: AppState, opts: { now: number; appVersion: string; device: string }): BackupEnvelope {
  return { format: BACKUP_FORMAT, v: state.version, appVersion: opts.appVersion, exportedAt: opts.now, device: opts.device, state };
}

/** A short device description for backups ("iPhone · Safari"), from the user agent when available. */
export function deviceLabel(ua: string | undefined = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent): string {
  if (!ua) return 'Unknown device';
  const device = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Macintosh/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows PC' : /Linux/.test(ua) ? 'Linux' : 'Device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /Node/.test(ua) ? 'Node' : 'Browser';
  return `${device} · ${browser}`;
}

/* ------------------------------------------------------------------ */
/* base64url (RFC 4648 §5, no padding) without Buffer/btoa             */
/* ------------------------------------------------------------------ */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const LOOKUP = new Map([...ALPHABET].map((c, i) => [c, i]));

export function base64UrlEncode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + ALPHABET[n & 63]!;
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]!;
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]!;
  }
  return out;
}

/** Decodes base64url (also accepts '+', '/', '=' padding and whitespace). Throws on bad input. */
export function base64UrlDecode(text: string): Uint8Array {
  const clean = text.replace(/\s+/g, '').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  if (clean.length % 4 === 1) throw new Error('bad base64 length');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    let n = 0;
    const chunk = clean.slice(i, i + 4);
    for (let j = 0; j < 4; j++) {
      const c = chunk[j];
      const v = c === undefined ? 0 : LOOKUP.get(c);
      if (v === undefined) throw new Error('bad base64 character');
      n = (n << 6) | v;
    }
    out[o++] = (n >> 16) & 255;
    if (chunk.length > 2) out[o++] = (n >> 8) & 255;
    if (chunk.length > 3) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

/* ------------------------------------------------------------------ */
/* gzip via (De)CompressionStream                                      */
/* ------------------------------------------------------------------ */

type StreamCtor = new (format: 'gzip') => { readable: ReadableStream<Uint8Array>; writable: WritableStream<Uint8Array> };

function streamCtor(name: 'CompressionStream' | 'DecompressionStream'): StreamCtor | null {
  const ctor = (globalThis as Record<string, unknown>)[name];
  return typeof ctor === 'function' ? (ctor as StreamCtor) : null;
}

/** Why a stream was let go: past its bound, or its import let go (WP-A6). */
class Stopped {
  constructor(readonly why: 'too-large' | 'aborted') {}
}

/**
 * Runs bytes through a (de)compression stream, reading it chunk by chunk with a running count: past
 * `maxBytes` it cancels the stream and answers 'too-large', so a small payload can never expand to
 * fill the phone's memory before anything is checked. When `signal` aborts (the import was let go:
 * the sheet closed, or another backup was chosen) it cancels the stream at the next chunk and
 * answers 'aborted' (WP-A6).
 */
async function through(bytes: Uint8Array, ctor: StreamCtor, maxBytes = Infinity, signal?: AbortSignal): Promise<Uint8Array | Stopped> {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(new ctor('gzip')).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => undefined);
      return new Stopped('aborted');
    }
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return new Stopped('too-large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/** 'CK1:' + base64url(gzip(json)), or 'CK0:' + base64url(json) without CompressionStream. */
export async function encodePayload(json: string, opts: { compress?: boolean } = {}): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  const ctor = opts.compress === false ? null : streamCtor('CompressionStream');
  if (ctor) {
    try {
      const out = await through(bytes, ctor);
      if (out instanceof Uint8Array) return PAYLOAD_GZIP + base64UrlEncode(out);
    } catch {
      /* fall through to the plain payload */
    }
  }
  return PAYLOAD_PLAIN + base64UrlEncode(bytes);
}

export interface ImportBounds {
  /** The most the payload may expand to (default `MAX_EXPANDED_BYTES`; tests use less). */
  maxBytes?: number;
  /** Aborted when the import is let go: reading stops at the next chunk, and the answer is 'aborted' (WP-A6). */
  signal?: AbortSignal | undefined;
}

/** The JSON inside a CK1/CK0 payload ('too-large' past the bounds, without expanding the rest). */
export async function decodePayload(text: string, opts: ImportBounds = {}): Promise<{ ok: true; json: string } | { ok: false; error: string }> {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'too-large' };
  const maxBytes = opts.maxBytes ?? MAX_EXPANDED_BYTES;
  const t = text.trim();
  const prefix = t.slice(0, 4);
  if (prefix !== PAYLOAD_GZIP && prefix !== PAYLOAD_PLAIN) return { ok: false, error: 'not-a-payload' };
  let bytes: Uint8Array;
  try {
    bytes = base64UrlDecode(t.slice(4));
  } catch {
    return { ok: false, error: 'damaged-payload' };
  }
  if (prefix === PAYLOAD_GZIP) {
    const ctor = streamCtor('DecompressionStream');
    if (!ctor) return { ok: false, error: 'cannot-decompress-here' };
    let out: Uint8Array | Stopped;
    try {
      out = await through(bytes, ctor, maxBytes, opts.signal);
    } catch {
      return { ok: false, error: opts.signal?.aborted ? 'aborted' : 'damaged-payload' };
    }
    if (out instanceof Stopped) return { ok: false, error: out.why };
    bytes = out;
  } else if (bytes.byteLength > maxBytes) {
    return { ok: false, error: 'too-large' };
  }
  try {
    return { ok: true, json: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, error: 'damaged-payload' };
  }
}

/* ------------------------------------------------------------------ */
/* Parsing an import                                                   */
/* ------------------------------------------------------------------ */

export type ParsedBackup =
  | { ok: true; state: AppState; savedAt: number; device?: string; appVersion?: string }
  | { ok: false; error: string; details?: string[] };

/**
 * DEC-P14 (P-persistence-21): the clock guard an import brings is capped at when the backup was
 * made (`madeAt`, its `exportedAt` or a raw envelope's `savedAt`), plus the 36 hours the guard
 * already allows: the latest time seen at most `madeAt` + 36 h, and the latest day at most the
 * backup's own day here (so today never jumps ahead of it). A backup from a device whose clock had
 * run ahead would otherwise pause rewards here until that date, or fix today on it. A guard within
 * the cap comes in as it was; with no `madeAt` (a bare state) there is nothing to cap it by.
 */
export function capImportedClock(state: AppState, madeAt: number, local: LocalTimeReader = runtimeLocalTime): AppState {
  if (!(madeAt > 0)) return state;
  const latest = madeAt + CLOCK_ROLLBACK_TOLERANCE_MS;
  const day = appDayKey(madeAt, state.settings.dayStartsAt, local);
  const c = state.clock;
  const maxDateKey = c.maxDateKey !== '' && c.maxDateKey > day ? day : c.maxDateKey;
  if (maxDateKey === c.maxDateKey && c.maxEpochMs <= latest && c.lastCheckinAt <= latest) return state;
  return { ...state, clock: { maxDateKey, maxEpochMs: Math.min(c.maxEpochMs, latest), lastCheckinAt: Math.min(c.lastCheckinAt, latest) } };
}

export interface ParseOptions extends ImportBounds {
  /** The local clock reader the backup's day is read with (the store's; default the device's). */
  local?: LocalTimeReader;
}

/** A wrapper number that is absent, or a timestamp catkin could have written (FS8: `exportedAt` 1e20). */
const okTime = (v: unknown): boolean => v === undefined || isTimestamp(v);

/**
 * Accepts a backup file, a CK1/CK0 payload or a raw save envelope, and decodes its state. A newer
 * catkin's (by the state's version or the wrapper's `v`) is 'made-by-newer-version'; one missing
 * anything a real build wrote is 'damaged-backup' (data-d6); one past the bounds is 'too-large'
 * (read no further); a wrapper whose own numbers are not real ones (a time past the ceiling, a
 * revision that is not a whole number) is 'not-a-backup'.
 */
export async function parseBackupText(text: string, opts: ParseOptions = {}): Promise<ParsedBackup> {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'too-large' };
  let json = text.trim();
  if (json.startsWith(PAYLOAD_GZIP) || json.startsWith(PAYLOAD_PLAIN)) {
    const d = await decodePayload(json, opts);
    if (!d.ok) return d;
    json = d.json;
  }
  // Let go before the parse: a large backup's JSON.parse and validation can't be interrupted once
  // they start, so they don't start (WP-A6).
  if (opts.signal?.aborted) return { ok: false, error: 'aborted' };
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    return { ok: false, error: 'not-a-backup' };
  }
  if (typeof obj !== 'object' || obj === null) return { ok: false, error: 'not-a-backup' };
  const o = obj as Record<string, unknown>;
  let raw: unknown;
  let declared: unknown;
  let savedAt = 0;
  let device: string | undefined;
  let appVersion: string | undefined;
  if (o.format === BACKUP_FORMAT) {
    if (!okTime(o.exportedAt)) return { ok: false, error: 'not-a-backup' };
    raw = o.state;
    declared = o.v;
    savedAt = typeof o.exportedAt === 'number' ? o.exportedAt : 0;
    device = typeof o.device === 'string' ? o.device : undefined;
    appVersion = typeof o.appVersion === 'string' ? o.appVersion : undefined;
  } else if (typeof o.v === 'number' && 'state' in o) {
    if (!okTime(o.savedAt) || !(o.rev === undefined || (Number.isSafeInteger(o.rev) && (o.rev as number) >= 0))) return { ok: false, error: 'not-a-backup' };
    raw = o.state;
    declared = o.v;
    savedAt = typeof o.savedAt === 'number' ? o.savedAt : 0;
    appVersion = typeof o.appVersion === 'string' ? o.appVersion : undefined;
  } else if (typeof o.version === 'number' && Array.isArray(o.habits)) raw = o;
  else return { ok: false, error: 'not-a-backup' };
  const d = decodeState(raw, 'import', { declaredVersion: declared });
  if (d.kind === 'newer') return { ok: false, error: 'made-by-newer-version' };
  if (d.kind === 'corrupt') return d.reason === 'invalid' ? { ok: false, error: 'damaged-backup', details: d.errors } : { ok: false, error: 'not-a-backup' };
  return { ok: true, state: capImportedClock(d.state, savedAt, opts.local), savedAt, ...(device ? { device } : {}), ...(appVersion ? { appVersion } : {}) };
}

/** The import preview line's numbers. */
export function describeBackup(p: Extract<ParsedBackup, { ok: true }>): ImportPreview {
  return {
    ok: true,
    // Live habits, as You's profile counts them (archived ones come along, on the balcony shelf).
    habits: p.state.habits.filter((h) => h.archivedOn === undefined).length,
    checkins: countCheckins(p.state),
    friends: Object.keys(p.state.pets).length,
    savedAt: p.savedAt,
    ...(p.device ? { device: p.device } : {}),
  };
}
