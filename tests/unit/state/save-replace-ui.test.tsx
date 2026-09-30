// @vitest-environment jsdom
/**
 * WP-A3 in the interface: every "Imported" and "Back to the copy" note, and every Undo, comes from
 * a replacement that answered `{ ok: true }`, and says only what that answer promises (data-d3,
 * data-d11 receipt, data-d12 busy state). Cases marked "failed before" failed against the code
 * before WP-A3.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SAVE_KEY } from '@/state/persist';
import type { SnapshotStore } from '@/state/snapshots';
import * as store from '@/state/store';
import { DATA, DATA_COPY } from '@/catalog/lines';
import { ImportSheet } from '@/features/you/ImportSheet';
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
