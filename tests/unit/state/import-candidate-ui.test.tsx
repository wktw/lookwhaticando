// @vitest-environment jsdom
/**
 * WP-A6 (FS6, FS5's interface half, P-persistence-15): the Import sheet imports exactly the backup
 * it described. Every new choice (a file, Paste my plants, typing, opening or closing the sheet)
 * starts a new selection: what was described before goes at once, the sheet says it is reading, and
 * a read, a clipboard answer or a description that belonged to an earlier choice is dropped when it
 * comes in. Import is bound to the described text itself, so the no-undo question imports that
 * text, and choosing another backup while an import is under way lets that import go, as closing
 * the sheet does.
 *
 * File reads, clipboard answers and previews are controllable promises. Cases marked "failed
 * before" failed against the code before WP-A6 (f6d620d); "(guard)" cases passed there too.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { SAVE_KEY } from '@/state/persist';
import type { SnapshotStore } from '@/state/snapshots';
import * as store from '@/state/store';
import { DATA, DATA_COPY, ERRORS, INSTALL } from '@/catalog/lines';
import { ImportSheet, previewLine } from '@/features/you/ImportSheet';
import * as files from '@/features/you/files';
import { toasts } from '@/ui/toast';
import { button, click, installDom, mount, type, until } from '@/features/capsules/testing';
import { fakeBrowser, type FakeBrowser } from './fixtures';

// The store's previewImport and applyImport are wrapped so a test can hold one back or see its text.
vi.mock('@/state/store', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/state/store')>();
  return { ...real, previewImport: vi.fn(real.previewImport), applyImport: vi.fn(real.applyImport) };
});
// The sheet's file read is wrapped too, so a test can see the signal it was given.
vi.mock('@/features/you/files', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/features/you/files')>();
  return { ...real, readImportFile: vi.fn(real.readImportFile) };
});

beforeAll(() => {
  installDom();
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
});

let view: ReturnType<typeof mount> | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
  toasts.value = [];
  // Reset, not just cleared: a held preview a failing case never used must not leak into the next.
  vi.mocked(store.previewImport).mockReset();
  vi.mocked(store.applyImport).mockReset();
  vi.mocked(files.readImportFile).mockReset();
  Reflect.deleteProperty(navigator, 'clipboard');
  store.configureStore({ locks: null });
  localStorage.clear();
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const walk = {
  name: 'Walk',
  icon: 'water',
  color: 'sky',
  plant: 'pothos',
  pot: 'terracotta',
  schedule: { kind: 'daily' },
  target: 1,
  step: 1,
  effort: 'light',
  timeOfDay: 'anytime',
  polarity: 'build',
} as const;

/**
 * Boots a window and keeps two backups, "Ana" with one habit and "Bea" with two (so their
 * previews differ), then starts over as "Other", the save shown.
 */
function threeSaves(): { b: FakeBrowser; A: string; B: string } {
  const b = fakeBrowser();
  store.hydrate();
  const backupOf = (name: string, habits: number) => {
    store.resetAll();
    store.completeOnboarding({ name, templateIds: [] });
    for (let i = 0; i < habits; i++) store.createHabit({ ...walk, name: `Walk ${i + 1}` });
    return store.exportData();
  };
  const A = backupOf('Ana', 1);
  const B = backupOf('Bea', 2);
  store.resetAll();
  store.completeOnboarding({ name: 'Other', templateIds: [] });
  b.advance(1000);
  return { b, A, B };
}

async function lineFor(text: string): Promise<string> {
  const real = (await vi.importActual<typeof import('@/state/store')>('@/state/store')).previewImport;
  const p = await real(text);
  if (!p.ok) throw new Error('not a backup');
  return previewLine(p);
}

/** A chosen file whose text arrives when the test says (a slow disk, a cloud file). */
function slowFile(name: string) {
  const d = deferred<string>();
  const text = vi.fn(() => d.promise);
  return { file: { name, size: 1000, type: 'application/json', text }, text, arrive: async (t: string) => act(async () => { d.resolve(t); await new Promise((r) => setTimeout(r, 10)); }) };
}

/** Chooses `file` in the sheet's hidden file input. */
async function choose(file: unknown): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
}

/** A clipboard whose readText answers when the test says. */
function slowClipboard() {
  const answers: Array<(t: string) => void> = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { readText: () => new Promise<string>((r) => answers.push(r)) },
  });
  return {
    get asked() {
      return answers.length;
    },
    answer: async (i: number, t: string) => act(async () => { answers[i]!(t); await new Promise((r) => setTimeout(r, 10)); }),
  };
}

