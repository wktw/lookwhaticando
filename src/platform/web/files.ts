/**
 * Files and the clipboard for You › Data (DESIGN §9.5, §11.1): a backup goes to the share sheet
 * where there is one (iPhone, iPad, the Mac's Safari), else it downloads; text is copied with the
 * async clipboard, then the old execCommand path. Each helper says how it went, so the screen can
 * word the note (VOICE §21, §18).
 */

import { MAX_IMPORT_BYTES } from '@/state/handoffCore';

export type SaveOutcome = 'shared' | 'downloaded' | 'downloaded-instead' | 'cancelled';

/** Downloads text as a file (a blob link, clicked). */
export function downloadText(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

type ShareNavigator = Navigator & { canShare?: (data: ShareData) => boolean };

/** Whether this device offers the share sheet for files (iOS, iPadOS, Safari on the Mac, Android). */
export function canShareFiles(nav: ShareNavigator | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  if (!nav?.share || !nav.canShare || typeof File === 'undefined') return false;
  try {
    return nav.canShare({ files: [new File(['{}'], 'catkin.json', { type: 'application/json' })] });
  } catch {
    return false;
  }
}

/** A touch device where the share sheet is how files leave the app (the desktop just downloads). */
function prefersShare(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

/**
 * "Save a backup": the share sheet on touch devices that have one, else a download. A share that
 * can't open (not a cancel) falls back to a download: "Saved to Downloads instead."
 */
export async function saveFile(name: string, text: string, type = 'application/json'): Promise<SaveOutcome> {
  if (prefersShare() && canShareFiles()) {
    try {
      await navigator.share({ files: [new File([text], name, { type })] });
      return 'shared';
    } catch (e) {
      if ((e as { name?: string } | null)?.name === 'AbortError') return 'cancelled';
      downloadText(name, text, type);
      return 'downloaded-instead';
    }
  }
  downloadText(name, text, type);
  return 'downloaded';
}

/** Copies text; false when neither clipboard path worked (the screen then shows the text to copy by hand). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the old path */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copies text that is still being made (a gzipped CK1 backup). Call it straight from the tap, with
 * no await before it: iPhone Safari only lets a tap write to the clipboard if the write starts
 * inside it, and it takes a ClipboardItem whose text arrives later. Elsewhere (or if that is
 * refused) the text is copied once it is ready.
 */
export async function copyLater(text: Promise<string>): Promise<boolean> {
  const Item = typeof ClipboardItem === 'undefined' ? undefined : ClipboardItem;
  if (Item && navigator.clipboard?.write) {
    try {
      const blob = text.then((t) => new Blob([t], { type: 'text/plain' }));
      await navigator.clipboard.write([new Item({ 'text/plain': blob })]);
      return true;
    } catch {
      /* fall through to the text paths */
    }
  }
  try {
    return await copyText(await text);
  } catch {
    return false;
  }
}

/**
 * Reads the clipboard's text (null when the browser won't say). Like copying, iPhone Safari only
 * allows it from inside a tap, so a caller starts it in its click handler.
 */
export async function readClipboard(): Promise<string | null> {
  try {
    const text = await navigator.clipboard?.readText?.();
    return typeof text === 'string' ? text : null;
  } catch {
    return null;
  }
}

/**
 * Reads a chosen backup file, refusing one past the import bound by its size alone, before a byte
 * of it is read (WP-A5, P-persistence-06): 'too-large'. 'unreadable' when the browser can't read it.
 * When `signal` aborts (another backup was chosen, or the sheet closed) the read stops at the next
 * chunk and answers 'aborted' (WP-A6).
 */
export async function readImportFile(
  file: File,
  opts: { maxBytes?: number; signal?: AbortSignal } = {},
): Promise<{ ok: true; text: string } | { ok: false; error: 'too-large' | 'unreadable' | 'aborted' }> {
  if (!(file.size <= (opts.maxBytes ?? MAX_IMPORT_BYTES))) return { ok: false, error: 'too-large' };
  if (opts.signal?.aborted) return { ok: false, error: 'aborted' };
  try {
    const text = await readFileText(file, opts.signal);
    return text === null ? { ok: false, error: 'aborted' } : { ok: true, text };
  } catch {
    return { ok: false, error: opts.signal?.aborted ? 'aborted' : 'unreadable' };
  }
}

/**
 * Reads a chosen file as UTF-8 text, as `Blob.text()` does. Where the file can be streamed it is
 * read chunk by chunk, so a read that `signal` lets go stops (null) instead of filling memory with
 * a file nobody wants any more; otherwise it is read whole and dropped if let go meanwhile.
 */
export async function readFileText(file: File, signal?: AbortSignal): Promise<string | null> {
  if (typeof file.stream === 'function') {
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    let text = '';
    for (;;) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      const { done, value } = await reader.read();
      // A read can finish after the chooser closes, including the terminal empty chunk.
      if (signal?.aborted) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      if (done) return text + decoder.decode();
      text += decoder.decode(value, { stream: true });
    }
  }
  const text =
    typeof file.text === 'function'
      ? await file.text()
      : await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result ?? ''));
          r.onerror = () => reject(r.error);
          r.readAsText(file);
        });
  return signal?.aborted ? null : text;
}
