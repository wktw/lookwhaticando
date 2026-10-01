/**
 * WP-A6 below the interface: an import that is let go (the sheet closed, or another backup chosen)
 * stops working as well as stops counting. A file read is cancelled, a CK1 payload stops expanding
 * at the next chunk, and text whose read was let go is never parsed. (WP-A5 left "making the import
 * cancellable while it validates" to this package.) Cases marked "failed before" failed against the
 * code before WP-A6 (f6d620d); "the option is new" marks the ones whose `signal` option did not exist
 * there (they fail on its absence). "(guard)" cases passed there too.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as handoff from '@/state/handoff';
import * as store from '@/state/store';
import * as files from '@/features/you/files';
import { fakeBrowser } from './fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  store.configureStore({ locks: null });
});

const said = (r: { ok: boolean; error?: string }) => (r.ok ? 'ok' : r.error);

/**
 * A stand-in DecompressionStream that hands out 1 MB chunks on demand, forever, and calls `onPull`
 * on each: a reader that ignores its signal pulls until the 128 MB bound (129 chunks).
 */
function endlessInflate(onPull: (n: number) => void) {
  const chunk = new Uint8Array(1024 * 1024);
  const seen = { pulls: 0, cancelled: false };
  class Inflate {
    writable = new WritableStream<Uint8Array>();
    readable = new ReadableStream<Uint8Array>(
      {
        pull(c) {
          seen.pulls++;
          onPull(seen.pulls);
          c.enqueue(chunk);
        },
        cancel() {
          seen.cancelled = true;
        },
      },
      { highWaterMark: 0 },
    );
  }
  vi.stubGlobal('DecompressionStream', Inflate);
  return seen;
}

describe('WP-A6: a let-go import stops expanding a payload', () => {
  it('previewImport with a signal aborted mid-expansion cancels the stream and answers aborted (failed before; the option is new)', async () => {
    const ctl = new AbortController();
    const seen = endlessInflate((n) => n === 2 && ctl.abort());
    const res = await store.previewImport('CK1:H4sIAAAAAAAA', { signal: ctl.signal });
    expect(said(res)).toBe('aborted');
    expect(seen.cancelled).toBe(true);
    expect(seen.pulls).toBeLessThanOrEqual(3);
  });

  it('applyImport let go mid-expansion stops expanding, and nothing changes (failed before)', async () => {
    fakeBrowser();
    store.hydrate();
    const before = store.state.value;
    const ctl = new AbortController();
    const seen = endlessInflate((n) => n === 2 && ctl.abort());
    const res = await store.applyImport('CK1:H4sIAAAAAAAA', { signal: ctl.signal });
    expect(said(res)).toBe('aborted');
    expect(seen.cancelled).toBe(true);
    expect(seen.pulls).toBeLessThanOrEqual(3);
    expect(store.state.value).toBe(before);
  });

  it('text whose preview was let go before it began is never parsed (failed before; the option is new)', async () => {
    fakeBrowser();
    store.hydrate();
    const text = store.exportData();
    const ctl = new AbortController();
    ctl.abort();
    const parse = vi.spyOn(JSON, 'parse');
    const res = await store.previewImport(text, { signal: ctl.signal });
    expect(said(res)).toBe('aborted');
    expect(parse.mock.calls.filter(([t]) => t === text.trim())).toEqual([]);
  });

  it('without a signal, a real CK1 backup is still described (guard)', async () => {
    fakeBrowser();
    store.hydrate();
    const payload = await handoff.encodePayload(store.exportData());
    expect(said(await store.previewImport(payload))).toBe('ok');
  });
});

/** A File stand-in whose stream hands out `parts` one pull at a time, and records a cancel. */
function streamedFile(parts: Uint8Array[], onPull: (n: number) => void = () => undefined) {
  const seen = { pulls: 0, cancelled: false };
  const size = parts.reduce((n, p) => n + p.byteLength, 0);
  const file = {
    name: 'backup.json',
    size,
    text: vi.fn(async () => new TextDecoder().decode(Buffer.concat(parts))),
    stream: () =>
      new ReadableStream<Uint8Array>(
        {
          pull(c) {
            seen.pulls++;
            onPull(seen.pulls);
            const next = parts[seen.pulls - 1];
            if (next) c.enqueue(next);
            else c.close();
          },
          cancel() {
            seen.cancelled = true;
          },
        },
        { highWaterMark: 0 },
      ),
  } as unknown as File;
  return { file, seen };
}

describe('WP-A6: a let-go file read stops reading', () => {
  it('readImportFile with a signal aborted mid-read cancels the read and answers aborted (failed before; the option is new)', async () => {
    const ctl = new AbortController();
    const parts = Array.from({ length: 10 }, () => new Uint8Array(1024).fill(0x61));
    const { file, seen } = streamedFile(parts, (n) => n === 2 && ctl.abort());
    await expect(files.readImportFile(file, { signal: ctl.signal })).resolves.toEqual({ ok: false, error: 'aborted' });
    expect(seen.cancelled).toBe(true);
    expect(seen.pulls).toBeLessThanOrEqual(3);
  });

  it('a streamed read gives the same text as reading it whole, a character split across chunks included (guard)', async () => {
    const bytes = new TextEncoder().encode('{"name":"Zoë ☕ 🌿"}');
    // Split inside the multi-byte characters.
    const parts = [bytes.subarray(0, 12), bytes.subarray(12, 15), bytes.subarray(15, 19), bytes.subarray(19)];
    const { file } = streamedFile(parts);
    await expect(files.readImportFile(file)).resolves.toEqual({ ok: true, text: '{"name":"Zoë ☕ 🌿"}' });
  });

  it('a file past the bound is still refused by its size, before it is read (guard)', async () => {
    const { file, seen } = streamedFile([new Uint8Array(4)]);
    Object.defineProperty(file, 'size', { value: handoff.MAX_IMPORT_BYTES + 1 });
    await expect(files.readImportFile(file)).resolves.toEqual({ ok: false, error: 'too-large' });
    expect(seen.pulls).toBe(0);
  });
});
