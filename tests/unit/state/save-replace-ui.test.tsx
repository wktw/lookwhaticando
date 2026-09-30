// @vitest-environment jsdom
/**
 * WP-A3 in the interface: every "Imported" and "Back to the copy" note, and every Undo, comes from
 * a replacement that answered `{ ok: true }`, and says only what that answer promises (data-d3,
 * data-d11 receipt, data-d12 busy state). Cases marked "failed before" failed against the code
 * before WP-A3.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { SAVE_KEY, encodeEnvelope } from '@/state/persist';
import { createInitialState } from '@/state/defaults';
import type { SnapshotStore } from '@/state/snapshots';
import * as store from '@/state/store';
import { DATA, DATA_COPY } from '@/catalog/lines';
import { ImportSheet, replaceErrorText } from '@/features/you/ImportSheet';
import { DataSection } from '@/features/you/DataSection';
import { toasts } from '@/ui/toast';
import { button, click, installDom, mount, type, until } from '@/features/capsules/testing';
import { failWrites, fakeBrowser } from './fixtures';

beforeAll(() => {
  installDom();
  // The You screen asks how catkin is installed (display-mode), which jsdom has no answer for.
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
});

let view: ReturnType<typeof mount> | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
  toasts.value = [];
  store.configureStore({ locks: null });
  localStorage.clear();
});

/** Boots a window, keeps a backup of "Sam", then starts over as "Other". */
function twoSaves() {
  const b = fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Sam', templateIds: [] });
  const backup = store.exportData();
  store.resetAll();
  store.completeOnboarding({ name: 'Other', templateIds: [] });
  b.advance(1000);
  return { b, backup };
}

const toast = (key: string) => toasts.value.find((t) => t.key === key);

async function pasteAndImport(backup: string) {
  const area = await until(() => document.querySelector<HTMLTextAreaElement>('textarea'), 'the paste box');
  await type(area as unknown as HTMLInputElement, backup);
  await until(() => document.querySelector('[role="status"]'), 'the preview');
  await click(button(DATA.importButton), 'Import');
}

describe('ImportSheet reports what the import did', () => {
  it('a save that can’t be written: the sheet stays with the not-saved line, and no Imported note (failed before)', async () => {
    const { b, backup } = twoSaves();
    failWrites(b.storage, 'quota', [SAVE_KEY]);
    let imported = 0;
    view = mount(<ImportSheet open onClose={() => undefined} onImported={() => imported++} />);
    await pasteAndImport(backup);
    await until(() => document.querySelector('[role="alert"]'), 'the error line');
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(DATA_COPY.notReplaced);
    expect(toast('imported')).toBeUndefined();
    expect(imported).toBe(0);
    expect(store.state.value.profile.name).toBe('Other');
  });

  it('a confirmed no-undo import says Imported with no Undo on the note (failed before)', async () => {
    const { b, backup } = twoSaves();
    const noCopies: SnapshotStore = { durable: true, list: b.snapshots.list, get: b.snapshots.get, remove: b.snapshots.remove, put: () => Promise.reject(new Error('quota')) };
    store.configureStore({ snapshots: noCopies });
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await pasteAndImport(backup);
    await click(await until(() => button(DATA_COPY.importAnyway), 'Import anyway'), 'Import anyway');
    const note = await until(() => toast('imported'), 'the Imported note');
    expect(note.message).toBe(DATA_COPY.importedNoUndo);
    expect(note.action).toBeUndefined();
    expect(store.state.value.profile.name).toBe('Sam');
  });

  it('an import with a copy says Imported with Undo import, and Undo goes back', async () => {
    const { backup } = twoSaves();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await pasteAndImport(backup);
    const note = await until(() => toast('imported'), 'the Imported note');
    expect(note.message).toBe(DATA.imported);
    expect(note.action?.label).toBe(DATA.undoImport);
    note.action!.onAction();
    await until(() => toast('import-undone'), 'the undone note');
    expect(store.state.value.profile.name).toBe('Other');
  });
});

describe('Daily copies: a restore that can’t read its copy', () => {
  it('re-enables the controls and says so, instead of staying busy (failed before)', async () => {
    const { b } = twoSaves();
    await new Promise((r) => setTimeout(r, 0));
    const reject = () => Promise.reject(new Error('read failed'));
    store.configureStore({ snapshots: { durable: true, list: b.snapshots.list, get: reject, put: b.snapshots.put, remove: b.snapshots.remove } });
    view = mount(<DataSection />);
    await click(button(new RegExp(`^${DATA_COPY.snapshotsRow}`)), 'Daily copies');
    const restoreRow = await until(() => button(DATA.restoreSnapshot), 'a copy');
    await click(restoreRow, 'Restore this copy');
    const confirm = await until(() => document.querySelector<HTMLButtonElement>('[role="alertdialog"] [data-confirm]'), 'the confirmation');
    await click(confirm, 'confirm');
    await until(() => toast('snapshot-no'), 'the note');
    expect(toast('snapshot-restored')).toBeUndefined();
    await until(() => document.querySelector('[role="alertdialog"] [data-confirm]') === null, 'the confirmation to close');
    expect(restoreRow.disabled).toBe(false);
    expect(store.state.value.profile.name).toBe('Other');
  });
});