const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 20)));
const preview = () => document.querySelector('[role="status"] strong')?.textContent ?? null;
const importButton = () => button(DATA.importButton);
const reading = () => Array.from(document.querySelectorAll('p')).some((p) => p.textContent === DATA_COPY.reading);
const area = () => document.querySelector<HTMLTextAreaElement>('textarea')!;
const toast = (key: string) => toasts.value.find((t) => t.key === key);
const closeAndReopen = async (props: Partial<Parameters<typeof ImportSheet>[0]> = {}) => {
  act(() => render(<ImportSheet open={false} onClose={() => undefined} />, view!.root));
  act(() => render(<ImportSheet open onClose={() => undefined} {...props} />, view!.root));
  await settle();
};

describe('WP-A6: a new choice clears what was described, at once', () => {
  it('a file chosen while another backup is described: the preview and Import go at once, and the sheet says it is reading (failed before)', async () => {
    const { A, B } = threeSaves();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await type(area() as unknown as HTMLInputElement, A);
    await until(() => preview(), 'the preview of A');
    const slow = slowFile('bea.json');
    await choose(slow.file);
    // While B is being read, nothing is on offer: Import is bound to no bytes at all.
    expect(importButton()).toBeNull();
    expect(preview()).toBeNull();
    expect(reading()).toBe(true);
    await slow.arrive(B);
    expect(preview()).toBe(await lineFor(B));
    expect(reading()).toBe(false);
    await click(importButton(), 'Import');
    await until(() => toast('imported'), 'the Imported note');
    expect(store.state.value.profile.name).toBe('Bea');
  });

  it('slow file A, then fast file B: B is described and imported, and A’s late text is dropped (failed before)', async () => {
    const { A, B } = threeSaves();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    const slowA = slowFile('ana.json');
    await choose(slowA.file);
    await choose({ name: 'bea.json', size: 1000, type: 'application/json', text: async () => B });
    await until(() => preview(), 'the preview of B');
    await slowA.arrive(A);
    expect(preview()).toBe(await lineFor(B));
    expect(document.querySelector('[role="alert"]')).toBeNull();
    await click(importButton(), 'Import');
    await until(() => toast('imported'), 'the Imported note');
    expect(vi.mocked(store.applyImport).mock.calls.map((c) => c[0])).toEqual([B.trim()]);
    expect(store.state.value.profile.name).toBe('Bea');
  });

  it('Paste my plants, slow to answer, then a backup pasted into the box: the box wins (failed before)', async () => {
    const { A, B } = threeSaves();
    const clip = slowClipboard();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await click(button(INSTALL.paste), 'Paste my plants');
    expect(clip.asked).toBe(1);
    await type(area() as unknown as HTMLInputElement, B);
    await until(() => preview(), 'the preview of B');
    await clip.answer(0, A);
    expect(preview()).toBe(await lineFor(B));
    expect(area().value).toBe(B);
  });
});

