/**
 * Backups and the Safari → app handoff (DESIGN v1 §13.8 "Handoff", "Export/import").
 *
 * - Backup file: `{ format: 'catkin-backup', v, appVersion, exportedAt, device, state }`.
 * - Clipboard payload: `'CK1:' + base64url(gzip(json))` using CompressionStream, or, where
 *   CompressionStream is unavailable, the graceful fallback `'CK0:' + base64url(utf8(json))`.
 * - Import accepts a backup file, a CK1/CK0 payload, or a raw save envelope; it migrates and
 *   validates before anything is applied, and describes the result for the preview
 *   ("12 habits, 1,284 check-ins, 23 friends, saved Sep 27"). Applying (snapshot first, replace
 *   never merge, undo for 24 h) is the store's job.
 */
import type { ImportPreview } from './api';
import type { AppState } from './types';
import { migrate } from './migrate';
import { countCheckins } from './snapshots';
import { validateState } from './validate';

export const BACKUP_FORMAT = 'catkin-backup';
export const PAYLOAD_GZIP = 'CK1:';
export const PAYLOAD_PLAIN = 'CK0:';

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

async function through(bytes: Uint8Array, ctor: StreamCtor): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new ctor('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** 'CK1:' + base64url(gzip(json)), or 'CK0:' + base64url(json) without CompressionStream. */
export async function encodePayload(json: string, opts: { compress?: boolean } = {}): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  const ctor = opts.compress === false ? null : streamCtor('CompressionStream');
  if (ctor) {
    try {
      return PAYLOAD_GZIP + base64UrlEncode(await through(bytes, ctor));
    } catch {
      /* fall through to the plain payload */
    }
  }
  return PAYLOAD_PLAIN + base64UrlEncode(bytes);
}

/** The JSON inside a CK1/CK0 payload. */
export async function decodePayload(text: string): Promise<{ ok: true; json: string } | { ok: false; error: string }> {
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
    try {
      bytes = await through(bytes, ctor);
    } catch {
      return { ok: false, error: 'damaged-payload' };
    }
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

/** Accepts a backup file, a CK1/CK0 payload or a raw save envelope; migrates and validates. */
export async function parseBackupText(text: string): Promise<ParsedBackup> {
  let json = text.trim();
  if (json.startsWith(PAYLOAD_GZIP) || json.startsWith(PAYLOAD_PLAIN)) {
    const d = await decodePayload(json);
    if (!d.ok) return d;
    json = d.json;
  }
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    return { ok: false, error: 'not-a-backup' };
  }
  if (typeof obj !== 'object' || obj === null) return { ok: false, error: 'not-a-backup' };
  const o = obj as Record<string, unknown>;
  let raw: unknown;
  let savedAt = 0;
  let device: string | undefined;
  let appVersion: string | undefined;
  if (o.format === BACKUP_FORMAT) {
    raw = o.state;
    savedAt = typeof o.exportedAt === 'number' ? o.exportedAt : 0;
    device = typeof o.device === 'string' ? o.device : undefined;
    appVersion = typeof o.appVersion === 'string' ? o.appVersion : undefined;
  } else if (typeof o.v === 'number' && typeof o.state === 'object') {
    raw = o.state;
    savedAt = typeof o.savedAt === 'number' ? o.savedAt : 0;
    appVersion = typeof o.appVersion === 'string' ? o.appVersion : undefined;
  } else if (typeof o.version === 'number' && Array.isArray(o.habits)) raw = o;
  else return { ok: false, error: 'not-a-backup' };
  const m = migrate(raw);
  if (!m.ok) return { ok: false, error: m.error === 'newer-version' ? 'made-by-newer-version' : 'not-a-backup' };
  const v = validateState(m.state);
  if (!v.ok) return { ok: false, error: 'damaged-backup', details: v.errors };
  return { ok: true, state: v.state, savedAt, ...(device ? { device } : {}), ...(appVersion ? { appVersion } : {}) };
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