describe('Daily copies: a restore that keeps a copy', () => {
  it('says "Back to the copy" with Undo, and the row offers Undo last replacement, which goes back (failed before)', async () => {
    const { b } = twoSaves();
    await new Promise((r) => setTimeout(r, 0));
    store.setName('Renamed');
    b.advance(1000);
    view = mount(<DataSection />);
    expect(button(DATA_COPY.undoRestore)).toBeNull();
    await click(button(new RegExp(`^${DATA_COPY.snapshotsRow}`)), 'Daily copies');
    await click(await until(() => button(DATA.restoreSnapshot), 'a copy'), 'Restore this copy');
    await click(await until(() => document.querySelector<HTMLButtonElement>('[role="alertdialog"] [data-confirm]'), 'the confirmation'), 'confirm');
    const note = await until(() => toast('snapshot-restored'), 'the restored note');
    expect(note.action?.label).toBe('Undo');
    expect(store.state.value.profile.name).not.toBe('Renamed');
    const row = await until(() => button(DATA_COPY.undoRestore), 'the Undo row');
    await click(row, 'Undo last replacement');
    const undone = await until(() => toast('import-undone'), 'the undone note');
    expect(undone.message).toBe(DATA_COPY.undoneRestore);
    expect(store.state.value.profile.name).toBe('Renamed');
  });
});

/** A copy store whose next put is held (after it was written) until released. */
function heldPut(inner: SnapshotStore) {
  let reached!: () => void;
  let open!: () => void;
  const hit = new Promise<void>((r) => (reached = r));
  const wait = new Promise<void>((r) => (open = r));
  let armed = true;
  const s: SnapshotStore = {
    durable: inner.durable,
    list: inner.list,
    get: inner.get,
    remove: inner.remove,
    put: async (r) => {
      await inner.put(r);
      if (armed) {
        armed = false;
        reached();
        await wait;
      }
    },
  };
  return { store: s, reached: hit, release: () => open() };
}

/** The WP-A3 review round: here "failed before" means against WP-A3 as first committed (d23d43c); a guard was checked by mutation. */
describe('review: the interface while a replacement is under way', () => {
  it('Start over, Try the demo and Import are disabled while one is in flight, and come back after (a guard)', async () => {
    const { b, backup } = twoSaves();
    await new Promise((r) => setTimeout(r, 0));
    const gate = heldPut(b.snapshots);
    store.configureStore({ snapshots: gate.store });
    view = mount(<DataSection />);
    const rows = () => [button(DATA.startOver), button(new RegExp(`^${DATA.demo}`)), button(DATA.import)];
    expect(rows().map((r) => r?.disabled)).toEqual([false, false, false]);
    const p = store.applyImport(backup);
    try {
      await gate.reached;
      await until(() => rows().every((r) => r?.disabled), 'the rows to be disabled');
    } finally {
      gate.release();
    }
    expect(await p).toMatchObject({ ok: true });
    await until(() => rows().every((r) => r && !r.disabled), 'the rows to come back');
  });

  it('closing the Import sheet mid-import lets the import go: nothing is replaced and nothing says Imported (a guard)', async () => {
    const { b, backup } = twoSaves();
    await new Promise((r) => setTimeout(r, 0));
    const gate = heldPut(b.snapshots);
    store.configureStore({ snapshots: gate.store });
    const disk = b.storage.getItem(SAVE_KEY);
    view = mount(<ImportSheet open onClose={() => undefined} />);
    await pasteAndImport(backup);
    await gate.reached;
    act(() => render(<ImportSheet open={false} onClose={() => undefined} />, view!.root));
    gate.release();
    await until(() => !store.replacing.value, 'the import to end');
    expect(store.state.value.profile.name).toBe('Other');
    expect(b.storage.getItem(SAVE_KEY)).toBe(disk);
    expect(b.storage.getItem('catkin:undo-import')).toBeNull();
    expect((await b.snapshots.list()).filter((m) => m.kind === 'pre-import')).toEqual([]);
    expect(toast('imported')).toBeUndefined();
  });

  it('an Undo refused because the save shown is another one never claims the copy is gone (failed before)', async () => {
    const { b, backup } = twoSaves();
    expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    const s = createInitialState(b.clock.now);
    b.storage.setItem(SAVE_KEY, encodeEnvelope({ ...s, profile: { ...s.profile, name: 'Elsewhere', onboarded: true } }, 1, 0, 'other', 'c'.repeat(32)));
    b.fire('storage', { key: SAVE_KEY });
    expect(await store.undoImport()).toEqual({ ok: false, error: 'expired' });
    expect(replaceErrorText('expired')).not.toBe(DATA_COPY.copyGone);
    expect(replaceErrorText('expired')).toBe(DATA_COPY.undoGone);
  });
});
