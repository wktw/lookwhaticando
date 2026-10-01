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

  it('a signal already aborted answers aborted before a byte is read (review guard)', async () => {
    const ctl = new AbortController();
    ctl.abort();
    const { file, seen } = streamedFile([new Uint8Array(4).fill(0x61)]);
    const plain = { name: 'backup.json', size: 4, text: vi.fn(async () => 'aaaa') } as unknown as File;
    await expect(files.readImportFile(file, { signal: ctl.signal })).resolves.toEqual({ ok: false, error: 'aborted' });
    await expect(files.readImportFile(plain, { signal: ctl.signal })).resolves.toEqual({ ok: false, error: 'aborted' });
    expect(seen.pulls).toBe(0);
    expect(plain.text).not.toHaveBeenCalled();
  });

  it('a file that can’t be streamed, let go while it is read whole: its text is dropped (review guard)', async () => {
    let arrive!: (t: string) => void;
    const plain = { name: 'backup.json', size: 4, text: vi.fn(() => new Promise<string>((r) => (arrive = r))) } as unknown as File;
    const ctl = new AbortController();
    const read = files.readImportFile(plain, { signal: ctl.signal });
    await Promise.resolve();
    ctl.abort();
    arrive('{"a":1}');
    await expect(read).resolves.toEqual({ ok: false, error: 'aborted' });
    // Not let go, the same file is read.
    const again = files.readImportFile(plain, { signal: new AbortController().signal });
    await Promise.resolve();
    arrive('{"a":1}');
    await expect(again).resolves.toEqual({ ok: true, text: '{"a":1}' });
  });

  it('a file past the bound is still refused by its size, before it is read (guard)', async () => {
    const { file, seen } = streamedFile([new Uint8Array(4)]);
    Object.defineProperty(file, 'size', { value: handoff.MAX_IMPORT_BYTES + 1 });
    await expect(files.readImportFile(file)).resolves.toEqual({ ok: false, error: 'too-large' });
    expect(seen.pulls).toBe(0);
  });
});

describe('WP-A6: the store says when an import commits (review)', () => {
  it('onCommit is called once, at the commit, before older copies are pruned; a throwing hook changes nothing (failed before; the option is new)', async () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Ana', templateIds: [] });
    const A = store.exportData();
    store.resetAll();
    store.completeOnboarding({ name: 'Other', templateIds: [] });
    b.advance(1000);
    const seen: string[] = [];
    const list = b.snapshots.list;
    store.configureStore({ snapshots: { durable: true, get: b.snapshots.get, put: b.snapshots.put, remove: b.snapshots.remove, list: async () => (seen.push('prune'), list()) } });
    const res = await store.applyImport(A, {
      onCommit: () => {
        seen.push(`commit ${store.state.value.profile.name}`);
        throw new Error('a careless hook');
      },
    });
    expect(said(res)).toBe('ok');
    expect(seen).toEqual(['commit Ana', 'prune']);
    expect(store.state.value.profile.name).toBe('Ana');
  });

  it('onCommit is not called for an import that changes nothing (guard)', async () => {
    fakeBrowser();
    store.hydrate();
    const onCommit = vi.fn();
    const ctl = new AbortController();
    ctl.abort();
    expect(said(await store.applyImport(store.exportData(), { signal: ctl.signal, onCommit }))).toBe('aborted');
    expect(said(await store.applyImport('not a backup', { onCommit }))).not.toBe('ok');
    expect(onCommit).not.toHaveBeenCalled();
  });
});