describe('WP-A6: closing the sheet lets every read go', () => {
  it('closed and reopened while a file is still being read: the sheet stays empty, and nothing can be imported (failed before)', async () => {
    const { A } = threeSaves();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    const slow = slowFile('ana.json');
    await choose(slow.file);
    await closeAndReopen();
    await slow.arrive(A);
    expect(preview()).toBeNull();
    expect(importButton()).toBeNull();
    expect(reading()).toBe(false);
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it('closed and reopened while a pasted backup is still being described: the sheet stays empty (failed before)', async () => {
    const { A } = threeSaves();
    const real = (await vi.importActual<typeof import('@/state/store')>('@/state/store')).previewImport;
    const hold = deferred<void>();
    vi.mocked(store.previewImport).mockImplementationOnce(async (text: string) => {
      await hold.promise;
      return real(text);
    });
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await type(area() as unknown as HTMLInputElement, A);
    await closeAndReopen();
    await act(async () => {
      hold.resolve();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(preview()).toBeNull();
    expect(importButton()).toBeNull();
  });

  it('a clipboard read started when the sheet opened, answered after it was closed and opened again: ignored (failed before)', async () => {
    const { A } = threeSaves();
    const first = deferred<string | null>();
    view = mount(<ImportSheet open onClose={() => undefined} clip={first.promise} />);
    await closeAndReopen();
    await act(async () => {
      first.resolve(A);
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(area().value).toBe('');
    expect(preview()).toBeNull();
    expect(importButton()).toBeNull();
  });

  it('opened again with a new clipboard read: its answer is described, never the earlier one that came in late (failed before)', async () => {
    const { A, B } = threeSaves();
    const first = deferred<string | null>();
    const second = deferred<string | null>();
    view = mount(<ImportSheet open onClose={() => undefined} clip={first.promise} />);
    await closeAndReopen({ clip: second.promise });
    await act(async () => {
      second.resolve(B);
      await new Promise((r) => setTimeout(r, 20));
    });
    await until(() => preview(), 'the preview of B');
    await act(async () => {
      first.resolve(A);
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(preview()).toBe(await lineFor(B));
    expect(area().value).toBe(B.trim());
  });

  it('a clipboard read: the sheet says it is reading, and the line goes when the clipboard has nothing to give (shape: the line is new)', async () => {
    threeSaves();
    const first = deferred<string | null>();
    view = mount(<ImportSheet open onClose={() => undefined} clip={first.promise} />);
    expect(reading()).toBe(true);
    await act(async () => {
      first.resolve(null);
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(reading()).toBe(false);
    expect(importButton()).toBeNull();
  });
});

describe('WP-A6: Import is bound to the bytes it described', () => {
  it('the no-undo question imports the backup it asked about, not a clipboard answer that came in meanwhile (failed before)', async () => {
    const { b, A, B } = threeSaves();
    const noCopies: SnapshotStore = { durable: true, list: b.snapshots.list, get: b.snapshots.get, remove: b.snapshots.remove, put: () => Promise.reject(new Error('quota')) };
    store.configureStore({ snapshots: noCopies });
    const clip = slowClipboard();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await click(button(INSTALL.paste), 'Paste my plants');
    await type(area() as unknown as HTMLInputElement, B);
    await until(() => preview(), 'the preview of B');
    await click(importButton(), 'Import');
    await until(() => button(DATA_COPY.importAnyway), 'Import anyway');
    // The Paste tap's answer is stale (typing was a newer choice), so the question stays open.
    await clip.answer(0, A);
    await click(button(DATA_COPY.importAnyway), 'Import anyway');
    const note = await until(() => toast('imported'), 'the Imported note');
    // What was imported is what was described: Bea, never the unseen Ana.
    expect(note.message).toBe(DATA_COPY.importedNoUndo);
    expect(store.state.value.profile.name).toBe('Bea');
    expect(vi.mocked(store.applyImport).mock.calls.map((c) => [c[0], c[1]?.withoutUndo])).toEqual([
      [B.trim(), false],
      [B.trim(), true],
    ]);
  });

  it('a backup chosen while the no-undo question is open closes the question, and its Import anyway imports nothing (review guard)', async () => {
    const { b, A, B } = threeSaves();
    const noCopies: SnapshotStore = { durable: true, list: b.snapshots.list, get: b.snapshots.get, remove: b.snapshots.remove, put: () => Promise.reject(new Error('quota')) };
    store.configureStore({ snapshots: noCopies });
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await type(area() as unknown as HTMLInputElement, B);
    await until(() => preview(), 'the preview of B');
    await click(importButton(), 'Import');
    const anyway = await until(() => button(DATA_COPY.importAnyway), 'Import anyway');
    // A current choice this time, not a stale answer.
    await choose({ name: 'ana.json', size: 1000, type: 'application/json', text: async () => A });
    const lineA = await lineFor(A);
    await until(() => preview() === lineA, 'the preview of A');
    // The old button, pressed while the question is still on its way out, imports nothing.
    await click(anyway, 'the old Import anyway');
    await settle();
    expect(vi.mocked(store.applyImport).mock.calls.map((c) => c[0])).toEqual([B.trim()]);
    await until(() => !button(DATA_COPY.importAnyway), 'the question to close', 3000);
    expect(store.state.value.profile.name).toBe('Other');
    expect(toast('imported')).toBeUndefined();
  });

  it('choosing another backup while an import is under way lets that import go, and describes the new one (failed before)', async () => {
    const { b, A, B } = threeSaves();
    await new Promise((r) => setTimeout(r, 0));
    let reached!: () => void;
    let open!: () => void;
    const hit = new Promise<void>((r) => (reached = r));
    const wait = new Promise<void>((r) => (open = r));
    store.configureStore({
      snapshots: {
        durable: true,
        list: b.snapshots.list,
        get: b.snapshots.get,
        remove: b.snapshots.remove,
        put: async (r) => {
          await b.snapshots.put(r);
          reached();
          await wait;
        },
      },
    });
    const disk = b.storage.getItem(SAVE_KEY);
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await type(area() as unknown as HTMLInputElement, A);
    await until(() => preview(), 'the preview of A');
    await click(importButton(), 'Import');
    await hit;
    await choose({ name: 'bea.json', size: 1000, type: 'application/json', text: async () => B });
    open();
    await until(() => !store.replacing.value, 'the import to end');
    await settle();
    expect(store.state.value.profile.name).toBe('Other');
    expect(b.storage.getItem(SAVE_KEY)).toBe(disk);
    expect(toast('imported')).toBeUndefined();
    expect(preview()).toBe(await lineFor(B));
  });

  it('a backup chosen while the let-go import is still finishing: Import waits, then imports the new one (review guard)', async () => {
    const { b, A, B } = threeSaves();
    await new Promise((r) => setTimeout(r, 0));
    let reached!: () => void;
    let open!: () => void;
    const hit = new Promise<void>((r) => (reached = r));
    const wait = new Promise<void>((r) => (open = r));
    store.configureStore({
      snapshots: {
        durable: true,
        list: b.snapshots.list,
        get: b.snapshots.get,
        remove: b.snapshots.remove,
        put: async (r) => {
          const put = await b.snapshots.put(r);
          reached();
          await wait;
          return put;
        },
      },
    });
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await type(area() as unknown as HTMLInputElement, A);
    await until(() => preview(), 'the preview of A');
    await click(importButton(), 'Import');
    await hit;
    await choose({ name: 'bea.json', size: 1000, type: 'application/json', text: async () => B });
    const lineB = await lineFor(B);
    await until(() => preview() === lineB, 'the preview of B');
    // A is let go but still holding its protective copy: Import for B waits, and a tap does nothing.
    expect(store.replacing.value).toBe(true);
    expect(importButton()!.getAttribute('aria-busy')).toBe('true');
    await click(importButton(), 'Import (waiting)');
    expect(vi.mocked(store.applyImport)).toHaveBeenCalledTimes(1);
    open();
    await until(() => !store.replacing.value, 'the let-go import to end');
    await until(() => importButton()?.getAttribute('aria-busy') !== 'true' || null, 'Import to be ready', 3000);
    await click(importButton(), 'Import');
    await until(() => toast('imported'), 'the Imported note');
    expect(store.state.value.profile.name).toBe('Bea');
    expect(vi.mocked(store.applyImport).mock.calls.map((c) => c[0])).toEqual([A.trim(), B.trim()]);
  });

  it('unmounted while a file is read and a preview is worked out: the late answers change nothing and throw nothing (guard)', async () => {
    const { A } = threeSaves();
    const slow = slowFile('ana.json');
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await choose(slow.file);
    view.unmount();
    view = null;
    await slow.arrive(A);
    expect(vi.mocked(store.applyImport)).not.toHaveBeenCalled();
    expect(store.state.value.profile.name).toBe('Other');
  });

  it('new line: the sheet says it is reading (VOICE §21, DEC-V pending; shape)', () => {
    expect(DATA_COPY.reading).toBe('Reading the backup…');
  });
});

describe('WP-A6: the sheet lets its reads go, and they stop (review guards)', () => {
  const lastSignal = (fn: { mock: { calls: unknown[][] } }) => (fn.mock.calls.at(-1)?.[1] as { signal?: AbortSignal } | undefined)?.signal;
  const holdPreview = () => {
    const hold = deferred<void>();
    vi.mocked(store.previewImport).mockImplementationOnce(async () => {
      await hold.promise;
      return { ok: false, error: 'aborted' };
    });
    return hold;
  };

  it('a file read is given a signal, aborted by the next choice', async () => {
    threeSaves();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await choose(slowFile('ana.json').file);
    const signal = lastSignal(vi.mocked(files.readImportFile));
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal!.aborted).toBe(false);
    await type(area() as unknown as HTMLInputElement, 'hello');
    expect(signal!.aborted).toBe(true);
  });

  it('a file read is let go when the sheet closes, and when it goes', async () => {
    threeSaves();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await choose(slowFile('ana.json').file);
    const first = lastSignal(vi.mocked(files.readImportFile))!;
    await closeAndReopen();
    expect(first.aborted).toBe(true);
    await choose(slowFile('bea.json').file);
    const second = lastSignal(vi.mocked(files.readImportFile))!;
    expect(second.aborted).toBe(false);
    view.unmount();
    view = null;
    expect(second.aborted).toBe(true);
  });

  it('a description is given a signal, aborted by the next choice, by closing and by unmounting', async () => {
    const { A } = threeSaves();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    const holds = [holdPreview(), holdPreview(), holdPreview()];
    await type(area() as unknown as HTMLInputElement, A);
    const first = lastSignal(vi.mocked(store.previewImport))!;
    expect(first.aborted).toBe(false);
    await choose(slowFile('bea.json').file);
    expect(first.aborted).toBe(true);
    await type(area() as unknown as HTMLInputElement, A);
    const second = lastSignal(vi.mocked(store.previewImport))!;
    expect(second).not.toBe(first);
    await closeAndReopen();
    expect(second.aborted).toBe(true);
    await type(area() as unknown as HTMLInputElement, A);
    const third = lastSignal(vi.mocked(store.previewImport))!;
    expect(third.aborted).toBe(false);
    view.unmount();
    view = null;
    expect(third.aborted).toBe(true);
    for (const h of holds) h.resolve();
  });

  it('a description that rejects says the text isn’t a backup, and stops saying it is reading', async () => {
    threeSaves();
    vi.mocked(store.previewImport).mockRejectedValueOnce(new Error('boom'));
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await type(area() as unknown as HTMLInputElement, '{"not":"a backup"}');
    await settle();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(ERRORS.notBackup);
    expect(reading()).toBe(false);
    expect(importButton()).toBeNull();
  });

  it('Paste my plants clears the box at the tap; a clipboard with nothing to give leaves it empty', async () => {
    threeSaves();
    const clip = slowClipboard();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await type(area() as unknown as HTMLInputElement, 'hello');
    await until(() => document.querySelector('[role="alert"]'), 'the not-a-backup line');
    await click(button(INSTALL.paste), 'Paste my plants');
    expect(area().value).toBe('');
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(reading()).toBe(true);
    await clip.answer(0, '');
    expect(area().value).toBe('');
    expect(reading()).toBe(false);
    expect(importButton()).toBeNull();
  });
});

// Closing during the protective copy is save-replace-ui's guard; closing while a CK1 payload is
// still expanding is import-candidate.test.ts's (jsdom's Blob can't stream, so it runs in node).
describe('WP-A6: closing the sheet at each await of an import', () => {
  it('after the commit, while older copies are pruned: it is imported, and the Imported note says so (guard)', async () => {
    const { b, A } = threeSaves();
    await new Promise((r) => setTimeout(r, 0));
    let listed = 0;
    let reached!: () => void;
    let open!: () => void;
    const hit = new Promise<void>((r) => (reached = r));
    const wait = new Promise<void>((r) => (open = r));
    store.configureStore({
      snapshots: {
        durable: true,
        get: b.snapshots.get,
        put: b.snapshots.put,
        remove: b.snapshots.remove,
        list: async () => {
          const l = await b.snapshots.list();
          if (++listed === 1) {
            reached();
            await wait;
          }
          return l;
        },
      },
    });
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await type(area() as unknown as HTMLInputElement, A);
    await until(() => preview(), 'the preview');
    await click(importButton(), 'Import');
    await hit;
    act(() => render(<ImportSheet open={false} onClose={() => undefined} />, view!.root));
    open();
    const note = await until(() => toast('imported'), 'the Imported note');
    expect(note.action?.label).toBe(DATA.undoImport);
    expect(store.state.value.profile.name).toBe('Ana');
  });
  it('an import that commits closes the sheet at once, before older copies are pruned, so no other backup can be chosen over it (failed before)', async () => {
    const { b, A } = threeSaves();
    await new Promise((r) => setTimeout(r, 0));
    let listed = 0;
    let reached!: () => void;
    let open!: () => void;
    const hit = new Promise<void>((r) => (reached = r));
    const wait = new Promise<void>((r) => (open = r));
    store.configureStore({
      snapshots: {
        durable: true,
        get: b.snapshots.get,
        put: b.snapshots.put,
        remove: b.snapshots.remove,
        list: async () => {
          const l = await b.snapshots.list();
          if (++listed === 1) {
            reached();
            await wait;
          }
          return l;
        },
      },
    });
    const onClose = vi.fn();
    const onImported = vi.fn();
    view = mount(<ImportSheet open onClose={onClose} onImported={onImported} />);
    await type(area() as unknown as HTMLInputElement, A);
    await until(() => preview(), 'the preview');
    await click(importButton(), 'Import');
    await hit;
    await settle();
    // Committed, still pruning: the sheet has been closed, so B can't be described over the import.
    expect(store.state.value.profile.name).toBe('Ana');
    expect(store.replacing.value).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    // The note waits for the end, so its Undo is never refused as busy.
    expect(toast('imported')).toBeUndefined();
    open();
    const note = await until(() => toast('imported'), 'the Imported note');
    expect(note.action?.label).toBe(DATA.undoImport);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(vi.mocked(store.applyImport)).toHaveBeenCalledTimes(1);
  });
});
