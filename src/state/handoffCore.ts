/**
 * The part of the handoff (`handoff.ts`) that is loaded with the app: the backup's format and bounds,
 * making a backup and its CK1/CK0 payload for export, and the bounded (de)compression stream both
 * directions share. Reading a backup in (decoding a payload, parsing and describing it) is
 * `handoff.ts`, which the store loads with `import()` only when a backup is previewed or imported,
 * so it is not part of first paint (WP-A6 review).
 */
import type { AppState } from './types';

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

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

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

/* ------------------------------------------------------------------ */
/* gzip via (De)CompressionStream                                      */
/* ------------------------------------------------------------------ */

export type StreamCtor = new (format: 'gzip') => { readable: ReadableStream<Uint8Array>; writable: WritableStream<Uint8Array> };

export function streamCtor(name: 'CompressionStream' | 'DecompressionStream'): StreamCtor | null {
  const ctor = (globalThis as Record<string, unknown>)[name];
  return typeof ctor === 'function' ? (ctor as StreamCtor) : null;
}

/** Why a stream was let go: past its bound, or its import let go (WP-A6). */
export class Stopped {
  constructor(readonly why: 'too-large' | 'aborted') {}
}

/**
 * Runs bytes through a (de)compression stream, reading it chunk by chunk with a running count: past
 * `maxBytes` it cancels the stream and answers 'too-large', so a small payload can never expand to
 * fill the phone's memory before anything is checked. When `signal` aborts (the import was let go:
 * the sheet closed, or another backup was chosen) it cancels the stream at the next chunk and
 * answers 'aborted' (WP-A6).
 */
export async function through(bytes: Uint8Array, ctor: StreamCtor, maxBytes = Infinity, signal?: AbortSignal): Promise<Uint8Array | Stopped> {
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
