// @vitest-environment jsdom
/**
 * WP-A7, the data-d12 interface half: a restore, an Undo, an import or the list of daily copies
 * whose store call rejects outright (the store answers with results, but the screens must not
 * depend on that) leaves the controls usable, says so, and raises no unhandled rejection. The
 * store's own functions are wrapped so a test can make one reject once. Cases marked "failed
 * before" failed against the code before WP-A7 (b2061e5).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as store from '@/state/store';
import { DATA, DATA_COPY, ERRORS } from '@/catalog/lines';
import { DataSection } from '@/features/you/DataSection';
import { ImportSheet, toastImported, toastRestored } from '@/features/you/ImportSheet';
import { toasts } from '@/ui/toast';
import { button, click, installDom, mount, pause, type, until } from '@/features/capsules/testing';
import { fakeBrowser } from './fixtures';

vi.mock('@/state/store', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/state/store')>();
  return {
    ...real,
    restoreSnapshot: vi.fn(real.restoreSnapshot),
    undoImport: vi.fn(real.undoImport),
    applyImport: vi.fn(real.applyImport),
    listSnapshots: vi.fn(real.listSnapshots),
  };
});

const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => void unhandled.push(reason);

beforeAll(() => {
  installDom();
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
  process.on('unhandledRejection', onUnhandled);
});
afterAll(() => {
  process.off('unhandledRejection', onUnhandled);
});

let view: ReturnType<typeof mount> | null = null;
beforeEach(() => {
  unhandled.length = 0;
});
afterEach(() => {
  view?.unmount();
  view = null;
  toasts.value = [];
  store.configureStore({ locks: null });
  localStorage.clear();
});

const toast = (key: string) => toasts.value.find((t) => t.key === key);
const boom = () => new Error('IndexedDB went away');

/** Boots "Sam", keeps a backup, starts over as "Other" and lets the daily copy be kept. */
async function twoSaves() {
  const b = fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Sam', templateIds: [] });
  const backup = store.exportData();
  store.resetAll();
  store.completeOnboarding({ name: 'Other', templateIds: [] });
  b.advance(1000);
  store.hydrate(); // a new visit: the daily copy of "Other" is kept
  await pause(0);
  return { b, backup };
}

describe('a restore whose call rejects', () => {
  it('says so, closes the question, and a second try works without leaving the screen (failed before)', async () => {
    await twoSaves();
    vi.mocked(store.restoreSnapshot).mockRejectedValueOnce(boom());
    view = mount(<DataSection />);
    await click(button(new RegExp(`^${DATA_COPY.snapshotsRow}`)), 'Daily copies');
    const restoreRow = await until(() => button(DATA.restoreSnapshot), 'a copy');
    await click(restoreRow, 'Restore this copy');
    await click(await until(() => document.querySelector('[role="alertdialog"] [data-confirm]'), 'the confirmation'), 'confirm');
    const note = await until(() => toast('snapshot-no'), 'the note');
    expect(note.message).toBe(DATA_COPY.copyUnreadable);
    await until(() => document.querySelector('[role="alertdialog"] [data-confirm]') === null, 'the question to close');
    expect(restoreRow.disabled).toBe(false);
    // Again, and this time the store answers.
    await click(restoreRow, 'Restore this copy');
    const confirm = await until(() => document.querySelector<HTMLButtonElement>('[role="alertdialog"] [data-confirm]'), 'the confirmation');
    expect(confirm.getAttribute('aria-busy')).not.toBe('true');
    await click(confirm, 'confirm');
    await until(() => toast('snapshot-restored'), 'the restored note');
    expect(unhandled).toEqual([]);
  });
});

describe('an Undo whose call rejects', () => {
  it('from the Data row: a note, the row still there, and no unhandled rejection (failed before)', async () => {
    const { backup } = await twoSaves();
    const res = await store.applyImport(backup);
    expect(res).toMatchObject({ ok: true });
    vi.mocked(store.undoImport).mockRejectedValueOnce(boom());
    view = mount(<DataSection />);
    await click(button(DATA.undoImport), 'Undo import');
    const note = await until(() => toast('import-undo-no'), 'the note');
    expect(note.message).toBe(DATA_COPY.copyUnreadable);
    await pause(10);
    expect(unhandled).toEqual([]);
    expect(button(DATA.undoImport)?.disabled).toBe(false);
    expect(store.state.value.profile.name).toBe('Sam');
  });

  it('from the Imported note: a note and no unhandled rejection (failed before)', async () => {
    const { backup } = await twoSaves();
    await store.applyImport(backup);
    vi.mocked(store.undoImport).mockRejectedValueOnce(boom());
    toastImported({ until: Date.now() + 1000 });
    toast('imported')!.action!.onAction();
    const note = await until(() => toast('import-undo-no'), 'the note');
    expect(note.message).toBe(DATA_COPY.copyUnreadable);
    await pause(10);
    expect(unhandled).toEqual([]);
  });

  it('from the restored note: the same (failed before)', async () => {
    await twoSaves();
    vi.mocked(store.undoImport).mockRejectedValueOnce(boom());
    toastRestored('Sep 28', { until: Date.now() + 1000 });
    toast('snapshot-restored')!.action!.onAction();
    await until(() => toast('import-undo-no'), 'the note');
    await pause(10);
    expect(unhandled).toEqual([]);
  });
});

describe('an import whose call rejects', () => {
  it('says nothing changed and Import can be pressed again (failed before)', async () => {
    const { backup } = await twoSaves();
    vi.mocked(store.applyImport).mockRejectedValueOnce(boom());
    view = mount(<ImportSheet open onClose={() => undefined} />);
    const area = await until(() => document.querySelector<HTMLTextAreaElement>('textarea'), 'the paste box');
    await type(area as unknown as HTMLInputElement, backup);
    await until(() => document.querySelector('[role="status"]:not([aria-live])'), 'the preview');
    await click(button(DATA.importButton), 'Import');
    await until(() => document.querySelector('[role="alert"]'), 'the error line');
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(DATA_COPY.notReplaced);
    const again = button(DATA.importButton)!;
    expect(again.disabled).toBe(false);
    expect(again.getAttribute('aria-busy')).not.toBe('true');
    await click(again, 'Import');
    await until(() => toast('imported'), 'the Imported note');
    expect(unhandled).toEqual([]);
  });
});

describe('a list of daily copies whose call rejects', () => {
  it('shows the error with Try again, never the empty line (failed before)', async () => {
    await twoSaves();
    vi.mocked(store.listSnapshots).mockRejectedValueOnce(boom());
    view = mount(<DataSection />);
    await click(button(new RegExp(`^${DATA_COPY.snapshotsRow}`)), 'Daily copies');
    await until(() => document.querySelector('[role="dialog"]')?.textContent?.includes(DATA_COPY.snapshotsError), 'the error line');
    await click(button(ERRORS.tryAgain), 'Try again');
    await until(() => button(DATA.restoreSnapshot), 'the copies');
    expect(unhandled).toEqual([]);
  });
});
